// server/routes/coupons.js – Coupon wallet routes (thin: validate → controller).
import express from 'express';
import { z } from 'zod';
import { validate } from '../lib/validate.js';
import { authenticate } from '../middleware/auth.js';
import { couponsController } from '../controllers/coupons.controller.js';

const router = express.Router();

const setUsedSchema = z.object({
  isUsed: z.boolean().optional(),
});

router.get('/', authenticate, couponsController.list);
router.get('/expiring', authenticate, couponsController.expiring);
router.get('/summary', authenticate, couponsController.summary);
router.put('/:id/use', authenticate, validate(setUsedSchema), couponsController.setUsed);
router.delete('/:id', authenticate, couponsController.remove);

export default router;
