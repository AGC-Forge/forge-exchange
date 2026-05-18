# Traffic Exchange Platform - Current Architecture Map

## Current State

Dokumen ini memetakan arsitektur aktual project dari ujung ke ujung berdasarkan struktur folder, runtime code, queue layer, worker execution, dan deployment yang saat ini ada di repository.

## Layer Map

### Presentation Layer

Komponen:

- Nuxt pages
- Vue components
- composables
- Pinia state
- dashboard realtime

Peran:

- menerima konfigurasi campaign
- menampilkan analytics, session, worker status, billing, dan settings
- subscribe ke event realtime via WebSocket

Lokasi utama:

- `apps/client/app/pages`
- `apps/client/app/components`
- `apps/client/app/composables`

### Application Layer

Komponen:

- Nitro API routes
- server handlers
- server services
- auth middleware

Peran:

- validasi request
- orkestrasi domain campaign, billing, proxy, integrations, user, analytics, workers
- enqueue job ke Redis/BullMQ

Lokasi utama:

- `apps/client/server/api`
- `apps/client/server/handler`
- `apps/client/server/services`
- `apps/client/server/utils`

### Queue dan Event Layer

Komponen:

- BullMQ
- Redis
- Redis Pub/Sub
- WebSocket bridge

Peran:

- mengirim job campaign ke worker
- menerima signal `pause` dan `stop`
- meneruskan event health/status/update ke dashboard realtime

Lokasi utama:

- `apps/client/server/services/queue.ts`
- `apps/client/server/plugins/ws-subscriber.ts`
- `apps/client/server/routes/_ws.ts`

### Worker Execution Layer

Komponen:

- `BrowserPoolManager`
- `SessionRunner`
- `PremiumSessionRunner`
- proxy resolver
- stealth engine
- fingerprint engine
- behavior engine

Peran:

- mengeksekusi sesi browser
- memilih mode `standard` atau `premium`
- resolve proxy dan geo target
- mencatat session result ke database
- mengirim worker heartbeat

Lokasi utama:

- `apps/worker/src/index.ts`
- `apps/worker/src/engine`
- `apps/worker/src/proxy`
- `apps/worker/src/stealth`
- `apps/worker/src/fingerprint`
- `apps/worker/src/behavior`

### Shared Runtime Layer

Komponen:

- Prisma package
- worker-kit
- antidetect provider package

Peran:

- membagi tipe, reporter, logger, dan provider abstraction antar app

Lokasi utama:

- `packages/db`
- `packages/worker-kit`
- `packages/antidetect`

### Persistence Layer

Komponen:

- PostgreSQL
- Prisma schema dan migration

Peran:

- penyimpanan domain data dan analytics

Domain utama:

- auth dan role
- campaign dan geo target
- billing dan credits
- proxy pool dan integrations
- browser session dan fingerprint
- worker nodes dan queue jobs
- analytics event dan traffic logs

### Infrastructure Layer

Komponen:

- Docker Compose
- Nginx
- Postgres
- Redis
- Prometheus
- Grafana
- pgAdmin

Peran:

- deployment aplikasi
- monitoring dan observability
- reverse proxy
- runtime dependency services

## End-to-End Diagram

```text
┌──────────────────────────────┐
│ User / Admin Browser         │
└──────────────┬───────────────┘
               │
               ▼
┌────────────────────────────────────────────────────┐
│ apps/client                                        │
│ Nuxt 4 fullstack                                  │
│ - UI pages                                         │
│ - Nitro API                                        │
│ - WebSocket                                        │
└──────────────┬─────────────────────┬───────────────┘
               │                     │
               │ Prisma              │ Redis subscribe
               ▼                     ▼
┌──────────────────────────────┐   ┌──────────────────────────────┐
│ PostgreSQL via packages/db   │   │ Redis / BullMQ               │
│ - campaigns                  │   │ - campaign_queue             │
│ - sessions                   │   │ - health_queue               │
│ - analytics                  │   │ - pub/sub realtime           │
│ - workers                    │   │ - roadmap queue placeholders │
└──────────────────────────────┘   └──────────────┬───────────────┘
                                                  │
                                                  ▼
                               ┌──────────────────────────────────┐
                               │ apps/worker                      │
                               │ - queue consumer                 │
                               │ - standard runner                │
                               │ - premium runner                 │
                               │ - Playwright execution           │
                               └──────────────┬───────────────────┘
                                              │
                                              ▼
                               ┌──────────────────────────────────┐
                               │ Browser Runtime / Provider       │
                               │ - proxy                          │
                               │ - fingerprint                    │
                               │ - stealth                        │
                               │ - antidetect provider            │
                               └──────────────────────────────────┘
```

## Queue Status Saat Ini

### Aktif

- `campaign_queue`
- `health_queue`

### Sudah Ada Abstraction, Belum Penuh Aktif

- `session_queue`
- `retry_queue`
- `analytics_queue`
- `proxy_rotation_queue`

## Realtime Event Status

Channel yang sudah terlihat dipakai:

- `analytics:update`
- `campaign:update`
- `worker:update`
- `worker:health`
- `worker:alert`
- `queue:update`
- `proxy:update`
- `system:health`

## Deployment Reality

Aktual saat ini lebih dekat ke model:

- single stack Docker Compose
- worker replica via compose variable
- observability dasar via Prometheus dan Grafana
- belum penuh ke orchestrator terpisah seperti Swarm atau Kubernetes

## Ringkasan

Arsitektur aktual project ini sudah terbagi cukup jelas menjadi:

- app fullstack
- worker execution runtime
- shared packages
- database persistence
- queue dan realtime layer
- infra deployment

Yang paling matang saat ini adalah jalur utama `campaign -> queue -> worker -> database -> realtime dashboard`.
