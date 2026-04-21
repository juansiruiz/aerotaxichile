#!/usr/bin/env bash
# ─── deploy.sh — Actualización rápida en producción ────────────────────────
# Uso (desde el VPS):
#   cd /var/www/aerotaxichile
#   ./scripts/deploy.sh
#
# Requiere:
#   - Código actualizado en el repo (git pull ya ejecutado)
#   - PM2 instalado o Docker Compose disponible

set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)
PROJECT_ROOT=$(cd -- "$SCRIPT_DIR/.." &>/dev/null && pwd)
cd "$PROJECT_ROOT"

echo "═════════════════════════════════════════════════════"
echo " 🚀 Deploy AeroTaxi Chile — $(date '+%Y-%m-%d %H:%M:%S')"
echo "═════════════════════════════════════════════════════"

# ── Detectar modo (Docker o PM2) ──────────────────────────────────────────
if [ -f "docker-compose.yml" ] && command -v docker &>/dev/null && docker compose version &>/dev/null; then
    MODE="docker"
elif command -v pm2 &>/dev/null; then
    MODE="pm2"
else
    echo "❌ No se encontró ni Docker Compose ni PM2. Abortando."
    exit 1
fi
echo "▶  Modo detectado: $MODE"

# ── 1. Git pull ──────────────────────────────────────────────────────────────
echo ""
echo "▶  Paso 1/5: Pulling últimos cambios..."
git pull --ff-only

# ── 2. Instalar deps ─────────────────────────────────────────────────────────
echo ""
echo "▶  Paso 2/5: Instalando dependencias..."
pnpm install --frozen-lockfile

# ── 3. Migraciones DB ────────────────────────────────────────────────────────
echo ""
echo "▶  Paso 3/5: Aplicando migraciones DB..."
pnpm --filter @aerotaxi/db db:push

# ── 4. Build ─────────────────────────────────────────────────────────────────
echo ""
echo "▶  Paso 4/5: Build..."
if [ "$MODE" = "docker" ]; then
    docker compose --env-file .env.production build
else
    BUILD_STANDALONE=true pnpm --filter @aerotaxi/web build
fi

# ── 5. Reiniciar servicios ───────────────────────────────────────────────────
echo ""
echo "▶  Paso 5/5: Reiniciando servicios..."
if [ "$MODE" = "docker" ]; then
    docker compose --env-file .env.production up -d
    echo ""
    echo "▶  Estado de contenedores:"
    docker compose ps
else
    pm2 reload ecosystem.config.cjs --update-env
    pm2 save
    echo ""
    echo "▶  Estado PM2:"
    pm2 status
fi

echo ""
echo "═════════════════════════════════════════════════════"
echo " ✅  Deploy completado correctamente"
echo "═════════════════════════════════════════════════════"
