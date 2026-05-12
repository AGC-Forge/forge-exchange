import pino from "pino";

export type WorkerLoggerLike = {
  info(msg: string, data?: Record<string, any>): void;
  warn(msg: string, data?: Record<string, any>): void;
  error(msg: string, data?: Record<string, any>): void;
  debug(msg: string, data?: Record<string, any>): void;
};

export class WorkerLogger implements WorkerLoggerLike {
  private logger: ReturnType<typeof pino>;

  constructor(opts?: { service?: string; workerId?: string }) {
    this.logger = pino({
      level: process.env.LOG_LEVEL || "info",
      transport:
        process.env.NODE_ENV === "development"
          ? { target: "pino-pretty", options: { colorize: true } }
          : undefined,
      base: {
        workerId: opts?.workerId ?? process.env.WORKER_ID ?? "worker-01",
        service: opts?.service ?? "worker",
      },
    });
  }

  info(msg: string, data?: Record<string, any>): void {
    this.logger.info(data ?? {}, msg);
  }

  warn(msg: string, data?: Record<string, any>): void {
    this.logger.warn(data ?? {}, msg);
  }

  error(msg: string, data?: Record<string, any>): void {
    this.logger.error(data ?? {}, msg);
  }

  debug(msg: string, data?: Record<string, any>): void {
    this.logger.debug(data ?? {}, msg);
  }
}
