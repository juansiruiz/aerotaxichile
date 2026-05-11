#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Deploy AeroTaxi Chile -> Hostinger Shared Hosting
Instala NVM + Node.js + pnpm en el home del usuario (sin sudo)
"""
import paramiko
import sys, io, time

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

HOST     = "147.93.14.206"
PORT     = 65002
USER     = "u626807608"
PASSWORD = "Rosjej26$%"
HOME     = "/home/u626807608"
PROJECT  = f"{HOME}/aerotaxichile"

def mk_client():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=30)
    return c

def run(client, cmd, timeout=300, label=None):
    if label:
        print(f"  > {label}...")
    _, stdout, stderr = client.exec_command(f"bash -l -c '{cmd}'", timeout=timeout, get_pty=True)
    out = ""
    while True:
        line = stdout.readline()
        if not line:
            break
        out += line
        if any(kw in line.lower() for kw in ["error", "warn", "fail", "fatal"]):
            print(f"    {line.rstrip()}")
    return out

def run_raw(client, cmd, timeout=120):
    """Run without bash -l wrapper, returns stdout+stderr"""
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode(errors='replace')
    err = stderr.read().decode(errors='replace')
    return out, err

def progress(transferred, total):
    pct = int(transferred / total * 100) if total > 0 else 0
    mb = transferred / 1024 / 1024
    print(f"    Subiendo: {mb:.2f} MB ({pct}%)", end="\r")

print("=" * 60)
print("  Deploy AeroTaxi Chile -> Hostinger")
print("=" * 60)

client = mk_client()
sftp = client.open_sftp()

# ── 1. Subir proyecto ────────────────────────────────────────────────────────
print("\n--- 1/7  Subiendo proyecto ---")
sftp.put("aerotaxichile.tar.gz", f"{HOME}/aerotaxichile.tar.gz", callback=progress)
print(f"\n  OK: archivo subido")

print("\n--- 2/7  Descomprimiendo ---")
out, err = run_raw(client, f"rm -rf {PROJECT} && mkdir -p {PROJECT} && tar -xzf {HOME}/aerotaxichile.tar.gz -C {PROJECT} && rm {HOME}/aerotaxichile.tar.gz && echo DONE")
print(f"  {'OK' if 'DONE' in out else 'ERR: ' + err[:200]}")

# ── 2. Instalar NVM ──────────────────────────────────────────────────────────
print("\n--- 3/7  Instalando NVM + Node.js 20 ---")
print("  (puede tardar 2-3 min...)")

# Verificar si ya tiene nvm
out, _ = run_raw(client, f"[ -d {HOME}/.nvm ] && echo HAS_NVM || echo NO_NVM")
if "NO_NVM" in out:
    out, err = run_raw(client,
        f"curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash",
        timeout=120)
    print(f"  NVM instalado: {'OK' if 'nvm' in out.lower() or not err.strip() else 'ver logs'}")
else:
    print("  NVM ya instalado")

# Instalar Node 20 via nvm (usando bash interactive para que cargue .bashrc)
out, err = run_raw(client,
    f'export NVM_DIR="{HOME}/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && '
    f'nvm install 20 && nvm use 20 && nvm alias default 20 && node --version && echo NODE_OK',
    timeout=180)
print(f"  Node: {'OK: ' + [l for l in out.split() if l.startswith('v')][-1] if 'NODE_OK' in out else 'ERR - ' + err[:100]}")

# ── 3. Instalar pnpm + pm2 ───────────────────────────────────────────────────
print("\n--- 4/7  Instalando pnpm + PM2 ---")
NVM_PREFIX = f'export NVM_DIR="{HOME}/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 20 2>/dev/null && '

out, err = run_raw(client, f'{NVM_PREFIX} npm install -g pnpm@10.13.1 pm2 && echo TOOLS_OK', timeout=120)
print(f"  pnpm + PM2: {'OK' if 'TOOLS_OK' in out else 'ERR: ' + err[:200]}")

# ── 4. Crear .env files ──────────────────────────────────────────────────────
print("\n--- 5/7  Configurando variables de entorno ---")

# Generar JWT secret
out, _ = run_raw(client, f'{NVM_PREFIX} node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"')
jwt_secret = out.strip().split('\n')[-1]
if not jwt_secret or len(jwt_secret) < 32:
    import secrets
    jwt_secret = secrets.token_hex(64)

vapid_pub  = "BNAl4oIIrMFusL0zFCYtz0zYWLzMxGASEpMlhvvSkLPFV8-CJJ9Lr52fJUawS2mJbAiCg6LHWzHKlw_c2yFSADc"
vapid_priv = "YTqUy8E6RzsWHLOZ7Of8NtX5eJJVWvtXgB_BVnjLKVU"

# Detectar si hay alguna DB disponible — Hostinger shared suele tener MySQL
# Pero usaremos SQLite de emergencia si no hay PostgreSQL
# Primero verificar si hay una DB config de Hostinger
out_domains, _ = run_raw(client, f"ls {HOME}/domains/")
print(f"  Dominios encontrados: {out_domains.strip()}")

# Ver si hay acceso a algun postgres local
out_pg, _ = run_raw(client, "ls /tmp/.s.PGSQL.* 2>/dev/null || echo NO_PG")
has_local_pg = "NO_PG" not in out_pg

# Por ahora configurar con DB externa o la URL que ya tenia el .env local
# El usuario puede editar después
db_url = "postgresql://aerotaxi:aerotaxi2024@localhost:5432/aerotaxichile"

api_env = f"""DATABASE_URL={db_url}
JWT_SECRET={jwt_secret}
PORT=4000
ALLOWED_ORIGINS=http://{HOST}:3000,http://localhost:3000
API_BASE_URL=http://{HOST}/api
VAPID_PUBLIC_KEY={vapid_pub}
VAPID_PRIVATE_KEY={vapid_priv}
VAPID_SUBJECT=mailto:admin@aerotaxichile.cl
NODE_ENV=production
"""

web_env = f"""NEXT_PUBLIC_API_URL=http://{HOST}:4000
NEXT_PUBLIC_WHATSAPP_NUMBER=56963552132
NEXT_PUBLIC_VAPID_PUBLIC_KEY={vapid_pub}
"""

db_env = f"DATABASE_URL={db_url}\n"

with sftp.file(f"{PROJECT}/apps/api/.env.production", "w") as f:
    f.write(api_env)
with sftp.file(f"{PROJECT}/apps/web/.env.production", "w") as f:
    f.write(web_env)
with sftp.file(f"{PROJECT}/packages/db/.env", "w") as f:
    f.write(db_env)

print("  OK: .env files creados")

# ── 5. Instalar dependencias ─────────────────────────────────────────────────
print("\n--- 6/7  Instalando dependencias (3-5 min)... ---")

out, err = run_raw(client,
    f'{NVM_PREFIX} cd {PROJECT} && pnpm install --frozen-lockfile 2>&1 | tail -8 && echo INSTALL_OK',
    timeout=600)
print(f"  {'OK' if 'INSTALL_OK' in out else 'ERR: ' + (out + err)[-300:]}")

# ── 6. Build Next.js ─────────────────────────────────────────────────────────
print("\n--- Build Next.js (puede tardar 5-8 min)... ---")

out, err = run_raw(client,
    f'{NVM_PREFIX} cd {PROJECT} && BUILD_STANDALONE=true pnpm --filter @aerotaxi/web build 2>&1 | tail -15 && echo BUILD_OK',
    timeout=900)
print(f"  {'OK' if 'BUILD_OK' in out else 'ERR: ' + (out + err)[-500:]}")

# ── 7. Crear estructura logs y levantar PM2 ──────────────────────────────────
print("\n--- 7/7  Iniciando servicios con PM2 ---")

run_raw(client, f"mkdir -p {PROJECT}/logs")
out, err = run_raw(client,
    f'{NVM_PREFIX} cd {PROJECT} && pm2 delete all 2>/dev/null; pm2 start ecosystem.config.cjs && pm2 save && echo PM2_OK',
    timeout=60)
print(f"  {'OK' if 'PM2_OK' in out else 'ERR: ' + (out + err)[-300:]}")

# Status
time.sleep(3)
out, _ = run_raw(client, f'{NVM_PREFIX} pm2 status')
print(f"\n{out}")

# PM2 startup (para que reinicie con el servidor)
out, _ = run_raw(client, f'{NVM_PREFIX} pm2 startup 2>&1 | tail -5')
print(f"  PM2 startup info: {out[:200]}")

sftp.close()
client.close()

print("\n" + "=" * 60)
print("  DEPLOY COMPLETADO")
print(f"  Web:  http://{HOST}:3000")
print(f"  API:  http://{HOST}:4000/health")
print("=" * 60)
print("\n  NOTA: Necesitas configurar la DB PostgreSQL.")
print("  Edita en el servidor:")
print(f"  {PROJECT}/apps/api/.env.production")
print(f"  {PROJECT}/packages/db/.env")
