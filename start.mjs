/**
 * Script de arranque para Hostinger Node.js hosting.
 * Inicia la API Hono (puerto 4000) y Next.js (puerto que Hostinger asigna vía PORT).
 *
 * Comando de inicio en Hostinger: start.mjs
 */
import { spawn }          from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath }  from 'url'
import { createRequire }  from 'module'
import { existsSync }     from 'fs'

const __dir = dirname(fileURLToPath(import.meta.url))
const req   = createRequire(import.meta.url)

const WEB_PORT = process.env.PORT     ?? '3000'   // Hostinger asigna PORT
const API_PORT = process.env.API_PORT ?? '4000'   // Siempre interno

console.log(`▶ API  → http://localhost:${API_PORT}`)
console.log(`▶ Web  → http://localhost:${WEB_PORT}`)

// ── Resolver un módulo con varios fallbacks ─────────────────────────────────
function resolveModule(name, extraDirs = []) {
  // 1. Desde raíz (funciona con shamefully-hoist=true)
  try { return req.resolve(name) } catch {}
  // 2. Desde directorios alternativos
  for (const dir of extraDirs) {
    try { return createRequire(resolve(dir, '_')).resolve(name) } catch {}
  }
  return null
}

// ── 1. Iniciar la API Hono ─────────────────────────────────────────────────
const apiEntry = resolve(__dir, 'apps/api/dist/index.js')
if (!existsSync(apiEntry)) {
  console.error(`❌ No se encontró apps/api/dist/index.js`)
  process.exit(1)
}

const api = spawn('node', [apiEntry], {
  cwd: resolve(__dir, 'apps/api'),
  env: { ...process.env, PORT: String(API_PORT) },
  stdio: 'inherit',
})
api.on('error', (err) => { console.error('API error:', err); process.exit(1) })
api.on('exit',  (code) => { if (code !== 0) { console.error(`API salió: ${code}`); process.exit(code ?? 1) } })

// ── 2. Iniciar Next.js ─────────────────────────────────────────────────────
await new Promise((r) => setTimeout(r, 2000))

const nextBin = resolveModule('next/dist/bin/next', [
  resolve(__dir, 'apps/web'),
])

if (!nextBin) {
  console.error('❌ No se encontró Next.js.')
  console.error('   Asegúrate de haber ejecutado: pnpm install')
  process.exit(1)
}

console.log(`✔ next: ${nextBin}`)

const web = spawn('node', [nextBin, 'start'], {
  cwd: resolve(__dir, 'apps/web'),
  env: { ...process.env, PORT: String(WEB_PORT) },
  stdio: 'inherit',
})
web.on('error', (err) => { console.error('Web error:', err); process.exit(1) })
web.on('exit',  (code) => { if (code !== 0) { console.error(`Web salió: ${code}`); process.exit(code ?? 1) } })

// ── Señales ──────────────────────────────────────────────────────────────
const shutdown = () => { api.kill(); web.kill() }
process.on('SIGTERM', shutdown)
process.on('SIGINT',  shutdown)

console.log('\n✅ Servicios iniciados\n')
