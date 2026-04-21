#!/usr/bin/env bash
# ─── init-ssl.sh — Obtener certificado SSL inicial con Let's Encrypt ───────
# Ejecutar UNA VEZ después de apuntar el dominio al VPS.
#
# Uso:
#   ./scripts/init-ssl.sh aerotaxichile.cl admin@aerotaxichile.cl

set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-}"

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "❌ Uso: $0 <dominio> <email>"
    echo "   Ejemplo: $0 aerotaxichile.cl admin@aerotaxichile.cl"
    exit 1
fi

PROJECT_ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." &>/dev/null && pwd)
cd "$PROJECT_ROOT"

echo "═════════════════════════════════════════════════════"
echo " 🔐 Init SSL — $DOMAIN"
echo "═════════════════════════════════════════════════════"

mkdir -p certbot/conf certbot/www

# ── 1. Generar certificado dummy temporal para arrancar nginx ──────────────
echo ""
echo "▶  1/4 Creando certificado dummy temporal..."
DUMMY_PATH="certbot/conf/live/$DOMAIN"
mkdir -p "$DUMMY_PATH"
openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout "$DUMMY_PATH/privkey.pem" \
    -out    "$DUMMY_PATH/fullchain.pem" \
    -subj "/CN=localhost"

# ── 2. Arrancar nginx con cert dummy ────────────────────────────────────────
echo ""
echo "▶  2/4 Levantando nginx..."
docker compose --env-file .env.production up -d nginx

sleep 5

# ── 3. Borrar dummy y pedir cert real ───────────────────────────────────────
echo ""
echo "▶  3/4 Solicitando certificado real Let's Encrypt..."
rm -rf "certbot/conf/live/$DOMAIN"
rm -rf "certbot/conf/archive/$DOMAIN"
rm -f  "certbot/conf/renewal/$DOMAIN.conf"

docker compose --env-file .env.production run --rm certbot certonly \
    --webroot \
    --webroot-path /var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"

# ── 4. Recargar nginx con el cert real ──────────────────────────────────────
echo ""
echo "▶  4/4 Recargando nginx..."
docker compose --env-file .env.production exec nginx nginx -s reload

echo ""
echo "═════════════════════════════════════════════════════"
echo " ✅  SSL activo en https://$DOMAIN"
echo "═════════════════════════════════════════════════════"
