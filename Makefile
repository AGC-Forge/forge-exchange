# ============================================================
# Makefile — Traffic Exchange Platform
# Usage: make <command>
# ============================================================

.PHONY: help dev build up down restart logs ps migrate seed backup update scale-worker

# Default
help:
	@echo ""
	@echo "╔══════════════════════════════════════════╗"
	@echo "║   TrafficX — Available Commands          ║"
	@echo "╚══════════════════════════════════════════╝"
	@echo ""
	@echo "  Setup:"
	@echo "    make setup          — First time setup"
	@echo "    make ssl            — Generate self-signed SSL cert"
	@echo ""
	@echo "  Development:"
	@echo "    make dev            — Start in development mode"
	@echo "    make dev-web        — Start only web in dev"
	@echo "    make dev-worker     — Start only worker in dev"
	@echo ""
	@echo "  Production:"
	@echo "    make build          — Build all Docker images"
	@echo "    make up             — Start all services"
	@echo "    make down           — Stop all services"
	@echo "    make restart        — Restart all services"
	@echo "    make update         — Rolling update (pull + rebuild)"
	@echo ""
	@echo "  Database:"
	@echo "    make migrate        — Run pending migrations"
	@echo "    make seed           — Seed database"
	@echo "    make studio         — Open Prisma Studio"
	@echo ""
	@echo "  Workers:"
	@echo "    make scale n=3      — Scale worker to 3 instances"
	@echo ""
	@echo "  Monitoring:"
	@echo "    make logs           — Tail all logs"
	@echo "    make logs-web       — Tail web logs only"
	@echo "    make logs-worker    — Tail worker logs only"
	@echo "    make ps             — Show service status"
	@echo "    make health         — Check app health"
	@echo ""
	@echo "  Maintenance:"
	@echo "    make backup         — Backup database"
	@echo "    make clean          — Remove stopped containers + old images"
	@echo ""

# ── Setup ─────────────────────────────────────────────────────
setup:
	@bash scripts/deploy.sh

ssl:
	@mkdir -p docker/nginx/ssl
	@openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
		-keyout docker/nginx/ssl/privkey.pem \
		-out docker/nginx/ssl/fullchain.pem \
		-subj "/CN=localhost"
	@echo "✓ Self-signed cert dibuat di docker/nginx/ssl/"

# ── Development ───────────────────────────────────────────────
dev:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up

dev-web:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up web postgres redis

dev-worker:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up worker postgres redis

# ── Production ────────────────────────────────────────────────
build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose restart

update:
	@bash scripts/update.sh all

update-web:
	@bash scripts/update.sh web

update-worker:
	@bash scripts/update.sh worker

# ── Database ──────────────────────────────────────────────────
migrate:
	docker compose run --rm web sh -c "npx prisma migrate deploy"

seed:
	docker compose run --rm web sh -c "npx prisma db seed"

studio:
	docker compose run --rm --service-ports web sh -c "npx prisma studio"

# ── Workers ───────────────────────────────────────────────────
scale:
	@bash scripts/scale-worker.sh $(n)

# ── Monitoring ────────────────────────────────────────────────
logs:
	docker compose logs -f --tail=100

logs-web:
	docker compose logs -f --tail=100 web

logs-worker:
	docker compose logs -f --tail=100 worker

ps:
	docker compose ps

health:
	@curl -s http://localhost:3000/api/health | python3 -m json.tool || echo "App tidak responding"

# ── Maintenance ───────────────────────────────────────────────
backup:
	@bash scripts/backup.sh

clean:
	docker compose down --remove-orphans
	docker image prune -f
	docker volume prune -f
	@echo "✓ Cleanup selesai"
