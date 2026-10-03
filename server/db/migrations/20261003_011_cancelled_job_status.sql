-- Migration 20261003_011_cancelled_job_status.sql
-- Adds 'cancelled' to sync_job_status enum

ALTER TYPE sync_job_status ADD VALUE IF NOT EXISTS 'cancelled';
