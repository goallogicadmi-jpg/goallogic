#!/usr/bin/env bash
# Backup diario de MongoDB con retención local de 7 días.
# Uso (cron, ej. 03:00): 0 3 * * * /ruta/proyecto/scripts/mongo-backup-daily.sh
#
# Almacenamiento fuera del servidor: tras el dump, sincroniza BACKUP_DIR a S3, p.ej.:
#   aws s3 sync "$BACKUP_DIR" "s3://tu-bucket/mongo-backups/$(hostname)/" --delete
# (configura credenciales IAM o variables AWS_* en el entorno del cron)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ -z "${MONGO_URI:-}" ]]; then
  echo "mongo_backup_error: MONGO_URI no definida" >&2
  exit 1
fi

BACKUP_ROOT="${MONGO_BACKUP_DIR:-$PROJECT_ROOT/backups/mongo}"
RETENTION_DAYS="${MONGO_BACKUP_RETENTION_DAYS:-7}"
DATE_STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="$BACKUP_ROOT/dump_$DATE_STAMP"

mkdir -p "$BACKUP_DIR"

echo "mongo_backup_start: $BACKUP_DIR"
mongodump --uri="$MONGO_URI" --out="$BACKUP_DIR"

# Eliminar dumps locales con más de RETENTION_DAYS días
find "$BACKUP_ROOT" -maxdepth 1 -type d -name 'dump_*' -mtime "+$RETENTION_DAYS" -print -exec rm -rf {} \; 2>/dev/null || true

echo "mongo_backup_done: $BACKUP_DIR"
