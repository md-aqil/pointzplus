// server/routes/notifications.js – Push notifications & alerts (thin: validate → controller).
import express from 'express';
import { z } from 'zod';
import { validate } from '../lib/validate.js';
import { authenticate } from '../middleware/auth.js';
import { notificationsController } from '../controllers/notifications.controller.js';

const router = express.Router();

const settingsSchema = z.object({
  expiryAlertsEnabled: z.boolean().optional(),
  expiryWarningDays: z.array(z.coerce.number().int().min(1).max(365)).max(8).optional(),
  earningAlertsEnabled: z.boolean().optional(),
  offerAlertsEnabled: z.boolean().optional(),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
});

const uuid = z.string().uuid('Must be a valid id');

const tokenSchema = z.object({
  pushToken: z.string().trim().min(10).max(500),
});

const clientAlertSchema = z.object({
  accountId: uuid,
  alertType: z.string().trim().min(1).max(32),
  pointsAtRisk: z.coerce.number().int().min(0).max(10_000_000),
});

router.get('/settings', authenticate, notificationsController.getSettings);
router.put('/settings', authenticate, validate(settingsSchema), notificationsController.updateSettings);
router.post('/token', authenticate, validate(tokenSchema), notificationsController.registerToken);
router.post('/alert', authenticate, validate(clientAlertSchema), notificationsController.recordAlert);
router.get('/expiry', authenticate, notificationsController.expiringAlerts);
router.get('/history', authenticate, notificationsController.history);
router.put('/acknowledge-all', authenticate, notificationsController.acknowledgeAll);
router.put('/acknowledge/:id', authenticate, notificationsController.acknowledge);
router.post('/check-expiry', notificationsController.checkExpiry);

export default router;
