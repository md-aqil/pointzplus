// server/repositories/accounts.repo.js – linked_accounts + transactions access.
import { query } from '../db.js';

const LIST_SQL = `
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
    lp.point_value_inr,
    (
      SELECT es.subject
      FROM email_statements es
      WHERE es.matched_program_id = la.program_id AND es.user_id = la.user_id
      ORDER BY es.received_at DESC LIMIT 1
    ) as source_subject,
    (
      SELECT es.from_email
      FROM email_statements es
      WHERE es.matched_program_id = la.program_id AND es.user_id = la.user_id
      ORDER BY es.received_at DESC LIMIT 1
    ) as source_sender,
    (
      SELECT es.extraction_source
      FROM email_statements es
      WHERE es.matched_program_id = la.program_id AND es.user_id = la.user_id
      ORDER BY es.received_at DESC LIMIT 1
    ) as extraction_source
  FROM linked_accounts la
  JOIN loyalty_programs lp ON la.program_id = lp.id
  WHERE la.user_id = $1
  ORDER BY la.current_balance DESC`;

export const AccountsRepo = {
  listByUser(userId) {
    return query(LIST_SQL, [userId]).then((r) => r.rows);
  },

  findById(userId, id) {
    return query(
      `SELECT la.*, lp.name as program_name, lp.slug as program_slug,
              lp.category, lp.logo_initial, lp.accent_color
       FROM linked_accounts la
       JOIN loyalty_programs lp ON la.program_id = lp.id
       WHERE la.id = $1 AND la.user_id = $2`,
      [id, userId]
    ).then((r) => r.rows[0] || null);
  },

  findByProgramAndMask(userId, programId, masked) {
    return query(
      `SELECT id FROM linked_accounts
       WHERE user_id = $1 AND program_id = $2 AND account_number_masked = $3`,
      [userId, programId, masked]
    ).then((r) => r.rows[0] || null);
  },

  create(userId, fields) {
    return query(
      `INSERT INTO linked_accounts (
         user_id, program_id, account_number_masked,
         current_balance, expiring_points, expiry_date,
         sync_method, sync_source, is_active
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
       RETURNING *`,
      [
        userId,
        fields.programId,
        fields.accountNumberMasked,
        fields.currentBalance,
        fields.expiringPoints || 0,
        fields.expiryDate || null,
        fields.syncMethod,
        fields.syncMethod === 'manual' ? 'manual' : null,
      ]
    ).then((r) => r.rows[0]);
  },

  insertTransaction(accountId, { type, points, description, source }) {
    return query(
      `INSERT INTO points_transactions (account_id, type, points, description, source, transaction_date)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [accountId, type, points, description, source]
    );
  },

  update(userId, id, { currentBalance, expiringPoints, expiryDate, isActive }) {
    return query(
      `UPDATE linked_accounts
       SET current_balance = COALESCE($1, current_balance),
           expiring_points = COALESCE($2, expiring_points),
           expiry_date = COALESCE($3, expiry_date),
           is_active = COALESCE($4, is_active),
           updated_at = NOW()
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [currentBalance, expiringPoints, expiryDate, isActive, id, userId]
    ).then((r) => r.rows[0] || null);
  },

  remove(userId, id) {
    return query(
      'DELETE FROM linked_accounts WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    ).then((r) => r.rows[0] || null);
  },

  /**
   * Keyset-paginated transaction history for an account the user owns.
   * Ownership is enforced by joining linked_accounts on user_id (fixes IDOR).
   * Cursor: { transactionDate, id } – ordered transaction_date DESC, id DESC.
   */
  listTransactions(userId, accountId, { limit, cursor }) {
    const params = [userId, accountId];
    let where = 'la.user_id = $1 AND pt.account_id = la.id AND la.id = $2';
    if (cursor?.transactionDate && cursor?.id) {
      params.push(cursor.transactionDate, cursor.id);
      where += ` AND (pt.transaction_date, pt.id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`;
    }
    params.push(limit + 1);
    return query(
      `SELECT pt.* FROM points_transactions pt
       JOIN linked_accounts la ON la.id = pt.account_id
       WHERE ${where}
       ORDER BY pt.transaction_date DESC, pt.id DESC
       LIMIT $${params.length}`,
      params
    ).then((r) => r.rows);
  },
};
