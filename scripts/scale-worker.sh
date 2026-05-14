#!/bin/bash
# ============================================================
# scripts/scale-worker.sh — Scale worker instances
# Usage: bash scripts/scale-worker.sh <total_instances>
# Example: bash scripts/scale-worker.sh 3
# ============================================================

set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

REPLICAS="${1:-1}"

# Validate input
[[ "$REPLICAS" =~ ^[0-9]+$ ]] || error "REPLICAS must be a number. Contoh: bash scripts/scale-worker.sh 3"
[ "$REPLICAS" -lt 1 ]  && error "Minimum 1 worker instance"
[ "$REPLICAS" -gt 20 ] && error "Maximum 20 worker instance per VPS"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   TrafficX — Scale Worker Instance            ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Resource check sebelum scale
AVAILABLE_MEM=$(free -g | awk '/^Mem:/{print $7}')
REQUIRED_MEM=$((REPLICAS * 4))  # ~4GB per worker instance

if [ "$REQUIRED_MEM" -gt "$AVAILABLE_MEM" ]; then
    warn "Available RAM: ${AVAILABLE_MEM}GB, Required: ~${REQUIRED_MEM}GB"
    warn "There may not be enough RAM for ${REPLICAS} worker instance"
    read -p "Continue? (y/N) " answer
    [[ "$answer" =~ ^[Yy]$ ]] || exit 0
fi

echo "→ Scaling worker ke ${REPLICAS} instance..."
docker compose up -d --scale worker="${REPLICAS}" --no-recreate worker

log "Worker scaled ke ${REPLICAS} instance"
echo ""
echo "Status workers:"
docker compose ps worker
echo ""
