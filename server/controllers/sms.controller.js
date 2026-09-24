// server/controllers/sms.controller.js – HTTP layer for SMS detection.
import { smsService } from '../services/sms.service.js';
import { asyncHandler, ApiError } from '../lib/errors.js';

export const smsController = {
  detect: asyncHandler(async (req, res) => {
    const { smsList } = req.body;
    if (!Array.isArray(smsList)) {
      throw ApiError.badRequest('smsList array required');
    }
    res.json(await smsService.detect(req.userId, smsList));
  }),

  autoAdd: asyncHandler(async (req, res) => {
    res.json(await smsService.autoAdd(req.userId, req.body));
  }),

  history: asyncHandler(async (req, res) => {
    res.json(await smsService.history(req.userId));
  }),

  getSettings: asyncHandler(async (req, res) => {
    res.json(await smsService.getSettings(req.userId));
  }),

  updateSettings: asyncHandler(async (req, res) => {
    res.json(await smsService.updateSettings(req.userId, req.body));
  }),
};
