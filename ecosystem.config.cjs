/**
 * PM2 ecosystem — alternativa a Docker para Hostinger VPS
 *
 * Uso:
 *   npm install -g pm2
 *   pnpm install
 *   pnpm --filter @aerotaxi/web build
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 *   pm2 startup   # persistir al reboot del servidor
 *
 * Logs:    pm2 logs
 * Status:  pm2 status
 * Reinicio: pm2 restart all
 */
module.exports = {
  apps: [
    // ── API (Hono) ────────────────────────────────────────────────────────
    {
      name: 'aerotaxi-api',
      cwd: './apps/api',
      script: 'node_modules/tsx/dist/cli.mjs',
      args: 'src/index.ts',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      env_file: './apps/api/.env.production',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '500M',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      time: true,
      autorestart: true,
      watch: false,
    },

    // ── Web (Next.js standalone) ──────────────────────────────────────────
    {
      name: 'aerotaxi-web',
      cwd: './apps/web',
      script: '.next/standalone/apps/web/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '800M',
      error_file: './logs/web-error.log',
      out_file: './logs/web-out.log',
      time: true,
      autorestart: true,
      watch: false,
    },
  ],
}
