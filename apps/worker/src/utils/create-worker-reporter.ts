import type { Redis as IORedis } from "ioredis";
import { WorkerReporter } from "./reporter.js";
import { workerNodeStore } from "./worker-node-store.js";
import type { WorkerLogger } from "./logger.js";

export function createWorkerReporter(
  redis: IORedis,
  opts: { workerId: string; logger: WorkerLogger },
): WorkerReporter {
  return new WorkerReporter(redis, {
    workerId: opts.workerId,
    logger: opts.logger,
    store: workerNodeStore,
  });
}
