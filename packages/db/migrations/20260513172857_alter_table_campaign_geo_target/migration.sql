-- AlterTable
ALTER TABLE "campaign_geo_targets"
ADD COLUMN "integration_id" UUID,
ADD COLUMN "proxy_source" VARCHAR(20) NOT NULL DEFAULT 'none';

-- CreateIndex
CREATE INDEX "idx_geo_targets_integration_id" ON "campaign_geo_targets" ("integration_id");

-- CreateIndex
CREATE INDEX "idx_geo_targets_proxy_source" ON "campaign_geo_targets" ("proxy_source");

-- AddForeignKey
ALTER TABLE "campaign_geo_targets" ADD CONSTRAINT "campaign_geo_targets_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
