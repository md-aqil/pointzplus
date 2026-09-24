-- supabase/migrations/20260915_003_coupons_and_sync_jobs.sql
-- PointzPlus: Coupons, Promo Tokens, Async Sync Jobs, and Webhook Tracking

-- ─── Types ──────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE coupon_type AS ENUM ('discount_code', 'barcode_voucher', 'qr_token', 'cashback_credit', 'points_multiplier');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sync_job_status AS ENUM ('queued', 'fetching', 'parsing', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE provider_type AS ENUM ('gmail', 'outlook', 'yahoo', 'imap');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── Extracted Coupons & Tokens Table ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.extracted_coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.loyalty_programs(id) ON DELETE SET NULL,
  merchant_name TEXT NOT NULL,
  category TEXT DEFAULT 'shopping', -- 'shopping', 'dining', 'travel', 'entertainment', 'banking', etc.
  coupon_code TEXT NOT NULL,
  coupon_type coupon_type DEFAULT 'discount_code',
  title TEXT NOT NULL,
  description TEXT,
  discount_value TEXT NOT NULL, -- e.g. "20% OFF", "₹500 Flat", "2X Multiplier"
  minimum_spend_inr NUMERIC(10, 2) DEFAULT 0,
  expiry_date TIMESTAMP WITH TIME ZONE,
  barcode_data TEXT,
  qr_code_url TEXT,
  redemption_url TEXT,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  email_message_id_hash TEXT NOT NULL, -- SHA-256 hash for deduplication
  source_email_subject TEXT,
  source_sender TEXT,
  confidence_score NUMERIC(3, 2) DEFAULT 0.95,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, coupon_code, email_message_id_hash)
);

-- ─── Sync Jobs Table (Asynchronous Processing) ──────────────────────
CREATE TABLE IF NOT EXISTS public.sync_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'gmail',
  status sync_job_status DEFAULT 'queued',
  total_messages_found INT DEFAULT 0,
  messages_processed INT DEFAULT 0,
  coupons_extracted INT DEFAULT 0,
  programs_updated INT DEFAULT 0,
  error_details TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Add Webhook and Security Fields to email_sync_accounts ─────────
ALTER TABLE public.email_sync_accounts 
  ADD COLUMN IF NOT EXISTS watch_expiration TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS watch_resource_id TEXT,
  ADD COLUMN IF NOT EXISTS encryption_iv TEXT,
  ADD COLUMN IF NOT EXISTS encryption_tag TEXT,
  ADD COLUMN IF NOT EXISTS history_id TEXT;

-- ─── Indexes for High-Performance Queries ───────────────────────────
CREATE INDEX IF NOT EXISTS idx_coupons_user_active ON public.extracted_coupons(user_id, is_used, expiry_date);
CREATE INDEX IF NOT EXISTS idx_coupons_expiry ON public.extracted_coupons(expiry_date ASC);
CREATE INDEX IF NOT EXISTS idx_coupons_dedup ON public.extracted_coupons(email_message_id_hash);
CREATE INDEX IF NOT EXISTS idx_coupons_merchant ON public.extracted_coupons(merchant_name);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_user ON public.sync_jobs(user_id, status);

-- NOTE: Demo/seed coupon INSERTs removed. Migrations must never attach fake
-- coupons to whichever user happens to be first in the table. For local demo
-- data, insert rows manually or via a dedicated dev-only seed script.
