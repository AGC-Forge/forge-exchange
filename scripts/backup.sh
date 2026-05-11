#!/bin/bash
# ============================================================
# scripts/backup.sh — Backup database + volumes
# Usage: bash scripts/backup.sh
# Recommended: cron every 6 hours
# ============================================================

set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }

source .env

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="trafficx_backup_${TIMESTAMP}"

mkdir -p "${BACKUP_DIR}"

# ── PostgreSQL backup ─────────────────────────────────────────
echo "→ Backing up PostgreSQL..."
docker compose exec -T postgres pg_dump \
    -U "${POSTGRES_USER:-trafficx}" \
    -d "${POSTGRES_DB:-traffic_exchange}" \
    --no-owner \
    --no-acl \
    | gzip > "${BACKUP_DIR}/${BACKUP_NAME}_postgres.sql.gz"
log "PostgreSQL backup: ${BACKUP_NAME}_postgres.sql.gz ($(du -sh ${BACKUP_DIR}/${BACKUP_NAME}_postgres.sql.gz | cut -f1))"

# ── Redis backup (RDB snapshot) ───────────────────────────────
echo "→ Backing up Redis..."
docker compose exec -T redis redis-cli BGSAVE > /dev/null
sleep 2
docker compose cp redis:/data/dump.rdb "${BACKUP_DIR}/${BACKUP_NAME}_redis.rdb"
log "Redis backup: ${BACKUP_NAME}_redis.rdb"

# ── Cleanup old backups (keep 7 days) ─────────────────────────
echo "→ Cleaning old backups..."
find "${BACKUP_DIR}" -name "trafficx_backup_*" -mtime +7 -delete
log "Old backups cleaned (keeping 7 days)"

# ── Summary ───────────────────────────────────────────────────
echo ""
log "Backup successful: ${TIMESTAMP}"
log "Location: ${BACKUP_DIR}/"
du -sh "${BACKUP_DIR}"
