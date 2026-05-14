import * as Sentry from '@sentry/vue'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const sentryDsn = config.public.NUXT_SENTRY_DSN as string | undefined
  const appEnv = config.public.NODE_ENV as string ?? 'production'
  const appVersion = config.public.APP_VERSION as string ?? '0.0.0'

  if (!sentryDsn || import.meta.env.MODE === 'development') {
    console.debug('[Sentry] Disabled — no DSN or dev mode')
    return
  }

  const router = useRouter()

  Sentry.init({
    app: nuxtApp.vueApp,
    dsn: sentryDsn,
    environment: appEnv,
    release: `trafficx@${appVersion}`,

    integrations: [
      Sentry.browserTracingIntegration({ router }),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Production: 10% traces, 1% replay normal, 100% replay on error
    tracesSampleRate: appEnv === 'production' ? 0.1 : 1.0,
    replaysSessionSampleRate: appEnv === 'production' ? 0.01 : 0.1,
    replaysOnErrorSampleRate: 1.0,

    beforeSend(event) {
      // Skip noise: network errors, browser quirks
      const val = event.exception?.values?.[0]?.value ?? ''
      if (val.includes('Failed to fetch')) return null
      if (val.includes('Load failed')) return null
      if (val.includes('ResizeObserver loop')) return null
      if (val.includes('NetworkError')) return null
      return event
    },

    sendDefaultPii: false,
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
    ],
  })

  return {
    provide: { sentry: Sentry },
  }
})
