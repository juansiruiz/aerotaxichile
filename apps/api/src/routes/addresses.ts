import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { db, clientAddresses } from '@aerotaxi/db'
import { authMiddleware } from '../middleware/auth.js'
import type { AppEnv } from '../lib/context.js'

export const addressesRouter = new Hono<AppEnv>()

const addressSchema = z.object({
  label:          z.string().min(2).max(50),
  address:        z.string().min(5).max(300),
  comunaDetected: z.string().max(60).optional(),
  zoneId:         z.string().uuid().optional(),
  isDefault:      z.boolean().optional(),
})

// GET /addresses — listar direcciones del usuario
addressesRouter.get('/', authMiddleware, async (c) => {
  const { sub } = c.get('user')
  const results = await db
    .select()
    .from(clientAddresses)
    .where(eq(clientAddresses.userId, sub))
    .orderBy(clientAddresses.createdAt)

  return c.json({ data: results })
})

// POST /addresses — guardar nueva dirección
addressesRouter.post('/', authMiddleware, zValidator('json', addressSchema), async (c) => {
  const { sub } = c.get('user')
  const body = c.req.valid('json')

  // Si es default, quitar default de las otras
  if (body.isDefault) {
    await db.update(clientAddresses).set({ isDefault: false }).where(eq(clientAddresses.userId, sub))
  }

  const [created] = await db
    .insert(clientAddresses)
    .values({ ...body, userId: sub })
    .returning()

  return c.json({ data: created }, 201)
})

// PATCH /addresses/:id — actualizar dirección (ej. cambiar label o marcar como default)
addressesRouter.patch('/:id', authMiddleware, zValidator('json', addressSchema.partial()), async (c) => {
  const { sub } = c.get('user')
  const id = c.req.param('id')
  const body = c.req.valid('json')

  if (body.isDefault) {
    await db.update(clientAddresses).set({ isDefault: false }).where(eq(clientAddresses.userId, sub))
  }

  const [updated] = await db
    .update(clientAddresses)
    .set(body)
    .where(and(eq(clientAddresses.id, id), eq(clientAddresses.userId, sub)))
    .returning()

  if (!updated) return c.json({ error: 'Dirección no encontrada' }, 404)
  return c.json({ data: updated })
})

// DELETE /addresses/:id — eliminar dirección
addressesRouter.delete('/:id', authMiddleware, async (c) => {
  const { sub } = c.get('user')
  const id = c.req.param('id')

  const deleted = await db
    .delete(clientAddresses)
    .where(and(eq(clientAddresses.id, id), eq(clientAddresses.userId, sub)))
    .returning({ id: clientAddresses.id })

  if (!deleted.length) return c.json({ error: 'Dirección no encontrada' }, 404)
  return c.json({ data: { deleted: true } })
})
