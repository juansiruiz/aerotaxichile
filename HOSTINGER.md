# Manual de Deploy — AeroTaxi Chile en Hostinger VPS

## Requisitos

- Plan **Hostinger VPS KVM 2** o superior (2 vCPU, 8 GB RAM, 100 GB SSD)
- Ubuntu 22.04 (elegir al crear el VPS)
- Dominio apuntando al VPS (registro A en DNS)

---

## PARTE 1 — Preparar el VPS (primera vez)

### 1.1 Conectarse por SSH

En tu computador abre una terminal:

```bash
ssh root@TU_IP_DEL_VPS
```

Hostinger te muestra la IP y contraseña root en el panel de control del VPS.

---

### 1.2 Actualizar el sistema

```bash
apt update && apt upgrade -y
```

---

### 1.3 Instalar Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v   # debe mostrar v20.x.x
```

---

### 1.4 Instalar pnpm

```bash
npm install -g pnpm@10.13.1
pnpm -v   # debe mostrar 10.13.1
```

---

### 1.5 Instalar PM2 (gestor de procesos)

```bash
npm install -g pm2
```

---

### 1.6 Instalar PostgreSQL

```bash
apt install -y postgresql postgresql-contrib
systemctl enable --now postgresql
```

Crear la base de datos:

```bash
sudo -u postgres psql
```

Dentro de psql pegar estas líneas (cambiar `PASSWORD_SEGURO` por una contraseña real):

```sql
CREATE USER aerotaxi WITH PASSWORD 'PASSWORD_SEGURO';
CREATE DATABASE aerotaxichile OWNER aerotaxi;
GRANT ALL PRIVILEGES ON DATABASE aerotaxichile TO aerotaxi;
\q
```

---

### 1.7 Instalar Nginx

```bash
apt install -y nginx
systemctl enable --now nginx
```

---

### 1.8 Configurar el Firewall

```bash
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable
```

---

## PARTE 2 — Subir el código al servidor

### 2.1 Crear la carpeta del proyecto

```bash
mkdir -p /var/www/aerotaxichile
```

### 2.2 Opción A — Subir por Git (recomendado)

Si tienes el código en GitHub/GitLab:

```bash
cd /var/www/aerotaxichile
git clone https://github.com/TU_USUARIO/aerotaxichile.git .
```

### 2.2 Opción B — Subir por SCP desde tu computador

En tu computador (no en el VPS), ejecutar:

```bash
# Empaquetar el proyecto (excluir node_modules y .next)
cd C:\Desarrollo\aerotaxichile
tar --exclude='node_modules' --exclude='.next' --exclude='dist' \
    --exclude='.git' --exclude='backups' \
    -czf aerotaxichile.tar.gz .

# Subir al VPS
scp aerotaxichile.tar.gz root@TU_IP:/var/www/aerotaxichile/

# En el VPS, descomprimir
ssh root@TU_IP
cd /var/www/aerotaxichile
tar -xzf aerotaxichile.tar.gz
rm aerotaxichile.tar.gz
```

---

## PARTE 3 — Configurar variables de entorno

### 3.1 Crear .env para la API

```bash
nano /var/www/aerotaxichile/apps/api/.env
```

Pegar este contenido (reemplazar todos los valores en MAYÚSCULAS):

```
DATABASE_URL=postgresql://aerotaxi:PASSWORD_SEGURO@localhost:5432/aerotaxichile
JWT_SECRET=GENERAR_ABAJO
PORT=4000
ALLOWED_ORIGINS=https://TU_DOMINIO.cl,https://www.TU_DOMINIO.cl
API_BASE_URL=https://TU_DOMINIO.cl/api
VAPID_PUBLIC_KEY=GENERAR_ABAJO
VAPID_PRIVATE_KEY=GENERAR_ABAJO
VAPID_SUBJECT=mailto:admin@TU_DOMINIO.cl
```

**Generar JWT_SECRET** (ejecutar en el VPS):

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copiar el resultado y pegarlo como valor de `JWT_SECRET`.

**Generar VAPID keys** (ejecutar en el VPS):

```bash
npx web-push generate-vapid-keys
```

Copiar `Public Key` → `VAPID_PUBLIC_KEY`  
Copiar `Private Key` → `VAPID_PRIVATE_KEY`

---

### 3.2 Crear .env para la Web

```bash
nano /var/www/aerotaxichile/apps/web/.env.production
```

```
NEXT_PUBLIC_API_URL=https://TU_DOMINIO.cl/api
NEXT_PUBLIC_WHATSAPP_NUMBER=56963552132
NEXT_PUBLIC_VAPID_PUBLIC_KEY=LA_MISMA_PUBLIC_KEY_DE_ARRIBA
```

---

### 3.3 Crear .env para la DB (migraciones)

```bash
nano /var/www/aerotaxichile/packages/db/.env
```

```
DATABASE_URL=postgresql://aerotaxi:PASSWORD_SEGURO@localhost:5432/aerotaxichile
```

---

## PARTE 4 — Instalar dependencias y compilar

```bash
cd /var/www/aerotaxichile

# Instalar dependencias
pnpm install --frozen-lockfile

# Compilar Next.js para producción
BUILD_STANDALONE=true pnpm --filter @aerotaxi/web build
```

Este paso tarda 2-3 minutos. Al final debe decir `✓ Generating static pages`.

---

## PARTE 5 — Migrar la base de datos y cargar datos iniciales

```bash
cd /var/www/aerotaxichile

# Crear todas las tablas
pnpm --filter @aerotaxi/db db:push

# Cargar datos base (admin, conductores, zonas, vehículos)
pnpm --filter @aerotaxi/db db:seed

# Cargar textos del sitio web
pnpm --filter @aerotaxi/db seed:content

# Cargar comunas de Santiago
pnpm --filter @aerotaxi/db seed:comunas
```

Al finalizar el seed verás las credenciales de acceso:

```
🔐 ADMIN
   Email:    admin@aerotaxichile.cl
   Password: aerotaxi2024

🚗 CONDUCTORES (password: chofer2024)
   carlos@aerotaxichile.cl
   roberto@aerotaxichile.cl
   juan@aerotaxichile.cl

👤 CLIENTES (password: cliente2024)
   maria@gmail.com
   pedro@gmail.com
```

> ⚠️ Cambiar la contraseña del admin inmediatamente después del primer login.

---

## PARTE 6 — Iniciar los servicios con PM2

```bash
cd /var/www/aerotaxichile
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

El comando `pm2 startup` imprime una línea que hay que ejecutar (empieza con `sudo env PATH=...`). Copiarla y ejecutarla para que PM2 arranque solo al reiniciar el VPS.

Verificar que estén corriendo:

```bash
pm2 status
```

Debe mostrar `aerotaxi-api` y `aerotaxi-web` en estado `online`.

---

## PARTE 7 — Configurar Nginx

### 7.1 Crear el archivo de configuración

```bash
nano /etc/nginx/sites-available/aerotaxichile
```

Pegar el siguiente contenido (reemplazar `TU_DOMINIO.cl` por tu dominio real):

```nginx
server {
    listen 80;
    server_name TU_DOMINIO.cl www.TU_DOMINIO.cl;

    # Para renovación SSL de Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name TU_DOMINIO.cl www.TU_DOMINIO.cl;

    ssl_certificate     /etc/letsencrypt/live/TU_DOMINIO.cl/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/TU_DOMINIO.cl/privkey.pem;

    client_max_body_size 10M;

    # API en /api/
    location /api/ {
        proxy_pass         http://127.0.0.1:4000/;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    # Archivos subidos (fotos de flota, logos)
    location /uploads/ {
        alias /var/www/aerotaxichile/apps/api/public/uploads/;
        expires 30d;
    }

    # Next.js
    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
    }
}
```

### 7.2 Activar el sitio

```bash
ln -s /etc/nginx/sites-available/aerotaxichile /etc/nginx/sites-enabled/
nginx -t   # debe decir "syntax is ok"
```

---

## PARTE 8 — Instalar SSL (certificado HTTPS gratuito)

```bash
apt install -y certbot python3-certbot-nginx

certbot --nginx \
  -d TU_DOMINIO.cl \
  -d www.TU_DOMINIO.cl \
  --agree-tos \
  --email admin@TU_DOMINIO.cl \
  --non-interactive \
  --redirect
```

Después recargar Nginx:

```bash
systemctl reload nginx
```

---

## PARTE 9 — Verificar que todo funciona

Abrir en el navegador:

| URL | Qué debe mostrar |
|-----|-----------------|
| `https://TU_DOMINIO.cl` | Landing page con el contenido |
| `https://TU_DOMINIO.cl/api/health` | `{"status":"ok"}` |
| `https://TU_DOMINIO.cl/auth/login` | Página de login |
| `https://TU_DOMINIO.cl/admin` | Panel de admin (tras login) |

---

## PARTE 10 — Actualizaciones futuras

Cada vez que hagas cambios en el código:

```bash
cd /var/www/aerotaxichile

# Si usas Git
git pull

# Reinstalar deps si cambiaron
pnpm install --frozen-lockfile

# Si hay cambios en la DB
pnpm --filter @aerotaxi/db db:push

# Si hay cambios en el frontend
BUILD_STANDALONE=true pnpm --filter @aerotaxi/web build

# Reiniciar servicios
pm2 reload all
```

O usar el script automático:

```bash
./scripts/deploy.sh
```

---

## Comandos útiles

```bash
# Ver estado de los servicios
pm2 status

# Ver logs en tiempo real
pm2 logs aerotaxi-api
pm2 logs aerotaxi-web

# Reiniciar un servicio
pm2 restart aerotaxi-api

# Ver uso de CPU y memoria
pm2 monit

# Reiniciar Nginx
systemctl reload nginx

# Ver logs de Nginx
tail -f /var/log/nginx/error.log
```

---

## Solución de problemas

**La página carga pero la API no responde**
```bash
pm2 logs aerotaxi-api   # buscar el error
pm2 restart aerotaxi-api
```

**Error 502 Bad Gateway**
```bash
pm2 status   # verificar que ambos servicios estén online
```

**Cambié textos en el admin pero no se ven**
El contenido se sirve desde la base de datos en tiempo real. Recargar la página en modo incógnito.

**Olvidé la contraseña del admin**
```bash
cd /var/www/aerotaxichile
node -e "
const bcrypt = require('bcryptjs');
bcrypt.hash('nueva_password', 10).then(h => console.log(h));
"
# Copiar el hash y ejecutar en psql:
sudo -u postgres psql aerotaxichile
UPDATE users SET password_hash = 'EL_HASH' WHERE email = 'admin@aerotaxichile.cl';
\q
```
