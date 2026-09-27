-- server/db/migrations/20260925_007_extraction_source.sql
-- PointzPlus: record whether a parsed statement came from the AI extractor or
-- the deterministic rules engine, so balances can be audited and re-run later.
--
-- The AI layer is optional (enabled only when GEMINI_API_KEY / OPENAI_API_KEY is
-- set) and falls back to regex rules, so without this column there is no way to
-- tell a rule-parsed balance from an LLM-inferred one after the fact.

ALTER TABLE public.email_statements
  ADD COLUMN IF NOT EXISTS extraction_source TEXT;

-- Existing rows predate the AI layer, so they were all rules-based.
UPDATE public.email_statements
  SET extraction_source = 'rule_parser'
  WHERE extraction_source IS NULL;
