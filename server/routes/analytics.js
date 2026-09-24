// server/routes/analytics.js – Portfolio & expiry analytics (moved out of index.js).
// Mounted twice: /api/analytics → /portfolio, /api/alerts → /expiring
// (matches the original endpoint URLs the mobile app calls).
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { analyticsController } from '../controllers/analytics.controller.js';

const router = express.Router();

// Scoped to the authenticated user – no IDOR via :userId.
router.get('/portfolio', authenticate, analyticsController.portfolio);
router.get('/expiring', authenticate, analyticsController.expiringAlerts);

export default router;
