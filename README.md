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

- [Architecture Overview](docs/ARCHITECTURE_OVERVIEW.md)
- [Current Architecture Map](docs/ARCHITECTURE_CURRENT_MAP.md)
- [Implementation Gap Map](docs/IMPLEMENTATION_GAP_MAP.md)

### Data Layer

- [Database Schema](docs/DATABASE_SCHEMA.md)

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
- Detail schema database dipindahkan ke `docs/DATABASE_SCHEMA.md`.
- Detail arsitektur aktual dan gap implementasi dipisah ke file `.md` terpisah agar lebih mudah dirawat.
