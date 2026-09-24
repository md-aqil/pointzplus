// server/routes/accounts.js – Linked accounts routes (thin: validate → controller).
import express from 'express';
import { z } from 'zod';
import { validate } from '../lib/validate.js';
import { authenticate } from '../middleware/auth.js';
import { accountsController } from '../controllers/accounts.controller.js';

const router = express.Router();

const uuid = z.string().uuid('Must be a valid id');

const createSchema = z.object({
  programId: uuid,
  accountNumberMasked: z.string().trim().min(1).max(60),
  currentBalance: z.coerce.number().int().min(0),
  expiringPoints: z.coerce.number().int().min(0).optional(),
  expiryDate: z.string().trim().max(60).optional(),
  syncMethod: z.enum(['manual', 'email_parser', 'sms', 'api']).optional(),
});

const updateSchema = z.object({
  currentBalance: z.coerce.number().int().min(0).optional(),
  expiringPoints: z.coerce.number().int().min(0).optional(),
  expiryDate: z.string().trim().max(60).optional(),
  isActive: z.boolean().optional(),
});

router.get('/', authenticate, accountsController.list);
router.get('/:id/transactions', authenticate, accountsController.transactions);
router.get('/:id', authenticate, accountsController.getOne);
router.post('/', authenticate, validate(createSchema), accountsController.create);
router.put('/:id', authenticate, validate(updateSchema), accountsController.update);
router.delete('/:id', authenticate, accountsController.remove);

export default router;
