// server/routes/accounts.js – Linked Accounts CRUD
import express from 'express';
import { query } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get all linked accounts for user
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        la.id,
        la.account_number_masked,
        la.current_balance,
        la.expiring_points,
        la.expiry_date,
        la.last_synced_at,
        la.sync_method,
        la.sync_source,
        la.is_active,
        la.created_at,
        lp.id as program_id,
        lp.slug as program_slug,
        lp.name as program_name,
        lp.category,
        lp.logo_initial,
        lp.accent_color,
        lp.point_value_inr
      FROM linked_accounts la
      JOIN loyalty_programs lp ON la.program_id = lp.id
      WHERE la.user_id = $1
      ORDER BY la.current_balance DESC
    `, [req.userId]);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching accounts:', err);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// Get single account
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        la.*,
        lp.name as program_name,
        lp.slug as program_slug,
        lp.category,
        lp.logo_initial,
        lp.accent_color
      FROM linked_accounts la
      JOIN loyalty_programs lp ON la.program_id = lp.id
      WHERE la.id = $1 AND la.user_id = $2
    `, [req.params.id, req.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch account' });
  }
});

// Add new linked account
router.post('/', authenticate, async (req, res) => {
  try {
    const { programId, accountNumberMasked, currentBalance, expiringPoints, expiryDate, syncMethod = 'manual' } = req.body;

    if (!programId || !accountNumberMasked || !currentBalance) {
      return res.status(400).json({ error: 'programId, accountNumberMasked, and currentBalance are required' });
    }

    // Check if program exists
    const programCheck = await query('SELECT id, name FROM loyalty_programs WHERE id = $1', [programId]);
    if (programCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid program ID' });
    }

    // Check for duplicate
    const duplicateCheck = await query(
      'SELECT id FROM linked_accounts WHERE user_id = $1 AND program_id = $2 AND account_number_masked = $3',
      [req.userId, programId, accountNumberMasked]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Account already linked' });
    }

    const result = await query(`
      INSERT INTO linked_accounts (
        user_id, program_id, account_number_masked, 
        current_balance, expiring_points, expiry_date, 
        sync_method, sync_source, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
      RETURNING *
    `, [
      req.userId, programId, accountNumberMasked,
      currentBalance, expiringPoints || 0, expiryDate || null,
      syncMethod, syncMethod === 'manual' ? 'manual' : null
    ]);

    // Log transaction
    await query(`
      INSERT INTO points_transactions (
        account_id, type, points, description, source, transaction_date
      ) VALUES ($1, 'credit', $2, $3, $4, NOW())
    `, [result.rows[0].id, currentBalance, 'Initial balance', 'manual_entry']);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding account:', err);
    res.status(500).json({ error: 'Failed to add account' });
  }
});

// Update account
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { currentBalance, expiringPoints, expiryDate, isActive } = req.body;

    const result = await query(`
      UPDATE linked_accounts
      SET 
        current_balance = COALESCE($1, current_balance),
        expiring_points = COALESCE($2, expiring_points),
        expiry_date = COALESCE($3, expiry_date),
        is_active = COALESCE($4, is_active),
        updated_at = NOW()
      WHERE id = $5 AND user_id = $6
      RETURNING *
    `, [currentBalance, expiringPoints, expiryDate, isActive, req.params.id, req.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update account' });
  }
});

// Delete account
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM linked_accounts WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Get transactions for an account
router.get('/:id/transactions', authenticate, async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM points_transactions
      WHERE account_id = $1
      ORDER BY transaction_date DESC
      LIMIT 50
    `, [req.params.id]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

export default router;