/**
 * Script de build portable — no depende de pnpm en PATH
 * Usado por Hostinger y otros entornos donde pnpm no está disponible como comando.
 * Usa require.resolve para localizar tsup y next sin depender de rutas fijas.
 */
import { execSync }     from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const __dir  = dirname(fileURLToPath(import.meta.url))
const req    = createRequire(import.meta.url)

const run = (cmd, cwd) => {
  console.log(`\n▶ ${cmd}`)
  execSync(cmd, { stdio: 'inherit', cwd: resolve(__dir, cwd), shell: true })
}

// Resuelve un módulo con fallback a búsqueda manual
function resolveModule(name, searchDirs) {
  // 1. require.resolve desde raíz
  try { return req.resolve(name) } catch {}
  // 2. Buscar en directorios alternativos
  for (const dir of searchDirs) {
    try { return createRequire(resolve(dir, '_')).resolve(name) } catch {}
  }
  throw new Error(`No se encontró: ${name}\nBuscado en: ${[__dir, ...searchDirs].join(', ')}`)
}

// ── API (tsup) ──────────────────────────────────────────────────────────────
console.log('\n═══ Building API ═══')
const tsupCli = resolveModule('tsup/dist/cli-default.js', [
  resolve(__dir, 'apps/api'),
])
console.log(`✔ tsup: ${tsupCli}`)
run(`node "${tsupCli}"`, 'apps/api')

// ── Web (Next.js) ───────────────────────────────────────────────────────────
console.log('\n═══ Building Web ═══')
const nextCli = resolveModule('next/dist/bin/next', [
  resolve(__dir, 'apps/web'),
])
console.log(`✔ next: ${nextCli}`)
run(`node "${nextCli}" build`, 'apps/web')

console.log('\n✅ Build completado\n')
