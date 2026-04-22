/**
 * Script de arranque para Hostinger Node.js hosting.
 * Usa el servidor standalone de Next.js — no requiere next instalado.
 *
 * Comando de inicio en Hostinger: start.mjs
 */
import { spawn }          from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath }  from 'url'
import { existsSync }     from 'fs'

const __dir = dirname(fileURLToPath(import.meta.url))

const WEB_PORT = process.env.PORT     ?? '3000'
const API_PORT = process.env.API_PORT ?? '4000'
const HOSTNAME = process.env.HOSTNAME ?? '0.0.0.0'

console.log(`▶ API  → http://localhost:${API_PORT}`)
console.log(`▶ Web  → http://${HOSTNAME}:${WEB_PORT}`)

// ── 1. Iniciar la API Hono ─────────────────────────────────────────────────
const apiEntry = resolve(__dir, 'apps/api/dist/index.js')
if (!existsSync(apiEntry)) {
  console.error('❌ No se encontró apps/api/dist/index.js')
  process.exit(1)
}

const api = spawn(process.execPath, [apiEntry], {
  cwd: resolve(__dir, 'apps/api'),
  env: { ...process.env, PORT: String(API_PORT) },
  stdio: 'inherit',
})
api.on('error', (e) => { console.error('API error:', e); process.exit(1) })
api.on('exit',  (c) => { if (c) { console.error(`API salió: ${c}`); process.exit(c) } })

// ── 2. Iniciar Next.js standalone ─────────────────────────────────────────
await new Promise((r) => setTimeout(r, 2000))

// El servidor standalone está en .next/standalone/apps/web/server.js
const standaloneServer = resolve(__dir, 'apps/web/.next/standalone/apps/web/server.js')

if (!existsSync(standaloneServer)) {
  console.error('❌ No se encontró el servidor standalone de Next.js.')
  console.error('   Ruta esperada:', standaloneServer)
  process.exit(1)
}

console.log(`✔ Servidor Next.js standalone: ${standaloneServer}`)

const web = spawn(process.execPath, [standaloneServer], {
  cwd: resolve(__dir, 'apps/web/.next/standalone/apps/web'),
  env: {
    ...process.env,
    PORT:     String(WEB_PORT),
    HOSTNAME: HOSTNAME,
    NODE_ENV: 'production',
  },
  stdio: 'inherit',
})
web.on('error', (e) => { console.error('Web error:', e); process.exit(1) })
web.on('exit',  (c) => { if (c) { console.error(`Web salió: ${c}`); process.exit(c) } })

const shutdown = () => { api.kill(); web.kill() }
process.on('SIGTERM', shutdown)
process.on('SIGINT',  shutdown)

console.log('\n✅ Servicios iniciados\n')
