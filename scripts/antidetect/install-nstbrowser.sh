#!/bin/bash
# ============================================================
# scripts/antidetect/install-nstbrowser.sh
# Install Nstbrowser di VPS (headless/Docker mode)
# Official: https://nstbrowser.io/download
# API v2 docs: https://apidocs.nstbrowser.io/doc-922484
# ============================================================

set -euo pipefail

INSTALL_DIR="/opt/trafficx/nstbrowser"
DATA_DIR="/var/lib/trafficx/nstbrowser"
PORT="${NSTBROWSER_PORT:-8848}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
info() { echo -e "${BLUE}[→]${NC} $1"; }

mkdir -p "$INSTALL_DIR" "$DATA_DIR"

# ── Check Docker ──────────────────────────────────────────────
# Nstbrowser support Docker — lebih stabil untuk VPS server
USE_DOCKER="${USE_DOCKER:-1}"

if [ "$USE_DOCKER" = "1" ] && command -v docker &>/dev/null; then
  info "Installing Nstbrowser via Docker (recommended for server)..."

  # Pull Nstbrowser Docker image
  # Ref: https://apidocs.nstbrowser.io/doc-922484
  docker pull nstbrowser/agent:latest 2>/dev/null || {
    warn "Docker pull gagal. Coba manual: docker pull nstbrowser/agent:latest"
  }

  # Create docker-compose untuk Nstbrowser
  cat > "$INSTALL_DIR/docker-compose.yml" << EOF
version: '3.8'
services:
  nstbrowser:
    image: nstbrowser/agent:latest
    container_name: trafficx_nstbrowser
    restart: unless-stopped
    ports:
      - "${PORT}:8848"
    volumes:
      - ${DATA_DIR}:/root/.nstbrowser
    environment:
      - DISPLAY=:99
    shm_size: '2gb'
    extra_hosts:
      - "host.docker.internal:host-gateway"
EOF

  # Start dengan docker-compose
  cd "$INSTALL_DIR"
  docker compose up -d

  log "Nstbrowser running via Docker on port $PORT"

else
  info "Installing Nstbrowser as native app..."

  # Download Nstbrowser Linux package
  DOWNLOAD_URL="https://download.nstbrowser.io/release/latest/linux/nstbrowser-linux.tar.gz"
  APPIMAGE_URL="https://download.nstbrowser.io/release/latest/linux/NstBrowser.AppImage"

  # Try tar.gz first, then AppImage
  if curl -fsSL --max-time 180 -L -o "/tmp/nstbrowser.tar.gz" "$DOWNLOAD_URL" 2>/dev/null; then
    tar -xzf /tmp/nstbrowser.tar.gz -C "$INSTALL_DIR" --strip-components=1
    rm -f /tmp/nstbrowser.tar.gz
    log "Nstbrowser extracted to $INSTALL_DIR"
  elif curl -fsSL --max-time 180 -L -o "$INSTALL_DIR/nstbrowser.AppImage" "$APPIMAGE_URL" 2>/dev/null; then
    chmod +x "$INSTALL_DIR/nstbrowser.AppImage"
    log "Nstbrowser AppImage downloaded"
  else
    warn "Auto-download gagal."
    warn "Download manual dari: https://nstbrowser.io/download"
    warn "Simpan ke: $INSTALL_DIR/"
    warn "Lalu jalankan: bash scripts/antidetect/install-nstbrowser.sh"
    exit 1
  fi

  # ── Wrapper script ──────────────────────────────────────────
  cat > "$INSTALL_DIR/start.sh" << STARTEOF
#!/bin/bash
export DISPLAY=:99
export HOME=/root
export XDG_RUNTIME_DIR=/tmp/runtime-nst
mkdir -p "\$XDG_RUNTIME_DIR" && chmod 700 "\$XDG_RUNTIME_DIR"

# Find the binary
NST_BIN=""
if [ -f "$INSTALL_DIR/nstbrowser" ]; then
  NST_BIN="$INSTALL_DIR/nstbrowser"
elif [ -f "$INSTALL_DIR/nstbrowser.AppImage" ]; then
  NST_BIN="$INSTALL_DIR/nstbrowser.AppImage"
elif [ -f "$INSTALL_DIR/NstBrowser" ]; then
  NST_BIN="$INSTALL_DIR/NstBrowser"
fi

[ -z "\$NST_BIN" ] && { echo "Nstbrowser binary tidak ditemukan di $INSTALL_DIR"; exit 1; }

exec "\$NST_BIN" \
  --no-sandbox \
  --disable-gpu \
  --port=${PORT} \
  --headless \
  --user-data-dir="$DATA_DIR"
STARTEOF

  chmod +x "$INSTALL_DIR/start.sh"

  # ── Systemd service ─────────────────────────────────────────
  cat > /etc/systemd/system/nstbrowser.service << EOF
[Unit]
Description=Nstbrowser Browser Manager
After=network.target xvfb.service
Requires=xvfb.service

[Service]
Type=simple
User=root
Environment=DISPLAY=:99
Environment=HOME=/root
WorkingDirectory=$INSTALL_DIR

ExecStart=$INSTALL_DIR/start.sh
Restart=always
RestartSec=5
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable nstbrowser
  systemctl start nstbrowser
fi

# ── Wait and verify ───────────────────────────────────────────
info "Waiting for Nstbrowser API v2..."
MAX_WAIT=40; WAITED=0
until curl -sf "http://localhost:${PORT}/api/v2/browser/list?page=1&pageSize=1" \
  -H "x-api-key: test" > /dev/null 2>&1; do
  sleep 2; WAITED=$((WAITED + 2))
  [ $WAITED -ge $MAX_WAIT ] && {
    warn "Nstbrowser belum ready setelah ${MAX_WAIT}s."
    if [ "$USE_DOCKER" = "1" ]; then
      warn "Cek: docker logs trafficx_nstbrowser"
    else
      warn "Cek: journalctl -u nstbrowser"
    fi
    break
  }
  printf '.'
done
echo ""

log "Nstbrowser API v2 running on port $PORT"
log "API Base URL: http://localhost:${PORT}/api/v2"
log ""
log "Cara mendapatkan API Key:"
log "  1. Buka Nstbrowser app atau https://nstbrowser.io"
log "  2. Account → API Key → Generate"
log "  3. Input key di platform: Settings → Integrations → Nstbrowser"
log "  4. Opsional: custom port di integration config (default: 8848)"
