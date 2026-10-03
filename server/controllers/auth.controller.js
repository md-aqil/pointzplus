// server/controllers/auth.controller.js – HTTP layer for auth endpoints.
import { authService } from '../services/auth.service.js';
import { asyncHandler } from '../lib/errors.js';

export const authController = {
  register: asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  }),

  login: asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    res.json(result);
  }),

  verify: asyncHandler(async (req, res) => {
    // authenticate already resolved the token into req.userId.
    const user = await authService.getProfile(req.userId);
    res.json({ user });
  }),

  getProfile: asyncHandler(async (req, res) => {
    const user = await authService.getProfile(req.userId);
    res.json(user);
  }),

  updateProfile: asyncHandler(async (req, res) => {
    const user = await authService.updateProfile(req.userId, req.body);
    res.json(user);
  }),

  deleteAccount: asyncHandler(async (req, res) => {
    const result = await authService.deleteAccount(req.userId);
    res.json(result);
  }),

  logout: asyncHandler(async (req, res) => {
    res.json({ message: 'Logged out successfully' });
  }),

  logoutAll: asyncHandler(async (req, res) => {
    const result = await authService.logoutAll(req.userId);
    res.json(result);
  }),
};
