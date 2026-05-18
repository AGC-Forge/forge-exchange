# Traffic Exchange Platform - Antidetect Provider Deployment

## Tujuan

Dokumen ini menjadi baseline dokumentasi untuk deployment provider antidetect di environment Ubuntu, dengan fokus pada script yang sudah ada di repository dan area yang masih perlu distabilkan, terutama `AdsPower`.

## Lokasi Script

Folder terkait:

- `scripts/antidetect`

Script yang saat ini tersedia:

- `setup-vps.sh`
- `manage.sh`
- `install-adspower.sh`
- `install-dolphin.sh`
- `install-multilogin.sh`
- `install-nstbrowser.sh`
- `fix-nstbrowser-now.sh`

## Tujuan Operasional

Layer provider antidetect dibutuhkan untuk:

- premium session mode
- provider-managed browser profile
- koneksi ke runtime antidetect tertentu
- stabilitas sesi live campaign yang butuh realism lebih tinggi

## Problem Saat Ini

Secara arsitektur, provider abstraction sudah ada di package code. Namun sisi operasional deployment Linux masih berpotensi bermasalah karena:

- setiap provider punya cara install yang berbeda
- dependency system-level berbeda
- perilaku headless dan desktop session bisa berbeda
- health-check provider belum tentu seragam
- troubleshooting antar provider belum distandardisasi

Khusus `AdsPower`, ini sering jadi area sensitif karena installer, dependency, dan runtime behavior di Ubuntu bisa lebih rewel dibanding provider lain.

## Target Struktur Deployment

### Layer 1 - Server Preparation

Server Ubuntu idealnya menyiapkan:

- package system dasar
- network tools
- display atau runtime desktop yang dibutuhkan provider
- permission file dan process yang konsisten

### Layer 2 - Provider Installation

Masing-masing provider sebaiknya punya:

- script install tersendiri
- lokasi binary yang jelas
- path config yang jelas
- hasil install yang bisa diverifikasi

### Layer 3 - Provider Runtime Validation

Sesudah install, sistem sebaiknya memverifikasi:

- binary bisa dijalankan
- service atau process utama hidup
- endpoint atau port yang dibutuhkan tersedia
- login state atau activation state valid

### Layer 4 - Worker Integration Validation

Sebelum live campaign, perlu validasi:

- worker dapat terhubung ke provider
- provider dapat membuat atau membuka profile
- browser session bisa dibuka dan ditutup dengan bersih

## Rekomendasi Standard Checklist

Checklist minimum per provider:

1. installer berhasil dijalankan
2. dependency OS terpenuhi
3. binary/provider process ditemukan
4. profile bisa dibuat atau dibuka
5. browser dapat launch
6. worker dapat connect
7. log error dasar bisa ditangkap

## Rekomendasi Isi Script Provider

Setiap script install idealnya konsisten memiliki:

- header environment check
- install dependency OS
- download atau verifikasi package
- install binary
- setup permission
- post-install verification
- output lokasi file penting
- pesan troubleshooting dasar

## Fokus Khusus AdsPower

### Kenapa AdsPower Perlu Perhatian

Beberapa risiko umum di Linux:

- dependency GUI atau library runtime tidak lengkap
- package installer berubah format atau lokasi
- path binary tidak konsisten
- proses launch sukses palsu tetapi service inti tidak siap
- worker gagal connect walau install tampak berhasil

### Rekomendasi Hardening AdsPower

- pisahkan script install dan script verify
- catat lokasi binary final secara eksplisit
- tambahkan pengecekan process setelah install
- tambahkan pengecekan port atau endpoint jika memang dibutuhkan provider
- sediakan error message yang lebih spesifik saat verify gagal

### Rekomendasi Alur AdsPower

```text
prepare server
  -> install dependency OS
  -> install AdsPower package
  -> verify binary exists
  -> launch provider runtime
  -> verify process or endpoint ready
  -> run integration smoke test
  -> baru dinyatakan siap untuk premium worker
```

## Rekomendasi Mode Dokumen Per Provider

Ke depan, tiap provider idealnya punya dokumen turunan:

- `adspower.md`
- `multilogin.md`
- `dolphin.md`
- `nstbrowser.md`

Isi minimumnya:

- prasyarat OS
- langkah install
- path penting
- cara verifikasi
- error umum
- langkah recovery

## Rekomendasi Monitoring Dasar

Untuk provider runtime, minimal pantau:

- process hidup atau mati
- restart count
- gagal connect dari worker
- waktu launch profile
- error rate saat membuka session

## Mapping Ke Backlog Teknis

### Prioritas Tinggi

- audit `install-adspower.sh`
- definisikan verification checklist AdsPower
- tentukan jalur smoke test setelah install

### Prioritas Menengah

- samakan pola script install antar provider
- tambahkan mode `verify` di `manage.sh`
- dokumentasikan dependency per provider

### Prioritas Rendah

- satukan output log format antar script
- buat wrapper installer yang lebih generik

## Rekomendasi Tahap Berikutnya

Urutan kerja yang paling aman:

1. audit isi script `install-adspower.sh`
2. definisikan expected binary, path, dan runtime state
3. buat checklist verify pasca install
4. uji smoke test dari worker ke provider
5. baru bandingkan pola yang sama ke provider lain

## Kesimpulan

Sisi code provider abstraction sudah cukup baik sebagai pondasi. Tantangan berikutnya ada di layer operasional Ubuntu, terutama memastikan bahwa hasil install provider benar-benar siap dipakai worker, bukan hanya sekadar berhasil dieksekusi.

Untuk itu, jalur paling aman adalah:

- install
- verify
- smoke test
- baru live
