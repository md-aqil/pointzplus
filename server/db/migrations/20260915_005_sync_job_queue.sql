-- server/db/migrations/20260915_005_sync_job_queue.sql
-- Turn sync_jobs into a real, multi-instance-safe queue:
--   * atomic claiming (FOR UPDATE SKIP LOCKED) so two API instances can run
--     workers concurrently without ever processing the same job twice
--   * heartbeat + attempt tracking so a crashed worker's job is recovered
--   * live per-message progress for the mobile progress bar

ALTER TABLE sync_jobs
  ADD COLUMN IF NOT EXISTS locked_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS worker_id     TEXT,
  ADD COLUMN IF NOT EXISTS attempt_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error    TEXT;

-- The claim query filters on (status, created_at) and orders by created_at.
CREATE INDEX IF NOT EXISTS idx_sync_jobs_claim
  ON sync_jobs (status, created_at)
  WHERE status IN ('queued', 'fetching', 'parsing');

-- The stale-lock reaper scans in-flight rows by heartbeat time.
CREATE INDEX IF NOT EXISTS idx_sync_jobs_locked_at
  ON sync_jobs (locked_at)
  WHERE status IN ('fetching', 'parsing');
