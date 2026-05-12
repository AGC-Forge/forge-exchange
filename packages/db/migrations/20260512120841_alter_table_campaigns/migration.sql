-- CreateEnum
CREATE TYPE "CampaignCustomClickOrder" AS ENUM ('sequential', 'random');

-- CreateEnum
CREATE TYPE "CampaignSessionMode" AS ENUM ('standard', 'premium');

-- CreateEnum
CREATE TYPE "BrowserType" AS ENUM ('chrome', 'firefox', 'safari', 'edge', 'opera');

-- CreateEnum
CREATE TYPE "OSType" AS ENUM ('windows', 'macos', 'linux', 'android', 'ios');

-- CreateEnum
CREATE TYPE "ProviderAntidetectType" AS ENUM (
  'gologin',
  'adspower',
  'multilogin',
  'dolphin',
  'nstbrowser'
);

-- AlterTable
ALTER TABLE "campaigns"
ADD COLUMN "browser_type" "BrowserType",
ADD COLUMN "browser_version" VARCHAR(50),
ADD COLUMN "custom_click_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "custom_click_max_per_session" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "custom_click_order" "CampaignCustomClickOrder" NOT NULL DEFAULT 'sequential',
ADD COLUMN "custom_click_targets" JSONB,
ADD COLUMN "os" "OSType",
ADD COLUMN "os_version" VARCHAR(50),
ADD COLUMN "provider" "ProviderAntidetectType",
ADD COLUMN "session_mode" "CampaignSessionMode" NOT NULL DEFAULT 'standard';

-- CreateIndex
CREATE UNIQUE INDEX "analytics_events_id_created_at_key" ON "analytics_events" ("id", "created_at");

-- CreateIndex
CREATE INDEX "idx_campaigns_session_mode" ON "campaigns" ("session_mode");

-- CreateIndex
CREATE UNIQUE INDEX "system_logs_id_created_at_key" ON "system_logs" ("id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "traffic_logs_id_created_at_key" ON "traffic_logs" ("id", "created_at");
