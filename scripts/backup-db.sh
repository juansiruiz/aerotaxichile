#!/usr/bin/env bash
# ─── backup-db.sh — Dump diario de la DB ────────────────────────────────────
# Añadir al cron:
#   0 3 * * * cd /var/www/aerotaxichile && ./scripts/backup-db.sh >> logs/backup.log 2>&1

set -euo pipefail

PROJECT_ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." &>/dev/null && pwd)
cd "$PROJECT_ROOT"

BACKUP_DIR="./backups"
RETENTION_DAYS=14
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="aerotaxi_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date '+%F %T')] 🔄 Backup DB → $FILENAME"

# Dump dentro del contenedor y comprimir
docker compose --env-file .env.production exec -T db \
    pg_dump -U "${POSTGRES_USER:-aerotaxi}" "${POSTGRES_DB:-aerotaxichile}" \
    | gzip > "$BACKUP_DIR/$FILENAME"

SIZE=$(du -h "$BACKUP_DIR/$FILENAME" | cut -f1)
echo "[$(date '+%F %T')] ✅ Backup OK ($SIZE)"

# Borrar backups viejos
find "$BACKUP_DIR" -name "aerotaxi_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
echo "[$(date '+%F %T')] 🗑️  Borrados backups > $RETENTION_DAYS días"
