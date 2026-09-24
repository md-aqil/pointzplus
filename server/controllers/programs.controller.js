// server/controllers/programs.controller.js – HTTP layer for the program catalog.
import { programsService } from '../services/programs.service.js';
import { asyncHandler } from '../lib/errors.js';

export const programsController = {
  list: asyncHandler(async (req, res) => {
    res.json(await programsService.list(req.query.category));
  }),

  getOne: asyncHandler(async (req, res) => {
    res.json(await programsService.getById(req.params.id));
  }),

  byCategory: asyncHandler(async (req, res) => {
    res.json(await programsService.byCategory(req.params.category));
  }),

  search: asyncHandler(async (req, res) => {
    res.json(await programsService.search(req.params.term));
  }),

  categories: asyncHandler(async (req, res) => {
    res.json(await programsService.categories());
  }),
};
