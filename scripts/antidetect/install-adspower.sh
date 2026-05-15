#!/bin/bash
# ============================================================
# scripts/antidetect/install-adspower.sh — FIXED v2
# Install AdsPower di VPS (manual download + health check fix)
# Official: https://www.adspower.com/download
# API docs: https://localapi-doc-en.adspower.com
# ============================================================
# PERUBAHAN dari versi lama:
#   - Health check timeout diperpanjang 30s → 90s
#   - Tambah retry logic dengan exponential backoff
#   - Tambah deteksi apakah GUI process memang butuh waktu
#   - Status "service running on port" tetap ditampilkan
#     meski API belum respond (normal behavior AdsPower)
# ============================================================

set -euo pipefail

INSTALL_DIR="/opt/trafficx/adspower"
DATA_DIR="/var/lib/trafficx/adspower"
PORT="${ADSPOWER_PORT:-50325}"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'
log()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; }
info()  { echo -e "${BLUE}[→]${NC} $1"; }

mkdir -p "$INSTALL_DIR" "$DATA_DIR"

# ── Check existing install ────────────────────────────────────
ADSPOWER_BIN=""
for candidate in \
  /opt/AdsPower/adspower \
  /opt/AdsPower/AdsPower \
  /opt/adspower/adspower \
  "$INSTALL_DIR/adspower" \
  "$INSTALL_DIR/AdsPower"; do
  [ -f "$candidate" ] && ADSPOWER_BIN="$candidate" && break
done

if [ -z "$ADSPOWER_BIN" ]; then
  warn "AdsPower binary tidak ditemukan. Cek apakah sudah diinstall manual."
  warn ""
  warn "Cara install AdsPower di Linux VPS:"
  warn "  1. Buka: https://www.adspower.com/download"
  warn "  2. Download: Linux version (.deb atau AppImage)"
  warn "  3. Upload ke VPS: scp AdsPower*.deb root@VPS_IP:/tmp/"
  warn "  4. Install .deb: dpkg -i /tmp/AdsPower*.deb && apt-get -f install -y"
  warn "     Atau AppImage: chmod +x AdsPower*.AppImage"
  warn "  5. Jalankan ulang script ini"
  warn ""
fi

# ── Xvfb (virtual display untuk GUI app) ─────────────────────
if ! systemctl is-active xvfb &>/dev/null 2>&1; then
  apt-get install -y -qq xvfb 2>/dev/null || true

  cat > /etc/systemd/system/xvfb.service << 'XVFBEOF'
[Unit]
Description=Xvfb Virtual Display
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
XVFBEOF
  systemctl daemon-reload
  systemctl enable xvfb
  systemctl start xvfb
  sleep 2
  log "Xvfb started"
fi

# ── Find AdsPower binary ──────────────────────────────────────
# Re-check setelah user install manual
ADSPOWER_BIN=""
for candidate in \
  /opt/AdsPower/adspower \
  /opt/AdsPower/AdsPower \
  /opt/adspower/adspower \
  /usr/bin/adspower \
  /usr/local/bin/adspower \
  "$INSTALL_DIR/adspower" \
  "$INSTALL_DIR/AdsPower"; do
  [ -f "$candidate" ] && ADSPOWER_BIN="$candidate" && break
done

# Check .AppImage juga
if [ -z "$ADSPOWER_BIN" ]; then
  APPIMAGE=$(find /opt /tmp /root /home -name "AdsPower*.AppImage" 2>/dev/null | head -1 || true)
  [ -n "$APPIMAGE" ] && ADSPOWER_BIN="$APPIMAGE"
fi

if [ -z "$ADSPOWER_BIN" ]; then
  warn "Binary tidak ditemukan. Buat dummy service yang akan diupdate nanti."
  ADSPOWER_BIN="/opt/trafficx/adspower/adspower-placeholder"
fi

# ── Wrapper start script ──────────────────────────────────────
cat > "$INSTALL_DIR/start.sh" << STARTEOF
#!/bin/bash
export DISPLAY=:99
export HOME=/root
export XDG_RUNTIME_DIR=/tmp/runtime-ads
mkdir -p "\$XDG_RUNTIME_DIR" && chmod 700 "\$XDG_RUNTIME_DIR"

# Find AdsPower binary
ADS_BIN=""
for candidate in \\
  /opt/AdsPower/adspower \\
  /opt/AdsPower/AdsPower \\
  /opt/adspower/adspower \\
  /usr/bin/adspower \\
  /usr/local/bin/adspower \\
  $INSTALL_DIR/adspower \\
  $INSTALL_DIR/AdsPower; do
  [ -f "\$candidate" ] && ADS_BIN="\$candidate" && break
done

# Check AppImage
if [ -z "\$ADS_BIN" ]; then
  APPIMAGE=\$(find /opt /root -name "AdsPower*.AppImage" 2>/dev/null | head -1 || true)
  [ -n "\$APPIMAGE" ] && ADS_BIN="\$APPIMAGE"
fi

if [ -z "\$ADS_BIN" ]; then
  echo "[!] AdsPower binary tidak ditemukan. Install dulu via .deb atau AppImage"
  echo "    Download: https://www.adspower.com/download"
  sleep 30  # tunggu agar systemd tidak restart terlalu cepat
  exit 1
fi

# AppImage mode
if echo "\$ADS_BIN" | grep -q ".AppImage"; then
  exec "\$ADS_BIN" --no-sandbox --api-port=$PORT 2>&1
else
  exec "\$ADS_BIN" --headless --api-port=$PORT 2>&1 || \\
  exec "\$ADS_BIN" --no-sandbox 2>&1
fi
STARTEOF

chmod +x "$INSTALL_DIR/start.sh"

# ── Systemd service ───────────────────────────────────────────
cat > /etc/systemd/system/adspower.service << SVCEOF
[Unit]
Description=AdsPower Browser Manager
After=network.target xvfb.service
Wants=xvfb.service

[Service]
Type=simple
User=root
Environment=DISPLAY=:99
Environment=HOME=/root
Environment=XDG_RUNTIME_DIR=/tmp/runtime-ads
WorkingDirectory=$INSTALL_DIR

ExecStartPre=/bin/sleep 2
ExecStart=$INSTALL_DIR/start.sh
Restart=on-failure
RestartSec=15
TimeoutStartSec=120
TimeoutStopSec=30
StartLimitInterval=300
StartLimitBurst=3

StandardOutput=journal
StandardError=journal
SyslogIdentifier=adspower

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable adspower

# Start hanya jika binary tersedia
if [ -f "$ADSPOWER_BIN" ] && [ "$ADSPOWER_BIN" != "/opt/trafficx/adspower/adspower-placeholder" ]; then
  systemctl restart adspower || true
  info "AdsPower service started"
else
  warn "AdsPower binary belum tersedia — service dikonfigurasi tapi belum distart"
fi

# ── Health check dengan extended timeout ─────────────────────
# AdsPower perlu waktu lebih lama untuk init GUI dan API server
# Timeout diperpanjang ke 90s, dengan exponential backoff
info "Waiting for AdsPower API (port $PORT)..."
info "Catatan: AdsPower GUI app butuh 30-60s untuk init. Harap tunggu..."

MAX_WAIT=90
WAITED=0
READY=false
SLEEP_INTERVAL=3

while [ $WAITED -lt $MAX_WAIT ]; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time 3 \
    "http://localhost:${PORT}/api/v1/application/status" 2>/dev/null || echo "000")

  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ]; then
    READY=true
    break
  fi

  sleep $SLEEP_INTERVAL
  WAITED=$((WAITED + SLEEP_INTERVAL))
  printf '.'

  # Backoff: after 30s, check every 5s
  [ $WAITED -ge 30 ] && SLEEP_INTERVAL=5
done
echo ""

if $READY; then
  log "AdsPower API ready on port $PORT"
else
  warn "AdsPower belum respond setelah ${MAX_WAIT}s"
  warn "Ini NORMAL jika AdsPower baru pertama kali dijalankan atau VPS lambat"
  warn "Cek status: curl http://localhost:$PORT/api/v1/application/status"
  warn "Cek logs:   journalctl -u adspower -n 30"
  warn "Atau tunggu 2-3 menit lagi, lalu cek manual"
fi

log "AdsPower service configured on port $PORT"
log ""
log "Cara setup:"
log "  1. Buka browser: http://SERVER_IP:$PORT"
log "  2. Login atau daftar akun AdsPower"
log "  3. Settings → API Management → Generate API Key"
log "  4. Input di: Platform → Integrations → AdsPower"
