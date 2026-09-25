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
  coupons_extracted: number | null;
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