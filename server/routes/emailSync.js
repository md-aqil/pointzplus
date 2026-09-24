// server/routes/emailSync.js – Gmail sync routes (thin: validate → controller).
import express from 'express';
import { z } from 'zod';
import { validate } from '../lib/validate.js';
import { authenticate } from '../middleware/auth.js';
import { emailSyncController } from '../controllers/emailSync.controller.js';

const router = express.Router();

const scanSchema = z.object({
  provider: z.enum(['gmail']).optional(),
  wait: z.boolean().optional(),
});

router.get('/google/url', authenticate, emailSyncController.getAuthUrl);
router.get('/google/callback', emailSyncController.oauthCallback);
router.post('/scan', authenticate, validate(scanSchema), emailSyncController.scan);
router.get('/jobs/:id', authenticate, emailSyncController.getJob);
router.get('/accounts', authenticate, emailSyncController.listAccounts);
router.delete('/accounts/:provider', authenticate, emailSyncController.disconnect);
router.post('/google/watch', authenticate, emailSyncController.enableWatch);
// Google Cloud Pub/Sub push – no user JWT; payload is base64 JSON.
router.post('/google/webhook', emailSyncController.pubsubWebhook);

export default router;
