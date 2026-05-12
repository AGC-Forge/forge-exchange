#!/bin/bash
# ============================================================
# scripts/antidetect/install-multilogin.sh
# Install Multilogin Agent di VPS (headless mode)
# Official: https://multilogin.com/download
# Docs: https://docs.multilogin.com
# ============================================================

set -euo pipefail

INSTALL_DIR="/opt/trafficx/multilogin"
DATA_DIR="/var/lib/trafficx/multilogin"
LOCAL_PORT="${MULTILOGIN_PORT:-35000}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
info() { echo -e "${BLUE}[→]${NC} $1"; }

mkdir -p "$INSTALL_DIR" "$DATA_DIR"

info "Installing Multilogin Agent..."

# ── Download Multilogin Linux agent ───────────────────────────
# Multilogin menyediakan dedicated agent untuk Linux/server
# Download URL tersedia setelah login ke dashboard
DOWNLOAD_URL="https://multilogin.com/download/linux/agent"

info "Downloading Multilogin Agent..."
if curl -fsSL --max-time 180 -L -o "/tmp/multilogin-agent.tar.gz" "$DOWNLOAD_URL" 2>/dev/null; then
  mkdir -p "$INSTALL_DIR"
  tar -xzf /tmp/multilogin-agent.tar.gz -C "$INSTALL_DIR" --strip-components=1
  rm -f /tmp/multilogin-agent.tar.gz
  log "Multilogin Agent extracted"
else
  warn "Auto-download gagal."
  warn "Download manual:"
  warn "  1. Login ke https://app.multilogin.com"
  warn "  2. Download → Linux Agent"
  warn "  3. Ekstrak ke: $INSTALL_DIR"
  warn "  4. Jalankan ulang script ini"
  exit 1
fi

# ── Find binary ───────────────────────────────────────────────
ML_BIN=""
for candidate in \
  "$INSTALL_DIR/multilogin-agent" \
  "$INSTALL_DIR/agent" \
  "$INSTALL_DIR/mlx-agent"; do
  [ -f "$candidate" ] && { ML_BIN="$candidate"; chmod +x "$ML_BIN"; break; }
done

if [ -z "$ML_BIN" ]; then
  warn "Binary Multilogin tidak ditemukan di $INSTALL_DIR"
  warn "Cek isi folder: ls -la $INSTALL_DIR"
  exit 1
fi

# ── Systemd service ───────────────────────────────────────────
cat > /etc/systemd/system/multilogin.service << EOF
[Unit]
Description=Multilogin Browser Agent
After=network.target xvfb.service
Requires=xvfb.service

[Service]
Type=simple
User=root
Environment=DISPLAY=:99
Environment=HOME=/root
WorkingDirectory=$INSTALL_DIR

ExecStart=$ML_BIN --port=${LOCAL_PORT} --data-dir=${DATA_DIR}
Restart=always
RestartSec=5
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable multilogin
systemctl start multilogin

# ── Wait and verify ───────────────────────────────────────────
info "Waiting for Multilogin Agent..."
MAX_WAIT=30; WAITED=0
until curl -sf "http://localhost:${LOCAL_PORT}/status" > /dev/null 2>&1; do
  sleep 2; WAITED=$((WAITED + 2))
  [ $WAITED -ge $MAX_WAIT ] && { warn "Multilogin belum ready. Cek: journalctl -u multilogin"; break; }
  printf '.'
done
echo ""

log "Multilogin Agent running on port $LOCAL_PORT"
log ""
log "Cara setup Multilogin:"
log "  1. Daftar akun di: https://multilogin.com"
log "  2. Input Email + Password di platform:"
log "     Settings → Integrations → Multilogin"
log "  3. Token otomatis di-generate saat health check"
