import * as Sentry from "@sentry/node";
import os from "node:os";
import { nodeProfilingIntegration } from '@sentry/profiling-node'
import type { WorkerLogger } from "./logger.js";

const isProduction = process.env.NODE_ENV === 'production' || process.env.SENTRY_ENVIRONMENT === 'production'

export function initSentry(logger: WorkerLogger, opts: { workerId: string }) {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;

  const tracesSampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0);

  Sentry.init({
    dsn,
    environment: isProduction ? 'production' : 'development',
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0,
    integrations: [
      ...(isProduction ? [nodeProfilingIntegration()] : []),
      Sentry.httpIntegration(),
    ],
    profilesSampleRate: isProduction ? 0.05 : 0,
    sendDefaultPii: false,
    initialScope: {
      tags: {
        component: 'worker',
        worker_id: opts.workerId,
        hostname: os.hostname(),
      },
    },
    beforeSend(event) {
      // Jangan log proxy credentials
      if (event.extra) {
        const extra = event.extra as Record<string, any>
        if (extra.proxyUrl) extra.proxyUrl = '***'
        if (extra.password) extra.password = '***'
        if (extra.apiKey) extra.apiKey = '***'
        if (extra.username) extra.username = '***'
      }
      return event
    },
  });

  logger.info(`[Sentry Worker] Initialized — worker: ${opts.workerId}`)
}

export function captureWorkerError(
  err: unknown,
  ctx: { where: string; extra?: Record<string, unknown> },
) {
  if (!process.env.SENTRY_DSN) return;
  const error = err instanceof Error ? err : new Error(String(err));
  Sentry.captureException(error, {
    tags: { where: ctx.where },
    extra: ctx.extra,
  });
}
export function captureJobError(
  error: unknown,
  context: {
    jobId: string
    campaignId: string
    sessionMode: string
    provider?: string
    userId?: string
  },
): void {
  Sentry.withScope((scope) => {
    scope.setTag('layer', 'worker_job')
    scope.setTag('session_mode', context.sessionMode)
    scope.setTag('campaign_id', context.campaignId)

    if (context.provider) scope.setTag('provider', context.provider)
    if (context.userId) scope.setUser({ id: context.userId })

    scope.setContext('job', {
      jobId: context.jobId,
      campaignId: context.campaignId,
      sessionMode: context.sessionMode,
      provider: context.provider,
    })

    Sentry.captureException(error)
  })
}
export function captureSessionError(
  error: unknown,
  context: {
    sessionId?: string
    campaignId: string
    workerId: string
    proxySource?: string
    country?: string
    browser?: string
    os?: string
  },
): void {
  Sentry.withScope((scope) => {
    scope.setTag('layer', 'session_runner')
    scope.setTag('campaign_id', context.campaignId)
    scope.setTag('worker_id', context.workerId)
    if (context.proxySource) scope.setTag('proxy_source', context.proxySource)
    if (context.country) scope.setTag('country', context.country)
    if (context.browser) scope.setTag('browser', context.browser)
    if (context.os) scope.setTag('os', context.os)

    scope.setContext('session', {
      sessionId: context.sessionId,
      campaignId: context.campaignId,
      workerId: context.workerId,
      proxySource: context.proxySource,
      country: context.country,
    })

    Sentry.captureException(error)
  })
}
export function captureBrowserPoolError(error: unknown, meta?: Record<string, any>): void {
  Sentry.withScope((scope) => {
    scope.setTag('layer', 'browser_pool')
    if (meta) scope.setContext('pool', meta)
    Sentry.captureException(error)
  })
}
export function captureProxyError(
  error: unknown,
  context: { proxySource: string; country: string; campaignId: string },
): void {
  Sentry.withScope((scope) => {
    scope.setTag('layer', 'proxy_resolver')
    scope.setTag('proxy_source', context.proxySource)
    scope.setTag('country', context.country)
    scope.setContext('proxy', context)
    Sentry.captureException(error)
  })
}
export { Sentry }
