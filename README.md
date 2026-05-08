# Traffic Exchange Platform — Database Schema

## Overview

Prisma schema lengkap untuk Traffic Exchange Platform dengan **20 model**, **16 enum**, dan **59+ indexes**.

---

## Stack

- **ORM**: Prisma 5.x
- **Database**: PostgreSQL 15+ (Supabase ready)
- **Extensions**: `uuid-ossp`, `pgcrypto`

---

## Struktur Tabel

### Auth & User

| Table        | Deskripsi                           |
| ------------ | ----------------------------------- |
| `users`      | User accounts, OAuth, API key       |
| `audit_logs` | Activity tracking semua user action |

### Billing

| Table                 | Deskripsi                                |
| --------------------- | ---------------------------------------- |
| `subscriptions`       | Plan & credit balance per user           |
| `credit_logs`         | Riwayat debit/kredit tiap transaksi      |
| `top_up_transactions` | Payment records (Midtrans/Xendit/Stripe) |

### Campaign

| Table                  | Deskripsi                            |
| ---------------------- | ------------------------------------ |
| `campaigns`            | Campaign config + stats denormalized |
| `campaign_geo_targets` | GEO targeting per campaign           |
| `behavior_profiles`    | Profil perilaku human simulation     |

### Proxy

| Table         | Deskripsi                   |
| ------------- | --------------------------- |
| `proxy_pools` | Proxy list + health metrics |
| `proxy_logs`  | Log tiap penggunaan proxy   |

### Browser Engine

| Table              | Deskripsi                                 |
| ------------------ | ----------------------------------------- |
| `fingerprints`     | Fingerprint data (UA, canvas, webgl, dll) |
| `browser_sessions` | Per-session execution record              |

### Worker

| Table          | Deskripsi                          |
| -------------- | ---------------------------------- |
| `worker_nodes` | Worker instance + resource metrics |
| `worker_logs`  | Log output per worker              |

### Analytics (Partitioned)

| Table              | Deskripsi                                    |
| ------------------ | -------------------------------------------- |
| `analytics_events` | Event tracking per session — partisi monthly |
| `traffic_logs`     | Traffic summary — partisi monthly            |

### System

| Table          | Deskripsi                            |
| -------------- | ------------------------------------ |
| `queue_jobs`   | BullMQ job tracking                  |
| `integrations` | Third-party integrations per user    |
| `system_logs`  | Service-level logs — partisi monthly |
| `geo_targets`  | Reference table negara               |

---

## Credit System

```
1 standard session  = 1 credit
+ Residential proxy = +2 credits
+ Mobile proxy      = +5 credits
+ GEO targeting     = +1 credit
+ Advanced stealth  = +1 credit
+ Session persist   = +1 credit
```

### Subscription Plans

| Plan       | Credits    |
| ---------- | ---------- |
| Free       | 100/day    |
| Starter    | 10k/month  |
| Pro        | 100k/month |
| Enterprise | Custom     |

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env
cp .env.example .env
# Edit DATABASE_URL

# 3. Generate Prisma client
npm run db:generate

# 4. Run migration
npm run db:migrate

# 5. Seed initial data
npm run db:seed
```

### Environment Variables

```env
DATABASE_URL="postgresql://user:password@localhost:5432/traffic_exchange?schema=public"
```

---

## Migration

```bash
# Development
npm run db:migrate

# Production
npm run db:migrate:prod

# Manual SQL (untuk Supabase)
# Jalankan: prisma/migrations/001_init/migration.sql
```

---

## Partitioned Tables

Tabel berikut menggunakan **PostgreSQL Table Partitioning** (by month) untuk performa optimal di data volume besar:

- `analytics_events` — partisi per bulan
- `traffic_logs` — partisi per bulan
- `system_logs` — partisi per bulan
- `worker_logs` — kandidat partisi di Phase 2

> ⚠️ Untuk menambah partisi bulan baru, jalankan:
>
> ```sql
> CREATE TABLE analytics_events_2026_07 PARTITION OF analytics_events
>   FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
> ```

---

## Key Design Decisions

1. **UUID v4** untuk semua primary key — distributed-safe
2. **Soft delete** (`deleted_at`) untuk `users`, `campaigns`, `proxy_pools`
3. **Denormalized counters** di `campaigns` (total_sessions, success_count, fail_count) untuk dashboard performance
4. **Encrypted credentials** di `integrations` dan `proxy_pools.password`
5. **ip_hash** bukan raw IP di analytics — privacy-safe
6. **Composite indexes** di query-critical paths (campaign_id + created_at, worker_id + status)
7. **Auto updated_at trigger** via PostgreSQL trigger function

---

## Seed Accounts

| Role       | Email                            | Password       |
| ---------- | -------------------------------- | -------------- |
| Superadmin | superadmin@trafficexchange.local | superadmin123! |
| Demo User  | demo@trafficexchange.local       | demo123!       |

> ⚠️ Ganti password sebelum production!
