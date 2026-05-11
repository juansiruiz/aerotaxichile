/**
 * deploy-finalize.mjs — Fase final del deploy AeroTaxi Chile → Hostinger
 * Instala dependencias y levanta/reinicia servicios con PM2.
 * Los archivos ya fueron subidos previamente.
 */
import { Client } from 'ssh2'

const SSH = {
  host: '147.93.14.206',
  port: 65002,
  username: 'u626807608',
  password: 'Rosjej26$%',
  readyTimeout: 30000,
}
const REMOTE = '/home/u626807608/aerotaxichile'

// Rutas absolutas del entorno NVM del servidor
const NVM_BIN = '/home/u626807608/.nvm/versions/node/v20.20.2/bin'
const NPM_CLI = `${NVM_BIN}/../lib/node_modules/npm/bin/npm-cli.js`
const PM2_BIN = `${NVM_BIN}/../lib/node_modules/pm2/bin/pm2`
const NODE = `${NVM_BIN}/node`

// Comandos construidos para evitar shebang /usr/bin/env
const NPM = `${NODE} ${NPM_CLI}`
const PM2 = `${NODE} ${PM2_BIN}`

function sshExec(conn, cmd, ignoreError = false) {
  return new Promise((res, rej) => {
    let out = ''
    conn.exec(cmd, (err, stream) => {
      if (err) return rej(err)
      stream.on('data', (d) => { out += d; process.stdout.write(d.toString()) })
      stream.stderr.on('data', (d) => process.stderr.write(d.toString()))
      stream.on('close', (code) => {
        if (code !== 0 && !ignoreError) rej(new Error(`Exit ${code}: ${cmd}`))
        else res(out)
      })
    })
  })
}

async function main() {
  const conn = new Client()
  await new Promise((res, rej) => conn.on('ready', res).on('error', rej).connect(SSH))
  console.log('✔ Conectado al servidor\n')

  // ── [4/5] Instalar dependencias ──────────────────────────────────────────
  console.log('═══ [4/5] Instalando dependencias ═══')
  console.log('\n→ API...')
  await sshExec(conn, `cd ${REMOTE}/api && ${NPM} install --omit=dev 2>&1`)
  console.log('\n→ Web...')
  await sshExec(conn, `cd ${REMOTE}/web && ${NPM} install --omit=dev 2>&1`)

  // ── [5/5] PM2 ────────────────────────────────────────────────────────────
  console.log('\n═══ [5/5] Configurando PM2 ═══')

  // API — puerto 3001
  console.log('\n→ Levantando API (puerto 3001)...')
  await sshExec(
    conn,
    `cd ${REMOTE}/api && ` +
    `(${PM2} describe aerotaxi-api > /dev/null 2>&1 && ${PM2} restart aerotaxi-api) || ` +
    `${PM2} start ${NODE} --name aerotaxi-api -- dist/index.js`,
    false
  )

  // Web — puerto 3000
  console.log('\n→ Levantando Web (puerto 3000)...')
  await sshExec(
    conn,
    `cd ${REMOTE}/web && ` +
    `(${PM2} describe aerotaxi-web > /dev/null 2>&1 && ${PM2} restart aerotaxi-web) || ` +
    `${PM2} start ${NPM} --name aerotaxi-web -- start`,
    false
  )

  // Guardar lista PM2 y mostrar estado
  await sshExec(conn, `${PM2} save 2>&1`)
  console.log('\n→ Estado de PM2:')
  await sshExec(conn, `${PM2} list 2>&1`)

  conn.end()

  console.log('\n╔══════════════════════════════════════════════╗')
  console.log('║  ✅ Deploy completado exitosamente            ║')
  console.log('║  API → http://147.93.14.206:3001             ║')
  console.log('║  Web → http://147.93.14.206:3000             ║')
  console.log('╚══════════════════════════════════════════════╝')
}

main().catch((err) => { console.error('\n❌ Error:', err.message); process.exit(1) })
