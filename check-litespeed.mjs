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
  
  const DIR = '/home/u626807608/domains/purple-lark-756147.hostingersite.com/public_html'
  
  console.log('--- CONTENIDO DE .htaccess ---')
  console.log(await sshExec(conn, `cat ${DIR}/.htaccess`))
  
  console.log('\n--- LOGS DE COMPILACION/ARRANQUE ---')
  console.log(await sshExec(conn, `cat ${DIR}/.builds/*.log 2>/dev/null | tail -n 50 || true`))

  console.log('\n--- PRUEBA ARRANQUE MANUAL ---')
  console.log(await sshExec(conn, `cd ${DIR} && /home/u626807608/.nvm/versions/node/v20.20.2/bin/npm run start 2>&1 & sleep 3; kill $!`))
  
  conn.end()
}

main().catch(console.error)
