# Traffic Exchange Platform - Architecture Overview

## Tujuan Dokumen

Dokumen ini menjadi ringkasan arsitektur aktual project `traffick-exchange` berdasarkan implementasi yang saat ini ada di repository.

Dokumen ini fokus pada:

- struktur sistem end-to-end
- pembagian tanggung jawab per layer
- alur data utama
- hubungan antara `apps/*`, `packages/*`, database, queue, dan worker

## Ringkasan Sistem

Project ini memakai arsitektur monorepo berbasis `pnpm workspace` dengan tiga blok utama:

- `apps/client`
  Aplikasi `Nuxt 4 fullstack` yang menangani UI, Nitro API, auth, billing, dashboard, dan WebSocket realtime.
- `apps/worker`
  Worker `TypeScript` untuk mengeksekusi job campaign menggunakan Playwright, proxy, stealth, fingerprint, dan behavior simulation.
- `packages/*`
  Shared package untuk database, runtime worker, dan integrasi antidetect browser.

## Komponen Inti

### 1. Client App

Lokasi:

- `apps/client`

Peran:

- menampilkan dashboard dan halaman aplikasi
- menerima input campaign, proxy, integrations, billing, settings
- menyediakan API internal melalui Nitro
- menyediakan WebSocket `/_ws` untuk realtime dashboard

### 2. Worker App

Lokasi:

- `apps/worker`

Peran:

- mengonsumsi queue campaign
- menjalankan browser session mode standard dan premium
- melakukan proxy resolving, fingerprint injection, stealth patching, dan human behavior simulation
- mengirim heartbeat dan event health ke Redis

### 3. Database Layer

Lokasi:

- `packages/db`
- `docker/postgres`

Peran:

- menyimpan data user, role, account, campaign, geo target, browser session, analytics, worker node, queue job, subscription, credit log, proxy pool, dan integration
- memakai Prisma sebagai ORM dan PostgreSQL sebagai persistence utama

### 4. Queue dan Realtime Layer

Lokasi:

- `apps/client/server/services/queue.ts`
- `apps/client/server/plugins/ws-subscriber.ts`
- `apps/client/server/routes/_ws.ts`

Peran:

- BullMQ memakai Redis sebagai backend queue
- Redis Pub/Sub dipakai untuk signal stop/pause campaign dan realtime event worker
- Nitro WebSocket menyebarkan event Redis ke browser client

### 5. Antidetect Provider Layer

Lokasi:

- `packages/antidetect`
- `scripts/antidetect`

Peran:

- menyediakan abstraction provider premium mode
- menampung integrasi seperti `GoLogin`, `AdsPower`, `Multilogin`, `Dolphin`, dan `NSTBrowser`
- menyediakan script setup provider di environment Ubuntu/VPS

## Diagram Arsitektur Aktual

```text
User/Admin Browser
  -> apps/client (Nuxt 4 fullstack)
     -> UI pages + composables + dashboard
     -> Nitro API routes
     -> Nitro WebSocket `/_ws`

apps/client
  -> PostgreSQL via Prisma
  -> Redis/BullMQ untuk enqueue job
  -> Redis Pub/Sub subscriber untuk realtime fan-out

Redis/BullMQ
  -> campaign queue
  -> health queue
  -> placeholder/parsial: session, retry, analytics, proxy

apps/worker
  -> consume campaign queue
  -> route ke standard runner atau premium runner
  -> Playwright + fingerprint + stealth + proxy + behavior
  -> write session/result/analytics ke database
  -> publish worker health/event ke Redis

Redis Pub/Sub
  -> Nitro subscriber
  -> WebSocket client
  -> live dashboard
```

## Alur Eksekusi Campaign

```text
User start campaign
  -> Nitro handler validasi campaign
  -> validasi credit, proxy, integration, geo target
  -> update status campaign menjadi queued
  -> enqueue ke campaign_queue
  -> worker mengambil job
  -> worker pilih standard/premium runner
  -> worker eksekusi browser session
  -> hasil ditulis ke database
  -> worker publish health/update ke Redis
  -> Nitro broadcast ke WebSocket
  -> dashboard update realtime
```

## Workspace Map

### Apps

- `apps/client`
- `apps/worker`

### Shared Packages

- `packages/db`
- `packages/worker-kit`
- `packages/antidetect`

### Infra dan Ops

- `docker`
- `scripts`
- `.github/workflows`

## Catatan Penting

- Implementasi saat ini sudah kuat di `fullstack app`, `worker runtime`, `database`, dan `realtime`.
- Desain queue multi-channel sudah mulai dibentuk, tetapi belum seluruhnya aktif end-to-end.
- Dokumentasi PDF existing lebih tepat dibaca sebagai campuran antara arsitektur aktual dan target roadmap.
