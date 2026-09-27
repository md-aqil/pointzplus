// types/models.ts – Shared client-side domain models
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  totalPoints: number;
  monthlyEarned: number;
  expiringSoon: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  /** Human-readable timestamp used by the notification card. */
  timestamp: string;
  dateGroup: string;
  isRead: boolean;
  type: "credit" | "expiry" | "offer";
  pointsDelta?: number;
}

/** Lifecycle of a server-side Gmail scan job (mirrors sync_job_status in PostgreSQL). */
export type SyncJobStatus = "queued" | "fetching" | "parsing" | "completed" | "failed";

export interface SyncJob {
  id: string;
  status: SyncJobStatus;
  total_messages_found: number | null;
  messages_processed: number | null;
  programs_updated: number | null;
  error_details: string | null;
  created_at?: string;
  started_at?: string | null;
  completed_at?: string | null;
}

/**
 * A `linked_accounts` row joined with its `loyalty_programs` catalogue entry.
 * This is the wire shape returned by GET /api/accounts.
 */
export interface BackendLinkedAccount {
  id: string;
  program_id: string;
  account_number_masked: string | null;
  current_balance: number;
  expiring_points: number | null;
  expiry_date: string | null;
  last_synced_at: string | null;
  sync_method: string | null;
  is_active: boolean;
  program_name?: string;
  program_slug?: string | null;
  category?: string;
  logo_initial?: string | null;
  accent_color?: string | null;
  point_value_inr?: number | string | null;
}

/**
 * Wire shape returned by GET /api/analytics/portfolio.
 * The server aggregates these in SQL, so the client never has to derive
 * monthly credit/debit flows from a partial transaction list.
 */
export interface BackendPortfolioSummary {
  total_accounts: number;
  total_points: number;
  portfolio_value_inr: number | string;
  expiring_points: number;
  last_sync: string | null;
  monthly_earned: number;
  monthly_redeemed: number;
}

/** One row of the per-category rollup returned alongside the portfolio summary. */
export interface BackendCategoryBreakdown {
  category: string;
  brand_count: number;
  total_points: number;
  expiring_points: number;
}