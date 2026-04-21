/**
 * Script de build portable — no depende de pnpm en PATH
 * Usado por Hostinger y otros entornos donde pnpm no está disponible como comando
 */
import { execSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const run = (cmd, cwd) => {
  console.log(`\n▶ ${cmd}`)
  execSync(cmd, { stdio: 'inherit', cwd: resolve(__dir, cwd), shell: true })
}

// ── API (tsup) ──────────────────────────────────────────────────────────────
console.log('\n═══ Building API ═══')
run('node node_modules/tsup/dist/cli-default.cjs', 'apps/api')

// ── Web (Next.js) ───────────────────────────────────────────────────────────
console.log('\n═══ Building Web ═══')
run('node node_modules/next/dist/bin/next build', 'apps/web')

console.log('\n✅ Build completado\n')
