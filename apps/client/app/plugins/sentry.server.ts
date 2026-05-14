import * as Sentry from '@sentry/node'

export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.server) return

  const config = useRuntimeConfig()
  const sentryDsn = config.public.NUXT_SENTRY_DSN as string | undefined
  const appEnv = config.public.NODE_ENV as string ?? 'production'
  const appVersion = config.public.APP_VERSION as string ?? '0.0.0'

  if (!sentryDsn) return

  // Hanya init jika belum diinit oleh Nitro plugin
  if (!(Sentry as any).__initialized__) {
    Sentry.init({
      dsn: sentryDsn,
      environment: appEnv,
      release: `trafficx@${appVersion}`,
      tracesSampleRate: appEnv === 'production' ? 0.1 : 1.0,
      sendDefaultPii: false,
    });
    (Sentry as any).__initialized__ = true
  }
})
