// server/repositories/sms.repo.js – sms_detections & sms_settings data access.
import { query } from '../db.js';

export const SmsRepo = {
  findProgramBySlug(slug) {
    return query(
      'SELECT id, name, category, point_value_inr FROM loyalty_programs WHERE slug = $1',
      [slug]
    ).then((r) => r.rows[0] || null);
  },

  insertDetection({ userId, sender, body, programId, points, confidence }) {
    return query(
      `INSERT INTO sms_detections (
         user_id, phone_number, sms_body, matched_program_id,
         extracted_points, detector_confidence, detected_at, action_taken
       ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'detected')`,
      [userId, sender, body, programId, points, confidence]
    );
  },

  findAccount(userId, programId) {
    return query(
      `SELECT id FROM linked_accounts WHERE user_id = $1 AND program_id = $2`,
      [userId, programId]
    ).then((r) => r.rows[0] || null);
  },

  upsertBalanceFromSms(userId, programId, { points, maskedNumber }) {
    return query(
      `INSERT INTO linked_accounts (
         user_id, program_id, account_number_masked, current_balance,
         sync_method, sync_source, is_active
       ) VALUES ($1, $2, $3, $4, 'sms', 'sms_android', true)
       ON CONFLICT (user_id, program_id, account_number_masked)
       DO UPDATE SET current_balance = $4, last_synced_at = NOW(), sync_method = 'sms'`,
      [userId, programId, maskedNumber, points]
    );
  },

  markDetectionAutoAdded(id) {
    return query(
      `UPDATE sms_detections SET action_taken = 'auto_added' WHERE id = $1`,
      [id]
    );
  },

  history(userId) {
    return query(
      `SELECT sd.*, lp.name as program_name, lp.category
       FROM sms_detections sd
       LEFT JOIN loyalty_programs lp ON sd.matched_program_id = lp.id
       WHERE sd.user_id = $1
       ORDER BY sd.detected_at DESC
       LIMIT 50`,
      [userId]
    ).then((r) => r.rows);
  },

  getSettings(userId) {
    return query('SELECT * FROM sms_settings WHERE user_id = $1', [userId]).then(
      (r) => r.rows[0] || null
    );
  },

  insertDefaultSettings(userId) {
    return query(
      `INSERT INTO sms_settings (user_id, sms_detection_enabled, auto_create_accounts, confidence_threshold)
       VALUES ($1, true, true, 0.85)
       ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [userId]
    ).then((r) => r.rows[0]);
  },

  updateSettings(userId, fields) {
    return query(
      `UPDATE sms_settings
       SET sms_detection_enabled = COALESCE($1, sms_detection_enabled),
           auto_create_accounts = COALESCE($2, auto_create_accounts),
           confidence_threshold = COALESCE($3, confidence_threshold),
           updated_at = NOW()
       WHERE user_id = $4
       RETURNING *`,
      [
        fields.smsDetectionEnabled,
        fields.autoCreateAccounts,
        fields.confidenceThreshold,
        userId,
      ]
    ).then((r) => r.rows[0] || null);
  },
};
