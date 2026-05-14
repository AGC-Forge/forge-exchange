# Deploy (Docker)

## Prasyarat

- Docker Engine + Docker Compose v2
- Port host: 80, 443, 3000 (opsional), 127.0.0.1:5432/6379/9090/3001 (default hanya localhost)

## Setup pertama kali

1) Buat file env:

```bash
cp .env.example .env
```

2) Edit `.env` (minimal isi ini):

- `POSTGRES_PASSWORD`
- `REDIS_PASSWORD`
- `NUXT_SESSION_PASSWORD` (minimal 32 char)
- `APP_URL`
- `DOMAIN` (domain publik, A record ke IP server)
- `LETSENCRYPT_EMAIL` (email untuk Let's Encrypt)
- `PGADMIN_DEFAULT_EMAIL`
- `PGADMIN_DEFAULT_PASSWORD`
- `PGADMIN_HTTP_USER` dan `PGADMIN_HTTP_PASSWORD` (basic auth untuk akses /pgadmin)

3) Pastikan DNS & firewall:

- `DOMAIN` sudah mengarah ke IP VPS (A record)
- Port 80 dan 443 terbuka (UFW / provider firewall)

4) Jalankan setup:

```bash
make setup
```

`make setup` akan:
- build image
- start postgres + redis
- jalankan migrate + seed via service `migrator`
- start semua service

## Update (rolling)

```bash
make update
```

Atau hanya client:

```bash
bash scripts/update.sh client
```

Worker:

```bash
bash scripts/update.sh worker
```

## Scale worker

```bash
make scale n=3
```

## Prisma

- Migrate deploy:
```bash
make migrate
```

- Seed:
```bash
make seed
```

- Studio (port 5555):
```bash
make studio
```

## SSL / HTTPS

- Nginx container mengurus cert otomatis via Let's Encrypt jika `DOMAIN` + `LETSENCRYPT_EMAIL` diset.
- Jika `LETSENCRYPT_EMAIL` kosong atau `DOMAIN=localhost`, nginx akan pakai self-signed.

## pgAdmin (Browser DB)

- URL: `https://<DOMAIN>/pgadmin/`
- Akses dilindungi basic auth dari nginx (`PGADMIN_HTTP_USER` + `PGADMIN_HTTP_PASSWORD`)
- Login pgAdmin memakai `PGADMIN_DEFAULT_EMAIL` + `PGADMIN_DEFAULT_PASSWORD`
- Host database dari pgAdmin: `postgres` (port 5432), user/pass sesuai env Postgres
- Rekomendasi: gunakan password kuat dan batasi akses (mis. Cloudflare / allowlist IP) jika bisa
- Extra aman (recommended): set `PGADMIN_ALLOWED_IPS` (comma-separated) untuk allowlist IP/CIDR. Contoh: `PGADMIN_ALLOWED_IPS=1.2.3.4,10.0.0.0/8`

### 2FA (TOTP / Authenticator)

pgAdmin mendukung 2FA dan bisa diaktifkan via config `MFA_ENABLED` serta metode `authenticator` (TOTP). Lihat dokumentasi resmi pgAdmin: MFA_ENABLED, MFA_SUPPORTED_METHODS, MFA_FORCE_REGISTRATION. [pgAdmin MFA docs](https://www.pgadmin.org/docs/pgadmin4/9.12/mfa.html)

- Default di repo ini: 2FA aktif dan mendukung TOTP (`PGADMIN_CONFIG_MFA_ENABLED=True`, `PGADMIN_CONFIG_MFA_SUPPORTED_METHODS="['authenticator']"`), tapi user boleh setup kapan saja (tidak dipaksa).
- Kalau mau “wajib setup TOTP saat login pertama”: set `PGADMIN_CONFIG_MFA_FORCE_REGISTRATION=True`.

Setup di UI pgAdmin: User menu (pojok kanan atas) → Two-factor Authentication → Setup Authenticator.
