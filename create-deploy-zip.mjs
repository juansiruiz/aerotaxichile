/**
 * create-deploy-zip.mjs
 * Compila el proyecto localmente y genera aerotaxichile-deploy.zip
 * listo para subir a Hostinger sin necesidad de compilar en el servidor.
 *
 * Uso: node create-deploy-zip.mjs
 */
import { execSync }         from 'child_process'
import { createWriteStream, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath }    from 'url'
import { createRequire }    from 'module'
import archiver             from 'archiver'

const __dir = dirname(fileURLToPath(import.meta.url))
const req   = createRequire(import.meta.url)

const run = (cmd, opts = {}) => {
  console.log(`\n▶ ${cmd}`)
  execSync(cmd, { stdio: 'inherit', cwd: __dir, shell: true, ...opts })
}

function resolveModule(name, extraDirs = []) {
  try { return req.resolve(name) } catch {}
  for (const dir of extraDirs) {
    try { return createRequire(resolve(dir, '_')).resolve(name) } catch {}
  }
  throw new Error(`No se encontró: ${name}`)
}

// ── 1. Compilar API ─────────────────────────────────────────────────────────
console.log('\n═══ Compilando API ═══')
const tsupCli = resolveModule('tsup/dist/cli-default.js', [resolve(__dir, 'apps/api')])
console.log(`✔ tsup: ${tsupCli}`)
execSync(`node "${tsupCli}"`, {
  stdio: 'inherit',
  cwd: resolve(__dir, 'apps/api'),
  shell: true,
})

// ── 2. Compilar Web ─────────────────────────────────────────────────────────
console.log('\n═══ Compilando Web ═══')
const nextCli = resolveModule('next/dist/bin/next', [resolve(__dir, 'apps/web')])
console.log(`✔ next: ${nextCli}`)
execSync(`node "${nextCli}" build`, {
  stdio: 'inherit',
  cwd: resolve(__dir, 'apps/web'),
  shell: true,
  env: { ...process.env, NEXT_PUBLIC_API_URL: '/api' },
})

// ── 3. Crear ZIP ─────────────────────────────────────────────────────────────
console.log('\n═══ Creando ZIP de deployment ═══')
const zipPath = resolve(__dir, 'aerotaxichile-deploy.zip')
const output  = createWriteStream(zipPath)
const archive = archiver('zip', { zlib: { level: 6 } })

archive.pipe(output)

const ignore = [
  'node_modules/**',
  '**/node_modules/**',
  '.git/**',
  '.claude/**',
  '**/.next/**',          // se agrega después sin caché
  '**/dist/**',           // se agrega después (api)
  'backups/**',
  'certbot/**',
  '*.zip',
  'deploy*.mjs',
  'deploy_remote.py',
  'create-deploy-zip.mjs',
]

// Código fuente
archive.glob('**', { cwd: __dir, ignore, dot: true })

// API compilada (bundle único ~56KB)
if (existsSync(resolve(__dir, 'apps/api/dist'))) {
  archive.directory(resolve(__dir, 'apps/api/dist'), 'apps/api/dist')
  console.log('✔ apps/api/dist incluido')
}

// Web compilada (sin caché)
const nextDir = resolve(__dir, 'apps/web/.next')
if (existsSync(nextDir)) {
  archive.glob('**', {
    cwd: nextDir,
    ignore: ['cache/**'],
    dot: true,
  }, { prefix: 'apps/web/.next' })
  console.log('✔ apps/web/.next incluido (sin caché)')
}

await new Promise((res, rej) => {
  output.on('close', () => {
    const mb = (archive.pointer() / 1024 / 1024).toFixed(1)
    console.log(`\n✅ aerotaxichile-deploy.zip listo (${mb} MB)`)
    res()
  })
  archive.on('error', rej)
  archive.finalize()
})

console.log(`\nUbicación: ${zipPath}`)
console.log('\n📋 Sube el ZIP a Hostinger y configura:')
console.log('   Comando de compilación: pnpm install')
console.log('   Comando de inicio:      node start.mjs')
console.log('   Variables de entorno:   DATABASE_URL  JWT_SECRET  API_PORT=4000  NODE_ENV=production')
