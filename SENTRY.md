# Sentry — Package Installation

## apps/client

```bash
cd apps/client
pnpm add @sentry/vue @sentry/node @sentry/profiling-node
```

## apps/worker

```bash
cd apps/worker
pnpm add @sentry/node @sentry/profiling-node
```

## Package versions (gunakan yang terbaru):

- @sentry/vue ^8.x
- @sentry/node ^8.x
- @sentry/profiling-node ^8.x

## Sentry Project Setup:

1. Buat project baru di https://sentry.io
2. Platform: Vue (untuk client) + Node.js (untuk worker)
3. Bisa pakai 1 project untuk semua, atau 2 project terpisah
4. Copy DSN ke .env
5. Upload sourcemaps saat build (opsional tapi recommended untuk prod):
   npx @sentry/cli releases files trafficx@{version} upload-sourcemaps .output/public/\_nuxt
