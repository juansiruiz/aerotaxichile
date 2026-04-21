# Guía de Deploy — AeroTaxi Chile en Hostinger VPS

Esta guía cubre el deploy completo del proyecto en un **VPS Hostinger con Ubuntu 22.04/24.04**.

Se incluyen **dos modos**:

- **Modo A — Docker Compose** (recomendado): todo aislado, fácil rollback, incluye PostgreSQL, nginx y SSL.
- **Modo B — PM2 nativo**: Node.js + PostgreSQL instalados en el host, sin contenedores. Menos overhead.

---

## 1. Requisitos previos

1. **Plan Hostinger**: KVM 1 o superior (mínimo 1 vCPU + 4 GB RAM + 50 GB SSD).
2. **Dominio** apuntando al VPS:
   - Registro A: `aerotaxichile.cl` → IP del VPS
   - Registro A: `www.aerotaxichile.cl` → IP del VPS
3. **SSH** configurado con llave pública (no contraseña).
4. **Repositorio Git** privado (GitHub / GitLab) con el código.

---

## 2. Setup inicial del VPS (UNA sola vez)

SSH al VPS como root:

```bash
ssh root@tu-ip-vps
```

Clonar el repo y ejecutar el setup:

```bash
git clone https://github.com/TU_USUARIO/aerotaxichile.git /var/www/aerotaxichile
cd /var/www/aerotaxichile
chmod +x scripts/*.sh
./scripts/setup-vps.sh
```

Este script instala:

- Docker + Docker Compose
- Node.js 20 + pnpm 10.13.1 + PM2
- Firewall UFW (abre 22, 80, 443)
- Fail2ban (protección contra brute-force SSH)

---

## 3. Modo A — Docker Compose (recomendado)

### 3.1 Configurar variables de entorno

```bash
cd /var/www/aerotaxichile
cp .env.production.example .env.production
nano .env.production
```

Completar **todas** las variables. Generar secretos fuertes:

```bash
# JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# VAPID keys (web push)
npx -y web-push generate-vapid-keys
```

### 3.2 Certificado SSL inicial

```bash
./scripts/init-ssl.sh aerotaxichile.cl admin@aerotaxichile.cl
```

> ⚠️ Antes de ejecutar, el dominio **debe resolver a la IP del VPS** (propagación DNS puede tardar minutos).

### 3.3 Levantar todo el stack

```bash
docker compose --env-file .env.production up -d --build
```

Ver estado:

```bash
docker compose ps
docker compose logs -f
```

### 3.4 Aplicar migraciones y seeds

```bash
# Migrar schema
docker compose exec api pnpm --filter @aerotaxi/db db:push

# Seed inicial (admin + conductores + zonas)
docker compose exec api pnpm --filter @aerotaxi/db db:seed

# Seed comunas
docker compose exec api pnpm --filter @aerotaxi/db seed:comunas

# Contenido web
docker compose exec api pnpm --filter @aerotaxi/db seed:content

# Reservas de ejemplo (opcional)
docker compose exec api pnpm --filter @aerotaxi/db seed:bookings
```

### 3.5 Verificar

```bash
curl https://aerotaxichile.cl                # landing (200)
curl https://aerotaxichile.cl/api/health     # API (200 ok)
```

Abrir en el navegador: `https://aerotaxichile.cl`

---

## 4. Modo B — PM2 nativo (sin Docker)

### 4.1 Instalar PostgreSQL en el host

```bash
apt-get install -y postgresql postgresql-contrib
sudo -u postgres psql <<EOF
CREATE USER aerotaxi WITH PASSWORD 'PASSWORD_FUERTE';
CREATE DATABASE aerotaxichile OWNER aerotaxi;
GRANT ALL PRIVILEGES ON DATABASE aerotaxichile TO aerotaxi;
EOF
```

### 4.2 Instalar nginx + Certbot

```bash
apt-get install -y nginx certbot python3-certbot-nginx
```

### 4.3 Clonar código y env files

```bash
cd /var/www/aerotaxichile
cp apps/api/.env.production.example apps/api/.env.production
cp apps/web/.env.production.example apps/web/.env.production
cp packages/db/.env.production.example packages/db/.env
# editar los tres archivos con valores reales

pnpm install --frozen-lockfile
pnpm --filter @aerotaxi/db db:push
pnpm --filter @aerotaxi/db db:seed
pnpm --filter @aerotaxi/web build
```

### 4.4 Configurar nginx como reverse proxy

Copiar el archivo `nginx/conf.d/aerotaxichile.conf` a `/etc/nginx/sites-available/` y **cambiar** los `proxy_pass http://api:4000/` y `http://web:3000` por `http://127.0.0.1:4000/` y `http://127.0.0.1:3000`.

```bash
cp nginx/conf.d/aerotaxichile.conf /etc/nginx/sites-available/aerotaxichile
sed -i 's|http://api:4000|http://127.0.0.1:4000|g' /etc/nginx/sites-available/aerotaxichile
sed -i 's|http://web:3000|http://127.0.0.1:3000|g' /etc/nginx/sites-available/aerotaxichile
sed -i 's|/var/www/uploads/|/var/www/aerotaxichile/apps/api/public/uploads/|g' /etc/nginx/sites-available/aerotaxichile

ln -sf /etc/nginx/sites-available/aerotaxichile /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 4.5 SSL con Certbot nativo

```bash
certbot --nginx -d aerotaxichile.cl -d www.aerotaxichile.cl \
    --agree-tos -m admin@aerotaxichile.cl --non-interactive --redirect
```

### 4.6 Arrancar con PM2

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd   # y seguir la instrucción que imprime
```

### 4.7 Verificar

```bash
pm2 status
pm2 logs
curl https://aerotaxichile.cl/api/health
```

---

## 5. Actualizaciones de código

Una vez desplegado, los siguientes cambios se aplican con un solo comando:

```bash
cd /var/www/aerotaxichile
./scripts/deploy.sh
```

El script:

1. `git pull`
2. `pnpm install`
3. Aplica migraciones DB
4. Rebuild (Docker o Next.js)
5. Reinicia servicios (sin downtime con `pm2 reload`)

---

## 6. Backups automáticos

Añadir al crontab (`crontab -e`):

```cron
# Backup DB diario a las 3 AM
0 3 * * * cd /var/www/aerotaxichile && ./scripts/backup-db.sh >> logs/backup.log 2>&1

# Renovación de SSL (solo si usas modo B — en modo A lo maneja el contenedor certbot)
0 4 * * * certbot renew --quiet && systemctl reload nginx
```

Los backups se guardan en `/var/www/aerotaxichile/backups/` con retención de 14 días.

Para descargar un backup al equipo local:

```bash
scp root@tu-vps:/var/www/aerotaxichile/backups/aerotaxi_YYYYMMDD_HHMMSS.sql.gz ./
```

Para restaurar:

```bash
gunzip -c aerotaxi_YYYYMMDD_HHMMSS.sql.gz | \
  docker compose exec -T db psql -U aerotaxi aerotaxichile
```

---

## 7. Monitoreo y logs

### Docker

```bash
docker compose logs -f api       # logs de la API
docker compose logs -f web       # logs de Next.js
docker compose logs -f nginx     # logs de nginx
docker stats                     # CPU / RAM de cada contenedor
```

### PM2

```bash
pm2 logs aerotaxi-api
pm2 logs aerotaxi-web
pm2 monit                        # monitor TUI
```

### Disco y memoria

```bash
df -h
free -m
htop
```

---

## 8. Troubleshooting

| Problema | Solución |
|---|---|
| `502 Bad Gateway` en nginx | `docker compose logs api` — revisa si la API crasheó. Verifica `DATABASE_URL`. |
| API no encuentra la DB | Desde el host: `docker compose exec api ping db`. Verifica que `db` esté `healthy`. |
| Certbot falla con "challenge did not pass" | Verifica DNS: `dig aerotaxichile.cl +short`. Debe devolver IP del VPS. |
| Next.js build sale sin texto del CMS | Hay que reiniciar el contenedor `web` tras cambiar settings: `docker compose restart web`. |
| Push notifications no llegan | Verifica `VAPID_*` envs y que sean las mismas en API y Web (build). Chequea `https://`, no funciona en http. |
| Uploads no aparecen | Verifica el volumen `uploads`: `docker volume inspect aerotaxichile_uploads`. |

---

## 9. Checklist de seguridad

- [ ] `JWT_SECRET` con 64+ caracteres aleatorios
- [ ] `POSTGRES_PASSWORD` con 32+ caracteres aleatorios
- [ ] Firewall UFW activo (solo 22, 80, 443 abiertos)
- [ ] Fail2ban activo
- [ ] SSH solo con llave (deshabilitar password: `/etc/ssh/sshd_config` → `PasswordAuthentication no`)
- [ ] Cambiar el usuario admin por defecto (`admin@aerotaxichile.cl` / `aerotaxi2024`) tras el primer login
- [ ] Crear usuario `deploy` no-root con sudo para despliegues
- [ ] Backups diarios de DB funcionando
- [ ] SSL renovándose automáticamente
- [ ] Rate limiting en nginx (opcional, ver `limit_req_zone`)

---

## 10. Rollback

### Docker

```bash
cd /var/www/aerotaxichile
git log --oneline -5              # ver últimos commits
git reset --hard COMMIT_ANTERIOR
docker compose --env-file .env.production up -d --build
```

### PM2

```bash
git reset --hard COMMIT_ANTERIOR
pnpm install --frozen-lockfile
pnpm --filter @aerotaxi/web build
pm2 reload ecosystem.config.cjs --update-env
```

### DB

```bash
gunzip -c backups/aerotaxi_YYYYMMDD_HHMMSS.sql.gz | \
  docker compose exec -T db psql -U aerotaxi aerotaxichile
```

---

## Resumen visual

```
┌──────────────────────────────────────────────────────────┐
│  Hostinger VPS Ubuntu 22.04                              │
│                                                          │
│  ┌────────────┐                                          │
│  │   nginx    │  puertos 80/443 (SSL con Let's Encrypt)  │
│  └──────┬─────┘                                          │
│         │                                                │
│    ┌────┴─────┐                                          │
│    │          │                                          │
│ ┌──▼──┐   ┌───▼───┐   ┌─────────┐                        │
│ │ web │   │  api  │──▶│ postgres│                        │
│ │:3000│   │ :4000 │   │  :5432  │                        │
│ └─────┘   └───┬───┘   └─────────┘                        │
│               │                                          │
│               └──▶ /uploads (volumen persistente)        │
└──────────────────────────────────────────────────────────┘
```

---

**Soporte**: Cualquier duda, revisar logs con `docker compose logs -f` o `pm2 logs`.
