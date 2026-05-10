import type { H3Event } from "h3";
import { Queue, Worker, QueueEvents } from "bullmq";
import IORedis from "ioredis";

let _redis: IORedis | null = null;
const queues = new Map<string, Queue>();

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
export function getQueue(name: QueueName): Queue {
  if (!queues.has(name)) {
    queues.set(
      name,
      new Queue(name, {
        connection: getRedis(),
        defaultJobOptions: {
          attempts: 3,
        },
      }),
    );
  }
  return queues.get(name)!;
}
export const campaignQueue = () => getQueue(QUEUE_NAMES.CAMPAIGN);
export const sessionQueue = () => getQueue(QUEUE_NAMES.SESSION);
export const proxyQueue = () => getQueue(QUEUE_NAMES.PROXY);
export const analyticsQueue = () => getQueue(QUEUE_NAMES.ANALYTICS);
export const healthQueue = () => getQueue(QUEUE_NAMES.HEALTH);
export const retryQueue = () => getQueue(QUEUE_NAMES.RETRY);

// ── Add campaign job ──────────────────────────────────────────
export async function enqueueCampaignJob(
  payload: CampaignJobPayload,
  options?: { delay?: number; priority?: number },
) {
  const queue = campaignQueue();
  const job = await queue.add(`campaign:${payload.campaignId}`, payload, {
    ...options,
    jobId: `campaign:${payload.campaignId}:${Date.now()}`,
  });
  return job;
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
  originalPayload: any,
  error: string,
  stackTrace?: string,
) {
  const queue = retryQueue();
  return queue.add(
    "dead_letter",
    {
      originalPayload,
      error,
      stackTrace,
      failedAt: new Date().toISOString(),
    },
    {
      attempts: 1,
      removeOnFail: false, // keep forever for inspection
    },
  );
}

// ── Get queue stats ───────────────────────────────────────────
export async function getQueueStats(name: QueueName) {
  const queue = getQueue(name);
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);
  return { waiting, active, completed, failed, delayed, name };
}

export async function getAllQueueStats() {
  return Promise.all(
    Object.values(QUEUE_NAMES).map((name) => getQueueStats(name as QueueName)),
  );
}
