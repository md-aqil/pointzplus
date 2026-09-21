// types/loyalty.ts – Core domain types for PointzPlus MVP
import { z } from "zod";

// ─── Loyalty Program (from catalog) ──────────────────────────────
export interface LoyaltyProgram {
  id: string;
  name: string;
  category: LoyaltyCategory;
  logoInitial: string; // First letter / emoji for avatar
  accentColor: string;
  defaultExpiryMonths: number; // Rolling expiry period
  pointValueINR: number; // ₹ value per point
}

// ─── User's Linked Account ──────────────────────────────────────
export interface LinkedAccount {
  id: string;
  programId: string;
  program: LoyaltyProgram;
  accountNumberMasked: string; // "XXXX-1234"
  currentBalance: number;
  expiringPoints: number;
  expiryDate: string | null; // ISO date or display string
  lastSyncedAt: string; // ISO timestamp
  syncMethod: "manual" | "email_parser" | "sms" | "api";
  isActive: boolean;
}

// ─── Points Transaction Log ─────────────────────────────────────
export interface PointsTransaction {
  id: string;
  accountId: string;
  type: "credit" | "debit" | "expired" | "redeemed";
  points: number;
  description: string;
  date: string; // ISO date
}

// ─── Category Summary (computed) ─────────────────────────────────
export interface CategorySummary {
  categoryId: LoyaltyCategory;
  categoryName: string;
  iconName: string;
  totalPoints: number;
  brandCount: number;
  expiringPoints: number;
  accentColor: string;
  bgColor: string;
}

// ─── Dashboard Summary (computed) ────────────────────────────────
export interface DashboardSummary {
  totalPoints: number;
  monthlyEarned: number;
  monthlyRedeemed: number;
  expiringThisMonth: number;
  portfolioValueINR: number;
  linkedAccountsCount: number;
}

// ─── Email Sync Types ────────────────────────────────────────────
export interface EmailSyncAccount {
  id: string;
  provider: "gmail" | "outlook";
  email: string;
  connectedAt: string;
  lastSyncAt: string | null;
  status: "connected" | "needs_reauth" | "syncing" | "error";
  programsFound: number;
}

export interface ParsedEmailResult {
  programName: string;
  programId: string;
  accountNumberMasked: string;
  pointsBalance: number;
  expiringPoints?: number;
  expiryDate?: string;
  sourceEmailSubject: string;
  sourceEmailDate: string;
  confidence: number; // 0-1, how confident the parser is
}

// ─── Enums ───────────────────────────────────────────────────────
export type LoyaltyCategory =
  | "airlines"
  | "hotels"
  | "banking"
  | "shopping"
  | "fuel"
  | "entertainment"
  | "food_delivery"
  | "dining"
  | "travel"
  | "groceries"
  | "health"
  | "telecom";

// ─── Zod Schemas (for form validation) ───────────────────────────
export const addProgramSchema = z.object({
  programId: z.string().min(1, "Select a loyalty program"),
  accountNumber: z.string().min(4, "Enter at least 4 characters"),
  currentBalance: z.coerce.number().min(0, "Points must be 0 or more"),
  expiringPoints: z.coerce.number().min(0).optional(),
  expiryDate: z.string().optional(),
});

export type AddProgramFormValues = z.infer<typeof addProgramSchema>;
