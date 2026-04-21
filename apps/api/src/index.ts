import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { HTTPException } from 'hono/http-exception'

import { uploadsRouter } from './routes/uploads.js'
import { authRouter } from './routes/auth.js'
import { bookingsRouter } from './routes/bookings.js'
import { driversRouter } from './routes/drivers.js'
import { zonesRouter } from './routes/zones.js'
import { vehiclesRouter } from './routes/vehicles.js'
import { profileRouter } from './routes/profile.js'
import { addressesRouter } from './routes/addresses.js'
import { clientsRouter } from './routes/clients.js'
import { settingsRouter } from './routes/settings.js'
import { communeRoutesRouter } from './routes/commune-routes.js'
import { pushRouter, initVapid } from './routes/push.js'
import { notificationsRouter } from './routes/notifications.js'
import { usersRouter } from './routes/users.js'

// ─── Init services ────────────────────────────────────────────────────────────

initVapid()

const app = new Hono()

// ─── Global Middleware ────────────────────────────────────────────────────────

app.use('*', logger())
app.use(
  '*',
  cors({
    origin: process.env['ALLOWED_ORIGINS']?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  }),
)

// ─── Static files ─────────────────────────────────────────────────────────────

app.use('/uploads/*', serveStatic({ root: './public' }))

// ─── Routes ──────────────────────────────────────────────────────────────────

app.route('/uploads', uploadsRouter)
app.route('/auth', authRouter)
app.route('/bookings', bookingsRouter)
app.route('/drivers', driversRouter)
app.route('/zones', zonesRouter)
app.route('/vehicles', vehiclesRouter)
app.route('/profile', profileRouter)
app.route('/addresses', addressesRouter)
app.route('/clients', clientsRouter)
app.route('/settings', settingsRouter)
app.route('/commune-routes', communeRoutesRouter)
app.route('/push', pushRouter)
app.route('/notifications', notificationsRouter)
app.route('/users', usersRouter)

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// ─── Error Handler ────────────────────────────────────────────────────────────

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status)
  }
  console.error(err)
  return c.json({ error: 'Error interno del servidor' }, 500)
})

app.notFound((c) => c.json({ error: 'Ruta no encontrada' }, 404))

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = Number(process.env['PORT'] ?? 4000)

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`API running on http://localhost:${PORT}`)
})

export default app
