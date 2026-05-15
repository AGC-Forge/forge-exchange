#!/bin/bash
# ============================================================
# Quick fix: install Nstbrowser via official nst-agent script
# Jalankan ini langsung di VPS:
#   sudo bash fix-nstbrowser-now.sh
# ============================================================

set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
info() { echo -e "${BLUE}[→]${NC} $1"; }

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   Nstbrowser Quick Fix — Official Agent Install  ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

PORT="${NSTBROWSER_PORT:-8848}"

# ── 1. Install via official script ───────────────────────────
info "Downloading official Nstbrowser agent installer..."

SCRIPT_URL="https://raw.githubusercontent.com/Nstbrowser/nstbrowser-agent-setup/main/scripts/agent_install.sh"

if curl -fsSL --max-time 60 "$SCRIPT_URL" | bash; then
  log "nst-agent installed successfully!"
else
  warn "Official script gagal. Coba Docker alternatif:"
  warn ""
  warn "  # Docker option (butuh API KEY dari nstbrowser.io):"
  warn "  export NSTBROWSER_API_KEY=your_token_here"
  warn "  docker run -d \\"
  warn "    -e TOKEN=\$NSTBROWSER_API_KEY \\"
  warn "    -e PORT=8848 \\"
  warn "    -p 8848:8848 \\"
  warn "    --name trafficx_nstbrowser \\"
  warn "    --restart unless-stopped \\"
  warn "    nstbrowser/browserless:latest"
  exit 1
fi

# ── 2. Setup start script ─────────────────────────────────────
mkdir -p /opt/trafficx/nstbrowser

cat > /opt/trafficx/nstbrowser/start.sh << STARTEOF
#!/bin/bash
export HOME=/root

if command -v nstcli &>/dev/null; then
  exec nstcli start --port $PORT 2>&1
elif [ -f /usr/bin/agent ]; then
  exec /usr/bin/agent --port $PORT 2>&1
else
  echo "[!] nst-agent binary tidak ditemukan"
  exit 1
fi
STARTEOF
chmod +x /opt/trafficx/nstbrowser/start.sh

# ── 3. Update systemd service ─────────────────────────────────
cat > /etc/systemd/system/nstbrowser.service << SVCEOF
[Unit]
Description=Nstbrowser Agent
After=network.target

[Service]
Type=simple
User=root
Environment=HOME=/root
WorkingDirectory=/opt/trafficx/nstbrowser

ExecStart=/opt/trafficx/nstbrowser/start.sh
Restart=on-failure
RestartSec=10
TimeoutStartSec=120

StandardOutput=journal
StandardError=journal
SyslogIdentifier=nstbrowser

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable nstbrowser
systemctl restart nstbrowser

# ── 4. Health check ───────────────────────────────────────────
info "Waiting for Nstbrowser (port $PORT)..."
sleep 5
MAX=60; WAITED=0; OK=false
while [ $WAITED -lt $MAX ]; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 \
    -H "x-api-key: test" \
    "http://localhost:${PORT}/api/v2/browser/list?page=1&pageSize=1" 2>/dev/null || echo "000")
  if [ "$CODE" = "200" ] || [ "$CODE" = "401" ] || [ "$CODE" = "403" ]; then
    OK=true; break
  fi
  sleep 3; WAITED=$((WAITED+3)); printf '.'
done
echo ""

if $OK; then
  log "Nstbrowser API ready on port $PORT!"
  log ""
  log "Verify: curl -H 'x-api-key: YOUR_KEY' http://localhost:$PORT/api/v2/browser/list"
else
  warn "Belum respond. Cek: journalctl -u nstbrowser -n 30"
  warn "Atau: nstcli status"
fi

echo ""
log "Next steps:"
log "  1. Login di: https://app.nstbrowser.io"
log "  2. Account → API Key → Generate"
log "  3. Input di: Platform → Integrations → Nstbrowser"
