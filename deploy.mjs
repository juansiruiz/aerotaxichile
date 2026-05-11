/**
 * deploy.mjs — Deploy AeroTaxi Chile → Hostinger
 * Usa la librería ssh2 para conexión SSH/SFTP directa.
 * Fase 2: Solo instala deps y reinicia PM2 (archivos ya subidos).
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

  // Detectar dónde está node/npm/pm2
  console.log('═══ Detectando entorno del servidor ═══')
  await sshExec(conn, 'echo $PATH && which node || true && ls /usr/local/bin/node* 2>/dev/null || true && ls ~/.nvm/versions/node/*/bin/node 2>/dev/null | head -3 || true', true)
  await sshExec(conn, 'ls /usr/bin/node* /usr/bin/npm* 2>/dev/null || true', true)
  await sshExec(conn, 'ls ~/.nvm/alias/default 2>/dev/null && cat ~/.nvm/alias/default 2>/dev/null || true', true)
  await sshExec(conn, 'source ~/.bashrc 2>/dev/null; source ~/.nvm/nvm.sh 2>/dev/null; which node && node --version && which npm && npm --version && which pm2 || true', true)

  conn.end()
  console.log('\nDatos del servidor obtenidos. Revisa el output arriba.')
}

main().catch((err) => { console.error('❌', err.message); process.exit(1) })
