import { usePointsStore } from "../store/pointsStore";
import { useAuthStore } from "../store/authStore";
export function usePoints() {
  const user = useAuthStore((state) => state.user);
  const accounts = usePointsStore((state) => state.accounts);
  const emailAccounts = usePointsStore((state) => state.emailAccounts);
  const coupons = usePointsStore((state) => state.coupons);
  const isSyncing = usePointsStore((state) => state.isSyncing);
  const syncProgress = usePointsStore((state) => state.syncProgress);
  const getDashboardSummary = usePointsStore((state) => state.getDashboardSummary);
  const getCategorySummaries = usePointsStore((state) => state.getCategorySummaries);
  const getExpiringAccounts = usePointsStore((state) => state.getExpiringAccounts);
  const getActiveCoupons = usePointsStore((state) => state.getActiveCoupons);
  const getExpiringCoupons = usePointsStore((state) => state.getExpiringCoupons);
  const addManualAccount = usePointsStore((state) => state.addManualAccount);
  const syncEmail = usePointsStore((state) => state.syncEmail);
  const deleteAccount = usePointsStore((state) => state.deleteAccount);
  const markCouponUsed = usePointsStore((state) => state.markCouponUsed);
  const refreshAll = usePointsStore((state) => state.refreshAll);

  const notifications = usePointsStore((state) => state.notifications);
  const fetchNotificationsFromBackend = usePointsStore((state) => state.fetchNotificationsFromBackend);
  const acknowledgeNotification = usePointsStore((state) => state.acknowledgeNotification);
  const summary = getDashboardSummary();
  const categorySummaries = getCategorySummaries();
  const expiringAccounts = getExpiringAccounts();
  const activeCoupons = getActiveCoupons();
  const expiringCoupons = getExpiringCoupons();

  return {
    summary,
    totalPoints: summary.totalPoints,
    monthlyEarned: summary.monthlyEarned,
    expiringSoon: summary.expiringThisMonth,
    portfolioValueINR: summary.portfolioValueINR,
    linkedAccountsCount: summary.linkedAccountsCount,
    activeCouponsCount: summary.activeCouponsCount,

    accounts,
    emailAccounts,
    coupons,
    activeCoupons,
    expiringCoupons,
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
    markCouponUsed,
    refreshAll,
    refetch: refreshAll,

    profile: user,
    isLoading: isSyncing,
  };
}