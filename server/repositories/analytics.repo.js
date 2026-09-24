// server/repositories/analytics.repo.js – portfolio & expiry-alert analytics.
import { query } from '../db.js';

export const AnalyticsRepo = {
  /** Portfolio totals + current-month earned/redeemed for one user. */
  portfolio(userId) {
    return query(
      `SELECT
         COUNT(*) as total_accounts,
         COALESCE(SUM(la.current_balance), 0) as total_points,
         COALESCE(SUM(la.current_balance * lp.point_value_inr), 0) as portfolio_value_inr,
         COALESCE(SUM(la.expiring_points), 0) as expiring_points,
         MAX(la.last_synced_at) as last_sync
       FROM linked_accounts la
       JOIN loyalty_programs lp ON la.program_id = lp.id
       WHERE la.user_id = $1 AND la.is_active = true`,
      [userId]
    ).then((r) => r.rows[0]);
  },

  /** Credits/debits booked in the current calendar month. */
  monthlyFlows(userId) {
    return query(
      `SELECT
         COALESCE(SUM(pts.points) FILTER (
           WHERE pts.type = 'credit' AND pts.transaction_date >= date_trunc('month', NOW())
         ), 0) as monthly_earned,
         COALESCE(SUM(pts.points) FILTER (
           WHERE pts.type IN ('debit', 'redeemed', 'expired')
             AND pts.transaction_date >= date_trunc('month', NOW())
         ), 0) as monthly_redeemed
       FROM points_transactions pts
       JOIN linked_accounts la ON la.id = pts.account_id
       WHERE la.user_id = $1`,
      [userId]
    ).then((r) => r.rows[0] || { monthly_earned: 0, monthly_redeemed: 0 });
  },

  categoryBreakdown(userId) {
    return query(
      `SELECT
         lp.category,
         COUNT(DISTINCT la.id) as brand_count,
         COALESCE(SUM(la.current_balance), 0) as total_points,
         COALESCE(SUM(la.expiring_points), 0) as expiring_points
       FROM linked_accounts la
       JOIN loyalty_programs lp ON la.program_id = lp.id
       WHERE la.user_id = $1 AND la.is_active = true
       GROUP BY lp.category
       ORDER BY total_points DESC`,
      [userId]
    ).then((r) => r.rows);
  },

  expiringAccounts(userId, days = 90) {
    return query(
      `SELECT
         la.id, lp.name as program_name, lp.category,
         la.current_balance, la.expiring_points, la.expiry_date,
         lp.point_value_inr
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
};
