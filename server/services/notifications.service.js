// server/services/notifications.service.js – settings, push tokens, expiry alerts.
import { ApiError } from '../lib/errors.js';
import { NotificationsRepo } from '../repositories/notifications.repo.js';
import { paginated } from '../lib/pagination.js';

const ALERT_THRESHOLDS = [15, 30, 45, 90];

export const notificationsService = {
  async getSettings(userId) {
    const existing = await NotificationsRepo.getSettings(userId);
    if (existing) return existing;
    return NotificationsRepo.insertDefaultSettings(userId);
  },

  async updateSettings(userId, fields) {
    await this.getSettings(userId); // ensure row exists
    const updated = await NotificationsRepo.updateSettings(userId, fields);
    if (!updated) throw ApiError.notFound('Settings not found');
    return updated;
  },

  registerToken(userId, pushToken) {
    return NotificationsRepo.upsertPushToken(userId, pushToken);
  },

  expiringAlerts(userId) {
    return NotificationsRepo.expiringAlerts(userId);
  },

  async history(userId, pagination) {
    const rows = await NotificationsRepo.history(userId, pagination);
    return paginated(rows, pagination.limit, (row) => ({
      triggeredAt: row.triggered_at,
      id: row.id,
    }));
  },

  acknowledge(userId, id) {
    return NotificationsRepo.acknowledge(userId, id).then((row) => {
      if (!row) throw ApiError.notFound('Alert not found');
      return { success: true };
    });
  },

  /**
   * Create pending expiry alerts (called by cron with CRON_SECRET).
   * Bucketed thresholds: smallest of 15/30/45/90 that is >= daysUntil, so
   * alerts fire on any day rather than only exact-match days. Each tier fires
   * at most once per window per account.
   */
  async runExpiryCheck() {
    const accounts = await NotificationsRepo.accountsNeedingAlerts();
    let alertsCreated = 0;

    for (const row of accounts) {
      const daysUntil = Math.ceil(
        (new Date(row.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      const tier = ALERT_THRESHOLDS.find((t) => daysUntil <= t);
      if (!tier) continue;

      const alertType = `${tier}days`;
      const alreadyFired = await NotificationsRepo.findRecentAlert(
        row.account_id,
        alertType,
        tier
      );
      if (alreadyFired) continue;

      await NotificationsRepo.insertAlert({
        userId: row.user_id,
        accountId: row.account_id,
        alertType,
        pointsAtRisk: row.expiring_points,
      });
      alertsCreated += 1;
    }

    return { alertsCreated };
  },
};
