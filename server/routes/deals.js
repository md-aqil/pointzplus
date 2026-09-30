// server/routes/deals.js – Deals & Coupon feeds routes
import express from 'express';
import { dealsController } from '../controllers/deals.controller.js';

const router = express.Router();

router.get('/', dealsController.list);
router.get('/categories', dealsController.categories);

export default router;
