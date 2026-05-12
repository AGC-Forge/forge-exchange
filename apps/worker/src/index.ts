// ============================================================
// Worker Entry Point — worker/index.ts
// Boot worker, connect Redis, start consuming jobs
// ============================================================

import { Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import os from "node:os";
import { BrowserPoolManager } from "./engine/browser-pool.js";
import { SessionRunner } from "./engine/session-runner.js";
import {
  PremiumSessionRunner
} from "./engine/premium-session-runner.js";
import { WorkerLogger } from "./utils/logger.js";
import type { CampaignJobPayload } from "@forge-exchange/worker-kit";
import { createWorkerReporter } from "./utils/create-worker-reporter.js";

const QUEUE_NAMES = {
  CAMPAIGN: "campaign_queue",
  SESSION: "session_queue",
  HEALTH: "health_queue",
};

const redis = new IORedis.Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// ── Singletons ────────────────────────────────────────────────
const logger = new WorkerLogger();
const pool = new BrowserPoolManager({
  maxBrowsers: Number(process.env.MAX_BROWSERS || 5),
});
const resolvedWorkerId =
  process.env.WORKER_ID ||
  process.env.HOSTNAME ||
  os.hostname() ||
  "worker-01";
const reporter = createWorkerReporter(redis, { workerId: resolvedWorkerId, logger });

// ── Runner instances ──────────────────────────────────────────
const standardRunner = new SessionRunner({
  pool, redis, logger,
})

const premiumRunner = new PremiumSessionRunner({
  redis, logger,
})

const campaignWorker = new Worker(
  QUEUE_NAMES.CAMPAIGN,
  async (job: Job<CampaignJobPayload>) => {
    const { sessionMode, campaignId } = job.data

    logger.info(`Job received: ${job.id}`, {
      campaignId,
      sessionMode: sessionMode ?? 'standard',
      provider: job.data.provider,
    })

    const [stopped, paused] = await Promise.all([
      redis.get(`campaign:stop:${campaignId}`),
      redis.get(`campaign:pause:${campaignId}`),
    ])

    if (stopped) {
      logger.info(`Campaign ${campaignId} sudah di-stop, skip job`)
      return { skipped: true, reason: 'stopped' }
    }

    if (paused) {
      logger.info(`Campaign ${campaignId} dijeda, skip job`)
      return { skipped: true, reason: 'paused' }
    }

    if (sessionMode === 'premium') {
      if (!job.data.provider) {
        throw new Error(
          `Campaign ${campaignId}: sessionMode='premium' but the provider is empty. ` +
          `Please select a provider in campaign config.`
        )
      }

      logger.info(`Routing to PREMIUM runner via ${job.data.provider}`, { campaignId })

      return premiumRunner.run({
        ...job.data,
        sessionMode: 'premium',
        mode: 'premium',
        provider: job.data.provider,
        os: job.data.os ?? 'windows',
        osVersion: job.data.osVersion,
        browser: job.data.browserType ?? 'chrome',
        browserVersion: job.data.browserVersion,
      })
    }

    logger.info(`Routing to STANDARD runner`, { campaignId })
    return standardRunner.run(job.data)
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

const healthWorker = new Worker(
  QUEUE_NAMES.HEALTH,
  async () => {
    const stats = pool.getStats()
    await reporter.reportHealth(stats)
    return stats
  },
  { connection: redis, concurrency: 1 },
)
// ── Redis pub/sub — listen for stop/pause signals ─────────────
const subscriber = redis.duplicate()
await subscriber.subscribe('campaign:stop', 'campaign:pause')

subscriber.on('message', async (channel, message) => {
  try {
    const { campaignId } = JSON.parse(message)
    if (channel === 'campaign:stop') {
      await redis.setex(`campaign:stop:${campaignId}`, 3600, '1')
      logger.info(`Stop signal received: ${campaignId}`)
    } else if (channel === 'campaign:pause') {
      await redis.setex(`campaign:pause:${campaignId}`, 86400, '1')
      logger.info(`Pause signal received: ${campaignId}`)
    }
  } catch (e: any) {
    logger.error('Pub/sub message error', { error: e.message })
  }
})

campaignWorker.on('completed', (job, result) => {
  if (result?.skipped) {
    logger.info(`Job ${job.id} skipped: ${result.reason}`)
    return
  }
  logger.info(`Job ${job.id} completed`, {
    campaignId: job.data.campaignId,
    sessionMode: job.data.sessionMode ?? 'standard',
    provider: job.data.provider,
  })
})

campaignWorker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed`, {
    campaignId: job?.data?.campaignId,
    sessionMode: job?.data?.sessionMode,
    provider: job?.data?.provider,
    error: err.message,
  })
})

campaignWorker.on('error', (err) => {
  logger.error('Campaign worker error', { error: err.message })
})

// ── Graceful shutdown ─────────────────────────────────────────
async function shutdown(signal: string) {
  logger.info(`Shutdown signal received: ${signal}`)

  await Promise.allSettled([
    campaignWorker.close(),
    healthWorker.close(),
  ])

  await pool.closeAll()
  await subscriber.unsubscribe()
  await redis.quit()

  logger.info('Worker shutdown complete')
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))


// ── Boot ──────────────────────────────────────────────────────
async function boot() {
  logger.info('🚀 Worker starting...', {
    workerId: process.env.WORKER_ID || 'worker-01',
    maxBrowsers: process.env.MAX_BROWSERS || 5,
    maxConcurrent: process.env.MAX_CONCURRENT || 5,
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    modes: ['standard', 'premium'],
  })

  // Register worker ke database via reporter
  await reporter.register()

  // Start health heartbeat setiap 30 detik
  setInterval(() => reporter.heartbeat(pool.getStats()), 30_000)

  logger.info('✅ Worker ready — routing: standard + premium modes')
}

boot().catch(err => {
  console.error('Worker boot failed:', err)
  process.exit(1)
})
