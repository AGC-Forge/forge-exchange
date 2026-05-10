// ============================================================
// Worker Entry Point — worker/index.ts
// Boot worker, connect Redis, start consuming jobs
// ============================================================

import { Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import { BrowserPoolManager } from "./engine/browser-pool.js";
import { SessionRunner } from "./engine/session-runner.js";
import { WorkerReporter } from "./utils/reporter.js";
import { WorkerLogger } from "./utils/logger.js";
import type { CampaignJobPayload } from "../server/services/queue.js";

const QUEUE_NAMES = {
  CAMPAIGN: "campaign_queue",
  SESSION: "session_queue",
  HEALTH: "health_queue",
};

// ── Redis connection ──────────────────────────────────────────
const redis = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// ── Singletons ────────────────────────────────────────────────
const logger = new WorkerLogger();
const pool = new BrowserPoolManager({
  maxBrowsers: Number(process.env.MAX_BROWSERS || 5),
});
const reporter = new WorkerReporter(
  redis,
  process.env.WORKER_ID || "worker-01",
);

// ── Campaign queue consumer ───────────────────────────────────
const campaignWorker = new Worker(
  QUEUE_NAMES.CAMPAIGN,
  async (job: Job<CampaignJobPayload>) => {
    logger.info(`Processing campaign job: ${job.id}`, {
      campaignId: job.data.campaignId,
    });

    const runner = new SessionRunner({ pool, redis, logger, reporter });

    // Check stop/pause signal sebelum mulai
    const stopped = await redis.get(`campaign:stop:${job.data.campaignId}`);
    if (stopped) {
      logger.info(`Campaign ${job.data.campaignId} sudah di-stop, skip job`);
      return { skipped: true };
    }

    return runner.run(job.data);
  },
  {
    connection: redis,
    concurrency: Number(process.env.MAX_CONCURRENT || 5),
    limiter: {
      max: 10,
      duration: 1000, // max 10 jobs per second
    },
  },
);

// ── Health check consumer ─────────────────────────────────────
const healthWorker = new Worker(
  QUEUE_NAMES.HEALTH,
  async () => {
    const stats = await pool.getStats();
    await reporter.reportHealth(stats);
    return stats;
  },
  { connection: redis, concurrency: 1 },
);

// ── Redis pub/sub — listen for stop/pause signals ─────────────
const subscriber = redis.duplicate();
await subscriber.subscribe("campaign:stop", "campaign:pause");

subscriber.on("message", async (channel, message) => {
  try {
    const { campaignId } = JSON.parse(message);
    if (channel === "campaign:stop") {
      await redis.setex(`campaign:stop:${campaignId}`, 3600, "1");
      logger.info(`Stop signal received for campaign: ${campaignId}`);
    } else if (channel === "campaign:pause") {
      await redis.setex(`campaign:pause:${campaignId}`, 86400, "1");
      logger.info(`Pause signal received for campaign: ${campaignId}`);
    }
  } catch (e) {
    logger.error("Failed to handle pub/sub message", { error: e });
  }
});

// ── Event handlers ────────────────────────────────────────────
campaignWorker.on("completed", (job, result) => {
  logger.info(`Job ${job.id} completed`, {
    campaignId: job.data.campaignId,
    result,
  });
});

campaignWorker.on("failed", (job, err) => {
  logger.error(`Job ${job?.id} failed`, {
    campaignId: job?.data?.campaignId,
    error: err.message,
  });
});

campaignWorker.on("error", (err) => {
  logger.error("Campaign worker error", { error: err.message });
});

// ── Graceful shutdown ─────────────────────────────────────────
async function shutdown() {
  logger.info("Shutting down worker gracefully...");
  await campaignWorker.close();
  await healthWorker.close();
  await pool.closeAll();
  await subscriber.unsubscribe();
  await redis.quit();
  logger.info("Worker shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// ── Boot ──────────────────────────────────────────────────────
async function boot() {
  logger.info("🚀 Worker starting...", {
    workerId: process.env.WORKER_ID || "worker-01",
    maxBrowsers: process.env.MAX_BROWSERS || 5,
    maxConcurrent: process.env.MAX_CONCURRENT || 5,
    redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  });

  // Register worker ke database via reporter
  await reporter.register();

  // Start health heartbeat setiap 30 detik
  setInterval(() => reporter.heartbeat(pool.getStats()), 30_000);

  logger.info("✅ Worker ready and consuming jobs");
}

boot().catch((err) => {
  console.error("Worker boot failed:", err);
  process.exit(1);
});
