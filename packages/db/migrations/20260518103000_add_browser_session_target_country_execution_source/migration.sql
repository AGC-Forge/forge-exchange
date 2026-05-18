-- AlterTable
ALTER TABLE "browser_sessions"
ADD COLUMN "target_country" VARCHAR(2),
ADD COLUMN "observed_country" VARCHAR(2),
ADD COLUMN "execution_source" VARCHAR(20) NOT NULL DEFAULT 'none';

-- CreateIndex
CREATE INDEX "idx_sessions_target_country" ON "browser_sessions" ("target_country");

-- CreateIndex
CREATE INDEX "idx_sessions_observed_country" ON "browser_sessions" ("observed_country");

-- CreateIndex
CREATE INDEX "idx_sessions_execution_source" ON "browser_sessions" ("execution_source");
