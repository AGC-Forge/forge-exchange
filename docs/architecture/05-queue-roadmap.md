# Traffic Exchange Platform - Queue Roadmap

## Tujuan

Dokumen ini menjelaskan arah pengembangan queue architecture agar layer `Redis + BullMQ` tidak hanya menjadi tempat enqueue job campaign utama, tetapi benar-benar menjadi orchestration layer yang modular dan mudah diobservasi.

## Kondisi Saat Ini

Queue yang sudah terlihat aktif:

- `campaign_queue`
- `health_queue`

Queue yang sudah punya pondasi abstraksi tetapi belum aktif penuh end-to-end:

- `session_queue`
- `retry_queue`
- `analytics_queue`
- `proxy_rotation_queue`
- `behavior_queue`

## Masalah Saat Ini

- sebagian besar alur kerja masih menumpuk di jalur `campaign -> worker -> result`
- retry dan dead-letter belum menjadi lane recovery yang utuh
- analytics masih berisiko terlalu dekat ke flow utama worker
- rotasi proxy dan behavior masih dekat ke runner, belum menjadi domain async yang terpisah
- observability per queue belum merata

## Target Queue Model

### 1. Campaign Queue

Peran:

- menerima orchestration tingkat atas saat campaign dimulai
- memvalidasi payload awal
- memecah campaign menjadi unit kerja session bila diperlukan

Status:

- sudah aktif

### 2. Session Queue

Peran:

- mengeksekusi satu unit sesi browser
- memisahkan orchestration campaign dari execution granular

Manfaat:

- concurrency lebih mudah diatur
- retry lebih presisi per sesi
- perhitungan success dan failure lebih akurat

Status:

- prioritas implementasi tinggi

### 3. Retry Queue

Peran:

- menangani retry terstruktur
- menjadi pintu masuk dead-letter recovery
- menyimpan alasan gagal dan histori retry

Manfaat:

- worker utama tetap bersih
- incident lebih mudah ditelusuri
- job replay lebih aman

Status:

- prioritas implementasi tinggi

### 4. Analytics Queue

Peran:

- memindahkan penulisan analytics berat ke jalur async
- mengurangi beban blocking pada eksekusi session utama

Manfaat:

- latency worker utama lebih rendah
- analytics bisa dikelola terpisah
- lebih mudah membuat batching atau throttle

Status:

- prioritas implementasi menengah

### 5. Proxy Rotation Queue

Peran:

- menangani rotasi proxy
- health-check proxy
- sinkronisasi state proxy yang tidak perlu menempel di runner

Manfaat:

- pemisahan concern lebih jelas
- retry rotasi proxy lebih terisolasi
- debugging koneksi proxy lebih mudah

Status:

- prioritas implementasi menengah

### 6. Behavior Queue

Peran:

- memisahkan behavior task jika nanti dibutuhkan
- cocok untuk skenario simulasi yang lebih kompleks atau AI-assisted timing

Manfaat:

- modularitas lebih tinggi
- mudah dikembangkan tanpa mengganggu runner utama

Status:

- prioritas implementasi rendah

### 7. Health Queue

Peran:

- heartbeat worker
- publish health metrics
- worker alert pipeline

Status:

- sudah aktif

## Target Flow

```text
API start campaign
  -> campaign_queue
  -> session_queue
  -> worker execute session
  -> analytics_queue
  -> retry_queue bila gagal
  -> proxy_rotation_queue bila perlu rotate / refresh
  -> Redis Pub/Sub + WebSocket update
```

## Tahapan Implementasi

### Tahap 1

- stabilkan `campaign_queue`
- hidupkan `retry_queue`
- hidupkan `session_queue`

Fokus:

- recovery lane
- granular execution
- error visibility

### Tahap 2

- hidupkan `analytics_queue`
- mulai pecah rotasi proxy ke jalur async jika memang diperlukan

Fokus:

- performa
- isolasi concern
- data pipeline

### Tahap 3

- evaluasi kebutuhan `behavior_queue`
- tambahkan queue metrics yang lebih kaya

Fokus:

- optimisasi
- extensibility

## Policy Rekomendasi

- satu queue harus punya producer yang jelas
- satu queue harus punya consumer yang jelas
- satu queue harus punya retry policy dan visibility minimal
- payload queue harus konsisten dan bisa diaudit
- status queue harus terlihat di dashboard atau monitoring

## Observability Minimum

Setiap queue idealnya punya metrik:

- waiting count
- active count
- completed count
- failed count
- delayed count
- average processing duration
- retry rate

## Prioritas Praktis

Urutan yang paling aman untuk project ini:

1. `retry_queue`
2. `session_queue`
3. `analytics_queue`
4. `proxy_rotation_queue`
5. `behavior_queue`

## Kesimpulan

Queue roadmap project ini sebaiknya bergerak dari model queue tunggal yang dominan ke model multi-queue yang tetap sederhana tetapi jelas batas concern-nya.

Fokus paling penting bukan menambah queue sebanyak mungkin, tetapi memastikan setiap queue yang diaktifkan benar-benar punya:

- tujuan
- consumer
- retry policy
- monitoring
- nilai operasional yang nyata
