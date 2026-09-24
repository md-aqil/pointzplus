// server/services/accounts.service.js – linked-account business rules.
import { ApiError, asyncHandler } from '../lib/errors.js';
import { AccountsRepo } from '../repositories/accounts.repo.js';
import { ProgramsRepo } from '../repositories/programs.repo.js';
import { paginated } from '../lib/pagination.js';

export const accountsService = {
  list(userId) {
    return AccountsRepo.listByUser(userId);
  },

  async get(userId, id) {
    const account = await AccountsRepo.findById(userId, id);
    if (!account) throw ApiError.notFound('Account not found');
    return account;
  },

  async create(userId, input) {
    const program = await ProgramsRepo.findById(input.programId);
    if (!program) throw ApiError.badRequest('Invalid program ID');

    const duplicate = await AccountsRepo.findByProgramAndMask(
      userId,
      input.programId,
      input.accountNumberMasked
    );
    if (duplicate) throw ApiError.conflict('Account already linked');

    const account = await AccountsRepo.create(userId, {
      programId: input.programId,
      accountNumberMasked: input.accountNumberMasked,
      currentBalance: input.currentBalance,
      expiringPoints: input.expiringPoints,
      expiryDate: input.expiryDate,
      syncMethod: input.syncMethod || 'manual',
    });

    await AccountsRepo.insertTransaction(account.id, {
      type: 'credit',
      points: input.currentBalance,
      description: 'Initial balance',
      source: 'manual_entry',
    });

    return account;
  },

  async update(userId, id, fields) {
    const account = await AccountsRepo.update(userId, id, fields);
    if (!account) throw ApiError.notFound('Account not found');
    return account;
  },

  async remove(userId, id) {
    const removed = await AccountsRepo.remove(userId, id);
    if (!removed) throw ApiError.notFound('Account not found');
    return { message: 'Account deleted successfully' };
  },

  async transactions(userId, accountId, pagination) {
    // Ensure ownership before paginating (404 hides cross-user existence).
    await this.get(userId, accountId);
    const rows = await AccountsRepo.listTransactions(
      userId,
      accountId,
      pagination
    );
    return paginated(rows, pagination.limit, (row) => ({
      transactionDate: row.transaction_date,
      id: row.id,
    }));
  },
};

export { asyncHandler };
