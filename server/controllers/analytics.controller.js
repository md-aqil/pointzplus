// server/controllers/analytics.controller.js – HTTP layer for portfolio analytics.
import { analyticsService } from '../services/analytics.service.js';
import { asyncHandler } from '../lib/errors.js';

export const analyticsController = {
  portfolio: asyncHandler(async (req, res) => {
    res.json(await analyticsService.portfolio(req.userId));
  }),

  expiringAlerts: asyncHandler(async (req, res) => {
    res.json(await analyticsService.expiringAlerts(req.userId));
  }),
};
