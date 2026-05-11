import type { Redis as IORedis } from "ioredis";
import { prismaWorker } from '@forge-exchange/db'
import type { PoolStats } from "../engine/browser-pool.js";
import { WorkerLogger } from "./logger.js";
import { createHash } from "node:crypto";
import os from "os";

export class WorkerReporter {
  private redis: IORedis;
  private workerId: string;
  private workerNodeId: string;
  private logger: WorkerLogger;
  private restartExitScheduled = false;

  constructor(redis: IORedis, workerId: string) {
    this.redis = redis;
    this.workerId = workerId;
    this.workerNodeId = this.normalizeWorkerNodeId(workerId);
    this.logger = new WorkerLogger();
  }

  // ── Register worker node to DB ────────────────────────────
  async register(): Promise<void> {
    try {
      await prismaWorker.workerNode.upsert({
        where: { id: this.workerNodeId },
        update: {
          status: "online",
          hostname: os.hostname(),
          ipAddress: this.getLocalIp(),
          uptimeSince: new Date(),
          version: process.env.npm_package_version ?? "1.0.0",
        },
        create: {
          id: this.workerNodeId,
          name: this.workerId,
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
      this.logger.info(`Worker registered: ${this.workerId}`, {
        workerNodeId: this.workerNodeId
      });
    } catch (err: any) {
      this.logger.error("Worker registration failed", { error: err.message });
    }
  }

  // ── Heartbeat ─────────────────────────────────────────────
  async heartbeat(stats: PoolStats | Promise<PoolStats>): Promise<void> {
    try {
      const s = await Promise.resolve(stats);
      if (await this.isRestartRequested()) {
        await this.handleRestartRequested();
        return;
      }
      const cpuUsage = await this.getCpuUsage();
      const ramUsage = this.getRamUsage();

      await prismaWorker.workerNode.update({
        where: { id: this.workerNodeId },
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
        where: { id: this.workerNodeId },
        data: { status: "offline", activeBrowsers: 0, activeSessions: 0 },
      });
    } catch {
      /* ignore */
    }
  }

  private async isRestartRequested(): Promise<boolean> {
    try {
      const node = await prismaWorker.workerNode.findUnique({
        where: { id: this.workerNodeId },
        select: { status: true },
      });
      return node?.status === "restarting";
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
      await prismaWorker.workerNode.update({
        where: { id: this.workerNodeId },
        data: {
          lastHeartbeatAt: new Date(),
          activeBrowsers: 0,
          activeSessions: 0,
        },
      });
    } catch {
      /* ignore */
    }

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
    } catch {
      /* ignore */
    }

    setTimeout(() => {
      process.exit(0);
    }, 250);
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
          //@ts-ignore
          const idleDiff = end[i].idle - start[i].idle;

          const totalDiff =
            //@ts-ignore
            Object.values(end[i]).reduce((a, b) => a + b, 0) -
            //@ts-ignore
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
