#!/bin/bash
# ============================================================
# scripts/update.sh — Rolling update deployment
# Usage: bash scripts/update.sh [web|worker|all]
# ============================================================

set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
info() { echo -e "${BLUE}[→]${NC} $1"; }

TARGET="${1:-all}"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   TrafficX — Rolling Update          ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── Pull latest code ──────────────────────────────────────────
info "Pulling latest code..."
git pull origin main
log "Code updated"

# ── Run migrations ────────────────────────────────────────────
info "Running pending migrations..."
docker compose run --rm web sh -c "npx prisma migrate deploy"
log "Migrations done"

# ── Rolling restart ───────────────────────────────────────────
if [ "$TARGET" = "web" ] || [ "$TARGET" = "all" ]; then
    info "Rebuilding web image..."
    docker compose build web
    info "Restarting web (zero-downtime)..."
    docker compose up -d --no-deps web
    log "Client updated"
fi

if [ "$TARGET" = "worker" ] || [ "$TARGET" = "all" ]; then
    info "Rebuilding worker image..."
    docker compose build worker
    info "Restarting worker..."
    docker compose up -d --no-deps worker
    log "Worker updated"
fi

if [ "$TARGET" = "all" ]; then
    info "Restarting nginx..."
    docker compose restart nginx
    log "Nginx reloaded"
fi

# ── Cleanup ───────────────────────────────────────────────────
info "Cleaning up old images..."
docker image prune -f
log "Cleanup done"

echo ""
log "Update successful! Services:"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo ""
