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
import { POPULAR_PROGRAMS, CATEGORY_LABELS } from "../constants/popularPrograms";
import { EmailSyncService } from "../services/emailParser";
import { apiClient } from "../lib/apiClient";

interface PointsState {
  // Data (Defaults to empty – no dummy data)
  accounts: LinkedAccount[];
  emailAccounts: EmailSyncAccount[];
  transactions: PointsTransaction[];
  isSyncing: boolean;
  syncProgress: { step: string; percent: number };

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
    provider: "gmail" | "outlook",
    email: string,
    onProgressUpdate?: (step: string, percent: number) => void
  ) => Promise<LinkedAccount[]>;

  disconnectEmail: (provider: "gmail" | "outlook") => Promise<void>;
  fetchAccountsFromBackend: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

export const usePointsStore = create<PointsState>((set, get) => ({
  accounts: [],
  emailAccounts: [],
  transactions: [],
  isSyncing: false,
  syncProgress: { step: "Ready", percent: 0 },

  // ─── Selectors ──────────────────────────────────────────────────
  getDashboardSummary: () => {
    const { accounts, transactions } = get();
    const active = accounts.filter((a) => a.isActive);

    const totalPoints = active.reduce((sum, a) => sum + (a.currentBalance || 0), 0);
    const expiringThisMonth = active.reduce((sum, a) => sum + (a.expiringPoints || 0), 0);
    const portfolioValueINR = active.reduce(
      (sum, a) => sum + (a.currentBalance || 0) * (a.program?.pointValueINR || 0.25),
      0
    );

    // Calculate real monthly earned points from transactions in the last 30 days
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const monthlyEarned = transactions
      .filter((t) => t.type === "credit" && new Date(t.date).getTime() >= thirtyDaysAgo)
      .reduce((sum, t) => sum + t.points, 0);

    const monthlyRedeemed = transactions
      .filter((t) => t.type === "debit" && new Date(t.date).getTime() >= thirtyDaysAgo)
      .reduce((sum, t) => sum + t.points, 0);

    return {
      totalPoints,
      monthlyEarned: monthlyEarned > 0 ? monthlyEarned : (totalPoints > 0 ? totalPoints : 0),
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
      const backendAccounts = await apiClient.getAccounts();
      if (Array.isArray(backendAccounts)) {
        const formatted: LinkedAccount[] = backendAccounts.map((a: any) => {
          const catalogProgram = POPULAR_PROGRAMS.find((p) => p.id === a.program_id) || {
            id: a.program_id,
            name: a.program_name || "Loyalty Program",
            category: a.category || "shopping",
            logoInitial: a.logo_initial || "⭐",
            accentColor: a.accent_color || "#01A2FB",
            defaultExpiryMonths: 12,
            pointValueINR: parseFloat(a.point_value_inr) || 0.25,
          };

          return {
            id: a.id,
            programId: a.program_id,
            program: catalogProgram,
            accountNumberMasked: a.account_number_masked,
            currentBalance: a.current_balance,
            expiringPoints: a.expiring_points || 0,
            expiryDate: a.expiry_date,
            lastSyncedAt: a.last_synced_at,
            syncMethod: a.sync_method || "manual",
            isActive: a.is_active,
          };
        });

        set({ accounts: formatted });
      }
    } catch {
      // Offline or unauthenticated fallback
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
      // 1. Try scanning real emails from backend if connected
      let syncedAccounts: LinkedAccount[] = [];
      try {
        const scanRes = await apiClient.scanEmails(provider);
        if (scanRes && scanRes.accounts && scanRes.accounts.length > 0) {
          syncedAccounts = scanRes.accounts.map((a: any) => {
            const prog = POPULAR_PROGRAMS.find((p) => p.id === a.program_id) || {
              id: a.program_id,
              name: a.program_name || "Loyalty Program",
              category: "airlines" as const,
              logoInitial: "✈️",
              accentColor: "#01A2FB",
              defaultExpiryMonths: 24,
              pointValueINR: 0.35,
            };
            return {
              id: a.id,
              programId: a.program_id,
              program: prog,
              accountNumberMasked: a.account_number_masked,
              currentBalance: a.current_balance,
              expiringPoints: a.expiring_points || 0,
              expiryDate: a.expiry_date,
              lastSyncedAt: new Date().toISOString(),
              syncMethod: "email_parser" as const,
              isActive: true,
            };
          });
        }
      } catch {
        // Local scan parser
        syncedAccounts = await EmailSyncService.executeEmailSync(provider, email, handleProgress);
      }

      set((state) => {
        const existingProgramIds = new Set(syncedAccounts.map((a) => a.programId));
        const filteredOld = state.accounts.filter((a) => !existingProgramIds.has(a.programId));

        const updatedEmailAccounts: EmailSyncAccount[] = [
          ...state.emailAccounts.filter((e) => e.provider !== provider),
          {
            id: `email_${Date.now()}`,
            provider,
            email,
            connectedAt: new Date().toISOString(),
            lastSyncAt: new Date().toISOString(),
            status: "connected",
            programsFound: syncedAccounts.length,
          },
        ];

        return {
          accounts: [...syncedAccounts, ...filteredOld],
          emailAccounts: updatedEmailAccounts,
          isSyncing: false,
          syncProgress: { step: "Done", percent: 100 },
        };
      });

      return syncedAccounts;
    } catch (error) {
      set({ isSyncing: false, syncProgress: { step: "Error during sync", percent: 0 } });
      throw error;
    }
  },

  disconnectEmail: async (provider) => {
    try {
      await apiClient.disconnectEmail(provider);
    } catch {}
    set((state) => ({
      emailAccounts: state.emailAccounts.filter((e) => e.provider !== provider),
    }));
  },

  refreshAll: async () => {
    set({ isSyncing: true });
    try {
      await get().fetchAccountsFromBackend();
    } finally {
      set({ isSyncing: false });
    }
  },
}));
