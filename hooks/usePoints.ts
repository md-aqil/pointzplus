import { useCallback, useMemo } from "react";
import {
  usePointsStore,
  computeDashboardSummary,
  computeCategorySummaries,
  computeExpiringAccounts,
} from "../store/pointsStore";
import { useAuth } from "./useAuth";

export function usePoints() {
  const { user, isAuthenticated } = useAuth();
  const accounts = usePointsStore((state) => state.accounts);
  const transactions = usePointsStore((state) => state.transactions);
  const monthlyFlows = usePointsStore((state) => state.monthlyFlows);
  const emailAccounts = usePointsStore((state) => state.emailAccounts);
  const isSyncing = usePointsStore((state) => state.isSyncing);
  const syncProgress = usePointsStore((state) => state.syncProgress);
  const isBackfillRunning = usePointsStore((state) => state.isBackfillRunning);
  const activeJobDetails = usePointsStore((state) => state.activeJobDetails);
  const parsedStatements = usePointsStore((state) => state.parsedStatements);
  const fetchParsedStatements = usePointsStore((state) => state.fetchParsedStatements);
  const checkActiveSyncStatus = usePointsStore((state) => state.checkActiveSyncStatus);
  const addManualAccount = usePointsStore((state) => state.addManualAccount);
  const syncEmail = usePointsStore((state) => state.syncEmail);
  const deleteAccount = usePointsStore((state) => state.deleteAccount);
  const disconnectEmail = usePointsStore((state) => state.disconnectEmail);
  const cancelSyncJob = usePointsStore((state) => state.cancelSyncJob);
  const rawRefreshAll = usePointsStore((state) => state.refreshAll);

  const refreshAll = useCallback(
    async (force = false): Promise<boolean> => {
      if (!isAuthenticated) return false;
      await rawRefreshAll(force);
      return true;
    },
    [isAuthenticated, rawRefreshAll]
  );

  const notifications = usePointsStore((state) => state.notifications);
  const fetchNotificationsFromBackend = usePointsStore((state) => state.fetchNotificationsFromBackend);
  const acknowledgeNotification = usePointsStore((state) => state.acknowledgeNotification);
  const acknowledgeAllNotifications = usePointsStore((state) => state.acknowledgeAllNotifications);

  // Pure memoized derivations: calculated directly from input states without store closure ambiguity
  const summary = useMemo(
    () => computeDashboardSummary(accounts, transactions, monthlyFlows),
    [accounts, transactions, monthlyFlows]
  );
  const categorySummaries = useMemo(
    () => computeCategorySummaries(accounts),
    [accounts]
  );
  const expiringAccounts = useMemo(
    () => computeExpiringAccounts(accounts),
    [accounts]
  );

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
    acknowledgeAllNotifications,
    categories: categorySummaries,
    expiringAccounts,

    isSyncing,
    isBackfillRunning,
    activeJobDetails,
    parsedStatements,
    fetchParsedStatements,
    checkActiveSyncStatus,
    syncProgress,

    addManualAccount,
    syncEmail,
    deleteAccount,
    disconnectEmail,
    cancelSyncJob,
    refreshAll,
    refetch: refreshAll,

    profile: user,
    isLoading: isSyncing,
  };
}