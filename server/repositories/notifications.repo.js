// server/repositories/notifications.repo.js – push settings, tokens, expiry alerts.
import { query } from '../db.js';

export const NotificationsRepo = {
  getSettings(userId) {
    return query(
      'SELECT * FROM push_notification_settings WHERE user_id = $1',
      [userId]
    ).then((r) => r.rows[0] || null);
  },

  insertDefaultSettings(userId) {
    return query(
      `INSERT INTO push_notification_settings (
         user_id, expiry_alerts_enabled, expiry_warning_days,
         earning_alerts_enabled, offer_alerts_enabled
       ) VALUES ($1, true, '{15,30,45,90}', true, true)
       ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [userId]
    ).then((r) => r.rows[0]);
  },

  updateSettings(userId, fields) {
    return query(
      `UPDATE push_notification_settings
       SET expiry_alerts_enabled = COALESCE($1, expiry_alerts_enabled),
           expiry_warning_days = COALESCE($2, expiry_warning_days),
           earning_alerts_enabled = COALESCE($3, earning_alerts_enabled),
           offer_alerts_enabled = COALESCE($4, offer_alerts_enabled),
           quiet_hours_start = COALESCE($5, quiet_hours_start),
           quiet_hours_end = COALESCE($6, quiet_hours_end),
           updated_at = NOW()
       WHERE user_id = $7
       RETURNING *`,
      [
        fields.expiryAlertsEnabled,
        fields.expiryWarningDays,
        fields.earningAlertsEnabled,
        fields.offerAlertsEnabled,
        fields.quietHoursStart,
        fields.quietHoursEnd,
        userId,
      ]
    ).then((r) => r.rows[0] || null);
  },

  upsertPushToken(userId, pushToken) {
    return query(
      `INSERT INTO push_notification_settings (user_id, push_token, last_token_refresh_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET push_token = $2, last_token_refresh_at = NOW(), updated_at = NOW()`,
      [userId, pushToken]
    );
  },

  expiringAlerts(userId, days = 90) {
    return query(
      `SELECT
         la.id, la.current_balance, la.expiring_points, la.expiry_date,
         lp.name as program_name, lp.category
       FROM linked_accounts la
       JOIN loyalty_programs lp ON la.program_id = lp.id
       WHERE la.user_id = $1
         AND la.is_active = true
         AND la.expiring_points > 0
         AND la.expiry_date IS NOT NULL
         AND la.expiry_date <= NOW() + INTERVAL '1 day' * $2
       ORDER BY la.expiry_date ASC`,
      [userId, days]
    ).then((r) => r.rows);
  },

  /** Keyset-paginated alert history (triggered_at DESC, id DESC). */
  history(userId, { limit, cursor }) {
    const params = [userId];
    let where = 'ea.user_id = $1';
    if (cursor?.triggeredAt && cursor?.id) {
      params.push(cursor.triggeredAt, cursor.id);
      where += ` AND (ea.triggered_at, ea.id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`;
    }
    params.push(limit + 1);
    return query(
      `SELECT ea.*, lp.name as program_name
       FROM expiry_alerts ea
       JOIN linked_accounts la ON ea.linked_account_id = la.id
       JOIN loyalty_programs lp ON la.program_id = lp.id
       WHERE ${where}
       ORDER BY ea.triggered_at DESC, ea.id DESC
       LIMIT $${params.length}`,
      params
    ).then((r) => r.rows);
  },

  acknowledge(userId, id) {
    return query(
      `UPDATE expiry_alerts
       SET acknowledged_by_user = true, acknowledged_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, userId]
    ).then((r) => r.rows[0] || null);
  },

  /** All user accounts with points expiring inside the alert window (cron). */
  accountsNeedingAlerts() {
    return query(`
      SELECT
        la.user_id, la.id as account_id, la.expiring_points, la.expiry_date,
        lp.name as program_name
      FROM linked_accounts la
      JOIN loyalty_programs lp ON la.program_id = lp.id
      WHERE la.is_active = true
        AND la.expiring_points > 0
        AND la.expiry_date IS NOT NULL
        AND la.expiry_date BETWEEN NOW() AND NOW() + INTERVAL '90 days'
    `).then((r) => r.rows);
  },

  findRecentAlert(accountId, alertType, windowDays) {
    return query(
      `SELECT id FROM expiry_alerts
       WHERE linked_account_id = $1
         AND alert_type = $2
         AND triggered_at > NOW() - INTERVAL '1 day' * $3`,
      [accountId, alertType, windowDays]
    ).then((r) => r.rows.length > 0);
  },

  insertAlert({ userId, accountId, alertType, pointsAtRisk }) {
    return query(
      `INSERT INTO expiry_alerts (
         user_id, linked_account_id, alert_type, points_at_risk, sent_push_notification
       ) VALUES ($1, $2, $3, $4, false)`,
      [userId, accountId, alertType, pointsAtRisk]
    );
  },
};
