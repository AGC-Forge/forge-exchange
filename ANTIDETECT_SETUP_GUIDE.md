# TrafficX — VPS Antidetect Setup Guide

## Overview

Platform TrafficX menggunakan **hybrid stealth mode**:

- **Standard Mode** — built-in Playwright fingerprint engine (1 credit/session)
- **Premium Mode** — antidetect browser pihak ketiga via CDP (3-5 credit/session)

Semua antidetect apps diinstall di **VPS platform yang sama dengan worker**.
User hanya perlu input API Key mereka di Settings → Integrations.

---

## Provider Reference

### Installation Method per Provider

| Provider          | Install                     | Local Port | Auth Method          |
| ----------------- | --------------------------- | ---------- | -------------------- |
| **GoLogin**       | `npm install gologin` (SDK) | Cloud API  | API Key              |
| **AdsPower**      | Native app (systemd)        | `50325`    | API Key              |
| **Multilogin**    | Native agent (systemd)      | `35000`    | Email + Password     |
| **Dolphin{anty}** | AppImage (systemd)          | `3001`     | API Key (cloud auth) |
| **Nstbrowser**    | Docker / Native app         | `8848`     | API Key              |

### Credit Cost per Provider

| Mode                | Credit/Session |
| ------------------- | -------------- |
| Standard (built-in) | 1              |
| GoLogin             | 4              |
| AdsPower            | 3              |
| Multilogin          | 5              |
| Dolphin{anty}       | 3              |
| Nstbrowser          | 4              |

---

## VPS Requirements

| Resource | Minimum      | Recommended      |
| -------- | ------------ | ---------------- |
| CPU      | 4 core       | 8 core           |
| RAM      | 8 GB         | 16 GB            |
| Disk     | 50 GB        | 100 GB           |
| OS       | Ubuntu 22.04 | Ubuntu 22.04 LTS |

---

## Quick Setup

```bash
# 1. Clone ke VPS
git clone https://github.com/your-org/traffic-exchange /opt/trafficx-app

# 2. Pilih providers yang mau diinstall
export PROVIDERS="adspower dolphin nstbrowser multilogin"

# 3. Run master setup
sudo bash scripts/antidetect/setup-vps.sh

# 4. Cek status
trafficx-health
```

---

## Per-Provider Setup

### GoLogin

GoLogin menggunakan Cloud API — tidak perlu install lokal.

```bash
npm install gologin          # install SDK di worker
```

User flow:

1. Daftar di [gologin.com](https://gologin.com)
2. Dashboard → Settings → API → Copy token
3. Platform: Settings → Integrations → GoLogin → input API Key

---

### AdsPower

```bash
export ADSPOWER_PORT=50325
sudo bash scripts/antidetect/install-adspower.sh

# Verify
curl http://localhost:50325/api/v1/application/status
```

User flow:

1. Platform mendistribusikan akun AdsPower atau user daftar sendiri
2. AdsPower UI: Settings → API Management → Generate Key
3. Platform: Settings → Integrations → AdsPower → input API Key

---

### Multilogin

```bash
export MULTILOGIN_PORT=35000
sudo bash scripts/antidetect/install-multilogin.sh

# Verify
curl http://localhost:35000/status
```

User flow:

1. Daftar di [multilogin.com](https://multilogin.com)
2. Platform: Settings → Integrations → Multilogin → input Email + Password

---

### Dolphin{anty}

```bash
export DOLPHIN_PORT=3001
sudo bash scripts/antidetect/install-dolphin.sh

# Verify
curl http://localhost:3001/v1.0/browser_profiles?limit=1
```

User flow:

1. Daftar di [dolphin-anty.com](https://dolphin-anty.com)
2. Dashboard → API → Generate Token
3. Platform: Settings → Integrations → Dolphin{anty} → input API Key

---

### Nstbrowser (Docker — recommended)

```bash
# Via Docker (recommended untuk server)
export NSTBROWSER_PORT=8848
USE_DOCKER=1 sudo bash scripts/antidetect/install-nstbrowser.sh

# Verify API v2
curl -H "x-api-key: YOUR_KEY" \
  http://localhost:8848/api/v2/browser/list?page=1&pageSize=1
```

User flow:

1. Daftar di [nstbrowser.io](https://nstbrowser.io)
2. Account → API Key → Generate
3. Platform: Settings → Integrations → Nstbrowser → input API Key
4. Optional: custom port jika berbeda dari 8848

---

## Service Management

```bash
# Status semua
bash scripts/antidetect/manage.sh status

# Start semua
bash scripts/antidetect/manage.sh start all

# Restart provider tertentu
bash scripts/antidetect/manage.sh restart nstbrowser

# Lihat logs
bash scripts/antidetect/manage.sh logs adspower

# Health check lengkap
trafficx-health

# Restart semua antidetect
trafficx-restart-antidetect
```

---

## Troubleshooting

### App tidak merespon di port-nya

```bash
# Cek apakah service jalan
systemctl status adspower

# Cek logs
journalctl -u adspower -n 50

# Cek port
ss -tlnp | grep 50325

# Restart
systemctl restart adspower
```

### Display error (Xvfb)

```bash
# Pastikan Xvfb jalan
systemctl status xvfb

# Test display
DISPLAY=:99 xdpyinfo | head -5

# Restart Xvfb
systemctl restart xvfb
```

### Nstbrowser Docker issue

```bash
# Cek container
docker ps | grep nstbrowser

# Logs
docker logs trafficx_nstbrowser --tail 50

# Restart
docker restart trafficx_nstbrowser

# Pull image terbaru
docker pull nstbrowser/agent:latest
docker compose -f docker/antidetect/docker-compose.antidetect.yml up -d --force-recreate nstbrowser
```

---

## Environment Variables

```env
# .env di VPS worker

# Ports (sesuaikan jika conflict)
ADSPOWER_PORT=50325
MULTILOGIN_PORT=35000
DOLPHIN_PORT=3001
NSTBROWSER_PORT=8848

# Providers yang diinstall (space-separated)
PROVIDERS=adspower dolphin nstbrowser multilogin

# Install dir
INSTALL_DIR=/opt/trafficx
DATA_DIR=/var/lib/trafficx

# Nstbrowser — gunakan Docker atau native
USE_DOCKER=1
```
