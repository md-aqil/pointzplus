// server/controllers/deals.controller.js – Deals & Coupon endpoints
import { DealsService } from '../services/deals.service.js';
import { asyncHandler } from '../lib/errors.js';

export const dealsController = {
  list: asyncHandler(async (req, res) => {
    const { category, q, type, featured } = req.query;
    const deals = await DealsService.getDeals({
      category,
      query: q,
      type,
      featured,
    });
    res.json({
      total: deals.length,
      deals,
    });
  }),

  categories: asyncHandler(async (req, res) => {
    res.json(DealsService.getCategories());
  }),
};
