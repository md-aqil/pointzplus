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
import {
  NotificationItem,
  SyncJob,
  SyncJobStatus,
  LiveDetection,
  RejectedEmail,
  BackendLinkedAccount,
  ParsedEmailStatement,
} from "../types/models";
import { POPULAR_PROGRAMS, CATEGORY_LABELS } from "../constants/popularPrograms";
import { apiClient } from "../lib/apiClient";
import { notifyPointsEarned } from "../services/pushNotifications";

// ─── Gmail sync job polling ────────────────────────────────────
const SYNC_JOB_POLL_INTERVAL_MS = 2_000;
const SYNC_JOB_TIMEOUT_MS = 10 * 60 * 1_000;

export type SyncProgress = {
  step: string;
  percent: number;
  liveDetections?: LiveDetection[];
  totalPointsDiscovered?: number;
  rejectedEmails?: RejectedEmail[];
};

// During `parsing` the server reports how many messages it has handled, so the
// bar tracks real work across the 80–92% band instead of animating blindly.
const SYNC_JOB_PROGRESS: Partial<Record<SyncJobStatus, (job: SyncJob) => SyncProgress>> = {
  queued: () => ({ step: "Scan queued – waiting for the sync worker...", percent: 30, liveDetections: [], totalPointsDiscovered: 0, rejectedEmails: [] }),
  fetching: () => ({ step: "Searching your inbox for statements & promo tokens...", percent: 55, liveDetections: [], totalPointsDiscovered: 0, rejectedEmails: [] }),
  parsing: (job) => {
    const total = Number(job.total_messages_found) || 0;
    const done = Number(job.messages_processed) || 0;
    const ratio = total > 0 ? Math.min(1, done / total) : 0;
    const liveDetections = job.live_detections || [];
    const rejectedEmails = job.rejected_emails || [];
    const totalPoints = liveDetections.reduce((acc, d) => acc + (Number(d.balance) || 0), 0);
    return {
      step:
        total > 0
          ? `Extracting points (${done}/${total})…`
          : "Extracting points from matched emails...",
      percent: 80 + Math.round(ratio * 12),
      liveDetections,
      totalPointsDiscovered: totalPoints,
      rejectedEmails,
    };
  },
  completed: (job) => {
    const liveDetections = job?.live_detections || [];
    const rejectedEmails = job?.rejected_emails || [];
    const totalPoints = liveDetections.reduce((acc, d) => acc + (Number(d.balance) || 0), 0);
    return {
      step: "Finalizing your portfolio...",
      percent: 95,
      liveDetections,
      totalPointsDiscovered: totalPoints,
      rejectedEmails,
    };
  },
};

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// ─── Per-Resource Fetch Timestamps & TTL Caching ───────────────
// Timestamps are ONLY updated when an API fetch succeeds, so failures can be retried immediately.
const lastFetchTimestamps = {
  accounts: 0,
  notifications: 0,
  portfolio: 0,
};
const RESOURCE_TTL_MS = 30_000;

export function isResourceFresh(
  resource: "accounts" | "notifications" | "portfolio",
  ttl = RESOURCE_TTL_MS
): boolean {
  return Date.now() - (lastFetchTimestamps[resource] || 0) < ttl;
}

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
    sourceSubject: a.source_subject || null,
    sourceSender: a.source_sender || null,
    extractionSource: a.extraction_source || null,
    isActive: a.is_active ?? true,
  };
}

const SYNC_JOB_MAX_POLL_DURATION_MS = 15 * 60 * 1_000;

/**
 * Poll a queued Gmail scan until it reaches a terminal state.
 * The scan runs in a background job, so this is how the UI learns it finished.
 */
async function pollSyncJob(
  jobId: string,
  onStatus: (job: SyncJob) => void
): Promise<SyncJob> {
  const startTime = Date.now();
  const hardMaxDeadline = startTime + SYNC_JOB_MAX_POLL_DURATION_MS;
  let deadline = Math.min(startTime + SYNC_JOB_TIMEOUT_MS, hardMaxDeadline);
  let lastProcessed = -1;
  let lastLiveCount = 0;

  while (Date.now() < deadline) {
    let job: SyncJob;
    try {
      job = await apiClient.getSyncJob(jobId);
    } catch (fetchErr: any) {
      console.warn(`[pollSyncJob] Poll attempt failed for job ${jobId}:`, fetchErr?.message);
      // A transient network blip must not abandon a scan that is still running.
      await delay(SYNC_JOB_POLL_INTERVAL_MS);
      continue;
    }

    console.log(`[pollSyncJob] Job ${jobId} status: ${job.status}, messages: ${job.messages_processed ?? 0}/${job.total_messages_found ?? 0}`);

    if (job.status === "failed") {
      console.error(`[pollSyncJob] Job ${jobId} failed:`, job.error_details);
      throw new Error(job.error_details || "Gmail sync failed. Please try again.");
    }
    if (job.status === "completed") {
      console.log(`[pollSyncJob] Job ${jobId} completed successfully!`);
      return job;
    }

    // If making active progress, extend deadline bounded strictly by hardMaxDeadline
    const currentProcessed = Number(job.messages_processed) || 0;
    const currentLiveCount = Array.isArray(job.live_detections) ? job.live_detections.length : 0;
    if (currentProcessed > lastProcessed || currentLiveCount > lastLiveCount) {
      lastProcessed = currentProcessed;
      lastLiveCount = currentLiveCount;
      deadline = Math.min(Date.now() + 2 * 60 * 1000, hardMaxDeadline);
    }

    onStatus(job);
    await delay(SYNC_JOB_POLL_INTERVAL_MS);
  }

  // Poll window expired: only return if the job reached a completed terminal state
  console.warn(`[pollSyncJob] Job ${jobId} reached polling threshold; checking final state`);
  const finalJob = await apiClient.getSyncJob(jobId).catch(() => null);
  if (finalJob?.status === "completed") {
    return finalJob;
  }
  if (finalJob?.status === "failed") {
    throw new Error(finalJob.error_details || "Gmail sync failed. Please try again.");
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
  syncProgress: SyncProgress;
  lastSyncRejectedEmails: RejectedEmail[];
  setLastSyncRejectedEmails: (emails: RejectedEmail[]) => void;
  parsedStatements: ParsedEmailStatement[];
  isBackfillRunning: boolean;
  activeJobDetails: SyncJob | null;
  fetchParsedStatements: (limit?: number) => Promise<ParsedEmailStatement[]>;
  checkActiveSyncStatus: () => Promise<void>;
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
  fetchAccountsFromBackend: (force?: boolean) => Promise<void>;
  fetchPortfolioFromBackend: (force?: boolean) => Promise<void>;
  fetchNotificationsFromBackend: (force?: boolean) => Promise<void>;
  acknowledgeNotification: (id: string) => Promise<void>;
  /**
   * Reload accounts + portfolio + notifications. Skips the network when the
   * last successful refresh is fresh, so mounting Home → Overview → Home
   * doesn't triple-fetch. Pull-to-refresh / retry buttons pass force=true.
   */
  refreshAll: (force?: boolean) => Promise<void>;
  reset: () => void;
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

// ─── Pure Derivations (Stateless & Pure for Memoization) ─────────
export function computeDashboardSummary(
  accounts: LinkedAccount[],
  transactions: PointsTransaction[] = [],
  monthlyFlows: { earned: number; redeemed: number } | null = null
): DashboardSummary {
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
}

export function computeCategorySummaries(accounts: LinkedAccount[]): CategorySummary[] {
  const active = accounts.filter((a) => a.isActive);

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
}

export function computeExpiringAccounts(accounts: LinkedAccount[]): LinkedAccount[] {
  return accounts.filter((a) => a.isActive && (a.expiringPoints || 0) > 0);
}

export const usePointsStore = create<PointsState>((set, get) => ({
  accounts: [],
  emailAccounts: [],
  transactions: [],
  notifications: [],
  isSyncing: false,
  syncProgress: { step: "Ready", percent: 0, rejectedEmails: [] },
  lastSyncRejectedEmails: [],
  setLastSyncRejectedEmails: (emails) => set({ lastSyncRejectedEmails: emails }),
  parsedStatements: [],
  isBackfillRunning: false,
  activeJobDetails: null,
  monthlyFlows: null,

  // ─── Selectors ──────────────────────────────────────────────────
  getDashboardSummary: () => {
    const { accounts, transactions, monthlyFlows } = get();
    return computeDashboardSummary(accounts, transactions, monthlyFlows);
  },

  getCategorySummaries: () => {
    const { accounts } = get();
    return computeCategorySummaries(accounts);
  },

  getExpiringAccounts: () => {
    const { accounts } = get();
    return computeExpiringAccounts(accounts);
  },

  // ─── Actions ────────────────────────────────────────────────────
  fetchAccountsFromBackend: async (force = false) => {
    if (!force && isResourceFresh("accounts")) return;
    try {
      const [backendAccounts, backendEmailAccounts] = await Promise.all([
        apiClient.getAccounts(),
        apiClient.getEmailAccounts().catch(() => null),
      ]);

      if (Array.isArray(backendAccounts)) {
        set({ accounts: backendAccounts.map(mapBackendAccount) });
        lastFetchTimestamps.accounts = Date.now();
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
      // Failed: leave timestamp unchanged so subsequent retries are not throttled
    }
  },

  fetchPortfolioFromBackend: async (force = false) => {
    if (!force && isResourceFresh("portfolio")) return;
    try {
      const response = await apiClient.getPortfolioSummary();
      const s = response?.summary;
      if (s) {
        set({
          monthlyFlows: {
            earned: Number(s.monthly_earned) || 0,
            redeemed: Number(s.monthly_redeemed) || 0,
          },
        });
        lastFetchTimestamps.portfolio = Date.now();
      }
    } catch {
      // Failed: leave timestamp unchanged so subsequent retries can proceed immediately
    }
  },

  fetchNotificationsFromBackend: async (force = false) => {
    if (!force && isResourceFresh("notifications")) return;
    try {
      const response = await apiClient.getNotificationHistory({ limit: 50 });
      if (response && Array.isArray(response.items)) {
        set({
          notifications: response.items.map(mapNotification),
        });
        lastFetchTimestamps.notifications = Date.now();
      }
    } catch {
      // Failed: leave timestamp unchanged so subsequent retries can proceed immediately
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
    set({
      isSyncing: true,
      syncProgress: { step: "Connecting to mailbox...", percent: 10, liveDetections: [], totalPointsDiscovered: 0 },
    });

    const handleProgress = (progress: SyncProgress) => {
      set({ syncProgress: progress });
      onProgressUpdate?.(progress.step, progress.percent);
    };

    try {
      handleProgress({ step: "Queueing mailbox scan...", percent: 25, liveDetections: [], totalPointsDiscovered: 0 });
      // The Gmail fetch + parse runs server-side as a job. Queuing returns in
      // milliseconds, so the HTTP request never blocks the UI thread.
      const { jobId } = await apiClient.queueEmailScan(provider);
      const job = await pollSyncJob(jobId, (current) => {
        const phase = SYNC_JOB_PROGRESS[current.status];
        if (phase) {
          const progress = phase(current);
          handleProgress(progress);
        }
      });

      handleProgress({ step: "Refreshing your portfolio...", percent: 90 });
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
          syncProgress: { step: "Done", percent: 100, liveDetections: job.live_detections || [], rejectedEmails: job.rejected_emails || [] },
          lastSyncRejectedEmails: Array.isArray(job.rejected_emails) ? job.rejected_emails : [],
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
      emailAccounts: state.emailAccounts.filter(
        (e) => e.id !== accountId && e.email !== accountId
      ),
    }));
  },

  fetchParsedStatements: async (limit = 200) => {
    try {
      const statements = await apiClient.getEmailStatements(limit);
      if (Array.isArray(statements)) {
        set({ parsedStatements: statements });
        return statements;
      }
      return [];
    } catch (e) {
      console.warn("[pointsStore] fetchParsedStatements error:", e);
      return [];
    }
  },

  checkActiveSyncStatus: async () => {
    try {
      const wasRunning = get().isBackfillRunning;
      const res = await apiClient.getActiveSyncJob();
      if (res && res.activeJob) {
        set({
          isBackfillRunning: res.isSyncing,
          activeJobDetails: res.activeJob,
          lastSyncRejectedEmails: Array.isArray(res.activeJob.rejected_emails)
            ? res.activeJob.rejected_emails
            : [],
        });
      } else {
        set({
          isBackfillRunning: false,
          activeJobDetails: null,
        });
        // If a background job just finished, reload portfolio & statements
        if (wasRunning) {
          get().fetchAccountsFromBackend(true).catch(() => {});
          get().fetchParsedStatements(300).catch(() => {});
        }
      }
    } catch {
      // Ignored
    }
  },

  refreshAll: async (force = false) => {
    const needsAccounts = force || !isResourceFresh("accounts");
    const needsNotifications = force || !isResourceFresh("notifications");
    const needsPortfolio = force || !isResourceFresh("portfolio");

    // If all resources are already fresh, return without redundant network requests
    if (!needsAccounts && !needsNotifications && !needsPortfolio) {
      return;
    }

    set({ isSyncing: true });
    try {
      const tasks: Promise<void>[] = [];
      if (needsAccounts) tasks.push(get().fetchAccountsFromBackend(force));
      if (needsNotifications) tasks.push(get().fetchNotificationsFromBackend(force));
      if (needsPortfolio) tasks.push(get().fetchPortfolioFromBackend(force));
      tasks.push(get().checkActiveSyncStatus());

      await Promise.all(tasks);
    } finally {
      set({ isSyncing: false });
    }
  },

  reset: () => {
    lastFetchTimestamps.accounts = 0;
    lastFetchTimestamps.notifications = 0;
    lastFetchTimestamps.portfolio = 0;
    set({
      accounts: [],
      emailAccounts: [],
      transactions: [],
      notifications: [],
      isSyncing: false,
      syncProgress: { step: "Ready", percent: 0, rejectedEmails: [] },
      lastSyncRejectedEmails: [],
      parsedStatements: [],
      isBackfillRunning: false,
      activeJobDetails: null,
      monthlyFlows: null,
    });
  },
}));
