-- server/db/migrations/20260925_008_multi_email.sql
-- PointzPlus: allow a user to connect more than one mailbox.
--
-- email_sync_accounts had UNIQUE (user_id, provider), so a user could only ever
-- hold one Gmail connection — reconnecting silently replaced the existing row.
-- Users legitimately have several mailboxes (personal + work), and one scan
-- should cover all of them.
--
-- Uniqueness narrows to the individual mailbox, so re-authorising the same
-- address still updates in place rather than creating a duplicate.

ALTER TABLE public.email_sync_accounts
  DROP CONSTRAINT IF EXISTS email_sync_accounts_user_id_provider_key;

ALTER TABLE public.email_sync_accounts
  ADD CONSTRAINT email_sync_accounts_user_provider_email_key
  UNIQUE (user_id, provider, email_address);

CREATE INDEX IF NOT EXISTS idx_email_sync_user_provider
  ON public.email_sync_accounts(user_id, provider);

-- ─── Bind each scan job to the mailbox it should read ───────────────
-- Without this a job can only resolve "the user's gmail account", which is
-- ambiguous once several are connected. NULL keeps historic rows readable; the
-- worker falls back to the first connected account.
ALTER TABLE public.sync_jobs
  ADD COLUMN IF NOT EXISTS email_sync_account_id UUID
  REFERENCES public.email_sync_accounts(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_sync_jobs_account
  ON public.sync_jobs(email_sync_account_id);
