# Traffic Exchange Platform

## Overview

Monorepo `Traffic Exchange Platform` untuk dashboard campaign, worker browser automation, queue orchestration, premium antidetect integration, analytics, dan deployment berbasis Docker.

Repository ini memakai pendekatan:

- `Nuxt 4 fullstack` untuk UI, Nitro API, dan realtime WebSocket
- `TypeScript worker` untuk eksekusi campaign
- `Redis + BullMQ` untuk queue dan Pub/Sub
- `PostgreSQL + Prisma` untuk persistence
- `Docker Compose` untuk deployment lokal dan server awal

## Dokumentasi Utama

### Architecture

- [Architecture Index](docs/architecture/README.md)
- [01 - Architecture Overview](docs/architecture/01-overview.md)
- [02 - Current Architecture Map](docs/architecture/02-current-map.md)
- [03 - Target Architecture Map](docs/architecture/03-target-map.md)
- [04 - Implementation Gap Map](docs/architecture/04-implementation-gap.md)
- [05 - Queue Roadmap](docs/architecture/05-queue-roadmap.md)
- [06 - GEO Without Proxy](docs/architecture/06-geo-without-proxy.md)
- [07 - Antidetect Provider Deployment](docs/architecture/07-antidetect-provider-deployment.md)

### Data Layer

- [Database Schema](docs/database/01-schema.md)

### Existing Source Documents

- `docs/Additional Technical Architecture Specification.pdf`
- `docs/Modern Traffic Exchange Platform — Architecture & Feature Map - Google Dokumen.pdf`

## Struktur Repository

### Apps

- `apps/client`
  Nuxt 4 fullstack app untuk dashboard, API, auth, billing, campaign, settings, dan realtime.
- `apps/worker`
  Worker TypeScript untuk queue consumer, Playwright execution, proxy resolving, stealth, fingerprint, dan behavior engine.

### Shared Packages

- `packages/db`
  Prisma schema, migrations, seed, dan shared database access.
- `packages/worker-kit`
  Shared logger, reporter, server helper, dan type payload untuk worker.
- `packages/antidetect`
  Provider abstraction untuk premium mode seperti `GoLogin`, `AdsPower`, `Multilogin`, `Dolphin`, dan `NSTBrowser`.

### Infrastructure

- `docker`
  Konfigurasi Nginx, Postgres, Prometheus, Grafana, dan service pendukung lain.
- `scripts`
  Automasi deploy, backup, scaling worker, dan setup antidetect provider.

## Ringkasan Arsitektur Aktual

```text
Browser User
  -> apps/client (Nuxt UI + Nitro API + WebSocket)
  -> PostgreSQL via Prisma
  -> Redis/BullMQ untuk queue dan Pub/Sub
  -> apps/worker untuk eksekusi campaign
  -> Playwright + proxy + fingerprint + stealth + behavior
  -> hasil kembali ke DB dan realtime dashboard
```

## Alur Utama Campaign

```text
User start campaign
  -> API validasi campaign dan credit
  -> enqueue ke campaign_queue
  -> worker mengambil job
  -> standard/premium runner mengeksekusi session
  -> analytics dan session result ditulis ke database
  -> worker publish update ke Redis
  -> dashboard menerima update via WebSocket
```

## Status Arsitektur Saat Ini

### Sudah Matang

- app fullstack Nuxt
- flow utama campaign ke worker
- database schema inti
- Redis Pub/Sub dan WebSocket bridge
- worker health reporting
- observability dasar dengan Prometheus dan Grafana

### Masih Parsial atau Roadmap

- `session_queue`
- `retry_queue`
- `analytics_queue`
- `proxy_rotation_queue`
- `behavior_queue`
- hardening deploy provider premium tertentu di Ubuntu

## Menjalankan Project

### Workspace

```bash
pnpm install
```

### Development

```bash
pnpm dev:client
pnpm dev:worker
```

### Database

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

### Build

```bash
pnpm build
pnpm build:worker
```

## Catatan

- `README.md` ini sekarang menjadi pintu utama dokumentasi project.
- Dokumentasi arsitektur dirapikan ke folder `docs/architecture` dengan penamaan bernomor.
- Detail schema database dipindahkan ke `docs/database/01-schema.md`.
- Detail arsitektur aktual, target architecture, dan gap implementasi dipisah ke file `.md` terpisah agar lebih mudah dirawat.
- Dokumentasi lanjutan untuk queue roadmap, GEO tanpa proxy, dan deployment antidetect provider sudah ditambahkan ke folder arsitektur.
