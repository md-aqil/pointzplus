// server/routes/auth.js – Authentication routes (thin: validate → controller).
import express from 'express';
import { z } from 'zod';
import { validate } from '../lib/validate.js';
import { rateLimit } from '../lib/rateLimit.js';
import { authenticate } from '../middleware/auth.js';
import { authController } from '../controllers/auth.controller.js';

const router = express.Router();

// Strict limiter on credential endpoints (login/register) per brief.
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyPrefix: 'auth_creds',
  message: 'Too many authentication attempts. Please try again later.',
});

const registerSchema = z.object({
  email: z.string().trim().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().trim().max(120).optional(),
  phoneNumber: z.string().trim().max(30).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
});

const profileSchema = z.object({
  fullName: z.string().trim().min(1).max(120).optional(),
  phoneNumber: z.string().trim().max(30).optional(),
  avatarUrl: z.string().trim().url().max(500).optional(),
});

router.post('/register', credentialLimiter, validate(registerSchema), authController.register);
router.post('/login', credentialLimiter, validate(loginSchema), authController.login);
router.get('/verify', authenticate, authController.verify);
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, validate(profileSchema), authController.updateProfile);
router.post('/logout', authController.logout);
router.delete('/account', authenticate, authController.deleteAccount);

export default router;
