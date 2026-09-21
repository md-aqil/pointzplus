// server/routes/sms.js – Android SMS Detection API
import express from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'pointzplus-secret-key-2026';

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// SMS Parser rules (same as mobile app)
const SMS_RULES = [
  { programId: 'hdfc_mycards', keywords: ['HDFCBANK', 'HDFC'], balanceRegex: /(?:Reward Points|Points Balance)\s*(?:is|are)?\s*([0-9,]+)/i },
  { programId: 'airtel_thanks', keywords: ['AIRTEL', 'THANKS'], balanceRegex: /(?:SuperCoins|points|balance)\s*(?:is|are)?\s*([0-9,]+)/i },
  { programId: 'flipkart_supercoins', keywords: ['FLIPKART', 'SUPERCOINS'], balanceRegex: /(?:SuperCoins|points|balance)\s*(?:is|are)?\s*([0,9,]+)/i },
  { programId: 'swiggy_one', keywords: ['SWIGGY'], balanceRegex: /(?:SuperCoins|points)\s*([0-9,]+)/i },
  { programId: 'cult_fit', keywords: ['CULTFIT', 'CULT'], balanceRegex: /(?:FitCoins|points)\s*([0-9,]+)/i },
  { programId: 'bookmyshow', keywords: ['BOOKMYSHOW', 'BMS'], balanceRegex: /(?:Rewards|points)\s*([0-9,]+)/i },
];

// Detect points from SMS (called from mobile app)
router.post('/detect', authenticate, async (req, res) => {
  try {
    const { smsList } = req.body; // Array of { body, sender, timestamp }

    if (!smsList || !Array.isArray(smsList)) {
      return res.status(400).json({ error: 'smsList array required' });
    }

    const detections = [];

    for (const sms of smsList) {
      const body = sms.body?.toUpperCase() || '';
      const sender = sms.sender?.toUpperCase() || '';

      for (const rule of SMS_RULES) {
        const matchesKeyword = rule.keywords.some(k => body.includes(k) || sender.includes(k));
        if (!matchesKeyword) continue;

        const match = sms.body?.match(rule.balanceRegex);
        if (!match) continue;

        const points = parseInt(match[1].replace(/,/g, ''), 10);
        if (isNaN(points) || points <= 0) continue;

        // Get program details
        const programResult = await query(
          'SELECT id, name, category, point_value_inr FROM loyalty_programs WHERE id = $1',
          [rule.programId]
        );

        if (programResult.rows.length === 0) continue;

        const program = programResult.rows[0];

        detections.push({
          programId: program.id,
          programName: program.name,
          category: program.category,
          points,
          accountNumber: null,
          confidence: 0.85,
          source: 'sms',
          detectedAt: new Date().toISOString()
        });

        // Log detection
        await query(`
          INSERT INTO sms_detections (
            user_id, phone_number, sms_body, matched_program_id,
            extracted_points, detector_confidence, detected_at, action_taken
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'detected')
        `, [req.userId, sms.sender || 'unknown', sms.body, program.id, points, 0.85]);

        break; // One detection per SMS
      }
    }

    res.json({
      totalScanned: smsList.length,
      detections
    });
  } catch (err) {
    console.error('SMS detect error:', err);
    res.status(500).json({ error: 'Detection failed' });
  }
});

// Auto-add detected SMS to linked accounts
router.post('/auto-add', authenticate, async (req, res) => {
  try {
    const { programId, points, accountNumber, sourceSmsId } = req.body;

    // Check if already exists
    const existing = await query(
      `SELECT id FROM linked_accounts WHERE user_id = $1 AND program_id = $2`,
      [req.userId, programId]
    );

    if (existing.rows.length > 0) {
      // Update existing
      await query(`
        UPDATE linked_accounts 
        SET current_balance = $1, last_synced_at = NOW(), sync_method = 'sms'
        WHERE id = $2
      `, [points, existing.rows[0].id]);
    } else {
      // Create new
      await query(`
        INSERT INTO linked_accounts (
          user_id, program_id, account_number_masked, current_balance,
          sync_method, sync_source, is_active
        ) VALUES ($1, $2, $3, $4, 'sms', 'sms_android', true)
      `, [req.userId, programId, accountNumber || 'SMS-***', points]);
    }

    // Update detection record
    if (sourceSmsId) {
      await query(`
        UPDATE sms_detections SET action_taken = 'auto_added' WHERE id = $1
      `, [sourceSmsId]);
    }

    res.json({ success: true, message: 'Account added via SMS' });
  } catch (err) {
    console.error('Auto-add error:', err);
    res.status(500).json({ error: 'Failed to add account' });
  }
});

// Get SMS detection history
router.get('/history', authenticate, async (req, res) => {
  try {
    const result = await query(`
      SELECT sd.*, lp.name as program_name, lp.category
      FROM sms_detections sd
      LEFT JOIN loyalty_programs lp ON sd.matched_program_id = lp.id
      WHERE sd.user_id = $1
      ORDER BY sd.detected_at DESC
      LIMIT 50
    `, [req.userId]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Get SMS settings
router.get('/settings', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM sms_settings WHERE user_id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      // Create default settings
      const newResult = await query(`
        INSERT INTO sms_settings (user_id, sms_detection_enabled, auto_create_accounts, confidence_threshold)
        VALUES ($1, true, true, 0.85)
        RETURNING *
      `, [req.userId]);
      return res.json(newResult.rows[0]);
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// Update SMS settings
router.put('/settings', authenticate, async (req, res) => {
  try {
    const { smsDetectionEnabled, autoCreateAccounts, confidenceThreshold } = req.body;

    const result = await query(`
      UPDATE sms_settings 
      SET sms_detection_enabled = COALESCE($1, sms_detection_enabled),
          auto_create_accounts = COALESCE($2, auto_create_accounts),
          confidence_threshold = COALESCE($3, confidence_threshold),
          updated_at = NOW()
      WHERE user_id = $4
      RETURNING *
    `, [smsDetectionEnabled, autoCreateAccounts, confidenceThreshold, req.userId]);

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;