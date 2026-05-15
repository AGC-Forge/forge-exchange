#!/bin/bash
# ============================================================
# scripts/antidetect/install-nstbrowser.sh — FIXED v3
# Menggunakan OFFICIAL install script dari GitHub Nstbrowser
# Repo: https://github.com/Nstbrowser/nstbrowser-agent-setup
#
# Nstbrowser di server = "nst-agent" (headless mode)
# BUKAN nstbrowser/agent Docker image (tidak public)
# Docker alternatif = nstbrowser/browserless (ada di Docker Hub)
# ============================================================

set -euo pipefail

INSTALL_DIR="/opt/trafficx/nstbrowser"
DATA_DIR="/var/lib/trafficx/nstbrowser"
NST_AGENT_DIR="$HOME/.nst-agent"
PORT="${NSTBROWSER_PORT:-8848}"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'
log()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }
info()  { echo -e "${BLUE}[→]${NC} $1"; }

mkdir -p "$INSTALL_DIR" "$DATA_DIR"

# ── Check OS ──────────────────────────────────────────────────
OS_RELEASE=$(lsb_release -r --short 2>/dev/null || echo "0")
if awk -v a="$OS_RELEASE" -v b="22.04" 'BEGIN {exit (a >= b)}'; then
  error "Nstbrowser agent memerlukan Ubuntu 22.04 atau lebih baru. Current: $OS_RELEASE"
fi

# ── Opsi 1: Official nst-agent install (recommended) ─────────
USE_DOCKER="${USE_DOCKER:-0}"

if [ "$USE_DOCKER" = "0" ]; then
  info "Installing Nstbrowser via official nst-agent script..."
  info "Source: https://github.com/Nstbrowser/nstbrowser-agent-setup"

  # Install prerequisites
  apt-get update -qq
  apt-get install -y -qq wget curl jq unzip psmisc supervisor x11vnc 2>/dev/null || true

  # Download dan jalankan official install script
  INSTALL_SCRIPT_URL="https://raw.githubusercontent.com/Nstbrowser/nstbrowser-agent-setup/main/scripts/agent_install.sh"
  INSTALL_SCRIPT="/tmp/nst_agent_install.sh"

  info "Downloading official install script..."
  if curl -fsSL --max-time 60 "$INSTALL_SCRIPT_URL" -o "$INSTALL_SCRIPT" 2>/dev/null; then
    chmod +x "$INSTALL_SCRIPT"
    log "Official install script downloaded"

    # Jalankan official script
    info "Running official Nstbrowser agent installer..."
    bash "$INSTALL_SCRIPT" 2>&1 | while IFS= read -r line; do
      echo "  [nst] $line"
    done
    rm -f "$INSTALL_SCRIPT"
    log "nst-agent installed via official script"
  else
    warn "Gagal download official script. Coba manual:"
    warn "  curl -fsSL https://raw.githubusercontent.com/Nstbrowser/nstbrowser-agent-setup/main/scripts/agent_install.sh | bash"
  fi

  # ── Cek apakah agent binary tersedia ─────────────────────
  AGENT_BIN=""
  for candidate in /usr/bin/agent "$NST_AGENT_DIR/agent" /usr/local/bin/agent; do
    [ -f "$candidate" ] && AGENT_BIN="$candidate" && break
  done

  if [ -z "$AGENT_BIN" ]; then
    warn "nst-agent binary tidak ditemukan setelah install."
    warn "Coba jalankan manual:"
    warn "  curl -fsSL https://raw.githubusercontent.com/Nstbrowser/nstbrowser-agent-setup/main/scripts/agent_install.sh | bash"
  else
    log "nst-agent binary: $AGENT_BIN"
  fi

  # ── Systemd service untuk nst-agent ──────────────────────
  # nst-agent menggunakan nstcli untuk start
  cat > "$INSTALL_DIR/start.sh" << STARTEOF
#!/bin/bash
export HOME=/root
export NST_AGENT_DIR="\$HOME/.nst-agent"

# Gunakan nstcli jika tersedia (official launcher)
if command -v nstcli &>/dev/null; then
  exec nstcli start --port $PORT --data-dir "$DATA_DIR" 2>&1
elif [ -f /usr/bin/agent ]; then
  exec /usr/bin/agent --port $PORT --data-dir "$DATA_DIR" 2>&1
else
  echo "[!] nst-agent tidak ditemukan. Install via:"
  echo "    curl -fsSL https://raw.githubusercontent.com/Nstbrowser/nstbrowser-agent-setup/main/scripts/agent_install.sh | bash"
  sleep 30
  exit 1
fi
STARTEOF
  chmod +x "$INSTALL_DIR/start.sh"

else
  # ── Opsi 2: Docker via nstbrowser/browserless ─────────────
  # Image yang benar di Docker Hub adalah nstbrowser/browserless
  # BUKAN nstbrowser/agent (itu private/tidak ada)
  info "Installing Nstbrowser via Docker (nstbrowser/browserless)..."
  info "Catatan: TOKEN wajib dari https://nstbrowser.io → Account → API Key"

  NST_TOKEN="${NSTBROWSER_API_KEY:-YOUR_API_KEY_HERE}"

  mkdir -p "$INSTALL_DIR"

  cat > "$INSTALL_DIR/docker-compose.yml" << COMPEOF
services:
  nstbrowser:
    image: nstbrowser/browserless:latest
    container_name: trafficx_nstbrowser
    restart: unless-stopped
    ports:
      - "${PORT}:8848"
    environment:
      - TOKEN=${NST_TOKEN}
      - PORT=8848
      - DATADIR=/data
    volumes:
      - ${DATA_DIR}:/data
    shm_size: '2gb'
COMPEOF

  # Pull image yang benar
  info "Pulling nstbrowser/browserless image..."
  docker pull nstbrowser/browserless:latest 2>&1 || {
    warn "Docker pull gagal. Coba: docker pull nstbrowser/browserless:latest"
  }

  cd "$INSTALL_DIR"
  docker compose up -d 2>&1 || warn "docker compose up gagal, cek log"
  log "Nstbrowser (browserless) container started"

  cat > "$INSTALL_DIR/start.sh" << STARTEOF
#!/bin/bash
cd $INSTALL_DIR
docker compose up -d
STARTEOF
  chmod +x "$INSTALL_DIR/start.sh"
fi

# ── Systemd service ───────────────────────────────────────────
cat > /etc/systemd/system/nstbrowser.service << SVCEOF
[Unit]
Description=Nstbrowser Agent
After=network.target
Wants=network.target

[Service]
Type=simple
User=root
Environment=HOME=/root
WorkingDirectory=$INSTALL_DIR

ExecStart=$INSTALL_DIR/start.sh
Restart=on-failure
RestartSec=15
TimeoutStartSec=120
TimeoutStopSec=30
StartLimitInterval=300
StartLimitBurst=3

StandardOutput=journal
StandardError=journal
SyslogIdentifier=nstbrowser

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable nstbrowser

# Start service jika binary tersedia
if command -v nstcli &>/dev/null || [ -f /usr/bin/agent ] || [ "$USE_DOCKER" = "1" ]; then
  systemctl restart nstbrowser || true
  sleep 3
fi

# ── Health check ──────────────────────────────────────────────
info "Waiting for Nstbrowser API (port $PORT)..."
MAX_WAIT=60; WAITED=0; READY=false

while [ $WAITED -lt $MAX_WAIT ]; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time 3 \
    -H "x-api-key: healthcheck" \
    "http://localhost:${PORT}/api/v2/browser/list?page=1&pageSize=1" 2>/dev/null || echo "000")

  # 200=ok, 401=service up tapi butuh valid token, 403=sama
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    READY=true; break
  fi

  sleep 3; WAITED=$((WAITED + 3)); printf '.'
done
echo ""

if $READY; then
  log "Nstbrowser API ready on port $PORT"
else
  warn "Nstbrowser belum respond setelah ${MAX_WAIT}s"
  if [ "$USE_DOCKER" = "1" ]; then
    warn "Cek: docker logs trafficx_nstbrowser --tail 30"
  else
    warn "Cek: journalctl -u nstbrowser -n 30"
    warn "     nstcli status (jika tersedia)"
  fi
fi

log ""
log "Nstbrowser installed!"
log ""
log "Jika pakai nst-agent (native):"
log "  nstcli status              → cek status"
log "  journalctl -u nstbrowser   → lihat logs"
log ""
log "Jika pakai Docker:"
log "  docker logs trafficx_nstbrowser --tail 30"
log "  TOKEN wajib: set NSTBROWSER_API_KEY di .env"
log ""
log "Setup API Key:"
log "  1. Login/daftar di: https://app.nstbrowser.io"
log "  2. Account → API Key → Generate"
log "  3. Input di: Platform → Integrations → Nstbrowser"
