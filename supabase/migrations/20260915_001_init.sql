-- supabase/migrations/20260915_001_init.sql
-- PointzPlus Phase 2: Complete Database Schema (Local PostgreSQL Compatible)

-- ─── Enable Extensions ──────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─── Users Table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  full_name TEXT,
  phone_number TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Loyalty Programs Catalog ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.loyalty_programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- airlines, hotels, banking, shopping, etc.
  logo_initial TEXT,
  accent_color TEXT,
  default_expiry_months INT DEFAULT 24,
  point_value_inr DECIMAL(10, 4) DEFAULT 0.25,
  seller_domain TEXT, -- e.g., "airindia.com", "marriott.com"
  email_parser_enabled BOOLEAN DEFAULT FALSE,
  sms_detector_enabled BOOLEAN DEFAULT FALSE,
  oauth_provider TEXT, -- e.g., "oauth2" if API available
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, category)
);

-- ─── User Connected Loyalty Accounts ───────────────────────
CREATE TABLE IF NOT EXISTS public.linked_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.loyalty_programs(id) ON DELETE RESTRICT,
  account_number_masked TEXT NOT NULL,
  current_balance INT NOT NULL DEFAULT 0,
  expiring_points INT DEFAULT 0,
  expiry_date TIMESTAMP WITH TIME ZONE,
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sync_method TEXT NOT NULL, -- 'email_parser', 'sms', 'oauth', 'manual'
  sync_source TEXT, -- e.g., 'gmail', 'outlook', 'sms_android', 'api'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, program_id, account_number_masked)
);

-- ─── Points Transaction History ────────────────────────────
CREATE TABLE IF NOT EXISTS public.points_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES public.linked_accounts(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'credit', 'debit', 'expired', 'redeemed', 'transfer'
  points INT NOT NULL,
  description TEXT,
  source TEXT, -- 'email_receipt', 'sms_alert', 'manual_entry', 'api_sync'
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Email Sync Accounts (OAuth Connections) ───────────────
CREATE TABLE IF NOT EXISTS public.email_sync_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'gmail', 'outlook', 'yahoo'
  email_address TEXT NOT NULL,
  oauth_token TEXT NOT NULL, -- Encrypted in production
  oauth_refresh_token TEXT, -- Encrypted
  token_expires_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'connected', -- 'connected', 'needs_reauth', 'error'
  error_message TEXT,
  programs_found INT DEFAULT 0,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- ─── SMS Detection Settings ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sms_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  sms_detection_enabled BOOLEAN DEFAULT TRUE,
  auto_create_accounts BOOLEAN DEFAULT TRUE,
  confidence_threshold DECIMAL(3, 2) DEFAULT 0.85,
  last_sms_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Push Notification Settings ────────────────────────────
CREATE TABLE IF NOT EXISTS public.push_notification_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  expiry_alerts_enabled BOOLEAN DEFAULT TRUE,
  expiry_warning_days INT[] DEFAULT '{15,30,45,90}',
  earning_alerts_enabled BOOLEAN DEFAULT TRUE,
  offer_alerts_enabled BOOLEAN DEFAULT TRUE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  push_token TEXT,
  last_token_refresh_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Parsed Email Statements (for audit/debug) ─────────────
CREATE TABLE IF NOT EXISTS public.email_statements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email_sync_account_id UUID REFERENCES public.email_sync_accounts(id) ON DELETE SET NULL,
  from_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL,
  matched_program_id UUID REFERENCES public.loyalty_programs(id),
  extracted_balance INT,
  extracted_account_number TEXT,
  extracted_expiry_date TIMESTAMP WITH TIME ZONE,
  parser_confidence DECIMAL(3, 2),
  parsed_successfully BOOLEAN DEFAULT FALSE,
  raw_text_preview TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Detected SMS Messages (Android SMS Reader) ────────────
CREATE TABLE IF NOT EXISTS public.sms_detections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  sms_body TEXT NOT NULL,
  matched_program_id UUID REFERENCES public.loyalty_programs(id),
  extracted_points INT,
  extracted_account_number TEXT,
  detector_confidence DECIMAL(3, 2),
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL,
  action_taken TEXT, -- 'auto_added', 'manual_review', 'ignored'
  created_linked_account_id UUID REFERENCES public.linked_accounts(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Expiry Alert History ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.expiry_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  linked_account_id UUID NOT NULL REFERENCES public.linked_accounts(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- '90days', '45days', '30days', '15days', 'expired'
  points_at_risk INT,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_push_notification BOOLEAN DEFAULT FALSE,
  acknowledged_by_user BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMP WITH TIME ZONE
);

-- ─── Indexes for Performance ───────────────────────────────
CREATE INDEX IF NOT EXISTS idx_linked_accounts_user_id ON public.linked_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_linked_accounts_program_id ON public.linked_accounts(program_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_account_id ON public.points_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_date ON public.points_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_email_sync_user_id ON public.email_sync_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_statements_user_id ON public.email_statements(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_detections_user_id ON public.sms_detections(user_id);
CREATE INDEX IF NOT EXISTS idx_expiry_alerts_user_id ON public.expiry_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_expiry_alerts_triggered ON public.expiry_alerts(triggered_at DESC);

-- ─── Views for Analytics ───────────────────────────────────
CREATE OR REPLACE VIEW public.user_portfolio_summary AS
SELECT
  u.id as user_id,
  u.email,
  COUNT(DISTINCT la.id) as linked_accounts_count,
  COALESCE(SUM(la.current_balance), 0) as total_points,
  COALESCE(SUM(la.current_balance * lp.point_value_inr), 0) as portfolio_value_inr,
  COALESCE(SUM(CASE WHEN la.expiring_points > 0 THEN la.expiring_points ELSE 0 END), 0) as expiring_points,
  MAX(la.last_synced_at) as last_sync_at
FROM public.users u
LEFT JOIN public.linked_accounts la ON u.id = la.user_id AND la.is_active = TRUE
LEFT JOIN public.loyalty_programs lp ON la.program_id = lp.id
GROUP BY u.id, u.email;

CREATE OR REPLACE VIEW public.category_summary AS
SELECT
  la.user_id,
  lp.category,
  COUNT(DISTINCT la.id) as brand_count,
  COALESCE(SUM(la.current_balance), 0) as total_points,
  COALESCE(SUM(la.current_balance * lp.point_value_inr), 0) as portfolio_value_inr,
  COALESCE(SUM(la.expiring_points), 0) as expiring_points
FROM public.linked_accounts la
JOIN public.loyalty_programs lp ON la.program_id = lp.id
WHERE la.is_active = TRUE
GROUP BY la.user_id, lp.category;
