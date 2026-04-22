/**
 * Script de arranque para Hostinger Node.js hosting.
 * Inicia la API Hono (puerto 4000) y Next.js standalone.
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

// ── Validar variables de entorno obligatorias ──────────────────────────────
const REQUIRED = ['DATABASE_URL', 'JWT_SECRET']
const missing  = REQUIRED.filter((k) => !process.env[k])
if (missing.length > 0) {
  console.error('❌ Variables de entorno faltantes:', missing.join(', '))
  console.error('   Configúralas en el panel de Hostinger → Variables de entorno')
  process.exit(1)
}

console.log('✔ DATABASE_URL:', process.env.DATABASE_URL?.slice(0, 40) + '...')
console.log('✔ JWT_SECRET configurado')
console.log(`▶ API  → http://localhost:${API_PORT}`)
console.log(`▶ Web  → http://0.0.0.0:${WEB_PORT}`)

// ── 1. Iniciar la API Hono ─────────────────────────────────────────────────
const apiEntry = resolve(__dir, 'apps/api/dist/index.js')
if (!existsSync(apiEntry)) {
  console.error('❌ No se encontró apps/api/dist/index.js')
  process.exit(1)
}

const api = spawn(process.execPath, [apiEntry], {
  cwd:   resolve(__dir, 'apps/api'),
  env:   { ...process.env, PORT: String(API_PORT) },
  stdio: ['inherit', 'inherit', 'pipe'],   // capturar stderr para logs
})

// Mostrar errores de la API en los logs de Hostinger
api.stderr?.on('data', (d) => process.stderr.write('[API] ' + d))
api.on('error', (e) => { console.error('API spawn error:', e.message); process.exit(1) })
api.on('exit',  (code) => {
  if (code !== 0) {
    console.error(`❌ API terminó con código ${code}`)
    process.exit(code ?? 1)
  }
})

// ── 2. Iniciar Next.js standalone ─────────────────────────────────────────
await new Promise((r) => setTimeout(r, 2000))

const standaloneServer = resolve(__dir, 'apps/web/.next/standalone/apps/web/server.js')
if (!existsSync(standaloneServer)) {
  console.error('❌ No se encontró el servidor standalone de Next.js.')
  process.exit(1)
}

console.log('✔ Servidor Next.js standalone OK')

const web = spawn(process.execPath, [standaloneServer], {
  cwd: resolve(__dir, 'apps/web/.next/standalone/apps/web'),
  env: {
    ...process.env,
    PORT:     String(WEB_PORT),
    HOSTNAME: '0.0.0.0',
    NODE_ENV: 'production',
  },
  stdio: ['inherit', 'inherit', 'pipe'],
})

web.stderr?.on('data', (d) => process.stderr.write('[Web] ' + d))
web.on('error', (e) => { console.error('Web spawn error:', e.message); process.exit(1) })
web.on('exit',  (code) => { if (code) { console.error(`Web terminó: ${code}`); process.exit(code) } })

const shutdown = () => { api.kill(); web.kill() }
process.on('SIGTERM', shutdown)
process.on('SIGINT',  shutdown)

console.log('\n✅ Servicios iniciados\n')
