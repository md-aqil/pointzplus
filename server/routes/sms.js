// server/routes/sms.js – Android SMS detection (thin: validate → controller).
import express from 'express';
import { z } from 'zod';
import { validate } from '../lib/validate.js';
import { authenticate } from '../middleware/auth.js';
import { smsController } from '../controllers/sms.controller.js';

const router = express.Router();

const smsItem = z.object({
  body: z.string().max(2000),
  sender: z.string().max(200).optional(),
  timestamp: z.string().max(60).optional(),
});

const detectSchema = z.object({
  smsList: z.array(smsItem).min(1).max(200),
});

const autoAddSchema = z.object({
  programId: z.string().uuid(),
  points: z.coerce.number().int().min(1),
  accountNumber: z.string().trim().max(60).optional(),
  sourceSmsId: z.string().uuid().optional(),
});

const settingsSchema = z.object({
  smsDetectionEnabled: z.boolean().optional(),
  autoCreateAccounts: z.boolean().optional(),
  confidenceThreshold: z.coerce.number().min(0).max(1).optional(),
});

router.post('/detect', authenticate, validate(detectSchema), smsController.detect);
router.post('/auto-add', authenticate, validate(autoAddSchema), smsController.autoAdd);
router.get('/history', authenticate, smsController.history);
router.get('/settings', authenticate, smsController.getSettings);
router.put('/settings', authenticate, validate(settingsSchema), smsController.updateSettings);

export default router;
