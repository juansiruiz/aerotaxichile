import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { db, vehicles } from '@aerotaxi/db'
import { createVehicleSchema } from '@aerotaxi/shared'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import type { AppEnv } from '../lib/context.js'

export const vehiclesRouter = new Hono<AppEnv>()

vehiclesRouter.use('*', authMiddleware, requireRole('admin'))

// GET /vehicles
vehiclesRouter.get('/', async (c) => {
  const results = await db.select().from(vehicles)
  return c.json({ data: results })
})

// POST /vehicles
vehiclesRouter.post('/', zValidator('json', createVehicleSchema), async (c) => {
  const body = c.req.valid('json')

  const [vehicle] = await db
    .insert(vehicles)
    .values({
      plate: body.plate,
      brand: body.brand,
      model: body.model,
      year: body.year,
      type: body.type,
      capacity: body.capacity,
      driverId: body.driverId ?? null,
    })
    .returning()

  return c.json({ data: vehicle }, 201)
})

// PATCH /vehicles/:id
vehiclesRouter.patch('/:id', zValidator('json', createVehicleSchema.partial()), async (c) => {
  const id = c.req.param('id')
  const body = c.req.valid('json')

  const [updated] = await db
    .update(vehicles)
    .set({ ...body })
    .where(eq(vehicles.id, id))
    .returning()

  if (!updated) return c.json({ error: 'Vehículo no encontrado' }, 404)
  return c.json({ data: updated })
})
