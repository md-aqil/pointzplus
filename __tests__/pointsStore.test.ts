// __tests__/pointsStore.test.ts – Unit tests for pure derivation functions.
// Defensive mandate: verify fail-safe behavior on empty/missing data, not just happy path.
import {
  computeDashboardSummary,
  computeCategorySummaries,
  computeExpiringAccounts,
} from "../store/pointsStore";
import type { LinkedAccount, PointsTransaction } from "../types/loyalty";

function makeAccount(overrides: Partial<LinkedAccount> = {}): LinkedAccount {
  return {
    id: "acc-1",
    programId: "prog-1",
    program: {
      id: "prog-1",
      name: "TestAir",
      category: "airlines" as never,
      logoInitial: "T",
      accentColor: "#02EFF4",
      defaultExpiryMonths: 12,
      pointValueINR: 0.5,
    },
    accountNumberMasked: "XXXX-1234",
    currentBalance: 1000,
    expiringPoints: 100,
    expiryDate: "2027-01-01",
    lastSyncedAt: new Date().toISOString(),
    syncMethod: "email_parser",
    isActive: true,
    ...overrides,
  };
}

describe("computeDashboardSummary", () => {
  it("returns an honest zero summary for an empty account list (no mock data)", () => {
    const s = computeDashboardSummary([], [], null);
    expect(s.totalPoints).toBe(0);
    expect(s.monthlyEarned).toBe(0);
    expect(s.monthlyRedeemed).toBe(0);
    expect(s.expiringThisMonth).toBe(0);
    expect(s.linkedAccountsCount).toBe(0);
  });

  it("counts only active accounts", () => {
    const accounts = [
      makeAccount({ id: "a", currentBalance: 500, isActive: true }),
      makeAccount({ id: "b", currentBalance: 9999, isActive: false }),
    ];
    const s = computeDashboardSummary(accounts, [], null);
    expect(s.totalPoints).toBe(500);
    expect(s.linkedAccountsCount).toBe(1);
  });

  it("treats missing balances as 0 instead of NaN", () => {
    const accounts = [makeAccount({ currentBalance: undefined as never })];
    const s = computeDashboardSummary(accounts, [], null);
    expect(s.totalPoints).toBe(0);
    expect(Number.isNaN(s.totalPoints)).toBe(false);
  });

  it("uses monthlyFlows when provided, local transactions otherwise", () => {
    const now = new Date();
    const txThisMonth: PointsTransaction = {
      id: "t1",
      accountId: "a",
      type: "credit",
      points: 250,
      description: "flight",
      date: now.toISOString(),
    };
    const s1 = computeDashboardSummary([makeAccount()], [txThisMonth], null);
    expect(s1.monthlyEarned).toBe(250);

    const s2 = computeDashboardSummary([makeAccount()], [txThisMonth], {
      earned: 777,
      redeemed: 55,
    });
    expect(s2.monthlyEarned).toBe(777);
    expect(s2.monthlyRedeemed).toBe(55);
  });

  it("computes portfolio value from pointValueINR and rounds it", () => {
    const s = computeDashboardSummary([makeAccount({ currentBalance: 1000 })], [], null);
    expect(s.portfolioValueINR).toBe(500); // 1000 * 0.5
  });
});

describe("computeCategorySummaries", () => {
  it("returns [] for empty accounts", () => {
    expect(computeCategorySummaries([])).toEqual([]);
  });

  it("groups by category and counts brands", () => {
    const accounts = [
      makeAccount({ id: "a", currentBalance: 100 }),
      makeAccount({ id: "b", currentBalance: 200 }),
      makeAccount({
        id: "c",
        currentBalance: 50,
        isActive: false, // excluded
      }),
    ];
    const result = computeCategorySummaries(accounts);
    expect(result).toHaveLength(1);
    expect(result[0].totalPoints).toBe(300);
    expect(result[0].brandCount).toBe(2);
  });

  it("falls back to a default category meta for unknown categories", () => {
    const accounts = [
      makeAccount({
        program: {
          ...makeAccount().program,
          category: "unknowncat" as never,
        },
      }),
    ];
    const result = computeCategorySummaries(accounts);
    expect(result).toHaveLength(1);
    expect(result[0].categoryName).toBe("Unknowncat");
  });
});

describe("computeExpiringAccounts", () => {
  it("returns [] for empty input", () => {
    expect(computeExpiringAccounts([])).toEqual([]);
  });

  it("includes only active accounts with expiring points > 0", () => {
    const accounts = [
      makeAccount({ id: "a", expiringPoints: 10 }),
      makeAccount({ id: "b", expiringPoints: 0 }),
      makeAccount({ id: "c", expiringPoints: 99, isActive: false }),
      makeAccount({ id: "d", expiringPoints: undefined as never }),
    ];
    const result = computeExpiringAccounts(accounts);
    expect(result.map((a) => a.id)).toEqual(["a"]);
  });
});
