// server/routes/programs.js – Loyalty programs catalog (thin: controller only).
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { programsController } from '../controllers/programs.controller.js';

const router = express.Router();

router.get('/', authenticate, programsController.list);
router.get('/meta/categories', authenticate, programsController.categories);
router.get('/category/:category', authenticate, programsController.byCategory);
router.get('/search/:term', authenticate, programsController.search);
router.get('/:id', authenticate, programsController.getOne);

export default router;
