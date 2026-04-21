import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { db, zones } from '@aerotaxi/db'
import { updateZonePricesSchema } from '@aerotaxi/shared'
import { z } from 'zod'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import type { AppEnv } from '../lib/context.js'

export const zonesRouter = new Hono<AppEnv>()

// GET /zones — público (para mostrar tarifas en el formulario de reserva)
zonesRouter.get('/', async (c) => {
  const results = await db.select().from(zones)
  return c.json({ data: results })
})

// PATCH /zones/:id — solo admin actualiza precios por tipo de vehículo
zonesRouter.patch(
  '/:id',
  authMiddleware,
  requireRole('admin'),
  zValidator('json', updateZonePricesSchema),
  async (c) => {
    const id = c.req.param('id')
    const body = c.req.valid('json')

    // Solo actualizar los campos que vienen en el body
    const updateFields: Record<string, number> = {}
    if (body.priceSedan   !== undefined) updateFields.priceSedan   = body.priceSedan
    if (body.priceSuv     !== undefined) updateFields.priceSuv     = body.priceSuv
    if (body.priceMinivan !== undefined) updateFields.priceMinivan = body.priceMinivan
    if (body.priceVan     !== undefined) updateFields.priceVan     = body.priceVan

    const [updated] = await db
      .update(zones)
      .set(updateFields)
      .where(eq(zones.id, id))
      .returning()

    if (!updated) return c.json({ error: 'Zona no encontrada' }, 404)
    return c.json({ data: updated })
  },
)

// PATCH /zones/:id/comunas — admin actualiza comunas de una zona
zonesRouter.patch(
  '/:id/comunas',
  authMiddleware,
  requireRole('admin'),
  zValidator('json', z.object({ comunas: z.array(z.string().min(2).max(60)).min(1) })),
  async (c) => {
    const id = c.req.param('id')
    const { comunas } = c.req.valid('json')

    const [updated] = await db
      .update(zones)
      .set({ comunas })
      .where(eq(zones.id, id))
      .returning()

    if (!updated) return c.json({ error: 'Zona no encontrada' }, 404)
    return c.json({ data: updated })
  },
)
