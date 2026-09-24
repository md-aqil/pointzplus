// server/controllers/accounts.controller.js – HTTP layer for linked accounts.
import { accountsService } from '../services/accounts.service.js';
import { asyncHandler } from '../lib/errors.js';
import { parsePagination } from '../lib/pagination.js';

export const accountsController = {
  list: asyncHandler(async (req, res) => {
    res.json(await accountsService.list(req.userId));
  }),

  getOne: asyncHandler(async (req, res) => {
    res.json(await accountsService.get(req.userId, req.params.id));
  }),

  create: asyncHandler(async (req, res) => {
    res.status(201).json(await accountsService.create(req.userId, req.body));
  }),

  update: asyncHandler(async (req, res) => {
    res.json(
      await accountsService.update(req.userId, req.params.id, req.body)
    );
  }),

  remove: asyncHandler(async (req, res) => {
    res.json(await accountsService.remove(req.userId, req.params.id));
  }),

  transactions: asyncHandler(async (req, res) => {
    const pagination = parsePagination(req.query, { def: 20, max: 50 });
    res.json(
      await accountsService.transactions(
        req.userId,
        req.params.id,
        pagination
      )
    );
  }),
};
