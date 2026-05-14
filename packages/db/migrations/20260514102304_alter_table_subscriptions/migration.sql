-- AlterTable
ALTER TABLE "top_up_transactions"
ADD COLUMN IF NOT EXISTS "external_id" TEXT,
ADD COLUMN IF NOT EXISTS "payment_url" TEXT,
ADD COLUMN IF NOT EXISTS "type" VARCHAR(20) NOT NULL DEFAULT 'topup',
ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_topup_type ON top_up_transactions (type);

CREATE INDEX IF NOT EXISTS idx_topup_external_id ON top_up_transactions (external_id);

UPDATE top_up_transactions
SET
  type = 'topup'
WHERE
  type = 'topup';
