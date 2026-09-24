// server/services/programs.service.js – loyalty program catalog.
import { ApiError } from '../lib/errors.js';
import { ProgramsRepo } from '../repositories/programs.repo.js';

export const programsService = {
  list(category) {
    return ProgramsRepo.list(category);
  },

  async getById(id) {
    const program = await ProgramsRepo.findById(id);
    if (!program) throw ApiError.notFound('Program not found');
    return program;
  },

  byCategory(category) {
    return ProgramsRepo.findByCategory(category);
  },

  search(term) {
    return ProgramsRepo.search(term);
  },

  categories() {
    return ProgramsRepo.categoryCounts();
  },
};
