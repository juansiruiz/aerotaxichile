/**
 * create-deploy-zip.mjs
 * Compila el proyecto localmente (API + Next.js standalone) y genera
 * aerotaxichile-deploy.zip listo para subir a Hostinger.
 *
 * El ZIP usa output:standalone de Next.js — no necesita instalar
 * next ni los paquetes del workspace en el servidor.
 *
 * Uso: node create-deploy-zip.mjs
 */
import { execSync }         from 'child_process'
import { createWriteStream, existsSync, cpSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath }    from 'url'
import { createRequire }    from 'module'
import archiver             from 'archiver'

const __dir = dirname(fileURLToPath(import.meta.url))
const req   = createRequire(import.meta.url)

const run = (cmd, opts = {}) => {
  console.log(`\n▶ ${cmd}`)
  execSync(cmd, { stdio: 'inherit', shell: true, ...opts })
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
execSync(`node "${tsupCli}"`, { stdio: 'inherit', cwd: resolve(__dir, 'apps/api'), shell: true })

// ── 2. Compilar Web (standalone) ────────────────────────────────────────────
console.log('\n═══ Compilando Web (standalone) ═══')
const nextCli = resolveModule('next/dist/bin/next', [resolve(__dir, 'apps/web')])
console.log(`✔ next: ${nextCli}`)
execSync(`node "${nextCli}" build`, {
  stdio: 'inherit',
  cwd: resolve(__dir, 'apps/web'),
  shell: true,
  env: {
    ...process.env,
    BUILD_STANDALONE: 'true',
    NEXT_PUBLIC_API_URL: '/api',
  },
})

// ── 3. Copiar archivos estáticos al standalone ───────────────────────────────
// Next.js standalone requiere que los archivos estáticos estén junto al server.js
console.log('\n═══ Copiando archivos estáticos al standalone ═══')
const standaloneDir   = resolve(__dir, 'apps/web/.next/standalone/apps/web')
const staticSrc       = resolve(__dir, 'apps/web/.next/static')
const staticDest      = resolve(__dir, 'apps/web/.next/standalone/apps/web/.next/static')
const publicSrc       = resolve(__dir, 'apps/web/public')
const publicDest      = resolve(__dir, 'apps/web/.next/standalone/apps/web/public')

if (existsSync(staticSrc))  { cpSync(staticSrc, staticDest, { recursive: true }); console.log('✔ .next/static copiado') }
if (existsSync(publicSrc))  { cpSync(publicSrc, publicDest, { recursive: true }); console.log('✔ public copiado') }

// ── 4. Crear ZIP ─────────────────────────────────────────────────────────────
console.log('\n═══ Creando ZIP de deployment ═══')
const zipPath = resolve(__dir, 'aerotaxichile-deploy.zip')
const output  = createWriteStream(zipPath)
const archive = archiver('zip', { zlib: { level: 6 } })

archive.pipe(output)

// Código fuente y configuración (sin node_modules ni builds)
archive.glob('**', {
  cwd: __dir,
  dot: true,
  ignore: [
    'node_modules/**',
    '**/node_modules/**',
    '.git/**',
    '.claude/**',
    '**/.next/**',         // se agrega después (solo standalone)
    '**/dist/**',          // se agrega después (api dist)
    'backups/**',
    'certbot/**',
    '*.zip',
    '*.tar.gz',
    'deploy*.mjs',
    'deploy_remote.py',
    'create-deploy-zip.mjs',
    'fix-*.mjs',
    'check-*.mjs',
    'inspect_vps.py',
    'fix_deploy.py',
    'zips/**',
  ],
})

// API compilada (bundle único, sin node_modules)
const apiDist = resolve(__dir, 'apps/api/dist')
if (existsSync(apiDist)) {
  archive.directory(apiDist, 'apps/api/dist')
  console.log('✔ apps/api/dist incluido')
}

// Next.js standalone (servidor + node_modules copiados + static)
const standaloneRoot = resolve(__dir, 'apps/web/.next/standalone')
if (existsSync(standaloneRoot)) {
  archive.directory(standaloneRoot, 'apps/web/.next/standalone')
  console.log('✔ apps/web/.next/standalone incluido')
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
console.log('\n📋 Configuración en Hostinger:')
console.log('   Comando de compilación: (vacío o pnpm install)')
console.log('   Archivo de inicio:      start.mjs')
console.log('   Variables de entorno:   DATABASE_URL  JWT_SECRET  API_PORT=4000  NODE_ENV=production')
