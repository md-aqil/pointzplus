-- 20261003_012_token_version.sql
-- JWT revocation: bumping a user's token_version invalidates every token issued before it.
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 1;
