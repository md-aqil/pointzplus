-- server/db/migrations/20260925_006_remove_coupons.sql
-- PointzPlus: remove the coupon / promo-token feature. Points only.
--
-- Rationale: the promo extractor matched any uppercase token followed by digits,
-- so bank account numbers (XXXXX12345), shipment tracking IDs (FFBA00) and UPI
-- references (SMSUPI0010) were all persisted as "coupon codes" with a 0.98
-- confidence score. The feature was withdrawn rather than patched, so the
-- sensitive rows are destroyed here instead of being filtered in the UI.

-- ─── Drop coupon data ─────────────────────────────────────────────
-- Any surviving rows may embed personal data, so remove the data itself.
DROP TABLE IF EXISTS public.extracted_coupons CASCADE;

-- The coupon_type enum is only referenced by the table above.
DROP TYPE IF EXISTS public.coupon_type;

-- ─── Remove the sync_jobs coupon counter ──────────────────────────
-- Kept in sync with the application: processSyncJob no longer reports coupons,
-- so the column would only ever hold a stale zero.
ALTER TABLE public.sync_jobs
  DROP COLUMN IF EXISTS coupons_extracted;
