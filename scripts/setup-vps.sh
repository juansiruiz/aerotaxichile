#!/usr/bin/env bash
# ─── setup-vps.sh — Setup inicial Hostinger VPS (Ubuntu 22/24) ─────────────
# Ejecutar UNA sola vez en un VPS recién creado.
#
# Uso:
#   ssh root@tu-vps
#   curl -fsSL https://raw.githubusercontent.com/.../setup-vps.sh | bash
#   # o subirlo por scp y hacer: bash setup-vps.sh

set -euo pipefail

echo "═════════════════════════════════════════════════════"
echo " 🛠️   Setup inicial VPS — AeroTaxi Chile"
echo "═════════════════════════════════════════════════════"

# ── 1. System update ─────────────────────────────────────────────────────────
echo ""
echo "▶  1/7 Actualizando sistema..."
apt-get update -y && apt-get upgrade -y

# ── 2. Paquetes base ─────────────────────────────────────────────────────────
echo ""
echo "▶  2/7 Instalando paquetes esenciales..."
apt-get install -y \
    curl wget git vim htop ufw fail2ban \
    build-essential ca-certificates gnupg \
    unzip rsync cron

# ── 3. Firewall UFW ──────────────────────────────────────────────────────────
echo ""
echo "▶  3/7 Configurando firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# ── 4. Fail2ban (protección SSH) ─────────────────────────────────────────────
echo ""
echo "▶  4/7 Activando fail2ban..."
systemctl enable --now fail2ban

# ── 5. Docker + Docker Compose ───────────────────────────────────────────────
echo ""
echo "▶  5/7 Instalando Docker..."
if ! command -v docker &>/dev/null; then
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
        https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
        > /etc/apt/sources.list.d/docker.list

    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable --now docker
else
    echo "   Docker ya instalado, skipping."
fi

# ── 6. Node.js 20 + pnpm (para PM2 o como fallback) ──────────────────────────
echo ""
echo "▶  6/7 Instalando Node.js 20 + pnpm..."
if ! command -v node &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
corepack enable
corepack prepare pnpm@10.13.1 --activate
npm install -g pm2

# ── 7. Directorio del proyecto ───────────────────────────────────────────────
echo ""
echo "▶  7/7 Creando estructura de directorios..."
mkdir -p /var/www/aerotaxichile
mkdir -p /var/www/aerotaxichile/backups
mkdir -p /var/www/aerotaxichile/logs
mkdir -p /var/www/aerotaxichile/certbot/conf
mkdir -p /var/www/aerotaxichile/certbot/www

echo ""
echo "═════════════════════════════════════════════════════"
echo " ✅  Setup completado"
echo "═════════════════════════════════════════════════════"
echo ""
echo "  Siguiente paso:"
echo "    cd /var/www/aerotaxichile"
echo "    git clone <tu-repo> ."
echo "    cp .env.production.example .env.production"
echo "    # editar .env.production"
echo "    ./scripts/init-ssl.sh aerotaxichile.cl admin@aerotaxichile.cl"
echo "    docker compose --env-file .env.production up -d"
echo ""
