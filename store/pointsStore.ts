// store/pointsStore.ts – Central Zustand store for PointzPlus (Real Data Only)
import { create } from "zustand";
import {
  LinkedAccount,
  EmailSyncAccount,
  PointsTransaction,
  DashboardSummary,
  CategorySummary,
  LoyaltyCategory,
} from "../types/loyalty";
import { NotificationItem, SyncJob, SyncJobStatus, BackendLinkedAccount } from "../types/models";
import { POPULAR_PROGRAMS, CATEGORY_LABELS } from "../constants/popularPrograms";
import { apiClient } from "../lib/apiClient";
import { notifyPointsEarned } from "../services/pushNotifications";

// ─── Gmail sync job polling ────────────────────────────────────
const SYNC_JOB_POLL_INTERVAL_MS = 2_000;
const SYNC_JOB_TIMEOUT_MS = 10 * 60 * 1_000;

type SyncProgress = { step: string; percent: number };

// During `parsing` the server reports how many messages it has handled, so the
// bar tracks real work across the 80–92% band instead of animating blindly.
const SYNC_JOB_PROGRESS: Partial<Record<SyncJobStatus, (job: SyncJob) => SyncProgress>> = {
  queued: () => ({ step: "Scan queued – waiting for the sync worker...", percent: 30 }),
  fetching: () => ({ step: "Searching your inbox for statements & promo tokens...", percent: 55 }),
  parsing: (job) => {
    const total = Number(job.total_messages_found) || 0;
    const done = Number(job.messages_processed) || 0;
    const ratio = total > 0 ? Math.min(1, done / total) : 0;
    return {
      step:
        total > 0
          ? `Extracting points (${done}/${total})…`
          : "Extracting points from matched emails...",
      percent: 80 + Math.round(ratio * 12),
    };
  },
  completed: () => ({ step: "Finalizing your portfolio...", percent: 92 }),
};

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Map a `linked_accounts` API row onto the client model, joined to the catalogue. */
function mapBackendAccount(a: BackendLinkedAccount): LinkedAccount {
  const catalogProgram =
    POPULAR_PROGRAMS.find((p) => p.id === (a.program_slug ?? a.program_id)) || {
      id: a.program_id,
      name: a.program_name || "Loyalty Program",
      category: (a.category || "shopping") as LoyaltyCategory,
      logoInitial: a.logo_initial || "⭐",
      accentColor: a.accent_color || "#01A2FB",
      defaultExpiryMonths: 12,
      pointValueINR: Number(a.point_value_inr) || 0.25,
    };

  return {
    id: a.id,
    programId: a.program_id,
    program: catalogProgram,
    accountNumberMasked: a.account_number_masked || "",
    currentBalance: a.current_balance,
    expiringPoints: a.expiring_points || 0,
    expiryDate: a.expiry_date,
    lastSyncedAt: a.last_synced_at || new Date().toISOString(),
    syncMethod: (a.sync_method || "manual") as LinkedAccount["syncMethod"],
    isActive: a.is_active ?? true,
  };
}

/**
 * Poll a queued Gmail scan until it reaches a terminal state.
 * The scan runs in a background job, so this is how the UI learns it finished.
 */
async function pollSyncJob(
  jobId: string,
  onStatus: (job: SyncJob) => void
): Promise<SyncJob> {
  const deadline = Date.now() + SYNC_JOB_TIMEOUT_MS;

  while (Date.now() < deadline) {
    let job;
    try {
      job = await apiClient.getSyncJob(jobId);
    } catch {
      // A transient network blip must not abandon a scan that is still running.
      await delay(SYNC_JOB_POLL_INTERVAL_MS);
      continue;
    }

    if (job.status === "failed") {
      throw new Error(job.error_details || "Gmail sync failed. Please try again.");
    }
    if (job.status === "completed") {
      return job;
    }

    onStatus(job);
    await delay(SYNC_JOB_POLL_INTERVAL_MS);
  }

  throw new Error("Gmail sync is taking longer than expected. Please try again shortly.");
}

interface PointsState {
  // Data (Defaults to empty – no dummy data)
  accounts: LinkedAccount[];
  emailAccounts: EmailSyncAccount[];
  transactions: PointsTransaction[];
  notifications: NotificationItem[];
  isSyncing: boolean;
  syncProgress: { step: string; percent: number };
  /**
   * Current-month credit/debit totals as aggregated by the server.
   * Null until the first successful load, so the UI can tell "0 this month"
   * apart from "not loaded yet" and never has to invent a number.
   */
  monthlyFlows: { earned: number; redeemed: number } | null;

  // Computed Selectors
  getDashboardSummary: () => DashboardSummary;
  getCategorySummaries: () => CategorySummary[];
  getExpiringAccounts: () => LinkedAccount[];

  // Actions
  addManualAccount: (params: {
    programId: string;
    customName?: string;
    category?: LoyaltyCategory;
    accountNumber: string;
    currentBalance: number;
    expiringPoints?: number;
    expiryDate?: string;
  }) => Promise<LinkedAccount>;

  deleteAccount: (id: string) => Promise<void>;
  updateAccount: (id: string, updates: Partial<LinkedAccount>) => Promise<void>;

  syncEmail: (
    provider: "gmail",
    email: string,
    onProgressUpdate?: (step: string, percent: number) => void
  ) => Promise<LinkedAccount[]>;

  /** Removes the mailbox whose email_sync_accounts id is given. */
  disconnectEmail: (accountId: string) => Promise<void>;
  fetchAccountsFromBackend: () => Promise<void>;
  fetchPortfolioFromBackend: () => Promise<void>;
  fetchNotificationsFromBackend: () => Promise<void>;
  acknowledgeNotification: (id: string) => Promise<void>;
  refreshAll: () => Promise<void>;
}

function notificationDateGroup(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Earlier";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function notificationTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function mapNotification(raw: any): NotificationItem {
  const pointsAtRisk = Number(raw.points_at_risk ?? raw.pointsAtRisk ?? 0);
  const programName = raw.program_name || raw.programName || "Loyalty Program";
  const alertType = String(raw.alert_type || raw.alertType || "expiry");
  const daysMatch = alertType.match(/(\d+)/);
  const warningDays = daysMatch ? `${daysMatch[1]} days` : "soon";
  return {
    id: raw.id,
    title: `${pointsAtRisk.toLocaleString()} points expiring soon`,
    description: `${programName} points are due to expire in ${warningDays}. Use them before they are lost.`,
    timestamp: notificationTimestamp(raw.triggered_at || raw.triggeredAt),
    dateGroup: notificationDateGroup(raw.triggered_at || raw.triggeredAt || new Date().toISOString()),
    isRead: Boolean(raw.acknowledged_by_user ?? raw.acknowledgedByUser),
    type: "expiry",
    pointsDelta: -pointsAtRisk,
  };
}

export const usePointsStore = create<PointsState>((set, get) => ({
  accounts: [],
  emailAccounts: [],
  transactions: [],
  notifications: [],
  isSyncing: false,
  syncProgress: { step: "Ready", percent: 0 },
  monthlyFlows: null,

  // ─── Selectors ──────────────────────────────────────────────────
  getDashboardSummary: () => {
    const { accounts, transactions, monthlyFlows } = get();
    const active = accounts.filter((a) => a.isActive);

    const totalPoints = active.reduce((sum, a) => sum + (a.currentBalance || 0), 0);
    const expiringThisMonth = active.reduce((sum, a) => sum + (a.expiringPoints || 0), 0);
    const portfolioValueINR = active.reduce(
      (sum, a) => sum + (a.currentBalance || 0) * (a.program?.pointValueINR || 0.25),
      0
    );

    const now = new Date();
    const inCurrentMonth = (iso: string) => {
      const d = new Date(iso);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    };

    // `transactions` is not loaded wholesale (the endpoint is per-account and
    // paginated), so it would always be empty and report 0. The server already
    // aggregates these in SQL, so prefer its figures and only fall back to the
    // local list if the analytics call has not landed yet.
    const localEarned = transactions
      .filter((t) => t.type === "credit" && inCurrentMonth(t.date))
      .reduce((sum, t) => sum + (t.points || 0), 0);
    const localRedeemed = transactions
      .filter((t) => (t.type === "debit" || t.type === "redeemed") && inCurrentMonth(t.date))
      .reduce((sum, t) => sum + (t.points || 0), 0);

    const monthlyEarned = monthlyFlows ? monthlyFlows.earned : localEarned;
    const monthlyRedeemed = monthlyFlows ? monthlyFlows.redeemed : localRedeemed;

    return {
      totalPoints,
      monthlyEarned,
      monthlyRedeemed,
      expiringThisMonth,
      portfolioValueINR: Math.round(portfolioValueINR),
      linkedAccountsCount: active.length,
    };
  },

  getCategorySummaries: () => {
    const { accounts } = get();
    const active = accounts.filter((a) => a.isActive);

    // Group accounts by category
    const categoryMap: Record<string, { totalPoints: number; brandCount: number; expiring: number }> = {};

    active.forEach((acc) => {
      const cat = acc.program?.category || "shopping";
      if (!categoryMap[cat]) {
        categoryMap[cat] = { totalPoints: 0, brandCount: 0, expiring: 0 };
      }
      categoryMap[cat].totalPoints += acc.currentBalance || 0;
      categoryMap[cat].brandCount += 1;
      categoryMap[cat].expiring += acc.expiringPoints || 0;
    });

    return Object.entries(categoryMap).map(([catKey, data]) => {
      const meta = CATEGORY_LABELS[catKey] || {
        name: catKey.charAt(0).toUpperCase() + catKey.slice(1),
        icon: "Shield",
        color: "#01A2FB",
        bgColor: "#E6F6FF",
      };

      return {
        categoryId: catKey as LoyaltyCategory,
        categoryName: meta.name,
        iconName: meta.icon,
        totalPoints: data.totalPoints,
        brandCount: data.brandCount,
        expiringPoints: data.expiring,
        accentColor: meta.color,
        bgColor: meta.bgColor,
      };
    });
  },

  getExpiringAccounts: () => {
    const { accounts } = get();
    return accounts.filter((a) => a.isActive && (a.expiringPoints || 0) > 0);
  },

  // ─── Actions ────────────────────────────────────────────────────
  fetchAccountsFromBackend: async () => {
    try {
      const [backendAccounts, backendEmailAccounts] = await Promise.all([
        apiClient.getAccounts().catch(() => null),
        apiClient.getEmailAccounts().catch(() => null),
      ]);

      if (Array.isArray(backendAccounts)) {
        set({ accounts: backendAccounts.map(mapBackendAccount) });
      }
      if (Array.isArray(backendEmailAccounts)) {
        set({
          emailAccounts: backendEmailAccounts.map((e: any) => ({
            id: e.id,
            provider: (e.provider || "gmail") as "gmail",
            email: e.email_address || e.email || "",
            connectedAt: e.created_at || new Date().toISOString(),
            lastSyncAt: e.last_synced_at || e.last_sync_at || null,
            status: (e.status === "connected" || e.is_active) ? ("connected" as const) : ("needs_reauth" as const),
            programsFound: Number(e.programs_found || 0),
          })),
        });
      }
    } catch {
      // Offline or unauthenticated fallback
    }
  },

  fetchPortfolioFromBackend: async () => {
    try {
      const response = await apiClient.getPortfolioSummary();
      const s = response?.summary;
      if (!s) return;
      set({
        monthlyFlows: {
          earned: Number(s.monthly_earned) || 0,
          redeemed: Number(s.monthly_redeemed) || 0,
        },
      });
    } catch {
      // Keep monthlyFlows null so the UI falls back to the local transaction
      // list instead of showing a confident zero that is really "unknown".
    }
  },

  fetchNotificationsFromBackend: async () => {
    try {
      const response = await apiClient.getNotificationHistory({ limit: 50 });
      set({
        notifications: Array.isArray(response?.items)
          ? response.items.map(mapNotification)
          : [],
      });
    } catch {
      // Keep the current cache on network errors
    }
  },

  acknowledgeNotification: async (id: string) => {
    try {
      await apiClient.acknowledgeAlert(id);
      set((state) => ({
        notifications: state.notifications.map((notification) =>
          notification.id === id ? { ...notification, isRead: true } : notification
        ),
      }));
    } catch {
      // Leave the item unread so the user can retry.
    }
  },

  addManualAccount: async ({
    programId,
    customName,
    category = "shopping",
    accountNumber,
    currentBalance,
    expiringPoints = 0,
    expiryDate,
  }) => {
    let program = POPULAR_PROGRAMS.find((p) => p.id === programId);

    if (!program) {
      program = {
        id: programId || `custom_${Date.now()}`,
        name: customName || "Custom Loyalty Program",
        category: category,
        logoInitial: "⭐",
        accentColor: "#01A2FB",
        defaultExpiryMonths: 12,
        pointValueINR: 0.25,
      };
    }

    const maskedNum = accountNumber.includes("*")
      ? accountNumber
      : `***${accountNumber.slice(-4)}`;

    const newAccount: LinkedAccount = {
      id: `acc_manual_${Date.now()}`,
      programId: program.id,
      program,
      accountNumberMasked: maskedNum,
      currentBalance,
      expiringPoints,
      expiryDate: expiryDate || (expiringPoints > 0 ? "30 Days" : null),
      lastSyncedAt: new Date().toISOString(),
      syncMethod: "manual",
      isActive: true,
    };

    try {
      await apiClient.addAccount({
        programId: program.id,
        accountNumberMasked: maskedNum,
        currentBalance,
        expiringPoints,
        expiryDate: expiryDate || undefined,
      });
    } catch {
      // Local state fallback
    }

    set((state) => ({
      accounts: [newAccount, ...state.accounts],
    }));

    return newAccount;
  },

  deleteAccount: async (id: string) => {
    try {
      await apiClient.deleteAccount(id);
    } catch {}
    set((state) => ({
      accounts: state.accounts.filter((a) => a.id !== id),
    }));
  },

  updateAccount: async (id: string, updates: Partial<LinkedAccount>) => {
    try {
      await apiClient.updateAccount(id, updates);
    } catch {}
    set((state) => ({
      accounts: state.accounts.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    }));
  },

  syncEmail: async (provider, email, onProgressUpdate) => {
    set({ isSyncing: true, syncProgress: { step: "Connecting to mailbox...", percent: 10 } });

    const handleProgress = (step: string, percent: number) => {
      set({ syncProgress: { step, percent } });
      onProgressUpdate?.(step, percent);
    };

    try {
      handleProgress("Queueing mailbox scan...", 25);
      // The Gmail fetch + parse runs server-side as a job. Queuing returns in
      // milliseconds, so the HTTP request never blocks the UI thread.
      const { jobId } = await apiClient.queueEmailScan(provider);
      const job = await pollSyncJob(jobId, (current) => {
        const phase = SYNC_JOB_PROGRESS[current.status];
        if (phase) {
          const { step, percent } = phase(current);
          handleProgress(step, percent);
        }
      });

      handleProgress("Refreshing your portfolio...", 90);
      const previousBalances = new Map(
        get().accounts.map((a) => [a.programId, a.currentBalance])
      );

      // The job persisted everything to PostgreSQL, so read the authoritative
      // state back from the API rather than trusting the scan response.
      // No fabricated fallback: a failure here surfaces to the user.
      const rows = await apiClient.getAccounts();
      const syncedAccounts = Array.isArray(rows) ? rows.map(mapBackendAccount) : [];

      set((state) => {
        const previous = state.emailAccounts.find((e) => e.provider === provider);
        return {
          accounts: syncedAccounts,
          // Keyed on the mailbox address, not the provider: a user may have
          // several Gmail accounts connected and each keeps its own row.
          emailAccounts: [
            ...state.emailAccounts.filter(
              (e) => !(e.provider === provider && e.email === email)
            ),
            {
              id: previous?.id || `email_${Date.now()}`,
              provider,
              email,
              connectedAt: previous?.connectedAt || new Date().toISOString(),
              lastSyncAt: new Date().toISOString(),
              status: "connected" as const,
              programsFound: job.programs_updated ?? syncedAccounts.length,
            },
          ],
          isSyncing: false,
          syncProgress: { step: "Done", percent: 100 },
        };
      });

      // Surface balances that grew during this sync.
      const increased = syncedAccounts.find((a) => {
        const before = previousBalances.get(a.programId);
        return before !== undefined && a.currentBalance > before;
      });
      if (increased) {
        const before = previousBalances.get(increased.programId) ?? 0;
        void notifyPointsEarned(increased.program.name, increased.currentBalance - before);
      }

      return syncedAccounts;
    } catch (error) {
      set({ isSyncing: false, syncProgress: { step: "Error during sync", percent: 0 } });
      throw error;
    }
  },

  /**
   * Remove one mailbox. `accountId` is the email_sync_accounts row id — the
   * server needs it to delete exactly one connection when several exist.
   */
  disconnectEmail: async (accountId) => {
    try {
      await apiClient.disconnectEmail(accountId);
    } catch {
      // Fall through to the local update so the UI stays consistent.
    }
    set((state) => ({
      emailAccounts: state.emailAccounts.filter((e) => e.id !== accountId),
    }));
  },

  refreshAll: async () => {
    set({ isSyncing: true });
    try {
      await Promise.all([
        get().fetchAccountsFromBackend(),
        get().fetchNotificationsFromBackend(),
        get().fetchPortfolioFromBackend(),
      ]);
    } finally {
      set({ isSyncing: false });
    }
  },
}));
