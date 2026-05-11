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
  const NVM_BIN = '/home/u626807608/.nvm/versions/node/v20.20.2/bin'
  const NODE = `${NVM_BIN}/node`
  const PM2 = `${NVM_BIN}/../lib/node_modules/pm2/bin/pm2`
  const PORT = 31445

  console.log('1. Actualizando server.js con nuevo puerto...')
  const serverJs = `
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = false;
const port = ${PORT};
const app = next({ dev, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, '127.0.0.1', (err) => {
    if (err) throw err;
    console.log('> Ready on http://127.0.0.1:' + port);
  });
});
`
  await sshExec(conn, `cat << 'EOF' > ${DIR}/server.js\n${serverJs}\nEOF`)

  console.log('2. Reiniciando Web en PM2...')
  // Primero limpiamos los logs
  await sshExec(conn, `${NODE} ${PM2} flush aerotaxi-web 2>/dev/null`)
  await sshExec(conn, `cd ${DIR} && ${NODE} ${PM2} restart aerotaxi-web 2>/dev/null || ${NODE} ${PM2} start server.js --name aerotaxi-web`)

  console.log('3. Actualizando .htaccess...')
  const htaccess = `
RewriteEngine On
RewriteRule ^(.*)$ http://127.0.0.1:${PORT}/$1 [P,L]
`
  await sshExec(conn, `cat << 'EOF' > ${DIR}/.htaccess\n${htaccess}\nEOF`)
  await sshExec(conn, `${NODE} ${PM2} save`)
  
  console.log('4. Esperando 3 segundos y verificando logs...')
  await new Promise(r => setTimeout(r, 3000))
  console.log(await sshExec(conn, `${NODE} ${PM2} logs aerotaxi-web --lines 10 --nostream`))
  
  conn.end()
}

main().catch(console.error)
