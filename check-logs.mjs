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
  
  console.log('--- RUTAS Y ARCHIVOS ---')
  const paths = await sshExec(conn, 'ls -la ~/ && ls -la ~/domains/*/public_html 2>/dev/null || true')
  console.log(paths)

  console.log('\n--- LOGS APP NODE (Hostinger) ---')
  const logs = await sshExec(conn, 'cat ~/domains/*/logs/error.log 2>/dev/null | tail -n 20 || true')
  console.log(logs)
  
  conn.end()
}

main().catch(console.error)
