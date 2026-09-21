// hooks/usePoints.ts – Unified hook connecting Zustand pointsStore to components
import { usePointsStore } from "../store/pointsStore";
import { useAuthStore } from "../store/authStore";

export function usePoints() {
  const user = useAuthStore((state) => state.user);
  const accounts = usePointsStore((state) => state.accounts);
  const emailAccounts = usePointsStore((state) => state.emailAccounts);
  const isSyncing = usePointsStore((state) => state.isSyncing);
  const syncProgress = usePointsStore((state) => state.syncProgress);
  const getDashboardSummary = usePointsStore((state) => state.getDashboardSummary);
  const getCategorySummaries = usePointsStore((state) => state.getCategorySummaries);
  const getExpiringAccounts = usePointsStore((state) => state.getExpiringAccounts);
  const addManualAccount = usePointsStore((state) => state.addManualAccount);
  const syncEmail = usePointsStore((state) => state.syncEmail);
  const deleteAccount = usePointsStore((state) => state.deleteAccount);
  const refreshAll = usePointsStore((state) => state.refreshAll);

  const summary = getDashboardSummary();
  const categorySummaries = getCategorySummaries();
  const expiringAccounts = getExpiringAccounts();

  return {
    // Aggregates
    summary,
    totalPoints: summary.totalPoints,
    monthlyEarned: summary.monthlyEarned,
    expiringSoon: summary.expiringThisMonth,
    portfolioValueINR: summary.portfolioValueINR,
    linkedAccountsCount: summary.linkedAccountsCount,

    // Lists
    accounts,
    emailAccounts,
    categories: categorySummaries,
    expiringAccounts,

    // Sync State
    isSyncing,
    syncProgress,

    // Actions
    addManualAccount,
    syncEmail,
    deleteAccount,
    refreshAll,
    refetch: refreshAll,

    // User metadata
    profile: user,
    isLoading: isSyncing,
  };
}
