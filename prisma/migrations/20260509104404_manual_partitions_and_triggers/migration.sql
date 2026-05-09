
BEGIN;
ALTER TABLE "campaign_geo_targets"
    DROP CONSTRAINT IF EXISTS "fk_geo_targets_proxy_pool";

ALTER TABLE "campaign_geo_targets"
    ADD CONSTRAINT "fk_geo_targets_proxy_pool"
    FOREIGN KEY ("proxy_pool_id")
    REFERENCES "proxy_pools"("id") ON DELETE SET NULL;

ALTER TABLE "proxy_logs"
    DROP CONSTRAINT IF EXISTS "fk_proxy_logs_session";

ALTER TABLE "proxy_logs"
    ADD CONSTRAINT "fk_proxy_logs_session"
    FOREIGN KEY ("session_id")
    REFERENCES "browser_sessions"("id") ON DELETE SET NULL;

DROP TABLE IF EXISTS "analytics_events" CASCADE;
CREATE TABLE "analytics_events" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "campaign_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "country" VARCHAR(2),
    "city" VARCHAR(100),
    "isp" VARCHAR(255),
    "asn" VARCHAR(50),
    "ip_hash" VARCHAR(64),
    "browser" VARCHAR(100),
    "browser_version" VARCHAR(50),
    "os" VARCHAR(100),
    "device_type" VARCHAR(20),
    "screen_size" VARCHAR(20),
    "duration" INTEGER,
    "bounce" BOOLEAN NOT NULL DEFAULT false,
    "referrer" TEXT,
    "exit_page" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id", "created_at")
) PARTITION BY RANGE ("created_at");

DROP TABLE IF EXISTS "traffic_logs" CASCADE;
CREATE TABLE "traffic_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "campaign_id" UUID NOT NULL,
    "session_id" UUID,
    "ip_hash" VARCHAR(64),
    "country" VARCHAR(2),
    "success" BOOLEAN NOT NULL,
    "duration" INTEGER,
    "credits_used" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "traffic_logs_pkey" PRIMARY KEY ("id", "created_at")
) PARTITION BY RANGE ("created_at");

DROP TABLE IF EXISTS "system_logs" CASCADE;
CREATE TABLE "system_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "level" VARCHAR(20) NOT NULL,
    "service" VARCHAR(100) NOT NULL,
    "message" TEXT NOT NULL,
    "context" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id", "created_at")
) PARTITION BY RANGE ("created_at");

DROP TABLE IF EXISTS "analytics_events_2025_01";
DROP TABLE IF EXISTS "analytics_events_2025_06";
DROP TABLE IF EXISTS "analytics_events_2026_01";
DROP TABLE IF EXISTS "analytics_events_2026_06";
DROP TABLE IF EXISTS "analytics_events_default";
DROP TABLE IF EXISTS "traffic_logs_2025_01";
DROP TABLE IF EXISTS "traffic_logs_2026_01";
DROP TABLE IF EXISTS "traffic_logs_2026_06";
DROP TABLE IF EXISTS "traffic_logs_default";
DROP TABLE IF EXISTS "system_logs_2026_01";
DROP TABLE IF EXISTS "system_logs_2026_06";
DROP TABLE IF EXISTS "system_logs_default";

CREATE TABLE "analytics_events_2025_01" PARTITION OF "analytics_events" FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE "analytics_events_2025_06" PARTITION OF "analytics_events" FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE "analytics_events_2026_01" PARTITION OF "analytics_events" FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE "analytics_events_2026_06" PARTITION OF "analytics_events" FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE "analytics_events_default" PARTITION OF "analytics_events" DEFAULT;
CREATE TABLE "traffic_logs_2025_01" PARTITION OF "traffic_logs" FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE "traffic_logs_2026_01" PARTITION OF "traffic_logs" FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE "traffic_logs_2026_06" PARTITION OF "traffic_logs" FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE "traffic_logs_default" PARTITION OF "traffic_logs" DEFAULT;
CREATE TABLE "system_logs_2026_01" PARTITION OF "system_logs" FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE "system_logs_2026_06" PARTITION OF "system_logs" FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE "system_logs_default" PARTITION OF "system_logs" DEFAULT;

ALTER TABLE "analytics_events" DROP CONSTRAINT IF EXISTS "analytics_events_campaign_id_fkey";
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE;

ALTER TABLE "analytics_events" DROP CONSTRAINT IF EXISTS "analytics_events_session_id_fkey";
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "browser_sessions"("id") ON DELETE CASCADE;

ALTER TABLE "traffic_logs" DROP CONSTRAINT IF EXISTS "traffic_logs_campaign_id_fkey";
ALTER TABLE "traffic_logs" ADD CONSTRAINT "traffic_logs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE;

ALTER TABLE "system_logs" DROP CONSTRAINT IF EXISTS "system_logs_user_id_fkey";
ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_analytics_events_campaign_id" ON "analytics_events"("campaign_id");
CREATE INDEX IF NOT EXISTS "idx_analytics_events_session_id" ON "analytics_events"("session_id");
CREATE INDEX IF NOT EXISTS "idx_analytics_events_country" ON "analytics_events"("country");
CREATE INDEX IF NOT EXISTS "idx_analytics_campaign_created" ON "analytics_events"("campaign_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_traffic_logs_campaign_id" ON "traffic_logs"("campaign_id");
CREATE INDEX IF NOT EXISTS "idx_traffic_logs_campaign_id_created_at" ON "traffic_logs"("campaign_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_system_logs_level" ON "system_logs"("level");
CREATE INDEX IF NOT EXISTS "idx_system_logs_service" ON "system_logs"("service");
CREATE INDEX IF NOT EXISTS "idx_system_logs_created_at" ON "system_logs"("created_at");

-- DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_campaigns_updated_at ON campaigns;
CREATE TRIGGER trg_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_proxy_pools_updated_at ON proxy_pools;
CREATE TRIGGER trg_proxy_pools_updated_at BEFORE UPDATE ON proxy_pools FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_worker_nodes_updated_at ON worker_nodes;
CREATE TRIGGER trg_worker_nodes_updated_at BEFORE UPDATE ON worker_nodes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_integrations_updated_at ON integrations;
CREATE TRIGGER trg_integrations_updated_at BEFORE UPDATE ON integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_top_up_updated_at ON top_up_transactions;
CREATE TRIGGER trg_top_up_updated_at BEFORE UPDATE ON top_up_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_behavior_profiles_updated_at ON behavior_profiles;
CREATE TRIGGER trg_behavior_profiles_updated_at BEFORE UPDATE ON behavior_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
COMMIT;
