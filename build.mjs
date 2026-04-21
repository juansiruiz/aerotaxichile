/**
 * Script de build portable — não depende de pnpm em PATH nem de symlinks de workspace.
 * Usa caminhos absolutos para tsup e next, garantindo funcionamento no Hostinger.
 */
import { execSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'

const __dir = dirname(fileURLToPath(import.meta.url))

const run = (cmd, cwd) => {
  console.log(`\n▶ ${cmd}  [cwd: ${cwd}]`)
  execSync(cmd, { stdio: 'inherit', cwd: resolve(__dir, cwd), shell: true })
}

// Localiza tsup: primeiro no root node_modules, depois em apps/api
function findTsup() {
  const candidates = [
    resolve(__dir, 'node_modules', 'tsup', 'dist', 'cli-default.cjs'),
    resolve(__dir, 'apps', 'api', 'node_modules', 'tsup', 'dist', 'cli-default.cjs'),
  ]
  for (const p of candidates) {
    if (existsSync(p)) {
      console.log(`✔ tsup encontrado: ${p}`)
      return p
    }
  }
  throw new Error(
    `tsup não encontrado. Candidatos verificados:\n${candidates.join('\n')}`
  )
}

// Localiza next CLI
function findNext() {
  const candidates = [
    resolve(__dir, 'apps', 'web', 'node_modules', 'next', 'dist', 'bin', 'next'),
    resolve(__dir, 'node_modules', 'next', 'dist', 'bin', 'next'),
  ]
  for (const p of candidates) {
    if (existsSync(p)) {
      console.log(`✔ next encontrado: ${p}`)
      return p
    }
  }
  throw new Error(
    `next não encontrado. Candidatos verificados:\n${candidates.join('\n')}`
  )
}

// ── API (tsup) ──────────────────────────────────────────────────────────────
console.log('\n═══ Building API ═══')
const tsupPath = findTsup()
run(`node "${tsupPath}"`, 'apps/api')

// ── Web (Next.js) ───────────────────────────────────────────────────────────
console.log('\n═══ Building Web ═══')
const nextPath = findNext()
run(`node "${nextPath}" build`, 'apps/web')

console.log('\n✅ Build completado\n')
