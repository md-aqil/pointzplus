// server/controllers/coupons.controller.js – HTTP layer for the coupon wallet.
import { couponsService } from '../services/coupons.service.js';
import { asyncHandler } from '../lib/errors.js';
import { parsePagination } from '../lib/pagination.js';

function parseUsed(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

export const couponsController = {
  list: asyncHandler(async (req, res) => {
    const pagination = parsePagination(req.query, { def: 20, max: 100 });
    res.json(
      await couponsService.list(req.userId, {
        used: parseUsed(req.query.used),
        category: req.query.category,
        active: req.query.active === 'true',
        limit: pagination.limit,
        cursor: pagination.cursor,
      })
    );
  }),

  expiring: asyncHandler(async (req, res) => {
    res.json(await couponsService.expiring(req.userId));
  }),

  summary: asyncHandler(async (req, res) => {
    res.json(await couponsService.summary(req.userId));
  }),

  setUsed: asyncHandler(async (req, res) => {
    const isUsed = req.body.isUsed !== false;
    res.json(await couponsService.setUsed(req.userId, req.params.id, isUsed));
  }),

  remove: asyncHandler(async (req, res) => {
    res.json(await couponsService.remove(req.userId, req.params.id));
  }),
};
