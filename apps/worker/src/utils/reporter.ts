import type { IORedis } from "ioredis";
import { prismaWorker } from '@forge-exchange/db'
import type { PoolStats } from "../engine/browser-pool.js";
import { WorkerLogger } from "./logger.js";
import os from "os";

export class WorkerReporter {
  private redis: IORedis;
  private workerId: string;
  private logger: WorkerLogger;

  constructor(redis: IORedis, workerId: string) {
    this.redis = redis;
    this.workerId = workerId;
    this.logger = new WorkerLogger();
  }

  // ── Register worker node to DB ────────────────────────────
  async register(): Promise<void> {
    try {
      await prismaWorker.workerNode.upsert({
        where: { id: this.workerId },
        update: {
          status: "online",
          hostname: os.hostname(),
          ipAddress: this.getLocalIp(),
          uptimeSince: new Date(),
          version: process.env.npm_package_version ?? "1.0.0",
        },
        create: {
          id: this.workerId,
          name: `worker-${this.workerId}`,
          hostname: os.hostname(),
          ipAddress: this.getLocalIp(),
          region: process.env.WORKER_REGION ?? "local",
          status: "online",
          maxBrowsers: Number(process.env.MAX_BROWSERS ?? 5),
          maxConcurrent: Number(process.env.MAX_CONCURRENT ?? 20),
          uptimeSince: new Date(),
          version: process.env.npm_package_version ?? "1.0.0",
        },
      });
      this.logger.info(`Worker registered: ${this.workerId}`);
    } catch (err: any) {
      this.logger.error("Worker registration failed", { error: err.message });
    }
  }

  // ── Heartbeat ─────────────────────────────────────────────
  async heartbeat(stats: PoolStats | Promise<PoolStats>): Promise<void> {
    try {
      const s = await Promise.resolve(stats);
      const cpuUsage = await this.getCpuUsage();
      const ramUsage = this.getRamUsage();

      await prismaWorker.workerNode.update({
        where: { id: this.workerId },
        data: {
          lastHeartbeatAt: new Date(),
          status: "online",
          activeBrowsers: s.activeBrowsers,
          activeSessions: s.totalContexts,
          cpuUsage,
          ramUsage: ramUsage.usedPct,
          ramTotal: BigInt(ramUsage.total),
          ramUsed: BigInt(ramUsage.used),
        },
      });

      // Also publish health to Redis for realtime dashboard
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

  // ── Report health stats ───────────────────────────────────
  async reportHealth(stats: PoolStats): Promise<void> {
    const cpuUsage = await this.getCpuUsage();
    const ram = this.getRamUsage();

    // Auto-restart threshold check
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

  // ── Mark worker offline ───────────────────────────────────
  async markOffline(): Promise<void> {
    try {
      await prismaWorker.workerNode.update({
        where: { id: this.workerId },
        data: { status: "offline", activeBrowsers: 0, activeSessions: 0 },
      });
    } catch {
      /* ignore */
    }
  }

  // ── CPU usage (async) ─────────────────────────────────────
  private getCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const start = os.cpus().map((c) => c.times);
      setTimeout(() => {
        const end = os.cpus().map((c) => c.times);
        let idle = 0,
          total = 0;
        for (let i = 0; i < start.length; i++) {
          const idleDiff = end[i].idle - start[i].idle;
          const totalDiff =
            Object.values(end[i]).reduce((a, b) => a + b, 0) -
            Object.values(start[i]).reduce((a, b) => a + b, 0);
          idle += idleDiff;
          total += totalDiff;
        }
        resolve(Math.round((1 - idle / total) * 100));
      }, 500);
    });
  }

  // ── RAM usage ─────────────────────────────────────────────
  private getRamUsage(): { total: number; used: number; usedPct: number } {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    return { total, used, usedPct: Math.round((used / total) * 100) };
  }

  // ── Get local IP ──────────────────────────────────────────
  private getLocalIp(): string {
    const ifaces = os.networkInterfaces();
    for (const iface of Object.values(ifaces)) {
      for (const addr of iface ?? []) {
        if (addr.family === "IPv4" && !addr.internal) return addr.address;
      }
    }
    return "127.0.0.1";
  }
}
