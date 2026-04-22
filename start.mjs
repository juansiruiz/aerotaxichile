/**
 * Script de arranque para Hostinger Node.js hosting.
 * Inicia la API Hono (puerto 4000) y Next.js (puerto que Hostinger asigna vía PORT).
 *
 * Comando de inicio en Hostinger: node start.mjs
 */
import { spawn } from 'child_process'
import { resolve, dirname, existsSync } from 'path'
import { fileURLToPath } from 'url'

// path no exporta existsSync — usamos fs
import { existsSync as fsExists } from 'fs'

const __dir = dirname(fileURLToPath(import.meta.url))

const WEB_PORT  = process.env.PORT     ?? '3000'   // Hostinger asigna PORT
const API_PORT  = process.env.API_PORT ?? '4000'   // Siempre interno

console.log(`▶ API  → http://localhost:${API_PORT}`)
console.log(`▶ Web  → http://localhost:${WEB_PORT}`)

// ── 1. Iniciar la API Hono ─────────────────────────────────────────────────
const apiEntry = resolve(__dir, 'apps/api/dist/index.js')
if (!fsExists(apiEntry)) {
  console.error(`❌ No se encontró apps/api/dist/index.js`)
  console.error('   Ejecuta primero: node build.mjs')
  process.exit(1)
}

const api = spawn('node', [apiEntry], {
  cwd: resolve(__dir, 'apps/api'),
  env: { ...process.env, PORT: String(API_PORT) },
  stdio: 'inherit',
})

api.on('error', (err) => console.error('API error:', err))
api.on('exit',  (code) => { console.error(`API salió con código ${code}`); process.exit(code ?? 1) })

// ── 2. Iniciar Next.js ─────────────────────────────────────────────────────
// Esperar un instante para que la API esté lista
await new Promise((r) => setTimeout(r, 2000))

// Buscar el binario de next
const nextCandidates = [
  resolve(__dir, 'apps/web/node_modules/next/dist/bin/next'),
  resolve(__dir, 'node_modules/next/dist/bin/next'),
]
const nextBin = nextCandidates.find(fsExists)
if (!nextBin) {
  console.error('❌ No se encontró el binario de Next.js')
  console.error('   Candidatos:', nextCandidates.join(', '))
  process.exit(1)
}

console.log(`✔ next: ${nextBin}`)

const web = spawn('node', [nextBin, 'start'], {
  cwd: resolve(__dir, 'apps/web'),
  env: { ...process.env, PORT: String(WEB_PORT) },
  stdio: 'inherit',
})

web.on('error', (err) => console.error('Web error:', err))
web.on('exit',  (code) => { console.error(`Web salió con código ${code}`); process.exit(code ?? 1) })

// ── Manejo de señales ─────────────────────────────────────────────────────
const shutdown = () => { api.kill(); web.kill() }
process.on('SIGTERM', shutdown)
process.on('SIGINT',  shutdown)

console.log('\n✅ Servicios iniciados. Esperando conexiones...\n')
