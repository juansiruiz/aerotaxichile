import { Client } from 'ssh2'

const SSH = {
  host: '147.93.14.206',
  port: 65002,
  username: 'u626807608',
  password: 'Rosjej26$%',
  readyTimeout: 30000,
}

function sshExec(conn, cmd) {
  return new Promise((res) => {
    let out = ''
    conn.exec(cmd, (err, stream) => {
      if (err) return res(`Error: ${err.message}`)
      stream.on('data', (d) => { out += d })
      stream.stderr.on('data', (d) => { out += d })
      stream.on('close', () => res(out))
    })
  })
}

async function main() {
  const conn = new Client()
  await new Promise((res, rej) => conn.on('ready', res).on('error', rej).connect(SSH))
  
  const NVM_BIN = '/home/u626807608/.nvm/versions/node/v20.20.2/bin'
  const NODE = `${NVM_BIN}/node`
  const PM2 = `${NVM_BIN}/../lib/node_modules/pm2/bin/pm2`

  console.log('--- LOGS DE ERRORES DE LA APP (PM2) ---')
  console.log(await sshExec(conn, `${NODE} ${PM2} logs aerotaxi-web --lines 50 --nostream`))

  console.log('\n--- VERIFICANDO PUERTO Y PROCESOS ---')
  console.log(await sshExec(conn, `netstat -tlnp 2>/dev/null | grep 3000 || echo "Puerto 3000 no activo"`))
  
  conn.end()
}

main().catch(console.error)
