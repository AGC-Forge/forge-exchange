#!/bin/bash
# ============================================================
# scripts/deploy.sh — First-time deployment script
# Usage: bash scripts/deploy.sh
# ============================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()    { echo -e "${GREEN}[✓]${NC} $1"; }
warn()   { echo -e "${YELLOW}[!]${NC} $1"; }
error()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }
info()   { echo -e "${BLUE}[→]${NC} $1"; }

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   TrafficX — Deployment Script       ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── Check requirements ────────────────────────────────────────
info "Checking requirements..."
command -v docker        >/dev/null 2>&1 || error "Docker not found. Install first: https://docs.docker.com/get-docker/"
command -v docker-compose >/dev/null 2>&1 || command -v docker compose >/dev/null 2>&1 || error "Docker Compose not found."
log "Docker & Docker Compose available"

# ── Check .env ───────────────────────────────────────────────
if [ ! -f ".env" ]; then
    warn ".env not found. Creating from .env.example..."
    cp .env.example .env
    error "Please edit .env first, then run this script again."
fi

# Validate required env vars
source .env
REQUIRED_VARS=("POSTGRES_PASSWORD" "REDIS_PASSWORD" "DATABASE_URL" "REDIS_URL" "NUXT_SESSION_PASSWORD" "APP_URL" "PGADMIN_HTTP_USER" "PGADMIN_HTTP_PASSWORD")
for var in "${REQUIRED_VARS[@]}"; do
    [ -z "${!var:-}" ] && error "Variable $var not set in .env"
done
log ".env validated"

if echo "${DATABASE_URL}" | grep -qiE '@(localhost|127\.0\.0\.1)(:|/|$)'; then
    warn "DATABASE_URL masih pakai localhost/127.0.0.1. Di Docker harus pakai host 'postgres'."
fi
if echo "${REDIS_URL}" | grep -qiE '@(localhost|127\.0\.0\.1)(:|/|$)'; then
    warn "REDIS_URL masih pakai localhost/127.0.0.1. Di Docker harus pakai host 'redis'."
fi

# ── Create SSL directory ──────────────────────────────────────
info "Setting up SSL directory..."
mkdir -p docker/nginx/ssl

if [ ! -f "docker/nginx/ssl/fullchain.pem" ]; then
    warn "SSL certificate not found in .env."
    warn "Untuk production: copy fullchain.pem and privkey.pem to docker/nginx/ssl/"
    warn "Jika DOMAIN + LETSENCRYPT_EMAIL diset di .env, nginx container akan otomatis request Let's Encrypt cert"
    warn "Jika tidak, nginx akan fallback ke self-signed"
fi

# ── Build images ──────────────────────────────────────────────
info "Building Docker images..."
docker compose build --no-cache
log "Images built"

# ── Start infrastructure ──────────────────────────────────────
info "Starting infrastructure (postgres, redis)..."
docker compose up -d postgres redis
sleep 5

# Wait for postgres
info "Waiting for PostgreSQL..."
until docker compose exec -T postgres pg_isready -U "${POSTGRES_USER:-trafficx}" 2>/dev/null; do
    printf '.'
    sleep 2
done
echo ""
log "PostgreSQL ready"

# ── Run database migration ────────────────────────────────────
info "Running database migration..."
docker compose run --rm migrator sh -c "pnpm --filter @forge-exchange/db migrate:prod"
log "Migration completed"

# ── Run database seed ─────────────────────────────────────────
info "Running database seed..."
docker compose run --rm migrator sh -c "pnpm --filter @forge-exchange/db seed" || warn "Seed failed or already run"

# ── Start all services ────────────────────────────────────────
info "Starting all services..."
docker compose up -d
log "All services started"

# ── Health check ──────────────────────────────────────────────
info "Waiting for app to be ready..."
sleep 10

MAX_ATTEMPTS=30
ATTEMPT=0
until curl -sf "http://localhost:3000/api/health" > /dev/null 2>&1; do
    ATTEMPT=$((ATTEMPT + 1))
    if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
        echo ""
        warn "Dump status container:"
        docker compose ps || true
        warn "Last 200 lines logs (client):"
        docker compose logs --tail=200 client || true
        warn "Last 200 lines logs (worker):"
        docker compose logs --tail=200 worker || true
        warn "Last 200 lines logs (nginx):"
        docker compose logs --tail=200 nginx || true
        warn "Last 200 lines logs (grafana):"
        docker compose logs --tail=200 grafana || true
        error "App not responding after ${MAX_ATTEMPTS} attempts"
    fi
    printf '.'
    sleep 3
done
echo ""
log "App ready!"

# ── Summary ───────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   🚀 Deployment Successful!                ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  🌐 App:       ${APP_URL:-http://localhost:3000}"
echo "  📊 Grafana:   ${APP_URL:-http://localhost:3000}/grafana"
echo "  🗄  pgAdmin:  ${APP_URL:-http://localhost:3000}/pgadmin"
echo ""
echo "  Default credentials (dari seed):"
echo "  Default credentials:"
echo "  Lihat output step seed (di atas) untuk email/password default."
echo "  Useful commands:"
echo "  docker compose logs -f client   # Client logs"
echo "  docker compose logs -f worker   # Worker logs"
echo "  docker compose ps               # Status services"
echo "  docker compose ps               # Status services"
echo "  bash scripts/update.sh          # Update deployment"
echo ""
