// server/services/notifications.service.js – settings, push tokens, expiry alerts.
import { ApiError } from '../lib/errors.js';
import { NotificationsRepo } from '../repositories/notifications.repo.js';
import { paginated } from '../lib/pagination.js';

const DEFAULT_WARNING_DAYS = [15, 30, 45, 90];

/** Normalize an INT[] from node-postgres (JS array, or '{15,30}' text). */
function normalizeWarningDays(value) {
  const raw = Array.isArray(value)
    ? value
    : String(value ?? '').replace(/[{}]/g, '').split(',');
  const days = raw
    .map((d) => Number.parseInt(String(d), 10))
    .filter((d) => Number.isFinite(d) && d > 0);
  return days.length ? [...new Set(days)].sort((a, b) => a - b) : [...DEFAULT_WARNING_DAYS];
}

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

  expiringAlerts(userId, days = 90) {
    return NotificationsRepo.expiringAlerts(userId, days);
  },

  async history(userId, pagination) {
    const rows = await NotificationsRepo.history(userId, pagination);
    return paginated(rows, pagination.limit, (row) => ({
      triggeredAt: row.triggered_at,
      id: row.id,
    }), (row) => row);
  },

  acknowledge(userId, id) {
    return NotificationsRepo.acknowledge(userId, id).then((row) => {
      if (!row) throw ApiError.notFound('Alert not found');
      return { success: true };
    });
  },

  acknowledgeAll(userId) {
    return NotificationsRepo.acknowledgeAll(userId).then((acknowledged) => ({
      success: true,
      acknowledged,
    }));
  },

  /**
   * Persist a locally-fired alert so /notifications/history is complete even
   * when the server cron has not run yet. Ownership is enforced and repeats of
   * the same account+tier within a day are ignored.
   */
  async recordAlert(userId, { accountId, alertType, pointsAtRisk }) {
    const account = await NotificationsRepo.accountForUser(userId, accountId);
    if (!account) throw ApiError.notFound('Linked account not found');

    const alreadyRecorded = await NotificationsRepo.findRecentAlert(accountId, alertType, 1);
    if (alreadyRecorded) return { success: true, duplicate: true };

    const row = await NotificationsRepo.insertAlert({
      userId,
      accountId,
      alertType,
      pointsAtRisk,
    });
    return { success: true, id: row?.id ?? null };
  },

  /**
   * Create pending expiry alerts (called by cron with CRON_SECRET).
   * Bucketed thresholds: the smallest of the user's configured warning days that
   * is >= daysUntil, so alerts fire on any day rather than only exact-match days.
   * Each tier fires at most once per window per account.
   */
  async runExpiryCheck() {
    const accounts = await NotificationsRepo.accountsNeedingAlerts();
    let alertsCreated = 0;

    for (const row of accounts) {
      const daysUntil = Math.ceil(
        (new Date(row.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      const tier = normalizeWarningDays(row.expiry_warning_days).find((t) => daysUntil <= t);
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
