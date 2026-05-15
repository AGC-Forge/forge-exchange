#!/bin/bash
# ============================================================
# scripts/antidetect/install-nstbrowser.sh — FIXED v2
# Install Nstbrowser di VPS (native binary — NO Docker Hub image)
# Official download: https://nstbrowser.io/download
# API docs: https://apidocs.nstbrowser.io
# ============================================================
# PERUBAHAN dari versi lama:
#   - HAPUS docker pull nstbrowser/agent (image tidak public)
#   - Ganti ke native binary download dari nstbrowser.io
#   - Tambah fallback manual download instructions
# ============================================================

set -euo pipefail

INSTALL_DIR="/opt/trafficx/nstbrowser"
DATA_DIR="/var/lib/trafficx/nstbrowser"
PORT="${NSTBROWSER_PORT:-8848}"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'
log()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }
info()  { echo -e "${BLUE}[→]${NC} $1"; }

mkdir -p "$INSTALL_DIR" "$DATA_DIR"

# ── Detect arch ──────────────────────────────────────────────
ARCH=$(uname -m)
case "$ARCH" in
  x86_64)  DEB_ARCH="amd64" ;;
  aarch64) DEB_ARCH="arm64" ;;
  *)       error "Arsitektur tidak didukung: $ARCH" ;;
esac

info "Installing Nstbrowser (native binary, arch: $DEB_ARCH)..."

# ── Install deps ──────────────────────────────────────────────
info "Installing system dependencies..."
apt-get update -qq
apt-get install -y -qq \
  curl wget ca-certificates \
  libfuse2 libglib2.0-0 libnss3 \
  libatk1.0-0 libatk-bridge2.0-0 libgtk-3-0 \
  libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 \
  libgbm1 libdrm2 libasound2 libxss1 \
  xvfb 2>/dev/null || true

# ── Download Nstbrowser .deb package ─────────────────────────
# Nstbrowser mendistribusikan via .deb untuk Linux server
# Cek versi terbaru di: https://nstbrowser.io/download
NST_VERSION="${NSTBROWSER_VERSION:-1.7.0}"

# URL patterns yang diketahui dari nstbrowser.io
DEB_URLS=(
  "https://download.nstbrowser.io/release/${NST_VERSION}/linux/nstbrowser_${NST_VERSION}_${DEB_ARCH}.deb"
  "https://download.nstbrowser.io/release/latest/linux/nstbrowser_${DEB_ARCH}.deb"
  "https://download.nstbrowser.io/download/linux/nstbrowser_${DEB_ARCH}.deb"
)

DEB_PATH="/tmp/nstbrowser_${DEB_ARCH}.deb"
DOWNLOADED=false

for URL in "${DEB_URLS[@]}"; do
  info "Trying: $URL"
  if curl -fsSL --max-time 180 --connect-timeout 15 -L -o "$DEB_PATH" "$URL" 2>/dev/null; then
    # Verify it's actually a .deb file (not an error page)
    if file "$DEB_PATH" 2>/dev/null | grep -q "Debian"; then
      DOWNLOADED=true
      log "Downloaded from: $URL"
      break
    fi
    rm -f "$DEB_PATH"
  fi
done

if $DOWNLOADED; then
  info "Installing .deb package..."
  dpkg -i "$DEB_PATH" 2>/dev/null || apt-get -f install -y -qq
  rm -f "$DEB_PATH"

  # Find installed binary
  NST_BIN=""
  for candidate in /usr/bin/nstbrowser /opt/nstbrowser/nstbrowser /usr/local/bin/nstbrowser; do
    if [ -f "$candidate" ]; then
      NST_BIN="$candidate"
      break
    fi
  done
  # Also check if dpkg registered it
  if [ -z "$NST_BIN" ]; then
    NST_BIN=$(dpkg -L nstbrowser 2>/dev/null | grep -E '/(nstbrowser|NstBrowser)$' | head -1 || true)
  fi
  [ -n "$NST_BIN" ] && log "Nstbrowser binary: $NST_BIN" || warn "Binary tidak ditemukan setelah install .deb"

else
  # ── Fallback: manual download ─────────────────────────────
  warn "Auto-download gagal. Coba download manual:"
  warn ""
  warn "  1. Buka https://nstbrowser.io/download di browser kamu"
  warn "  2. Download versi Linux (.deb untuk Ubuntu/Debian)"
  warn "  3. Upload ke VPS:"
  warn "     scp nstbrowser_*.deb root@VPS_IP:/tmp/"
  warn "  4. Install:"
  warn "     dpkg -i /tmp/nstbrowser_*.deb && apt-get -f install -y"
  warn "  5. Jalankan ulang script ini"
  warn ""

  # Check apakah user sudah manually install
  if command -v nstbrowser &>/dev/null || [ -f "$INSTALL_DIR/nstbrowser" ]; then
    log "Nstbrowser sudah terinstall manual!"
  else
    warn "Nstbrowser belum terinstall. Ikuti langkah di atas."
    # Jangan exit 1 — biarkan installer lanjut ke tahap setup service
  fi
fi

# ── Create headless wrapper script ───────────────────────────
# Nstbrowser di server mode berjalan sebagai background service
# API tersedia di localhost:PORT
cat > "$INSTALL_DIR/start.sh" << STARTEOF
#!/bin/bash
# Nstbrowser headless server wrapper

export DISPLAY=:99
export HOME=/root
export XDG_RUNTIME_DIR=/tmp/runtime-nst
export CHROME_DEVEL_SANDBOX=/usr/local/sbin/chrome-devel-sandbox

mkdir -p "\$XDG_RUNTIME_DIR" && chmod 700 "\$XDG_RUNTIME_DIR"

# Find binary
NST_BIN=""
for candidate in \
  /usr/bin/nstbrowser \
  /usr/local/bin/nstbrowser \
  /opt/nstbrowser/nstbrowser \
  /opt/nstbrowser/NstBrowser \
  $INSTALL_DIR/nstbrowser; do
  [ -f "\$candidate" ] && NST_BIN="\$candidate" && break
done

if [ -z "\$NST_BIN" ]; then
  echo "[!] Nstbrowser binary tidak ditemukan. Install dulu via .deb"
  exit 1
fi

echo "[+] Starting Nstbrowser via \$NST_BIN on port $PORT"

exec "\$NST_BIN" \
  --no-sandbox \
  --disable-gpu \
  --disable-software-rasterizer \
  --headless \
  --api-port="$PORT" \
  --data-dir="$DATA_DIR" \
  --user-data-dir="$DATA_DIR" 2>&1
STARTEOF

chmod +x "$INSTALL_DIR/start.sh"

# ── Xvfb service (virtual display) ───────────────────────────
if ! systemctl is-active xvfb &>/dev/null 2>&1; then
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
  log "Xvfb started on :99"
fi

# ── Systemd service untuk Nstbrowser ─────────────────────────
cat > /etc/systemd/system/nstbrowser.service << SVCEOF
[Unit]
Description=Nstbrowser Browser Manager
After=network.target xvfb.service
Wants=xvfb.service

[Service]
Type=simple
User=root
Environment=DISPLAY=:99
Environment=HOME=/root
WorkingDirectory=$INSTALL_DIR

ExecStart=$INSTALL_DIR/start.sh
Restart=on-failure
RestartSec=10
TimeoutStopSec=30

# Restart max 5x dalam 5 menit
StartLimitInterval=300
StartLimitBurst=5

StandardOutput=journal
StandardError=journal
SyslogIdentifier=nstbrowser

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable nstbrowser

# Start hanya jika binary tersedia
if command -v nstbrowser &>/dev/null || [ -f "$INSTALL_DIR/nstbrowser" ]; then
  systemctl restart nstbrowser || true
  sleep 3
fi

# ── Wait and verify ───────────────────────────────────────────
info "Waiting for Nstbrowser API (port $PORT)..."
MAX_WAIT=45
WAITED=0
READY=false

while [ $WAITED -lt $MAX_WAIT ]; do
  # Nstbrowser API v2 — x-api-key boleh empty untuk health check dasar
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time 3 \
    -H "x-api-key: healthcheck" \
    "http://localhost:${PORT}/api/v2/browser/list?page=1&pageSize=1" 2>/dev/null || echo "000")

  # 200 = ok, 401 = API butuh key valid (tapi service running!),
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    READY=true
    break
  fi

  sleep 2
  WAITED=$((WAITED + 2))
  printf '.'
done
echo ""

if $READY; then
  log "Nstbrowser API ready on port $PORT"
else
  warn "Nstbrowser belum respond setelah ${MAX_WAIT}s"
  warn "Cek logs: journalctl -u nstbrowser -n 30"
  warn "Pastikan binary sudah terinstall (dpkg -l | grep nstbrowser)"
fi

log ""
log "Nstbrowser installed. Cara setup:"
log "  1. Daftar/login di: https://nstbrowser.io"
log "  2. Account → API Key → Generate"
log "  3. Input key di: Platform → Integrations → Nstbrowser"
log "  4. Port default: $PORT (ubah di integration jika berbeda)"
log ""
log "Troubleshoot:"
log "  journalctl -u nstbrowser -n 50"
log "  curl -H 'x-api-key: YOUR_KEY' http://localhost:$PORT/api/v2/browser/list"
