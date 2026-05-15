#!/bin/bash
# ============================================================
# scripts/antidetect/install-dolphin.sh — FIXED v2
# Install Dolphin{anty} di VPS (AppImage, FUSE-free mode)
# Official: https://dolphin-anty.com/download
# ============================================================
# PERUBAHAN dari versi lama:
#   - Tambah --appimage-extract-and-run flag (tidak butuh FUSE)
#   - Atau extract AppImage ke folder lalu jalankan binary
#   - Perpanjang health check timeout ke 60s
#   - Tambah multiple download URL fallback
# ============================================================

set -euo pipefail

INSTALL_DIR="/opt/trafficx/dolphin"
DATA_DIR="/var/lib/trafficx/dolphin"
EXTRACT_DIR="$INSTALL_DIR/extracted"
PORT="${DOLPHIN_PORT:-3001}"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'
log()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; }
info()  { echo -e "${BLUE}[→]${NC} $1"; }

mkdir -p "$INSTALL_DIR" "$DATA_DIR" "$EXTRACT_DIR"

APPIMAGE_PATH="$INSTALL_DIR/dolphin-anty.AppImage"

# ── Download Dolphin{anty} AppImage ──────────────────────────
DOWNLOAD_URLS=(
  "https://dolphin-anty.com/download/linux"
  "https://dolphin-anty-pub.s3.amazonaws.com/anty-linux-latest.AppImage"
  "https://pub-dolphin-anty.s3.amazonaws.com/linux/dolphin-anty-linux-latest.AppImage"
)

info "Downloading Dolphin{anty} AppImage..."

DOWNLOADED=false
for URL in "${DOWNLOAD_URLS[@]}"; do
  info "Trying: $URL"
  if curl -fsSL --max-time 180 --connect-timeout 15 \
       -L -o "$APPIMAGE_PATH" "$URL" 2>/dev/null; then
    # Cek file tidak kosong dan bukan error page HTML
    FILE_SIZE=$(stat -c%s "$APPIMAGE_PATH" 2>/dev/null || echo "0")
    if [ "$FILE_SIZE" -gt 1048576 ]; then  # >1MB = valid AppImage
      chmod +x "$APPIMAGE_PATH"
      DOWNLOADED=true
      log "Downloaded from: $URL (${FILE_SIZE} bytes)"
      break
    fi
    rm -f "$APPIMAGE_PATH"
  fi
done

if ! $DOWNLOADED; then
  # Cek apakah sudah ada dari download manual
  if [ -f "$APPIMAGE_PATH" ]; then
    DOWNLOADED=true
    log "Menggunakan AppImage yang sudah ada: $APPIMAGE_PATH"
  else
    warn "Auto-download gagal."
    warn ""
    warn "Download manual dari: https://dolphin-anty.com/download"
    warn "Pilih: Linux → AppImage (atau Linux 64-bit)"
    warn "Upload ke VPS: scp dolphin-anty*.AppImage root@VPS_IP:$APPIMAGE_PATH"
    warn "Lalu: chmod +x $APPIMAGE_PATH && bash scripts/antidetect/install-dolphin.sh"
    warn ""
  fi
fi

# ── FUSE check dan extract AppImage ──────────────────────────
# VPS server biasanya tidak punya FUSE — extract AppImage dulu
if $DOWNLOADED && [ -f "$APPIMAGE_PATH" ]; then
  info "Installing AppImage dependencies..."
  apt-get install -y -qq \
    libfuse2 libglib2.0-0 libnss3 \
    libatk1.0-0 libatk-bridge2.0-0 libgtk-3-0 \
    libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 \
    libgbm1 libdrm2 libasound2 \
    xvfb 2>/dev/null || true

  # Test apakah FUSE tersedia
  if [ -c /dev/fuse ] && modinfo fuse &>/dev/null 2>&1; then
    log "FUSE tersedia — AppImage bisa dijalankan langsung"
    USE_EXTRACT=false
  else
    info "FUSE tidak tersedia — extract AppImage untuk server mode"
    USE_EXTRACT=true
  fi

  if $USE_EXTRACT; then
    info "Extracting AppImage ke $EXTRACT_DIR..."
    rm -rf "$EXTRACT_DIR"
    mkdir -p "$EXTRACT_DIR"

    # --appimage-extract-and-run tidak butuh FUSE
    # Atau extract manual ke folder
    cd "$EXTRACT_DIR"
    "$APPIMAGE_PATH" --appimage-extract > /dev/null 2>&1 || {
      # Fallback: extract dengan 7z
      if command -v 7z &>/dev/null; then
        7z x "$APPIMAGE_PATH" -o"$EXTRACT_DIR/squashfs-root" > /dev/null 2>&1
      else
        warn "Gagal extract. Install fuse2: apt-get install libfuse2 -y"
        warn "Atau install 7zip: apt-get install p7zip-full -y"
        warn "Lalu jalankan ulang script ini"
      fi
    }
    cd /

    # Find extracted binary
    DOLPHIN_BIN=$(find "$EXTRACT_DIR/squashfs-root" -name "dolphin-anty" -o -name "dolphin" 2>/dev/null | head -1 || true)
    [ -n "$DOLPHIN_BIN" ] && log "Extracted binary: $DOLPHIN_BIN"
  fi
fi

# ── Xvfb service ─────────────────────────────────────────────
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
fi

# ── Wrapper start script ──────────────────────────────────────
cat > "$INSTALL_DIR/start.sh" << STARTEOF
#!/bin/bash
export DISPLAY=:99
export HOME=/root
export XDG_RUNTIME_DIR=/tmp/runtime-dolphin
export APPIMAGE_EXTRACT_AND_RUN=1  # skip FUSE check

mkdir -p "\$XDG_RUNTIME_DIR" && chmod 700 "\$XDG_RUNTIME_DIR"

APPIMAGE="$APPIMAGE_PATH"
EXTRACT_DIR="$EXTRACT_DIR/squashfs-root"

# Prioritas: extracted binary > --appimage-extract-and-run > langsung
DOLPHIN_BIN=\$(find "\$EXTRACT_DIR" -name "dolphin-anty" -o -name "dolphin" 2>/dev/null | head -1 || true)

if [ -n "\$DOLPHIN_BIN" ]; then
  # Gunakan extracted binary (tidak butuh FUSE)
  exec "\$DOLPHIN_BIN" \
    --no-sandbox \
    --disable-gpu \
    --headless-mode \
    --local-api-port=$PORT \
    --user-data-dir="$DATA_DIR" 2>&1

elif [ -f "\$APPIMAGE" ]; then
  # Gunakan --appimage-extract-and-run (tidak butuh FUSE, sedikit lebih lambat)
  exec "\$APPIMAGE" \
    --appimage-extract-and-run \
    --no-sandbox \
    --disable-gpu \
    --headless-mode \
    --local-api-port=$PORT \
    --user-data-dir="$DATA_DIR" 2>&1
else
  echo "[!] Dolphin binary tidak ditemukan di $INSTALL_DIR"
  echo "    Download dari: https://dolphin-anty.com/download"
  sleep 30
  exit 1
fi
STARTEOF

chmod +x "$INSTALL_DIR/start.sh"

# ── Systemd service ───────────────────────────────────────────
cat > /etc/systemd/system/dolphin-anty.service << SVCEOF
[Unit]
Description=Dolphin{anty} Browser Manager
After=network.target xvfb.service
Wants=xvfb.service

[Service]
Type=simple
User=root
Environment=DISPLAY=:99
Environment=HOME=/root
Environment=APPIMAGE_EXTRACT_AND_RUN=1
WorkingDirectory=$INSTALL_DIR

ExecStartPre=/bin/sleep 2
ExecStart=$INSTALL_DIR/start.sh
Restart=on-failure
RestartSec=10
TimeoutStartSec=90
TimeoutStopSec=30
StartLimitInterval=300
StartLimitBurst=3

StandardOutput=journal
StandardError=journal
SyslogIdentifier=dolphin-anty

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable dolphin-anty

if [ -f "$APPIMAGE_PATH" ]; then
  systemctl restart dolphin-anty || true
  info "Dolphin-anty service started"
fi

# ── Health check — extended timeout ──────────────────────────
info "Waiting for Dolphin API (port $PORT)..."
info "Dolphin bisa memerlukan 30-60s untuk init pertama kali..."

MAX_WAIT=60
WAITED=0
READY=false

while [ $WAITED -lt $MAX_WAIT ]; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time 3 \
    "http://localhost:${PORT}/v1.0/browser_profiles?limit=1" 2>/dev/null || echo "000")

  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    READY=true
    break
  fi

  sleep 3
  WAITED=$((WAITED + 3))
  printf '.'
done
echo ""

if $READY; then
  log "Dolphin{anty} API ready on port $PORT"
else
  warn "Dolphin belum respond setelah ${MAX_WAIT}s — ini OK jika baru diinstall"
  warn "Cek: journalctl -u dolphin-anty -n 30"
  warn "API: curl http://localhost:$PORT/v1.0/browser_profiles?limit=1"
fi

log "Dolphin{anty} running on port $PORT"
log ""
log "Cara mendapatkan API Key:"
log "  1. Daftar di: https://dolphin-anty.com"
log "  2. Dashboard → API → Generate Token"
log "  3. Input di: Platform → Integrations → Dolphin{anty}"
