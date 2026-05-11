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

  console.log('1. Deteniendo PM2 (usaremos el gestor nativo de Hostinger)...')
  await sshExec(conn, `${NODE} ${PM2} delete aerotaxi-web 2>/dev/null || true`)
  await sshExec(conn, `${NODE} ${PM2} save`)

  console.log('2. Actualizando server.js para Passenger...')
  const serverJs = `
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = false;
// Passenger nos pasa el puerto automáticamente mediante process.env.PORT
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
  await sshExec(conn, `cat << 'EOF' > ${DIR}/server.js\n${serverJs}\nEOF`)

  console.log('3. Creando el .htaccess nativo de LiteSpeed/Passenger...')
  const htaccess = `
# DO NOT REMOVE. ALWAY AT THE TOP
# BEGIN LITESPEED NODEJS APP
<IfModule Litespeed>
  PassengerAppRoot "${DIR}"
  PassengerAppType node
  PassengerStartupFile server.js
</IfModule>
# END LITESPEED NODEJS APP

RewriteEngine On
RewriteRule ^\.builds - [F,L]
`
  await sshExec(conn, `cat << 'EOF' > ${DIR}/.htaccess\n${htaccess}\nEOF`)
  
  // Reiniciamos el proceso de Passenger (creando la carpeta tmp y el archivo restart.txt)
  console.log('4. Forzando reinicio de la aplicación web...')
  await sshExec(conn, `mkdir -p ${DIR}/tmp && touch ${DIR}/tmp/restart.txt`)

  console.log('Proceso terminado. Passenger ya está configurado.')
  conn.end()
}

main().catch(console.error)
