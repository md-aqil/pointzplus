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
  const disconnectEmail = usePointsStore((state) => state.disconnectEmail);
  const refreshAll = usePointsStore((state) => state.refreshAll);

  const notifications = usePointsStore((state) => state.notifications);
  const fetchNotificationsFromBackend = usePointsStore((state) => state.fetchNotificationsFromBackend);
  const acknowledgeNotification = usePointsStore((state) => state.acknowledgeNotification);
  const summary = getDashboardSummary();
  const categorySummaries = getCategorySummaries();
  const expiringAccounts = getExpiringAccounts();

  return {
    summary,
    totalPoints: summary.totalPoints,
    monthlyEarned: summary.monthlyEarned,
    expiringSoon: summary.expiringThisMonth,
    portfolioValueINR: summary.portfolioValueINR,
    linkedAccountsCount: summary.linkedAccountsCount,

    accounts,
    emailAccounts,
    notifications,
    fetchNotificationsFromBackend,
    acknowledgeNotification,
    categories: categorySummaries,
    expiringAccounts,

    isSyncing,
    syncProgress,

    addManualAccount,
    syncEmail,
    deleteAccount,
    disconnectEmail,
    refreshAll,
    refetch: refreshAll,

    profile: user,
    isLoading: isSyncing,
  };
}