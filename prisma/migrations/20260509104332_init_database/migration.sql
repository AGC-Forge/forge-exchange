-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'moderator', 'admin', 'superadmin');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'queued', 'running', 'paused', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "GeoMode" AS ENUM ('single', 'multiple', 'weighted', 'dynamic');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('desktop', 'mobile', 'tablet', 'random');

-- CreateEnum
CREATE TYPE "SpeedMode" AS ENUM ('slow', 'normal', 'fast');

-- CreateEnum
CREATE TYPE "ProxyType" AS ENUM ('http', 'https', 'socks5', 'residential', 'mobile', 'isp', 'rotating');

-- CreateEnum
CREATE TYPE "ProxyStatus" AS ENUM ('active', 'inactive', 'testing', 'banned', 'error');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled', 'timeout');

-- CreateEnum
CREATE TYPE "SessionMode" AS ENUM ('ephemeral', 'sticky', 'persistent', 'multilogin');

-- CreateEnum
CREATE TYPE "WorkerStatus" AS ENUM ('online', 'offline', 'busy', 'error', 'restarting');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('free', 'starter', 'pro', 'enterprise');

-- CreateEnum
CREATE TYPE "CreditType" AS ENUM ('debit', 'credit', 'refund', 'bonus');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('pending', 'paid', 'failed', 'refunded', 'expired');

-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('residential_proxy', 'mobile_proxy', 'multilogin', 'gologin', 'adspower', 'capmonster', 'twocaptcha', 'turnstile');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('waiting', 'active', 'completed', 'failed', 'delayed', 'paused');

-- CreateEnum
CREATE TYPE "BrowserEngine" AS ENUM ('chromium', 'firefox', 'webkit');

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" "UserRole" NOT NULL DEFAULT 'user',
    "level" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT,
    "name" VARCHAR(255),
    "avatar_url" VARCHAR(500),
    "timezone" VARCHAR(100) DEFAULT 'UTC',
    "role_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verified_at" TIMESTAMPTZ,
    "last_login_at" TIMESTAMPTZ,
    "last_login_ip" VARCHAR(45),
    "oauth_provider" VARCHAR(50),
    "oauth_provider_id" VARCHAR(255),
    "api_key" VARCHAR(64),
    "api_key_created_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "token" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "expires" TIMESTAMPTZ NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "resource" VARCHAR(100) NOT NULL,
    "resource_id" UUID,
    "old_value" JSONB,
    "new_value" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'free',
    "credit_limit" BIGINT NOT NULL DEFAULT 100,
    "credit_used" BIGINT NOT NULL DEFAULT 0,
    "credit_balance" BIGINT NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expired_at" TIMESTAMPTZ,
    "renewed_at" TIMESTAMPTZ,
    "cancelled_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "CreditType" NOT NULL,
    "source" VARCHAR(100) NOT NULL,
    "source_id" UUID,
    "description" VARCHAR(500),
    "balance_before" BIGINT NOT NULL,
    "balance_after" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "credit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "top_up_transactions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "amount_idr" BIGINT NOT NULL,
    "amount_usd" DECIMAL(10,2),
    "credits_purchased" BIGINT NOT NULL,
    "gateway" VARCHAR(50) NOT NULL,
    "gateway_ref" VARCHAR(255),
    "gateway_payload" JSONB,
    "status" "TransactionStatus" NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMPTZ,
    "expired_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "top_up_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "target_url" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'draft',
    "daily_limit" INTEGER NOT NULL DEFAULT 100,
    "total_limit" INTEGER,
    "max_concurrent" INTEGER NOT NULL DEFAULT 5,
    "speed_mode" "SpeedMode" NOT NULL DEFAULT 'normal',
    "device_type" "DeviceType" NOT NULL DEFAULT 'desktop',
    "geo_mode" "GeoMode" NOT NULL DEFAULT 'single',
    "behavior_profile_id" UUID,
    "min_duration" INTEGER NOT NULL DEFAULT 30,
    "max_duration" INTEGER NOT NULL DEFAULT 180,
    "bounce_rate" INTEGER NOT NULL DEFAULT 20,
    "schedule_enabled" BOOLEAN NOT NULL DEFAULT false,
    "schedule_start" VARCHAR(5),
    "schedule_end" VARCHAR(5),
    "schedule_days" INTEGER[],
    "timezone" VARCHAR(100) NOT NULL DEFAULT 'UTC',
    "total_sessions" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "fail_count" INTEGER NOT NULL DEFAULT 0,
    "today_count" INTEGER NOT NULL DEFAULT 0,
    "webhook_url" VARCHAR(500),
    "webhook_enabled" BOOLEAN NOT NULL DEFAULT false,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_geo_targets" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "campaign_id" UUID NOT NULL,
    "country" VARCHAR(2) NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 100,
    "proxy_pool_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "campaign_geo_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "behavior_profiles" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "mouse_movement" BOOLEAN NOT NULL DEFAULT true,
    "mouseSpeed" VARCHAR(20) NOT NULL DEFAULT 'normal',
    "scroll_enabled" BOOLEAN NOT NULL DEFAULT true,
    "scroll_depth" INTEGER NOT NULL DEFAULT 70,
    "internal_link_click" BOOLEAN NOT NULL DEFAULT true,
    "link_click_rate" INTEGER NOT NULL DEFAULT 30,
    "idle_pause_enabled" BOOLEAN NOT NULL DEFAULT true,
    "tab_switching" BOOLEAN NOT NULL DEFAULT false,
    "keyboard_typing" BOOLEAN NOT NULL DEFAULT false,
    "custom_click_enabled" BOOLEAN NOT NULL DEFAULT false,
    "custom_click_targets" JSONB,
    "custom_click_order" VARCHAR(20) NOT NULL DEFAULT 'sequential',
    "custom_click_max_per_session" INTEGER NOT NULL DEFAULT 3,
    "readingSpeed" VARCHAR(20) NOT NULL DEFAULT 'normal',
    "attention_span" INTEGER NOT NULL DEFAULT 60,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "behavior_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proxy_pools" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(255),
    "type" "ProxyType" NOT NULL,
    "host" VARCHAR(255) NOT NULL,
    "port" INTEGER NOT NULL,
    "username" VARCHAR(255),
    "password" TEXT,
    "country" VARCHAR(2),
    "city" VARCHAR(100),
    "is_shared" BOOLEAN NOT NULL DEFAULT false,
    "status" "ProxyStatus" NOT NULL DEFAULT 'testing',
    "last_tested_at" TIMESTAMPTZ,
    "response_time_ms" INTEGER,
    "success_rate" DOUBLE PRECISION DEFAULT 0,
    "uptime" DOUBLE PRECISION DEFAULT 0,
    "block_rate" DOUBLE PRECISION DEFAULT 0,
    "is_blacklisted" BOOLEAN NOT NULL DEFAULT false,
    "blacklist_checked_at" TIMESTAMPTZ,
    "rotation_interval" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "proxy_pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proxy_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "proxy_id" UUID NOT NULL,
    "session_id" UUID,
    "success" BOOLEAN NOT NULL,
    "response_time" INTEGER,
    "error_message" TEXT,
    "ip_returned" VARCHAR(45),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "proxy_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fingerprints" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "browser_engine" "BrowserEngine" NOT NULL DEFAULT 'chromium',
    "user_agent" TEXT NOT NULL,
    "platform" VARCHAR(50) NOT NULL,
    "language" VARCHAR(10) NOT NULL,
    "languages" TEXT[],
    "timezone" VARCHAR(100) NOT NULL,
    "screen_width" INTEGER NOT NULL,
    "screen_height" INTEGER NOT NULL,
    "color_depth" INTEGER NOT NULL DEFAULT 24,
    "pixel_ratio" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "hardware_concurrency" INTEGER NOT NULL DEFAULT 4,
    "device_memory" INTEGER,
    "max_touch_points" INTEGER NOT NULL DEFAULT 0,
    "webgl" JSONB,
    "canvas" JSONB,
    "audio_context" JSONB,
    "fonts" TEXT[],
    "plugins" JSONB,
    "media_devices" JSONB,
    "geo_lat" DOUBLE PRECISION,
    "geo_lng" DOUBLE PRECISION,
    "geo_country" VARCHAR(2),
    "times_used" INTEGER NOT NULL DEFAULT 0,
    "last_used_at" TIMESTAMPTZ,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fingerprints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_nodes" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(100) NOT NULL,
    "hostname" VARCHAR(255) NOT NULL,
    "ip_address" VARCHAR(45) NOT NULL,
    "region" VARCHAR(100),
    "status" "WorkerStatus" NOT NULL DEFAULT 'offline',
    "max_browsers" INTEGER NOT NULL DEFAULT 5,
    "active_browsers" INTEGER NOT NULL DEFAULT 0,
    "max_concurrent" INTEGER NOT NULL DEFAULT 20,
    "active_sessions" INTEGER NOT NULL DEFAULT 0,
    "cpu_usage" DOUBLE PRECISION,
    "ram_usage" DOUBLE PRECISION,
    "ram_total" BIGINT,
    "ram_used" BIGINT,
    "crash_rate" DOUBLE PRECISION DEFAULT 0,
    "last_heartbeat_at" TIMESTAMPTZ,
    "last_restart_at" TIMESTAMPTZ,
    "uptime_since" TIMESTAMPTZ,
    "version" VARCHAR(50),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "worker_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "worker_id" UUID NOT NULL,
    "level" VARCHAR(20) NOT NULL,
    "message" TEXT NOT NULL,
    "context" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "worker_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "browser_sessions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "campaign_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "proxy_id" UUID,
    "fingerprint_id" UUID,
    "worker_id" UUID,
    "status" "SessionStatus" NOT NULL DEFAULT 'pending',
    "mode" "SessionMode" NOT NULL DEFAULT 'ephemeral',
    "target_url" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip_used" VARCHAR(45),
    "country" VARCHAR(2),
    "duration_ms" BIGINT,
    "pages_visited" INTEGER NOT NULL DEFAULT 0,
    "bytes_transferred" BIGINT,
    "scroll_depth" INTEGER,
    "error_type" VARCHAR(100),
    "error_message" TEXT,
    "credits_used" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ,
    "cookie_data" JSONB,
    "storage_data" JSONB,

    CONSTRAINT "browser_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

    CONSTRAINT "traffic_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queue_jobs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "queue" VARCHAR(100) NOT NULL,
    "job_id" VARCHAR(255) NOT NULL,
    "campaign_id" UUID,
    "worker_id" UUID,
    "status" "JobStatus" NOT NULL DEFAULT 'waiting',
    "payload" JSONB NOT NULL,
    "result" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "error_msg" TEXT,
    "stack_trace" TEXT,
    "scheduled_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "queue_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "type" "IntegrationType" NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "credentials" JSONB NOT NULL,
    "config" JSONB,
    "last_tested_at" TIMESTAMPTZ,
    "is_healthy" BOOLEAN,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "level" VARCHAR(20) NOT NULL,
    "service" VARCHAR(100) NOT NULL,
    "message" TEXT NOT NULL,
    "context" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geo_targets" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "country_code" VARCHAR(2) NOT NULL,
    "country_name" VARCHAR(100) NOT NULL,
    "region" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "proxy_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "geo_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "group_name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "role_name_idx" ON "roles"("name");

-- CreateIndex
CREATE INDEX "role_level_idx" ON "roles"("level");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_level_key" ON "roles"("name", "level");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_api_key_key" ON "users"("api_key");

-- CreateIndex
CREATE INDEX "idx_users_role_id" ON "users"("role_id");

-- CreateIndex
CREATE INDEX "idx_users_created_at" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "idx_users_api_key" ON "users"("api_key");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_role_id_key" ON "users"("email", "role_id");

-- CreateIndex
CREATE INDEX "account_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE INDEX "account_provider_idx" ON "accounts"("provider");

-- CreateIndex
CREATE INDEX "account_created_at_idx" ON "accounts"("created_at");

-- CreateIndex
CREATE INDEX "account_updated_at_idx" ON "accounts"("updated_at");

-- CreateIndex
CREATE INDEX "account_deleted_at_idx" ON "accounts"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE INDEX "verification_token_token_idx" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_token_idx" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "password_reset_expires_idx" ON "password_reset_tokens"("expires");

-- CreateIndex
CREATE INDEX "password_reset_created_at_idx" ON "password_reset_tokens"("created_at");

-- CreateIndex
CREATE INDEX "idx_audit_logs_user_id" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_action" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_user_id_key" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "idx_subscriptions_user_id" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "idx_subscriptions_plan" ON "subscriptions"("plan");

-- CreateIndex
CREATE INDEX "idx_subscriptions_expired_at" ON "subscriptions"("expired_at");

-- CreateIndex
CREATE INDEX "idx_credit_logs_user_id" ON "credit_logs"("user_id");

-- CreateIndex
CREATE INDEX "idx_credit_logs_type" ON "credit_logs"("type");

-- CreateIndex
CREATE INDEX "idx_credit_logs_created_at" ON "credit_logs"("created_at");

-- CreateIndex
CREATE INDEX "idx_topup_user_id" ON "top_up_transactions"("user_id");

-- CreateIndex
CREATE INDEX "idx_topup_status" ON "top_up_transactions"("status");

-- CreateIndex
CREATE INDEX "idx_topup_gateway" ON "top_up_transactions"("gateway");

-- CreateIndex
CREATE INDEX "idx_topup_created_at" ON "top_up_transactions"("created_at");

-- CreateIndex
CREATE INDEX "idx_campaigns_user_id" ON "campaigns"("user_id");

-- CreateIndex
CREATE INDEX "idx_campaigns_status" ON "campaigns"("status");

-- CreateIndex
CREATE INDEX "idx_campaigns_user_created" ON "campaigns"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_campaigns_created_at" ON "campaigns"("created_at");

-- CreateIndex
CREATE INDEX "idx_campaign_user_status_created_at" ON "campaigns"("user_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "idx_geo_targets_campaign_id" ON "campaign_geo_targets"("campaign_id");

-- CreateIndex
CREATE INDEX "idx_geo_targets_country" ON "campaign_geo_targets"("country");

-- CreateIndex
CREATE INDEX "idx_proxy_pools_user_id" ON "proxy_pools"("user_id");

-- CreateIndex
CREATE INDEX "idx_proxy_pools_status" ON "proxy_pools"("status");

-- CreateIndex
CREATE INDEX "idx_proxy_pools_country" ON "proxy_pools"("country");

-- CreateIndex
CREATE INDEX "idx_proxy_pools_type" ON "proxy_pools"("type");

-- CreateIndex
CREATE INDEX "idx_proxy_user_status_country" ON "proxy_pools"("user_id", "status", "country");

-- CreateIndex
CREATE INDEX "idx_proxy_logs_proxy_id" ON "proxy_logs"("proxy_id");

-- CreateIndex
CREATE INDEX "idx_proxy_logs_proxy_created" ON "proxy_logs"("proxy_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_fingerprints_user_id" ON "fingerprints"("user_id");

-- CreateIndex
CREATE INDEX "idx_fingerprints_browser_engine" ON "fingerprints"("browser_engine");

-- CreateIndex
CREATE INDEX "idx_fingerprints_is_active" ON "fingerprints"("is_active");

-- CreateIndex
CREATE INDEX "idx_worker_nodes_status" ON "worker_nodes"("status");

-- CreateIndex
CREATE INDEX "idx_worker_nodes_region" ON "worker_nodes"("region");

-- CreateIndex
CREATE INDEX "idx_worker_logs_worker_id" ON "worker_logs"("worker_id");

-- CreateIndex
CREATE INDEX "idx_worker_logs_worker_created" ON "worker_logs"("worker_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_sessions_composite" ON "browser_sessions"("campaign_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "idx_sessions_campaign_id" ON "browser_sessions"("campaign_id");

-- CreateIndex
CREATE INDEX "idx_sessions_user_id" ON "browser_sessions"("user_id");

-- CreateIndex
CREATE INDEX "idx_sessions_proxy_id" ON "browser_sessions"("proxy_id");

-- CreateIndex
CREATE INDEX "idx_sessions_fingerprint_id" ON "browser_sessions"("fingerprint_id");

-- CreateIndex
CREATE INDEX "idx_sessions_worker_id" ON "browser_sessions"("worker_id");

-- CreateIndex
CREATE INDEX "idx_sessions_status" ON "browser_sessions"("status");

-- CreateIndex
CREATE INDEX "idx_sessions_campaign_created_at" ON "browser_sessions"("campaign_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_sessions_worker_id_status" ON "browser_sessions"("worker_id", "status");

-- CreateIndex
CREATE INDEX "idx_analytics_events_campaign_id" ON "analytics_events"("campaign_id");

-- CreateIndex
CREATE INDEX "idx_analytics_events_session_id" ON "analytics_events"("session_id");

-- CreateIndex
CREATE INDEX "idx_analytics_events_country" ON "analytics_events"("country");

-- CreateIndex
CREATE INDEX "idx_analytics_campaign_created" ON "analytics_events"("campaign_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_events_id_created_at_key" ON "analytics_events"("id", "created_at");

-- CreateIndex
CREATE INDEX "idx_traffic_logs_campaign_id" ON "traffic_logs"("campaign_id");

-- CreateIndex
CREATE INDEX "idx_traffic_logs_campaign_id_created_at" ON "traffic_logs"("campaign_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "traffic_logs_id_created_at_key" ON "traffic_logs"("id", "created_at");

-- CreateIndex
CREATE INDEX "idx_queue_jobs_queue" ON "queue_jobs"("queue");

-- CreateIndex
CREATE INDEX "idx_queue_jobs_status" ON "queue_jobs"("status");

-- CreateIndex
CREATE INDEX "idx_queue_jobs_campaign_id" ON "queue_jobs"("campaign_id");

-- CreateIndex
CREATE INDEX "idx_queue_jobs_worker_id" ON "queue_jobs"("worker_id");

-- CreateIndex
CREATE INDEX "idx_queue_jobs_created_at" ON "queue_jobs"("created_at");

-- CreateIndex
CREATE INDEX "idx_integrations_user_id" ON "integrations"("user_id");

-- CreateIndex
CREATE INDEX "idx_integrations_type" ON "integrations"("type");

-- CreateIndex
CREATE UNIQUE INDEX "integrations_user_id_type_key" ON "integrations"("user_id", "type");

-- CreateIndex
CREATE INDEX "idx_system_logs_level" ON "system_logs"("level");

-- CreateIndex
CREATE INDEX "idx_system_logs_service" ON "system_logs"("service");

-- CreateIndex
CREATE INDEX "idx_system_logs_created_at" ON "system_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "system_logs_id_created_at_key" ON "system_logs"("id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "geo_targets_country_code_key" ON "geo_targets"("country_code");

-- CreateIndex
CREATE INDEX "idx_geo_targets_is_active" ON "geo_targets"("is_active");

-- CreateIndex
CREATE INDEX "setting_key_idx" ON "settings"("key");

-- CreateIndex
CREATE INDEX "setting_group_name_idx" ON "settings"("group_name");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_group_name_key" ON "settings"("key", "group_name");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_logs" ADD CONSTRAINT "credit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "top_up_transactions" ADD CONSTRAINT "top_up_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_behavior_profile_id_fkey" FOREIGN KEY ("behavior_profile_id") REFERENCES "behavior_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_geo_targets" ADD CONSTRAINT "campaign_geo_targets_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_geo_targets" ADD CONSTRAINT "campaign_geo_targets_proxy_pool_id_fkey" FOREIGN KEY ("proxy_pool_id") REFERENCES "proxy_pools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proxy_pools" ADD CONSTRAINT "proxy_pools_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proxy_logs" ADD CONSTRAINT "proxy_logs_proxy_id_fkey" FOREIGN KEY ("proxy_id") REFERENCES "proxy_pools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fingerprints" ADD CONSTRAINT "fingerprints_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_logs" ADD CONSTRAINT "worker_logs_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "worker_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "browser_sessions" ADD CONSTRAINT "browser_sessions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "browser_sessions" ADD CONSTRAINT "browser_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "browser_sessions" ADD CONSTRAINT "browser_sessions_proxy_id_fkey" FOREIGN KEY ("proxy_id") REFERENCES "proxy_pools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "browser_sessions" ADD CONSTRAINT "browser_sessions_fingerprint_id_fkey" FOREIGN KEY ("fingerprint_id") REFERENCES "fingerprints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "browser_sessions" ADD CONSTRAINT "browser_sessions_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "worker_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "browser_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traffic_logs" ADD CONSTRAINT "traffic_logs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_jobs" ADD CONSTRAINT "queue_jobs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_jobs" ADD CONSTRAINT "queue_jobs_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "worker_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
