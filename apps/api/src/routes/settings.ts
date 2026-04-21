import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, settings } from '@aerotaxi/db'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import type { AppEnv } from '../lib/context.js'

export const settingsRouter = new Hono<AppEnv>()

// GET /settings — público, devuelve todos los settings mezclados con defaults
settingsRouter.get('/', async (c) => {
  const rows = await db.select().from(settings)
  const merged: Record<string, string> = {
    pricing_mode: 'zone',
    destination_type: 'airport',
    destination_name: 'Aeropuerto AMB',
    destination_address: 'Aeropuerto Internacional Arturo Merino Benítez, Pudahuel',
  }
  for (const row of rows) { merged[row.key] = row.value }
  return c.json({ data: merged })
})

// GET /settings/:key — público (para que el formulario sepa el modo)
settingsRouter.get('/:key', async (c) => {
  const key = c.req.param('key')
  const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1)

  // Defaults si no existe aún en la tabla
  const defaults: Record<string, string> = {
    pricing_mode: 'zone',
    destination_type: 'airport',
    destination_name: 'Aeropuerto AMB',
    destination_address: 'Aeropuerto Internacional Arturo Merino Benítez, Pudahuel',
  }

  const value = row?.value ?? defaults[key] ?? null
  if (value === null) return c.json({ error: 'Setting no encontrado' }, 404)
  return c.json({ data: { key, value } })
})

// PATCH /settings/:key — solo admin
settingsRouter.patch(
  '/:key',
  authMiddleware,
  requireRole('admin'),
  zValidator('json', z.object({ value: z.string().min(1).max(10000) })),
  async (c) => {
    const key = c.req.param('key')
    const { value } = c.req.valid('json')

    // Validaciones por clave conocida
    if (key === 'pricing_mode' && !['zone', 'commune'].includes(value)) {
      return c.json({ error: 'Valor inválido para pricing_mode' }, 400)
    }
    if (key === 'destination_type' && !['airport', 'bus_terminal', 'train_station', 'port', 'other'].includes(value)) {
      return c.json({ error: 'Valor inválido para destination_type' }, 400)
    }

    await db
      .insert(settings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value, updatedAt: new Date() },
      })

    return c.json({ data: { key, value } })
  },
)
