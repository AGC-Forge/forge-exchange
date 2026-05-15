#!/bin/bash
# ============================================================
# scripts/antidetect/install-adspower.sh
# Install AdsPower di VPS (headless/server mode)
# Official download: https://www.adspower.com/download
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

INSTALL_DIR="/opt/trafficx/adspower"
DATA_DIR="/var/lib/trafficx/adspower"
PORT="${ADSPOWER_PORT:-50325}"
VERSION="${ADSPOWER_VERSION:-latest}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
info() { echo -e "${BLUE}[→]${NC} $1"; }

mkdir -p "$INSTALL_DIR" "$DATA_DIR"

info "Installing AdsPower..."

# ── Install .deb ──────────────────────────────────────────────
info "Installing .deb package..."
dpkg -i adspower.deb || apt-get install -f -y
rm -f adspower.deb
log "AdsPower installed"

# ── Create systemd service ────────────────────────────────────
cat > /etc/systemd/system/adspower.service << EOF
[Unit]
Description=AdsPower Browser Manager
After=network.target xvfb.service
Requires=xvfb.service

[Service]
Type=simple
User=root
Environment=DISPLAY=:99
Environment=HOME=/root
WorkingDirectory=/root

# AdsPower binary path (sesuaikan jika berbeda)
ExecStart=/opt/AdsPower/adspower --no-sandbox --disable-gpu \\
  --api-port=${PORT} \\
  --data-path=${DATA_DIR} \\
  --headless

Restart=always
RestartSec=5
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable adspower
systemctl start adspower

# ── Wait and verify ───────────────────────────────────────────
info "Waiting for AdsPower API to be ready..."
MAX_WAIT=30
WAITED=0
until curl -sf "http://localhost:${PORT}/api/v1/application/status" > /dev/null 2>&1; do
  sleep 2
  WAITED=$((WAITED + 2))
  [ $WAITED -ge $MAX_WAIT ] && { warn "AdsPower belum ready setelah ${MAX_WAIT}s. Cek: journalctl -u adspower"; break; }
  printf '.'
done
echo ""

log "AdsPower service running on port $PORT"
log "API URL: http://localhost:${PORT}"
log ""
log "Cara mendapatkan API Key:"
log "  1. Buka AdsPower UI: http://SERVER_IP:${PORT}"
log "  2. Login dengan akun AdsPower kamu"
log "  3. Settings → API Management → Generate Key"
log "  4. Input key di platform: Settings → Integrations → AdsPower"
