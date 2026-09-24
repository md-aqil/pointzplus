// server/services/analytics.service.js – portfolio & expiry analytics.
import { AnalyticsRepo } from '../repositories/analytics.repo.js';

export const analyticsService = {
  async portfolio(userId) {
    const [summary, monthly, categories] = await Promise.all([
      AnalyticsRepo.portfolio(userId),
      AnalyticsRepo.monthlyFlows(userId),
      AnalyticsRepo.categoryBreakdown(userId),
    ]);

    return {
      summary: {
        total_accounts: summary.total_accounts,
        total_points: summary.total_points,
        portfolio_value_inr: summary.portfolio_value_inr,
        expiring_points: summary.expiring_points,
        last_sync: summary.last_sync,
        monthly_earned: monthly.monthly_earned,
        monthly_redeemed: monthly.monthly_redeemed,
      },
      categories,
    };
  },

  expiringAlerts(userId) {
    return AnalyticsRepo.expiringAccounts(userId, 90);
  },
};
