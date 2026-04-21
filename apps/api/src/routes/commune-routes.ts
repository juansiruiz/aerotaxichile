import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq, and, asc } from 'drizzle-orm'
import { z } from 'zod'
import { db, communeRoutes } from '@aerotaxi/db'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import type { AppEnv } from '../lib/context.js'

export const communeRoutesRouter = new Hono<AppEnv>()

const routeSchema = z.object({
  fromCommune:  z.string().min(2).max(100),
  toCommune:    z.string().min(2).max(100),
  priceSedan:   z.number().int().min(0),
  priceSuv:     z.number().int().min(0),
  priceMinivan: z.number().int().min(0),
  priceVan:     z.number().int().min(0),
})

// GET /commune-routes — público (para formulario de reserva)
// Devuelve solo las activas
communeRoutesRouter.get('/', async (c) => {
  const rows = await db
    .select()
    .from(communeRoutes)
    .where(eq(communeRoutes.isActive, true))
    .orderBy(asc(communeRoutes.fromCommune), asc(communeRoutes.toCommune))

  return c.json({ data: rows })
})

// GET /commune-routes/all — admin ve todas (incluyendo inactivas)
communeRoutesRouter.get(
  '/all',
  authMiddleware,
  requireRole('admin'),
  async (c) => {
    const rows = await db
      .select()
      .from(communeRoutes)
      .orderBy(asc(communeRoutes.fromCommune), asc(communeRoutes.toCommune))
    return c.json({ data: rows })
  },
)

// POST /commune-routes — admin crea ruta
communeRoutesRouter.post(
  '/',
  authMiddleware,
  requireRole('admin'),
  zValidator('json', routeSchema),
  async (c) => {
    const body = c.req.valid('json')

    // Verificar que no exista ya (misma from → to)
    const [existing] = await db
      .select({ id: communeRoutes.id })
      .from(communeRoutes)
      .where(
        and(
          eq(communeRoutes.fromCommune, body.fromCommune),
          eq(communeRoutes.toCommune,   body.toCommune),
        ),
      )
      .limit(1)

    if (existing) {
      return c.json({ error: 'Ya existe una ruta entre estas comunas' }, 409)
    }

    const [created] = await db.insert(communeRoutes).values(body).returning()
    return c.json({ data: created }, 201)
  },
)

// PATCH /commune-routes/:id — admin actualiza precios
communeRoutesRouter.patch(
  '/:id',
  authMiddleware,
  requireRole('admin'),
  zValidator('json', routeSchema.partial()),
  async (c) => {
    const id   = c.req.param('id')
    const body = c.req.valid('json')

    const [updated] = await db
      .update(communeRoutes)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(communeRoutes.id, id))
      .returning()

    if (!updated) return c.json({ error: 'Ruta no encontrada' }, 404)
    return c.json({ data: updated })
  },
)

// DELETE /commune-routes/:id — admin desactiva ruta (soft delete)
communeRoutesRouter.delete(
  '/:id',
  authMiddleware,
  requireRole('admin'),
  async (c) => {
    const id = c.req.param('id')
    const [updated] = await db
      .update(communeRoutes)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(communeRoutes.id, id))
      .returning()

    if (!updated) return c.json({ error: 'Ruta no encontrada' }, 404)
    return c.json({ data: { id } })
  },
)
