import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, users } from '@aerotaxi/db'
import { authMiddleware } from '../middleware/auth.js'
import type { AppEnv } from '../lib/context.js'

export const profileRouter = new Hono<AppEnv>()

// GET /profile — datos del usuario autenticado
profileRouter.get('/', authMiddleware, async (c) => {
  const { sub } = c.get('user')
  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, phone: users.phone, role: users.role })
    .from(users)
    .where(eq(users.id, sub))
    .limit(1)

  if (!user) return c.json({ error: 'Usuario no encontrado' }, 404)
  return c.json({ data: user })
})

// PUT /profile — actualizar datos del perfil
profileRouter.put(
  '/',
  authMiddleware,
  zValidator(
    'json',
    z.object({
      name:  z.string().min(2).max(100).optional(),
      phone: z.string().regex(/^\+?56[0-9]{9}$/, 'Teléfono chileno inválido (+56XXXXXXXXX)').optional(),
      email: z.string().email().optional(),
    }),
  ),
  async (c) => {
    const { sub } = c.get('user')
    const body = c.req.valid('json')

    if (Object.keys(body).length === 0) return c.json({ error: 'Nada que actualizar' }, 400)

    const [updated] = await db
      .update(users)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(users.id, sub))
      .returning({ id: users.id, name: users.name, email: users.email, phone: users.phone, role: users.role })

    return c.json({ data: updated })
  },
)
