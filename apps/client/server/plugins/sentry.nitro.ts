import * as Sentry from '@sentry/node'
import { nodeProfilingIntegration } from '@sentry/profiling-node'

export default defineNitroPlugin((nitroApp) => {
  const config = useRuntimeConfig()
  const sentryDsn = config.NUXT_SENTRY_DSN as string | undefined
  const appEnv = config.NODE_ENV as string ?? 'production'
  const appVersion = config.APP_VERSION as string ?? '0.0.0'

  if (!sentryDsn) {
    console.warn('[Sentry] NUXT_SENTRY_DSN not set — Sentry disabled on server')
    return
  }

  Sentry.init({
    dsn: sentryDsn,
    environment: appEnv,
    release: `trafficx@${appVersion}`,

    integrations: [
      // CPU profiling (production only)
      ...(appEnv === 'production' ? [nodeProfilingIntegration()] : []),
      // HTTP spans — track outbound requests (ke Midtrans, Xendit, dll)
      Sentry.httpIntegration(),
    ],

    tracesSampleRate: appEnv === 'production' ? 0.1 : 1.0,
    profilesSampleRate: appEnv === 'production' ? 0.1 : 0,
    sendDefaultPii: false,

    beforeSend(event) {
      // Strip sensitive headers dari semua server events
      if (event.request?.headers) {
        delete event.request.headers['authorization']
        delete event.request.headers['cookie']
        delete event.request.headers['x-api-key']
      }
      // Strip body dari payment events (jangan log credentials)
      if (event.request?.url?.includes('/api/billing')) {
        delete event.request.data
      }
      return event
    },
  })

  // ── Hook: capture semua unhandled errors di Nitro ────────
  nitroApp.hooks.hook('error', (error, { event }) => {
    // Skip 4xx — bukan bug server, itu user error
    const status = (error as any)?.statusCode ?? 500
    if (status >= 400 && status < 500) return

    Sentry.withScope((scope) => {
      // Tag untuk filter di Sentry dashboard
      scope.setTag('layer', 'nitro')
      scope.setTag('status_code', String(status))

      if (event) {
        scope.setTag('route', event.path ?? 'unknown')
        scope.setTag('method', event.method ?? 'GET')
        scope.setContext('request', {
          url: event.path,
          method: event.method,
          // Tidak include headers/body untuk security
        })
      }

      Sentry.captureException(error)
    })
  })

  // ── Hook: capture request errors (afterResponse) ─────────
  nitroApp.hooks.hook('afterResponse', (event) => {
    // Tidak ada action, tapi bisa dipakai untuk custom metrics
  })

  console.info(`[Sentry] Server SDK initialized — env: ${appEnv}`)
})

