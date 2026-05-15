#!/bin/bash
# ============================================================
# scripts/antidetect/manage.sh
# Manage semua antidetect services
# Usage: bash manage.sh [start|stop|restart|status|logs] [provider]
# ============================================================

set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'
BLUE='\033[0;34m'; NC='\033[0m'

log()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; }
info()  { echo -e "${BLUE}[→]${NC} $1"; }

CMD="${1:-status}"
TARGET="${2:-all}"

# ── Service definitions ───────────────────────────────────────
declare -A SERVICES=(
  [xvfb]="xvfb"
  [adspower]="adspower"
  [multilogin]="multilogin"
  # [dolphin]="dolphin-anty"
  [nstbrowser]="nstbrowser"
)

declare -A HEALTH_URLS=(
  [adspower]="http://localhost:50325/api/v1/application/status"
  [multilogin]="http://localhost:35000/status"
  # [dolphin]="http://localhost:3001/v1.0/browser_profiles?limit=1"
  [nstbrowser]="grep -n 'nstbrowser\|HEALTH_URLS\|url' scripts/antidetect/manage.sh | head -20"
)

# ── Get target services ───────────────────────────────────────
get_targets() {
  if [ "$TARGET" = "all" ]; then
    echo "${!SERVICES[@]}"
  else
    echo "$TARGET"
  fi
}

# ── Commands ──────────────────────────────────────────────────
do_start() {
  local provider="$1"
  local svc="${SERVICES[$provider]:-$provider}"

  if systemctl list-unit-files "${svc}.service" &>/dev/null; then
    systemctl start "$svc" && log "$provider started" || error "Gagal start $provider"
  elif docker ps -a --format '{{.Names}}' | grep -q "trafficx_${provider}"; then
    docker start "trafficx_${provider}" && log "$provider (docker) started"
  else
    warn "$provider service tidak ditemukan. Jalankan install script dulu."
  fi
}

do_stop() {
  local provider="$1"
  local svc="${SERVICES[$provider]:-$provider}"

  if systemctl list-unit-files "${svc}.service" &>/dev/null; then
    systemctl stop "$svc" 2>/dev/null && log "$provider stopped" || warn "$provider tidak berjalan"
  elif docker ps --format '{{.Names}}' | grep -q "trafficx_${provider}"; then
    docker stop "trafficx_${provider}" && log "$provider (docker) stopped"
  fi
}

do_restart() {
  do_stop "$1"
  sleep 2
  do_start "$1"
}

do_status() {
  local provider="$1"
  local svc="${SERVICES[$provider]:-$provider}"
  local url="${HEALTH_URLS[$provider]:-}"

  printf "  %-15s " "$provider:"

  # Check process
  local running=false
  if systemctl is-active "$svc" &>/dev/null 2>&1; then
    running=true
  elif docker ps --format '{{.Names}}' | grep -q "trafficx_${provider}" 2>/dev/null; then
    running=true
  fi

  if $running; then
    printf "${GREEN}running${NC}"

    # Check API health jika ada URL
    if [ -n "$url" ]; then
      if curl -sf --max-time 3 "$url" > /dev/null 2>&1; then
        printf " | API: ${GREEN}ok${NC}"
      else
        printf " | API: ${YELLOW}not ready${NC}"
      fi
    fi
  else
    printf "${RED}stopped${NC}"
  fi
  echo ""
}

do_logs() {
  local provider="$1"
  local svc="${SERVICES[$provider]:-$provider}"

  if systemctl list-unit-files "${svc}.service" &>/dev/null; then
    journalctl -u "$svc" -n 50 --no-pager
  elif docker ps -a --format '{{.Names}}' | grep -q "trafficx_${provider}"; then
    docker logs "trafficx_${provider}" --tail 50
  else
    warn "Tidak ada logs untuk $provider"
  fi
}

# ── Main ──────────────────────────────────────────────────────
case "$CMD" in
  start)
    for p in $(get_targets); do do_start "$p"; done
    ;;
  stop)
    for p in $(get_targets); do do_stop "$p"; done
    ;;
  restart)
    for p in $(get_targets); do do_restart "$p"; done
    ;;
  status)
    echo ""
    echo "╔══════════════════════════════════════╗"
    echo "║   TrafficX — Antidetect Status       ║"
    echo "╚══════════════════════════════════════╝"
    echo ""
    echo "[ Virtual Display ]"
    do_status "xvfb"
    echo ""
    echo "[ Antidetect Providers ]"
    for p in adspower multilogin dolphin nstbrowser; do
      do_status "$p"
    done
    echo ""
    echo "[ System Resources ]"
    echo "  CPU:  $(top -bn1 | grep 'Cpu(s)' | awk '{print $2}')%"
    echo "  RAM:  $(free -h | awk '/^Mem:/{print $3"/"$2}')"
    echo "  Disk: $(df -h / | awk 'NR==2{print $3"/"$2" ("$5" used)"}')"
    echo ""
    ;;
  logs)
    do_logs "$TARGET"
    ;;
  *)
    echo "Usage: $0 [start|stop|restart|status|logs] [provider|all]"
    echo "Providers: xvfb adspower multilogin dolphin nstbrowser"
    exit 1
    ;;
esac
