# Traffic Exchange Platform - GEO Without Proxy

## Tujuan

Dokumen ini mendefinisikan flow campaign `standard mode` untuk skenario `GEO targeting tanpa proxy`, yaitu saat user cukup memilih negara tanpa wajib mengikat sesi ke proxy pool atau integration proxy.

## Latar Belakang

Saat ini project sudah punya konsep geo target dan juga sumber proxy per geo. Namun ada kebutuhan baru untuk mendukung mode:

- pilih negara
- tanpa proxy
- tetap jalankan browser session memakai koneksi bawaan runtime

Konsekuensinya:

- IP publik tidak dijamin sesuai negara target
- client hints dan network identity tetap mengikuti koneksi browser/runtime asli
- GEO menjadi lebih dekat ke intent campaign daripada jaminan lokasi jaringan nyata

## Problem Statement

Jika user memilih negara tanpa proxy, sistem perlu jelas dalam menjawab:

- apakah negara itu hanya metadata targeting
- apakah sistem boleh tetap jalan walau IP tidak sesuai negara target
- apakah hasil analytics harus diberi label tertentu
- apakah user harus menerima warning sebelum run

## Definisi Mode

### GEO Dengan Proxy

Karakteristik:

- negara target didukung sumber IP/proxy
- realism lebih tinggi
- hasil analytics lebih dekat ke negara target

### GEO Tanpa Proxy

Karakteristik:

- negara target hanya dipilih di level konfigurasi campaign
- koneksi jaringan tetap memakai koneksi browser atau server runtime
- IP publik bisa tidak sesuai negara target
- realism menurun tetapi flow menjadi lebih simpel dan murah

## Rekomendasi Policy

### Policy Type

Sistem sebaiknya punya tiga policy:

- `strict`
  GEO hanya valid bila sumber IP mendukung.
- `soft`
  GEO boleh dipilih tanpa proxy, tetapi sistem memberi warning.
- `no-proxy`
  GEO disimpan sebagai intent campaign dan runtime diizinkan jalan tanpa jaminan lokasi jaringan.

Untuk kebutuhan kamu saat ini, pendekatan paling aman adalah:

- `soft` untuk UI warning
- `no-proxy` untuk runtime behavior

## Rekomendasi UX Form Campaign

Pada section `GEO Targeting`, tiap target negara idealnya bisa memilih:

- `None`
- `Proxy Pool`
- `Integration Proxy`

Arti masing-masing:

- `None`
  Jalankan tanpa proxy.
- `Proxy Pool`
  Pakai proxy pool internal.
- `Integration Proxy`
  Pakai integration proxy tertentu.

## UX Warning Yang Disarankan

Saat user memilih `None`, tampilkan informasi seperti:

> Campaign akan berjalan tanpa proxy. Negara target hanya menjadi preferensi targeting, bukan jaminan lokasi IP aktual. Hasil traffic dapat terlihat berasal dari lokasi koneksi browser saat runtime.

## Dampak Ke Runtime

### Yang Tetap Bisa Jalan

- session execution
- behavior simulation
- fingerprinting
- stealth patching
- country metadata untuk campaign

### Yang Tidak Bisa Dijamin

- IP country match
- ASN dan ISP match
- timezone dan geolocation realism penuh bila tidak dikaitkan kebijakan tambahan
- sinkronisasi network identity dengan negara target

## Rekomendasi Validasi API

Saat menerima geo target dengan `proxySource = none`, API sebaiknya:

- mengizinkan request
- mencatat bahwa target berjalan dalam mode no-proxy
- memberi response warning non-blocking bila diperlukan
- tidak memaksa validasi `proxyPoolId` atau `integrationId`

## Rekomendasi Payload

Field yang relevan untuk tetap eksplisit:

- `country`
- `proxySource`
- `proxyPoolId`
- `integrationId`
- `geoPolicy`

Contoh intent:

```text
country: ID
proxySource: none
geoPolicy: no-proxy
```

## Rekomendasi Analytics

Agar data tidak misleading, analytics sebaiknya bisa membedakan:

- `targetCountry`
- `observedCountry`
- `proxyMode`

Dengan begitu dashboard bisa menjelaskan:

- negara target yang diminta user
- negara aktual yang terdeteksi dari runtime atau IP
- apakah sesi berjalan tanpa proxy

## Rekomendasi Label Internal

Untuk sesi tanpa proxy, label yang berguna:

- `proxyMode = none`
- `geoPolicy = no-proxy`
- `geoMismatchAllowed = true`

## Risiko

### Risiko Teknis

- mismatch antara target country dan IP nyata
- hasil campaign terlihat tidak konsisten
- dashboard GEO bisa menyesatkan bila hanya menampilkan target country

### Risiko Produk

- user bisa mengira negara target pasti tercapai
- expectation hasil live campaign bisa meleset

## Mitigasi

- tampilkan warning yang jelas di UI
- tandai sesi no-proxy di analytics
- pisahkan `target country` dan `observed country`
- jangan tampilkan mode ini seolah-olah setara realism-nya dengan mode proxy

## Keputusan Rekomendasi

Untuk tahap awal implementasi:

1. izinkan `proxySource = none`
2. tampilkan warning yang jelas di form campaign
3. jangan blok runtime
4. simpan policy no-proxy secara eksplisit
5. pisahkan analytics target vs observed geo

## Kesimpulan

Mode `GEO tanpa proxy` layak didukung karena berguna untuk campaign yang lebih ringan dan fleksibel. Namun sistem harus jujur bahwa mode ini tidak memberikan jaminan lokasi IP aktual.

Dengan kata lain:

- ini valid sebagai mode campaign
- ini bukan mode GEO realism tinggi
- ini harus diposisikan sebagai `intent targeting`, bukan `network-verified targeting`
