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

  console.log('1. Creando server.js para Next.js...')
  const serverJs = `
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = false;
const port = 3000;
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
  // Escribir server.js
  await sshExec(conn, `cat << 'EOF' > ${DIR}/server.js\n${serverJs}\nEOF`)

  console.log('2. Levantando Web en PM2...')
  await sshExec(conn, `cd ${DIR} && (${NODE} ${PM2} delete aerotaxi-web 2>/dev/null || true) && ${NODE} ${PM2} start server.js --name aerotaxi-web`)

  console.log('3. Configurando .htaccess para Proxy a Puerto 3000...')
  const htaccess = `
RewriteEngine On
RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]
`
  await sshExec(conn, `cat << 'EOF' > ${DIR}/.htaccess\n${htaccess}\nEOF`)
  
  console.log('4. Estado de PM2:')
  console.log(await sshExec(conn, `${NODE} ${PM2} save && ${NODE} ${PM2} status`))
  
  conn.end()
}

main().catch(console.error)
