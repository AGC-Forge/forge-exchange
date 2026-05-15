import os from "node:os";
import type { WorkerLogger } from "./logger.js";

const isProduction = process.env.NODE_ENV === 'production' || process.env.SENTRY_ENVIRONMENT === 'production'

type SentryScopeLike = {
  setLevel?: (level: string) => void
  setTag?: (key: string, value: string) => void
  setContext?: (name: string, context: unknown) => void
  setUser?: (user: unknown) => void
}

const noop = () => { }
const noopPromise = async () => { }

export const Sentry: Record<string, any> = {
  init: noop,
  captureException: noop,
  withScope: (cb: (scope: SentryScopeLike) => void) => cb({ setLevel: noop, setTag: noop, setContext: noop, setUser: noop }),
  flush: noopPromise,
  addBreadcrumb: noop,
  httpIntegration: () => undefined,
}

let sentryLoaded = false

async function ensureSentryLoaded(): Promise<boolean> {
  if (sentryLoaded) return true
  sentryLoaded = true
  try {
    const mod = await import("@sentry/node")
    Object.assign(Sentry, mod)
    return true
  } catch {
    return false
  }
}

export function initSentry(logger: WorkerLogger, opts: { workerId: string }) {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;

  const tracesSampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0);

  void (async () => {
    const ok = await ensureSentryLoaded()
    if (!ok) {
      logger.warn('[Sentry Worker] @sentry/node not installed in runtime image; skipping Sentry init')
      return
    }

    const integrations: any[] = [Sentry.httpIntegration()]
    if (isProduction) {
      try {
        const profiling = await import('@sentry/profiling-node')
        if (typeof profiling.nodeProfilingIntegration === 'function') {
          integrations.unshift(profiling.nodeProfilingIntegration())
        }
      } catch { }
    }

    Sentry.init({
      dsn,
      environment: isProduction ? 'production' : 'development',
      release: process.env.SENTRY_RELEASE,
      tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0,
      integrations,
      profilesSampleRate: isProduction ? 0.05 : 0,
      sendDefaultPii: false,
      initialScope: {
        tags: {
          component: 'worker',
          worker_id: opts.workerId,
          hostname: os.hostname(),
        },
      },
      beforeSend(event: any) {
        if (event.extra) {
          const extra = event.extra as Record<string, any>
          if (extra.proxyUrl) extra.proxyUrl = '***'
          if (extra.password) extra.password = '***'
          if (extra.apiKey) extra.apiKey = '***'
          if (extra.username) extra.username = '***'
        }
        return event
      },
    })

    logger.info(`[Sentry Worker] Initialized — worker: ${opts.workerId}`)
  })()

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
  if (!process.env.SENTRY_DSN) return
  Sentry.withScope((scope: any) => {
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
  if (!process.env.SENTRY_DSN) return
  Sentry.withScope((scope: any) => {
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
  if (!process.env.SENTRY_DSN) return
  Sentry.withScope((scope: any) => {
    scope.setTag('layer', 'browser_pool')
    if (meta) scope.setContext('pool', meta)
    Sentry.captureException(error)
  })
}
export function captureProxyError(
  error: unknown,
  context: { proxySource: string; country: string; campaignId: string },
): void {
  if (!process.env.SENTRY_DSN) return
  Sentry.withScope((scope: any) => {
    scope.setTag('layer', 'proxy_resolver')
    scope.setTag('proxy_source', context.proxySource)
    scope.setTag('country', context.country)
    scope.setContext('proxy', context)
    Sentry.captureException(error)
  })
}
