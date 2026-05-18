ALTER TABLE "browser_sessions"
ADD COLUMN IF NOT EXISTS "target_country" VARCHAR(2),
ADD COLUMN IF NOT EXISTS "observed_country" VARCHAR(2),
ADD COLUMN IF NOT EXISTS "execution_source" VARCHAR(20) NOT NULL DEFAULT 'none';

CREATE INDEX IF NOT EXISTS "idx_sessions_target_country"
ON "browser_sessions" ("target_country");

CREATE INDEX IF NOT EXISTS "idx_sessions_observed_country"
ON "browser_sessions" ("observed_country");

CREATE INDEX IF NOT EXISTS "idx_sessions_execution_source"
ON "browser_sessions" ("execution_source");
