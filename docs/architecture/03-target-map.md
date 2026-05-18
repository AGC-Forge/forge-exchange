# Traffic Exchange Platform - Target Architecture Map

## Tujuan

Dokumen ini menjelaskan target architecture yang ingin dicapai berdasarkan kombinasi antara:

- desain PDF existing
- struktur pondasi yang sudah ada di codebase
- roadmap implementasi queue, campaign orchestration, GEO handling, dan provider runtime

Dokumen ini bukan deskripsi penuh kondisi saat ini, tetapi peta arah arsitektur yang dituju.

## Target Prinsip Arsitektur

- pemisahan concern yang lebih tegas antara UI, API, queue orchestration, worker execution, dan observability
- queue per domain aktif penuh dengan producer dan consumer yang jelas
- flow campaign standard dan premium sama-sama eksplisit dan mudah diaudit
- pipeline realtime, analytics, retry, dan worker recovery lebih konsisten
- deployment provider premium di Linux lebih stabil dan terdokumentasi

## Target Layer Map

### 1. Frontend dan App API

Tetap memakai:

- `Nuxt 4 fullstack`
- Nitro API
- Nitro Native WebSocket

Target peningkatan:

- API versioning yang lebih formal
- kontrak response yang lebih konsisten
- validasi request yang lebih seragam antar domain

### 2. Queue Orchestration Layer

Target queue aktif:

- `campaign_queue`
- `session_queue`
- `retry_queue`
- `analytics_queue`
- `proxy_rotation_queue`
- `behavior_queue`
- `health_queue`

Target peran:

- `campaign_queue`
  Menangani orchestration campaign tingkat atas.
- `session_queue`
  Menangani unit kerja sesi browser secara lebih granular.
- `retry_queue`
  Menangani retry lane dan DLQ recovery.
- `analytics_queue`
  Menangani penulisan analytics secara asynchronous.
- `proxy_rotation_queue`
  Menangani rotasi proxy dan validasi kesehatan yang terisolasi.
- `behavior_queue`
  Menangani proses behavior simulation yang dapat dipisah bila perlu.
- `health_queue`
  Menangani heartbeat dan health reporting worker.

## Target End-to-End Flow

```text
User/Admin Browser
  -> Nuxt UI
  -> Nitro API
  -> campaign_queue
  -> session_queue
  -> worker execution lane
  -> analytics_queue / retry_queue / proxy_rotation_queue
  -> PostgreSQL + Redis Pub/Sub
  -> WebSocket realtime dashboard
```

## Target Campaign Flow

### Standard Mode

```text
Create campaign
  -> pilih target URL
  -> pilih device / duration / behavior
  -> pilih GEO target
  -> pilih mode proxy:
     - none
     - pool
     - integration
  -> API validasi realism policy
  -> enqueue campaign
  -> pecah jadi session jobs
  -> worker execute
```

### Premium Mode

```text
Create campaign
  -> pilih provider antidetect
  -> pilih OS dan browser profile
  -> validasi integration
  -> enqueue campaign
  -> worker premium runner connect ke provider runtime
  -> execute session
```

## Target GEO Policy

Target implementasi GEO dibagi menjadi tiga mode policy:

- `strict`
  Negara target harus sinkron dengan sumber IP/proxy.
- `soft`
  Negara target dipakai untuk intent campaign, tetapi sistem memberi warning jika IP tidak mendukung.
- `no-proxy`
  Negara tetap dipilih sebagai metadata targeting, tetapi runtime berjalan memakai koneksi bawaan browser dan hasil dapat berbeda dari negara target.

Tujuan policy ini adalah agar flow `GEO tanpa proxy` menjadi eksplisit dan tidak membingungkan.

## Target Worker Hardening

Target peningkatan worker:

- retry policy yang lebih transparan
- dead-letter recovery yang bisa ditelusuri
- browser crash recovery
- session replay minimal
- reassign job bila worker mati
- monitoring per queue dan per worker lane

## Target Premium Provider Operations

Target operasional provider premium:

- setup Ubuntu terdokumentasi per provider
- script install yang lebih deterministik
- health-check provider runtime sebelum dipakai live
- fallback dan troubleshooting guide khusus `AdsPower`

## Target Observability

Target observability layer:

- health dan alert lebih konsisten per worker
- queue metrics per domain
- dashboard Grafana per campaign dan per worker
- centralized logging yang lebih mudah dicari
- tracing error antara API, queue, dan worker

## Target Deployment Maturity

Tahap target:

1. single-node Compose yang stabil
2. multi-worker lebih rapi dengan scaling terkontrol
3. deployment multi-node jika traffic tumbuh
4. kesiapan ke orchestrator tingkat lanjut bila benar-benar dibutuhkan

## Ringkasan

Target architecture project ini bukan mengganti pondasi yang sudah ada, tetapi memperkuat pondasi saat ini agar:

- modular
- observable
- recoverable
- siap live campaign yang lebih kompleks

Dengan arah ini, transisi dari desain ke implementasi bisa dilakukan bertahap tanpa perlu rewrite besar.
