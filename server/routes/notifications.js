// server/routes/notifications.js – Push Notifications & Alerts
import express from 'express';
import crypto from 'crypto';
import { query } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Cron/service-to-service guard for check-expiry. Rejects when CRON_SECRET is unset.
function isCronAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const provided = String(req.headers['x-cron-secret'] || '');
  if (provided.length !== secret.length) return false;
  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(secret));
}

// Get notification settings
router.get('/settings', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM push_notification_settings WHERE user_id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      // Create defaults
      const newResult = await query(`
        INSERT INTO push_notification_settings (
          user_id, expiry_alerts_enabled, expiry_warning_days,
          earning_alerts_enabled, offer_alerts_enabled
        ) VALUES ($1, true, '{15,30,45,90}', true, true)
        RETURNING *
      `, [req.userId]);
      return res.json(newResult.rows[0]);
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// Update notification settings
router.put('/settings', authenticate, async (req, res) => {
  try {
    const { 
      expiryAlertsEnabled, expiryWarningDays, 
      earningAlertsEnabled, offerAlertsEnabled,
      quietHoursStart, quietHoursEnd 
    } = req.body;

    const result = await query(`
      UPDATE push_notification_settings 
      SET expiry_alerts_enabled = COALESCE($1, expiry_alerts_enabled),
          expiry_warning_days = COALESCE($2, expiry_warning_days),
          earning_alerts_enabled = COALESCE($3, earning_alerts_enabled),
          offer_alerts_enabled = COALESCE($4, offer_alerts_enabled),
          quiet_hours_start = COALESCE($5, quiet_hours_start),
          quiet_hours_end = COALESCE($6, quiet_hours_end),
          updated_at = NOW()
      WHERE user_id = $7
      RETURNING *
    `, [
      expiryAlertsEnabled, expiryWarningDays, 
      earningAlertsEnabled, offerAlertsEnabled,
      quietHoursStart, quietHoursEnd, req.userId
    ]);

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Register push token
router.post('/token', authenticate, async (req, res) => {
  try {
    const { pushToken } = req.body;

    // Upsert: the settings row may not exist yet (first token before settings read)
    await query(`
      INSERT INTO push_notification_settings (user_id, push_token, last_token_refresh_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET push_token = $2, last_token_refresh_at = NOW(), updated_at = NOW()
    `, [req.userId, pushToken]);

    res.json({ success: true });
  } catch (err) {
    console.error('Save push token error:', err);
    res.status(500).json({ error: 'Failed to save token' });
  }
});

// Get expiry alerts
router.get('/expiry', authenticate, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        la.id, la.current_balance, la.expiring_points, la.expiry_date,
        lp.name as program_name, lp.category
      FROM linked_accounts la
      JOIN loyalty_programs lp ON la.program_id = lp.id
      WHERE la.user_id = $1 
        AND la.is_active = true 
        AND la.expiring_points > 0
        AND la.expiry_date IS NOT NULL
        AND la.expiry_date <= NOW() + INTERVAL '90 days'
      ORDER BY la.expiry_date ASC
    `, [req.userId]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Get alert history
router.get('/history', authenticate, async (req, res) => {
  try {
    const result = await query(`
      SELECT ea.*, lp.name as program_name
      FROM expiry_alerts ea
      JOIN linked_accounts la ON ea.linked_account_id = la.id
      JOIN loyalty_programs lp ON la.program_id = lp.id
      WHERE ea.user_id = $1
      ORDER BY ea.triggered_at DESC
      LIMIT 50
    `, [req.userId]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Acknowledge alert
router.put('/acknowledge/:id', authenticate, async (req, res) => {
  try {
    await query(`
      UPDATE expiry_alerts 
      SET acknowledged_by_user = true, acknowledged_at = NOW()
      WHERE id = $1 AND user_id = $2
    `, [req.params.id, req.userId]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to acknowledge' });
  }
});

// Check and create pending expiry alerts (called by cron job)
router.post('/check-expiry', async (req, res) => {
  if (!isCronAuthorized(req)) {
    return res.status(401).json({
      error:
        'Unauthorized. Set CRON_SECRET in server/.env and send it as "x-cron-secret" header.',
    });
  }
  try {
    // Get all users with expiring points
    const result = await query(`
      SELECT 
        la.user_id, la.id as account_id, la.expiring_points, la.expiry_date,
        lp.name as program_name
      FROM linked_accounts la
      JOIN loyalty_programs lp ON la.program_id = lp.id
      WHERE la.is_active = true 
        AND la.expiring_points > 0
        AND la.expiry_date IS NOT NULL
        AND la.expiry_date BETWEEN NOW() AND NOW() + INTERVAL '90 days'
    `);

    let alertsCreated = 0;

    for (const row of result.rows) {
      const daysUntil = Math.ceil(
        (new Date(row.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      
      // Bucketed thresholds: pick the smallest of 15/30/45/90 that is >= daysUntil
      // so alerts fire on any day, not only exact-match days (which rarely occur).
      const thresholds = [15, 30, 45, 90];
      const tier = thresholds.find((t) => daysUntil <= t);
      if (!tier) continue;
      const alertType = `${tier}days`;

      // Skip if this tier already fired for this account within its window
      const existing = await query(`
        SELECT id FROM expiry_alerts 
        WHERE linked_account_id = $1 
          AND alert_type = $2
          AND triggered_at > NOW() - INTERVAL '1 day' * $3
      `, [row.account_id, alertType, tier]);

      if (existing.rows.length > 0) continue;

      // Create alert
      await query(`
        INSERT INTO expiry_alerts (
          user_id, linked_account_id, alert_type, points_at_risk, sent_push_notification
        ) VALUES ($1, $2, $3, $4, false)
      `, [row.user_id, row.account_id, alertType, row.expiring_points]);

      alertsCreated++;
    }

    res.json({ alertsCreated });
  } catch (err) {
    console.error('Check expiry error:', err);
    res.status(500).json({ error: 'Check failed' });
  }
});

export default router;