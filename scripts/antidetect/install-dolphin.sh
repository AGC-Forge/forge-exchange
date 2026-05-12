#!/bin/bash
# ============================================================
# scripts/antidetect/install-dolphin.sh
# Install Dolphin{anty} di VPS (headless mode)
# Official: https://dolphin-anty.com/download
# ============================================================

set -euo pipefail

INSTALL_DIR="/opt/trafficx/dolphin"
DATA_DIR="/var/lib/trafficx/dolphin"
PORT="${DOLPHIN_PORT:-3001}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
info() { echo -e "${BLUE}[→]${NC} $1"; }

mkdir -p "$INSTALL_DIR" "$DATA_DIR"

info "Installing Dolphin{anty}..."

# ── Download Dolphin{anty} Linux ──────────────────────────────
DOWNLOAD_URL="https://dolphin-anty.com/download/linux"
APPIMAGE_PATH="$INSTALL_DIR/dolphin-anty.AppImage"

info "Downloading Dolphin{anty} AppImage..."
if curl -fsSL --max-time 180 -L -o "$APPIMAGE_PATH" "$DOWNLOAD_URL" 2>/dev/null; then
  chmod +x "$APPIMAGE_PATH"
  log "Dolphin{anty} downloaded to $APPIMAGE_PATH"
else
  warn "Auto-download gagal."
  warn "Download manual dari: https://dolphin-anty.com/download"
  warn "Pilih: Linux → AppImage"
  warn "Simpan ke: $APPIMAGE_PATH"
  warn "Lalu jalankan ulang script ini."
  exit 1
fi

# ── AppImage deps ─────────────────────────────────────────────
info "Installing AppImage dependencies..."
apt-get install -y -qq \
  libfuse2 \
  libglib2.0-0 \
  libnss3 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libgtk-3-0 2>/dev/null || true

# ── Wrapper script ────────────────────────────────────────────
cat > "$INSTALL_DIR/start.sh" << EOF
#!/bin/bash
export DISPLAY=:99
export HOME=/root
export XDG_RUNTIME_DIR=/tmp/runtime-root

mkdir -p "\$XDG_RUNTIME_DIR"
chmod 700 "\$XDG_RUNTIME_DIR"

# Extract AppImage jika belum (untuk headless mode)
if [ ! -d "$INSTALL_DIR/squashfs-root" ]; then
  cd "$INSTALL_DIR"
  ./dolphin-anty.AppImage --appimage-extract > /dev/null 2>&1 || true
fi

# Run extracted atau AppImage langsung
if [ -f "$INSTALL_DIR/squashfs-root/AppRun" ]; then
  exec "$INSTALL_DIR/squashfs-root/AppRun" \\
    --no-sandbox \\
    --disable-gpu \\
    --api-port=${PORT} \\
    --headless \\
    --data-dir="$DATA_DIR"
else
  exec "$APPIMAGE_PATH" \\
    --no-sandbox \\
    --disable-gpu \\
    --api-port=${PORT} \\
    --headless \\
    --data-dir="$DATA_DIR"
fi
EOF

chmod +x "$INSTALL_DIR/start.sh"

# ── Systemd service ───────────────────────────────────────────
cat > /etc/systemd/system/dolphin-anty.service << EOF
[Unit]
Description=Dolphin{anty} Browser Manager
After=network.target xvfb.service
Requires=xvfb.service

[Service]
Type=simple
User=root
Environment=DISPLAY=:99
Environment=HOME=/root
Environment=XDG_RUNTIME_DIR=/tmp/runtime-root
WorkingDirectory=$INSTALL_DIR

ExecStart=$INSTALL_DIR/start.sh
Restart=always
RestartSec=5
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable dolphin-anty
systemctl start dolphin-anty

# ── Wait and verify ───────────────────────────────────────────
info "Waiting for Dolphin API..."
MAX_WAIT=30; WAITED=0
until curl -sf "http://localhost:${PORT}/v1.0/browser_profiles?limit=1" > /dev/null 2>&1; do
  sleep 2; WAITED=$((WAITED + 2))
  [ $WAITED -ge $MAX_WAIT ] && { warn "Dolphin belum ready. Cek: journalctl -u dolphin-anty"; break; }
  printf '.'
done
echo ""

log "Dolphin{anty} running on port $PORT"
log ""
log "Cara mendapatkan API Key:"
log "  1. Daftar di: https://dolphin-anty.com"
log "  2. Dashboard → API → Generate Token"
log "  3. Input key di platform: Settings → Integrations → Dolphin{anty}"
