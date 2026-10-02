-- Migration 20261002_010_rejected_emails.sql
-- Adds rejected_emails jsonb column to sync_jobs for storing unextracted/skipped emails for diagnostics

ALTER TABLE sync_jobs
ADD COLUMN IF NOT EXISTS rejected_emails jsonb DEFAULT '[]'::jsonb;
