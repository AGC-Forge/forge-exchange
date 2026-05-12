import type { Redis as IORedis } from "ioredis";
import { createHash } from "node:crypto";
import os from "node:os";
import type { PoolStats } from "./types.js";
import { WorkerLogger, type WorkerLoggerLike } from "./logger.js";

export type WorkerNodeStore = {
  upsertNode(input: {
    id: string;
    name: string;
    hostname: string;
    ipAddress: string;
    region: string;
    status: string;
    maxBrowsers: number;
    maxConcurrent: number;
    uptimeSince: Date;
    version: string;
  }): Promise<void>;
  updateNode(
    id: string,
    data: Record<string, any>,
  ): Promise<void>;
  getNodeStatus(id: string): Promise<string | null>;
};

export type WorkerReporterOpts = {
  workerId?: string;
  workerRegion?: string;
  maxBrowsers?: number;
  maxConcurrent?: number;
  logger?: WorkerLoggerLike;
  store: WorkerNodeStore;
};

export class WorkerReporter {
  private redis: IORedis;
  private workerId: string;
  private workerNodeId: string;
  private logger: WorkerLoggerLike;
  private opts: WorkerReporterOpts;
  private restartExitScheduled = false;

  constructor(redis: IORedis, opts?: WorkerReporterOpts) {
    this.redis = redis;
    if (!opts) {
      throw new Error("WorkerReporter: opts.store is required");
    }
    this.opts = opts;
    this.workerId =
      this.opts.workerId ??
      process.env.WORKER_ID ??
      process.env.HOSTNAME ??
      os.hostname() ??
      "worker-01";
    this.workerNodeId = this.normalizeWorkerNodeId(this.workerId);
    this.logger =
      this.opts.logger ??
      new WorkerLogger({ workerId: this.workerId, service: "worker" });
  }

  async register(): Promise<void> {
    try {
      await this.opts.store.upsertNode({
        id: this.workerNodeId,
        name: this.workerId,
        hostname: os.hostname(),
        ipAddress: this.getLocalIp(),
        region: process.env.WORKER_REGION ?? this.opts.workerRegion ?? "local",
        status: "online",
        maxBrowsers: Number(process.env.MAX_BROWSERS ?? this.opts.maxBrowsers ?? 5),
        maxConcurrent: Number(
          process.env.MAX_CONCURRENT ?? this.opts.maxConcurrent ?? 20,
        ),
        uptimeSince: new Date(),
        version: process.env.npm_package_version ?? "1.0.0",
      });
      this.logger.info(`Worker registered: ${this.workerId}`, {
        workerNodeId: this.workerNodeId,
      });
    } catch (err: any) {
      this.logger.error("Worker registration failed", { error: err.message });
    }
  }

  async heartbeat(stats: PoolStats | Promise<PoolStats>): Promise<void> {
    try {
      const s = await Promise.resolve(stats);
      if (await this.isRestartRequested()) {
        await this.handleRestartRequested();
        return;
      }

      const cpuUsage = await this.getCpuUsage();
      const ramUsage = this.getRamUsage();

      await this.opts.store.updateNode(this.workerNodeId, {
        lastHeartbeatAt: new Date(),
        status: "online",
        activeBrowsers: s.activeBrowsers,
        activeSessions: s.totalContexts,
        cpuUsage,
        ramUsage: ramUsage.usedPct,
        ramTotal: BigInt(ramUsage.total),
        ramUsed: BigInt(ramUsage.used),
      });

      await this.redis.publish(
        "worker:health",
        JSON.stringify({
          workerId: this.workerId,
          status: "online",
          cpuUsage,
          ramUsage: ramUsage.usedPct,
          activeBrowsers: s.activeBrowsers,
          activeSessions: s.totalContexts,
          maxBrowsers: s.maxBrowsers,
          timestamp: Date.now(),
        }),
      );
    } catch (err: any) {
      this.logger.warn("Heartbeat failed", { error: err.message });
    }
  }

  async reportHealth(stats: PoolStats): Promise<void> {
    const cpuUsage = await this.getCpuUsage();
    const ram = this.getRamUsage();

    if (ram.usedPct > 85) {
      this.logger.warn("RAM usage critical", { ramPct: ram.usedPct });
      await this.redis.publish(
        "worker:alert",
        JSON.stringify({
          workerId: this.workerId,
          type: "HIGH_RAM",
          value: ram.usedPct,
        }),
      );
    }

    if (cpuUsage > 85) {
      this.logger.warn("CPU usage critical", { cpuPct: cpuUsage });
    }

    await this.heartbeat(stats);
  }

  async markOffline(): Promise<void> {
    try {
      await this.opts.store.updateNode(this.workerNodeId, {
        status: "offline",
        activeBrowsers: 0,
        activeSessions: 0,
      });
    } catch { }
  }

  private async isRestartRequested(): Promise<boolean> {
    try {
      const status = await this.opts.store.getNodeStatus(this.workerNodeId);
      return status === "restarting";
    } catch {
      return false;
    }
  }

  private async handleRestartRequested(): Promise<void> {
    if (this.restartExitScheduled) return;
    this.restartExitScheduled = true;

    this.logger.warn("Restart requested via DB status", {
      workerId: this.workerId,
      workerNodeId: this.workerNodeId,
    });

    try {
      await this.opts.store.updateNode(this.workerNodeId, {
        lastHeartbeatAt: new Date(),
        activeBrowsers: 0,
        activeSessions: 0,
      });
    } catch { }

    try {
      await this.redis.publish(
        "worker:health",
        JSON.stringify({
          workerId: this.workerId,
          status: "restarting",
          activeBrowsers: 0,
          activeSessions: 0,
          maxBrowsers: Number(process.env.MAX_BROWSERS ?? 5),
          timestamp: Date.now(),
        }),
      );
    } catch { }

    setTimeout(() => {
      process.exit(0);
    }, 250);
  }

  private getCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const start = os.cpus().map((c) => c.times);
      setTimeout(() => {
        const end = os.cpus().map((c) => c.times);
        let idle = 0;
        let total = 0;

        for (let i = 0; i < start.length; i++) {
          const startTimes = start[i]!;
          const endTimes = end[i]!;

          const idleDiff = endTimes.idle - startTimes.idle;
          const totalDiff =
            Object.values(endTimes).reduce((a, b) => a + b, 0) -
            Object.values(startTimes).reduce((a, b) => a + b, 0);

          idle += idleDiff;
          total += totalDiff;
        }

        resolve(Math.round((1 - idle / total) * 100));
      }, 500);
    });
  }

  private getRamUsage(): { total: number; used: number; usedPct: number } {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    return { total, used, usedPct: Math.round((used / total) * 100) };
  }

  private getLocalIp(): string {
    const ifaces = os.networkInterfaces();
    for (const iface of Object.values(ifaces)) {
      for (const addr of iface ?? []) {
        if (addr.family === "IPv4" && !addr.internal) return addr.address;
      }
    }
    return "127.0.0.1";
  }

  private normalizeWorkerNodeId(value: string): string {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(value)) {
      return value;
    }

    const hex = createHash("sha256").update(value).digest("hex");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
  }
}
