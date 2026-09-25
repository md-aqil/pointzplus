// server/controllers/notifications.controller.js – HTTP layer for alerts/settings.
import crypto from 'crypto';
import { notificationsService } from '../services/notifications.service.js';
import { asyncHandler, ApiError } from '../lib/errors.js';
import { parsePagination } from '../lib/pagination.js';

/** Cron/service-to-service guard for check-expiry. Rejects when CRON_SECRET unset. */
export function isCronAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const provided = String(req.headers['x-cron-secret'] || '');
  if (provided.length !== secret.length) return false;
  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(secret));
}

export const notificationsController = {
  getSettings: asyncHandler(async (req, res) => {
    res.json(await notificationsService.getSettings(req.userId));
  }),

  updateSettings: asyncHandler(async (req, res) => {
    res.json(await notificationsService.updateSettings(req.userId, req.body));
  }),

  registerToken: asyncHandler(async (req, res) => {
    await notificationsService.registerToken(req.userId, req.body.pushToken);
    res.json({ success: true });
  }),

  expiringAlerts: asyncHandler(async (req, res) => {
    const days = Number.parseInt(String(req.query.days || ''), 10);
    res.json(await notificationsService.expiringAlerts(
      req.userId,
      Number.isFinite(days) ? Math.min(Math.max(days, 1), 365) : 90
    ));
  }),

  history: asyncHandler(async (req, res) => {
    const pagination = parsePagination(req.query, { def: 20, max: 50 });
    res.json(await notificationsService.history(req.userId, pagination));
  }),

  acknowledge: asyncHandler(async (req, res) => {
    res.json(await notificationsService.acknowledge(req.userId, req.params.id));
  }),

  recordAlert: asyncHandler(async (req, res) => {
    res.json(await notificationsService.recordAlert(req.userId, req.body));
  }),

  checkExpiry: asyncHandler(async (req, res) => {
    if (!isCronAuthorized(req)) {
      throw ApiError.unauthorized(
        'Unauthorized. Set CRON_SECRET in server/.env and send it as "x-cron-secret" header.'
      );
    }
    res.json(await notificationsService.runExpiryCheck());
  }),
};
