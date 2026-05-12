import { Queue } from "bullmq";
import IORedis from "ioredis";
import type { CampaignJobPayload } from "@forge-exchange/worker-kit";

let _redis: IORedis | null = null;

export function getRedis(): IORedis {
  if (!_redis) {
    _redis = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
      db: parseInt(process.env.REDIS_DB || "0", 10),
      maxRetriesPerRequest: null, // required for BullMQ
      enableReadyCheck: false,
    });
  }
  return _redis;
}
const STANDARD_JOB_OPTS = {
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 500 },
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 1000,       // 1s → 2s → 4s
  },
}

const PREMIUM_JOB_OPTS = {
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 500 },
  attempts: 2,             // lebih sedikit retry — browser launch mahal
  backoff: {
    type: 'exponential' as const,
    delay: 3000,       // 3s → 6s
  },
}

const queues = new Map<string, Queue>()

export function getQueue(name: QueueName): Queue {
  if (!queues.has(name)) {
    queues.set(name, new Queue(name, {
      connection: getRedis(),
      defaultJobOptions: STANDARD_JOB_OPTS,
    }))
  }
  return queues.get(name)!
}
export const campaignQueue = () => getQueue(QUEUE_NAMES.CAMPAIGN)
export const analyticsQueue = () => getQueue(QUEUE_NAMES.ANALYTICS)
export const healthQueue = () => getQueue(QUEUE_NAMES.HEALTH)
export const retryQueue = () => getQueue(QUEUE_NAMES.RETRY)
export const sessionQueue = () => getQueue(QUEUE_NAMES.SESSION);
export const proxyQueue = () => getQueue(QUEUE_NAMES.PROXY);

// ── Add campaign job ──────────────────────────────────────────
export async function enqueueCampaignJob(
  payload: CampaignJobPayload,
  options?: { delay?: number; priority?: number },
) {
  const queue = campaignQueue();
  const jobOpts = payload.sessionMode === 'premium'
    ? { ...PREMIUM_JOB_OPTS, ...options }
    : { ...STANDARD_JOB_OPTS, ...options }

  const jobName = `campaign:${payload.campaignId}:${payload.sessionMode}`

  const job = await queue.add(jobName, payload, {
    ...jobOpts,
    jobId: `${jobName}:${Date.now()}`,
  })

  return job
}
// ── Add session job ───────────────────────────────────────────
export async function enqueueSessionJob(payload: SessionJobPayload) {
  const queue = sessionQueue();
  return queue.add(`session:${payload.sessionId}`, payload, {
    jobId: `session:${payload.sessionId}`,
  });
}

// ── Add to retry/dead-letter queue ────────────────────────────
export async function enqueueDeadLetter(
  originalPayload: CampaignJobPayload,
  error: string,
  stackTrace?: string,
) {
  return retryQueue().add('dead_letter', {
    originalPayload,
    sessionMode: originalPayload.sessionMode,
    provider: originalPayload.provider,
    error,
    stackTrace,
    failedAt: new Date().toISOString(),
  }, {
    attempts: 1,
    removeOnFail: false,
  })
}


// ── Get queue stats ───────────────────────────────────────────
export async function getQueueStats(name: QueueName) {
  const queue = getQueue(name)
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ])
  return { waiting, active, completed, failed, delayed, name }
}
export async function getAllQueueStats() {
  return Promise.all(
    Object.values(QUEUE_NAMES).map(n => getQueueStats(n as QueueName))
  )
}
