import { Client } from 'ssh2'
import { readFileSync } from 'fs'

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
  console.log('✅ SSH Conectado')

  const API_DIR = '/home/u626807608/aerotaxi-api'
  const PUBLIC_HTML = '/home/u626807608/domains/purple-lark-756147.hostingersite.com/public_html'
  const NVM_BIN = '/home/u626807608/.nvm/versions/node/v20.20.2/bin'
  const NODE = `${NVM_BIN}/node`
  const PM2 = `${NVM_BIN}/../lib/node_modules/pm2/bin/pm2`
  
  // 1. Preparar directorio seguro fuera de public_html
  console.log('1. Preparando directorio de la API...')
  await sshExec(conn, `rm -rf ${API_DIR} && mkdir -p ${API_DIR}`)

  // 2. Subir aerotaxi-api.zip vía SFTP
  console.log('2. Subiendo aerotaxi-api.zip...')
  await new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err)
      const readStream = readFileSync('c:\\Desarrollo\\aerotaxichile\\zips\\aerotaxi-api.zip')
      const writeStream = sftp.createWriteStream(`${API_DIR}/aerotaxi-api.zip`)
      writeStream.on('close', resolve)
      writeStream.on('error', reject)
      writeStream.write(readStream)
      writeStream.end()
    })
  })

  // 3. Descomprimir API
  console.log('3. Descomprimiendo e instalando API...')
  await sshExec(conn, `cd ${API_DIR} && unzip -q aerotaxi-api.zip && rm aerotaxi-api.zip`)

  // 4. Iniciar con PM2
  console.log('4. Iniciando API en el puerto 4000 con PM2...')
  await sshExec(conn, `${NODE} ${PM2} delete aerotaxi-api 2>/dev/null || true`)
  await sshExec(conn, `cd ${API_DIR} && ${NODE} ${PM2} start dist/index.js --name aerotaxi-api -- --port 4000`)
  await sshExec(conn, `${NODE} ${PM2} save`)

  // 5. Inyectar regla de proxy en .htaccess de la Web
  console.log('5. Conectando Web con API vía proxy inverso en .htaccess...')
  
  const proxyRule = `
# PROXY PARA LA API INTERNA EN EL PUERTO 4000
RewriteEngine On
RewriteRule ^backend/(.*)$ http://127.0.0.1:4000/$1 [P,L]
RewriteRule ^backend$ http://127.0.0.1:4000/ [P,L]
`
  // Extraemos el contenido actual de .htaccess y le agregamos nuestra regla arriba
  const currentHtaccess = await sshExec(conn, `cat ${PUBLIC_HTML}/.htaccess 2>/dev/null || echo ""`)
  if (!currentHtaccess.includes('backend')) {
      await sshExec(conn, `cat << 'EOF' > ${PUBLIC_HTML}/.htaccess\n${proxyRule}\n${currentHtaccess}\nEOF`)
  }

  // Verificar status de la API
  console.log('\n✅ Proceso completado. Status de PM2:')
  console.log(await sshExec(conn, `${NODE} ${PM2} status aerotaxi-api`))
  
  conn.end()
}

main().catch(console.error)
