#!/bin/bash
# ============================================================
# scripts/antidetect/setup-vps.sh
# Master setup script untuk VPS worker platform
# Installs: system deps, Node.js, antidetect browser apps
# Usage: bash scripts/antidetect/setup-vps.sh
# ============================================================

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'

log()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }
info()  { echo -e "${BLUE}[→]${NC} $1"; }
step()  { echo -e "\n${BLUE}══════════════════════════════════${NC}"; echo -e "${BLUE}  $1${NC}"; echo -e "${BLUE}══════════════════════════════════${NC}"; }

# ── Check root ────────────────────────────────────────────────
[ "$EUID" -ne 0 ] && error "Jalankan sebagai root: sudo bash scripts/antidetect/setup-vps.sh"

# ── Detect OS ─────────────────────────────────────────────────
if [ -f /etc/os-release ]; then
  source /etc/os-release
  OS_NAME="$NAME"
  OS_VERSION="$VERSION_ID"
else
  error "OS tidak dikenali"
fi

log "OS: $OS_NAME $OS_VERSION"

# ── Load config ───────────────────────────────────────────────
INSTALL_DIR="${INSTALL_DIR:-/opt/trafficx}"
DATA_DIR="${DATA_DIR:-/var/lib/trafficx}"
PROVIDERS="${PROVIDERS:-adspower dolphin nstbrowser}"  # space-separated

mkdir -p "$INSTALL_DIR" "$DATA_DIR"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   TrafficX — VPS Antidetect Setup            ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "  Install dir:  $INSTALL_DIR"
echo "  Data dir:     $DATA_DIR"
echo "  Providers:    $PROVIDERS"
echo ""
read -p "Lanjutkan? (y/N) " confirm
[[ "$confirm" =~ ^[Yy]$ ]] || exit 0

# ══════════════════════════════════════════════════════════════
step "1. System Dependencies"
# ══════════════════════════════════════════════════════════════

info "Updating apt packages..."
apt-get update -qq

info "Installing system dependencies..."
apt-get install -y -qq \
  curl wget gnupg ca-certificates \
  xvfb x11-utils xauth \
  libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
  libcups2 libdrm2 libxkbcommon0 libxcomposite1 \
  libxdamage1 libxfixes3 libxrandr2 libgbm1 \
  libasound2t64 libpangocairo-1.0-0 libgtk-3-0 \
  fonts-liberation fonts-noto-color-emoji \
  unzip jq software-properties-common \
  dbus-x11 procps net-tools

log "System dependencies installed"

# ══════════════════════════════════════════════════════════════
step "2. Node.js 24 LTS"
# ══════════════════════════════════════════════════════════════


# ══════════════════════════════════════════════════════════════
step "3. Virtual Display (Xvfb)"
# ══════════════════════════════════════════════════════════════

info "Setting up Xvfb virtual display service..."

cat > /etc/systemd/system/xvfb.service << 'EOF'
[Unit]
Description=Virtual Frame Buffer X Server
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable xvfb
systemctl start xvfb

# Set DISPLAY environment variable globally
echo 'export DISPLAY=:99' >> /etc/environment
export DISPLAY=:99

log "Xvfb virtual display running on :99"

# ══════════════════════════════════════════════════════════════
step "4. Install Antidetect Apps"
# ══════════════════════════════════════════════════════════════

for provider in $PROVIDERS; do
  info "Installing: $provider"
  case "$provider" in
    adspower)  bash "$( dirname "$0" )/install-adspower.sh"  ;;
    multilogin) bash "$( dirname "$0" )/install-multilogin.sh" ;;
    dolphin)   bash "$( dirname "$0" )/install-dolphin.sh"   ;;
    nstbrowser) bash "$( dirname "$0" )/install-nstbrowser.sh" ;;
    *) warn "Provider tidak dikenal: $provider, skip" ;;
  esac
  log "$provider installed"
done

# ══════════════════════════════════════════════════════════════
step "5. Health Check Script"
# ══════════════════════════════════════════════════════════════

cat > /usr/local/bin/trafficx-health << 'HEALTHEOF'
#!/bin/bash
# TrafficX Antidetect Health Check

echo "=== TrafficX Antidetect Health Check ==="
echo "Time: $(date)"
echo ""

check_service() {
  local name="$1"
  local url="$2"
  local response
  response=$(curl -sf --max-time 5 "$url" 2>/dev/null)
  if [ $? -eq 0 ]; then
    echo "  ✓ $name: OK"
  else
    echo "  ✗ $name: NOT RESPONDING ($url)"
  fi
}

check_process() {
  local name="$1"
  local pattern="$2"
  if pgrep -f "$pattern" > /dev/null 2>&1; then
    echo "  ✓ $name: Running (PID: $(pgrep -f "$pattern" | head -1))"
  else
    echo "  ✗ $name: Not running"
  fi
}

echo "[ System ]"
echo "  CPU: $(top -bn1 | grep 'Cpu(s)' | awk '{print $2}')%"
echo "  RAM: $(free -h | awk '/^Mem:/{print $3"/"$2}')"
echo "  Disk: $(df -h / | awk 'NR==2{print $3"/"$2}')"
echo ""

echo "[ Display ]"
check_process "Xvfb" "Xvfb :99"
echo "  DISPLAY=${DISPLAY:-:99}"
echo ""

echo "[ Antidetect Apps ]"
check_service "AdsPower"   "http://localhost:50325/api/v1/application/status"
check_service "Multilogin" "http://localhost:35000/status"
check_service "Dolphin"    "http://localhost:3001/v1.0/browser_profiles?limit=1"
check_service "Nstbrowser" "http://localhost:8848/api/v2/browser/list?page=1&pageSize=1"
echo ""

echo "[ Worker ]"
check_process "Worker"     "node.*dist/index"
echo "========================="
HEALTHEOF

chmod +x /usr/local/bin/trafficx-health
log "Health check script: /usr/local/bin/trafficx-health"

# ══════════════════════════════════════════════════════════════
step "6. Restart Script"
# ══════════════════════════════════════════════════════════════

cat > /usr/local/bin/trafficx-restart-antidetect << 'RESTARTEOF'
#!/bin/bash
# Restart semua antidetect services

echo "Restarting antidetect services..."
systemctl restart xvfb         2>/dev/null && echo "  ✓ Xvfb restarted"
systemctl restart adspower      2>/dev/null && echo "  ✓ AdsPower restarted"
systemctl restart multilogin    2>/dev/null && echo "  ✓ Multilogin restarted"
systemctl restart dolphin-anty  2>/dev/null && echo "  ✓ Dolphin restarted"
systemctl restart nstbrowser    2>/dev/null && echo "  ✓ Nstbrowser restarted"
echo "Done."
RESTARTEOF

chmod +x /usr/local/bin/trafficx-restart-antidetect

# ══════════════════════════════════════════════════════════════
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   Setup Selesai! ✅                          ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "  Commands:"
echo "  trafficx-health                   → Health check"
echo "  trafficx-restart-antidetect       → Restart semua"
echo "  systemctl status adspower         → Status AdsPower"
echo "  systemctl status nstbrowser       → Status Nstbrowser"
echo ""
echo "  Selanjutnya:"
echo "  1. Configure API keys di platform dashboard"
echo "  2. Jalankan: trafficx-health"
echo "  3. Test integration dari Settings → Integrations"
echo ""
