#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Corre el build y levanta el web en el servidor"""
import paramiko, sys, io, time

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

HOST, PORT, USER, PASSWORD = "147.93.14.206", 65002, "u626807608", "Rosjej26$%"
HOME    = "/home/u626807608"
PROJECT = f"{HOME}/aerotaxichile"
NVM     = f'export NVM_DIR="{HOME}/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 20 2>/dev/null && '

def mk_client():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=30)
    return c

def run(client, cmd, timeout=600, print_output=True):
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode(errors='replace')
    err = stderr.read().decode(errors='replace')
    if print_output:
        combined = (out + err).strip()
        if combined:
            # Solo mostrar últimas 20 lineas
            lines = combined.split('\n')
            for l in lines[-20:]:
                if l.strip():
                    print(f"    {l}")
    return out, err

client = mk_client()
print("Conectado al servidor\n")

# 1. Verificar estado actual
print("=== Estado actual ===")
out, _ = run(client, f"{NVM} pm2 status", print_output=True)

# 2. Ver qué hay en .next
print("\n=== Verificando build anterior ===")
out, _ = run(client, f"ls {PROJECT}/apps/web/.next/ 2>/dev/null || echo NO_NEXT", print_output=False)
print(f"  .next existe: {'NO' if 'NO_NEXT' in out else 'SI, archivos: ' + out.strip()[:200]}")

out, _ = run(client, f"ls {PROJECT}/apps/web/.next/standalone/ 2>/dev/null || echo NO_STANDALONE", print_output=False)
print(f"  standalone: {'NO' if 'NO_STANDALONE' in out else 'SI'}")

# 3. Reinstalar dependencias (sin frozen para que resuelva bien en linux)
print("\n=== Instalando dependencias ===")
print("  pnpm install... (2-3 min)")
out, err = run(client,
    f"{NVM} cd {PROJECT} && pnpm install 2>&1 | tail -10 && echo INSTALL_OK",
    timeout=600)
print(f"  {'OK' if 'INSTALL_OK' in out+err else 'ERROR'}")

# 4. Build Next.js standalone
print("\n=== Build Next.js standalone ===")
print("  (puede tardar 5-10 min...)")
out, err = run(client,
    f"{NVM} cd {PROJECT} && BUILD_STANDALONE=true pnpm --filter @aerotaxi/web build 2>&1 | tail -20 && echo BUILD_OK",
    timeout=900)
build_ok = 'BUILD_OK' in out + err
print(f"  {'OK' if build_ok else 'ERROR - ver output arriba'}")

if build_ok:
    # Copiar static files al standalone (requerido por Next.js)
    print("\n=== Copiando assets estaticos al standalone ===")
    run(client, f"""
        mkdir -p {PROJECT}/apps/web/.next/standalone/apps/web/.next/static &&
        cp -r {PROJECT}/apps/web/.next/static {PROJECT}/apps/web/.next/standalone/apps/web/.next/static &&
        mkdir -p {PROJECT}/apps/web/.next/standalone/apps/web/public &&
        cp -r {PROJECT}/apps/web/public/* {PROJECT}/apps/web/.next/standalone/apps/web/public/ 2>/dev/null || true &&
        echo COPY_OK
    """, timeout=60)

    # 5. Verificar que server.js existe
    out, _ = run(client, f"ls -la {PROJECT}/apps/web/.next/standalone/apps/web/server.js 2>/dev/null || echo NO_SERVER", print_output=False)
    if 'NO_SERVER' in out:
        print("  WARN: server.js no encontrado. probando ruta alternativa...")
        out2, _ = run(client, f"find {PROJECT}/apps/web/.next/standalone -name 'server.js' 2>/dev/null", print_output=False)
        print(f"  server.js encontrado en: {out2.strip()}")
    else:
        print(f"  server.js: OK")

    # 6. Actualizar ecosystem.config para usar la ruta correcta y reiniciar
    print("\n=== Reiniciando PM2 con web ===")
    run(client, f"""
        {NVM} cd {PROJECT} &&
        pm2 delete aerotaxi-web 2>/dev/null || true &&
        pm2 start .next/standalone/apps/web/server.js \
            --name aerotaxi-web \
            --cwd apps/web \
            -e logs/web-error.log \
            -o logs/web-out.log \
            -- --port 3000 &&
        pm2 save &&
        echo PM2_WEB_OK
    """, timeout=60)

# 7. Logs de debug de la API
print("\n=== Logs API (ultimas lineas) ===")
run(client, f"{NVM} pm2 logs aerotaxi-api --lines 20 --nostream 2>&1 | tail -20", timeout=30)

print("\n=== Estado PM2 final ===")
run(client, f"{NVM} pm2 status")

# 8. Test de conectividad
print("\n=== Test de endpoints ===")
time.sleep(5)
out, _ = run(client, "curl -s http://localhost:4000/health 2>/dev/null || echo CURL_FAIL", print_output=False)
print(f"  API /health: {out.strip()[:100] if out.strip() else 'no responde aun'}")

out, _ = run(client, "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 2>/dev/null || echo CURL_FAIL", print_output=False)
print(f"  Web :3000  HTTP status: {out.strip()}")

client.close()
print("\n=== LISTO ===")
