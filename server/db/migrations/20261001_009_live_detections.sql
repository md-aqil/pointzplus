-- Migration 20261001_009_live_detections.sql
-- Adds live_detections jsonb column to sync_jobs for streaming real-time loyalty discoveries to the UI

ALTER TABLE sync_jobs
ADD COLUMN IF NOT EXISTS live_detections jsonb DEFAULT '[]'::jsonb;
