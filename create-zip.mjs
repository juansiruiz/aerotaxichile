/**
 * create-zip.mjs — Empaqueta la app para subir a Hostinger vía web
 *
 * Genera dos ZIPs listos para subir:
 *   📦 aerotaxi-api.zip   → API Hono/Node.js  (puerto 4000)
 *   📦 aerotaxi-web.zip   → Frontend Next.js   (puerto 3000)
 *
 * Uso: node create-zip.mjs
 */

import { execSync } from 'child_process'
import { existsSync, mkdirSync, writeFileSync, cpSync, rmSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const DIST = resolve(__dir, 'dist-deploy')   // carpeta temporal
const OUT  = resolve(__dir, 'zips')           // carpeta de salida

// IP real del servidor de producción
const SERVER_IP   = '147.93.14.206'
const API_PORT    = '4000'
const WEB_PORT    = '3000'

// ── Helpers ──────────────────────────────────────────────────────────────────

function step(n, total, msg) {
  console.log(`\n[${ n }/${ total }] ${ msg }`)
}

function copyDir(src, dest) {
  if (!existsSync(src)) {
    console.warn(`  ⚠ No existe: ${src}`)
    return
  }
  cpSync(src, dest, { recursive: true })
}

import archiver from 'archiver'
import { createWriteStream } from 'fs'

/** Comprime una carpeta usando la librería archiver */
function zipFolder(sourceDir, zipPath) {
  return new Promise((resolve, reject) => {
    if (existsSync(zipPath)) rmSync(zipPath)
    
    const output = createWriteStream(zipPath)
    const archive = archiver('zip', {
      zlib: { level: 9 } // Nivel máximo de compresión
    })

    output.on('close', () => resolve())
    archive.on('error', (err) => reject(err))

    archive.pipe(output)
    archive.directory(sourceDir, false)
    archive.finalize()
  })
}

// ── Preparación ───────────────────────────────────────────────────────────────

// Limpiar y crear carpetas de trabajo
if (existsSync(DIST)) rmSync(DIST, { recursive: true, force: true })
mkdirSync(`${DIST}/api`, { recursive: true })
mkdirSync(`${DIST}/web`, { recursive: true })
mkdirSync(OUT, { recursive: true })

const TOTAL = 6

// ═══════════════════════════════════════════════════════════════
//   ZIP 1 — API
// ═══════════════════════════════════════════════════════════════
console.log('\n╔══════════════════════════════════════╗')
console.log('║  📦 Preparando aerotaxi-api.zip       ║')
console.log('╚══════════════════════════════════════╝')

step(1, TOTAL, 'Copiando dist/ de la API...')
copyDir(
  resolve(__dir, 'apps/api/dist'),
  `${DIST}/api/dist`
)

step(2, TOTAL, 'Generando package.json limpio para la API...')
// Leer el package.json original y eliminar dependencias workspace:*
const apiPkg = JSON.parse(readFileSync(resolve(__dir, 'apps/api/package.json'), 'utf8'))
// Filtrar workspace:* (ya están compiladas en el bundle de tsup)
const filteredDeps = Object.fromEntries(
  Object.entries(apiPkg.dependencies || {}).filter(([, v]) => !v.startsWith('workspace:'))
)
const cleanApiPkg = {
  name: apiPkg.name,
  version: apiPkg.version,
  type: 'module',
  scripts: {
    start: 'node dist/index.js',
  },
  dependencies: filteredDeps,
  engines: { node: '>=20' },
}
writeFileSync(`${DIST}/api/package.json`, JSON.stringify(cleanApiPkg, null, 2))
console.log('  ✔ package.json limpio (sin workspace:*)')
console.log('  ✔ Dependencias incluidas:', Object.keys(filteredDeps).join(', '))

step(3, TOTAL, 'Generando .env de producción para la API...')
const apiEnvContent = [
  `DATABASE_URL=postgresql://aerotaxi:aerotaxi2024@localhost:5432/aerotaxichile`,
  `JWT_SECRET=aerotaxi-jwt-secret-super-seguro-64-caracteres-para-produccion-ok`,
  `PORT=${API_PORT}`,
  `ALLOWED_ORIGINS=http://${SERVER_IP}:${WEB_PORT}`,
  `VAPID_PUBLIC_KEY=BNAl4oIIrMFusL0zFCYtz0zYWLzMxGASEpMlhvvSkLPFV8-CJJ9Lr52fJUawS2mJbAiCg6LHWzHKlw_c2yFSADc`,
  `VAPID_PRIVATE_KEY=YTqUy8E6RzsWHLOZ7Of8NtX5eJJVWvtXgB_BVnjLKVU`,
  `VAPID_SUBJECT=mailto:admin@aerotaxichile.cl`,
].join('\n')
writeFileSync(`${DIST}/api/.env`, apiEnvContent)
console.log('  ✔ .env actualizado con IP del servidor')

// ═══════════════════════════════════════════════════════════════
//   ZIP 2 — WEB
// ═══════════════════════════════════════════════════════════════
console.log('\n╔══════════════════════════════════════╗')
console.log('║  📦 Preparando aerotaxi-web.zip       ║')
console.log('╚══════════════════════════════════════╝')

step(4, TOTAL, 'Copiando .next/ y public/ del frontend...')
copyDir(resolve(__dir, 'apps/web/.next'),   `${DIST}/web/.next`)
copyDir(resolve(__dir, 'apps/web/public'),  `${DIST}/web/public`)

// Copiar next.config.ts
const nextConfigSrc = resolve(__dir, 'apps/web/next.config.ts')
if (existsSync(nextConfigSrc)) {
  cpSync(nextConfigSrc, `${DIST}/web/next.config.ts`)
}

step(5, TOTAL, 'Generando package.json y .env.local para la Web...')
// package.json limpio para Web (sin workspace:*)
const webPkg = JSON.parse(readFileSync(resolve(__dir, 'apps/web/package.json'), 'utf8'))
const filteredWebDeps = Object.fromEntries(
  Object.entries(webPkg.dependencies || {}).filter(([, v]) => !v.startsWith('workspace:'))
)
const cleanWebPkg = {
  name: webPkg.name,
  version: webPkg.version,
  scripts: {
    start: `next start -p ${WEB_PORT}`,
    build: 'next build',
  },
  dependencies: filteredWebDeps,
  devDependencies: webPkg.devDependencies,
  engines: { node: '>=20' },
}
writeFileSync(`${DIST}/web/package.json`, JSON.stringify(cleanWebPkg, null, 2))
console.log('  ✔ package.json limpio')

// .env.local apuntando al servidor real
const webEnvContent = [
  `NEXT_PUBLIC_API_URL=https://api.adylo.org`,
  `NEXT_PUBLIC_WHATSAPP_NUMBER=56912345678`,
  `NEXT_PUBLIC_VAPID_PUBLIC_KEY=BNAl4oIIrMFusL0zFCYtz0zYWLzMxGASEpMlhvvSkLPFV8-CJJ9Lr52fJUawS2mJbAiCg6LHWzHKlw_c2yFSADc`,
].join('\n')
writeFileSync(`${DIST}/web/.env.local`, webEnvContent)
console.log(`  ✔ NEXT_PUBLIC_API_URL → https://api.adylo.org`)

// server.js para Hostinger LiteSpeed/Passenger
const serverJsContent = `
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = false;
// Passenger nos pasa el puerto en process.env.PORT
const port = process.env.PORT || 3000;
const app = next({ dev, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, (err) => {
    if (err) throw err;
    console.log('> Ready on http://localhost:' + port);
  });
});
`
writeFileSync(`${DIST}/web/server.js`, serverJsContent)
console.log('  ✔ server.js (Entry file) generado')

// ═══════════════════════════════════════════════════════════════
//   Comprimir
// ═══════════════════════════════════════════════════════════════
async function main() {
  step(6, TOTAL, 'Comprimiendo ZIPs...')

  const apiZip = resolve(OUT, 'aerotaxi-api.zip')
  const webZip = resolve(OUT, 'aerotaxi-web.zip')

  process.stdout.write('  → Comprimiendo API... ')
  await zipFolder(`${DIST}/api`, apiZip)
  console.log('✔')

  process.stdout.write('  → Comprimiendo Web... ')
  await zipFolder(`${DIST}/web`, webZip)
  console.log('✔')

  // Limpiar temporal
  rmSync(DIST, { recursive: true, force: true })

  // ── Resumen ───────────────────────────────────────────────────────────────────
  console.log('\n╔════════════════════════════════════════════════════════════╗')
  console.log('║  ✅  ZIPs listos para subir a Hostinger                    ║')
  console.log('╠════════════════════════════════════════════════════════════╣')
  console.log(`║  📦  zips\\aerotaxi-api.zip   →  API (puerto ${API_PORT})          ║`)
  console.log(`║  📦  zips\\aerotaxi-web.zip   →  Web (puerto ${WEB_PORT})          ║`)
  console.log('╠════════════════════════════════════════════════════════════╣')
  console.log('║  Pasos en Hostinger:                                       ║')
  console.log('║  1. Crear app Node.js → "Sube los archivos"                ║')
  console.log('║  2. Subir aerotaxi-api.zip  → comando start: npm start     ║')
  console.log('║  3. Crear segunda app Node.js → "Sube los archivos"        ║')
  console.log('║  4. Subir aerotaxi-web.zip  → comando start: npm start     ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
}

main().catch(console.error)
