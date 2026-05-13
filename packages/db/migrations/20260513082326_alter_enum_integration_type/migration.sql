ALTER TYPE "IntegrationType" ADD VALUE 'brightdata';

ALTER TYPE "IntegrationType" ADD VALUE 'oxylabs';

ALTER TYPE "IntegrationType" ADD VALUE 'iproyal';

ALTER TYPE "IntegrationType" ADD VALUE 'smartproxy';

ALTER TYPE "IntegrationType" ADD VALUE 'socks5_proxy';

ALTER TYPE "IntegrationType" ADD VALUE 'rotating_proxy';

ALTER TYPE "IntegrationType" ADD VALUE 'dolphin';

ALTER TYPE "IntegrationType" ADD VALUE 'nstbrowser';

ALTER TYPE "IntegrationType" ADD VALUE 'anticaptcha';

-- AlterTable
ALTER TABLE "integrations"
ALTER COLUMN "type"
SET DEFAULT 'brightdata';