import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@aerotaxi/db'
import { users } from '@aerotaxi/db/schema'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { hashPassword } from '../lib/auth.js'
import type { AppEnv } from '../lib/context.js'

export const usersRouter = new Hono<AppEnv>()

usersRouter.use('*', authMiddleware)
usersRouter.use('*', requireRole('admin'))

// ─── GET /users?role=admin ────────────────────────────────────────────────────

usersRouter.get('/', async (c) => {
  const role = c.req.query('role') as 'admin' | 'client' | 'driver' | undefined

  const rows = await db
    .select({
      id:        users.id,
      name:      users.name,
      email:     users.email,
      phone:     users.phone,
      role:      users.role,
      isActive:  users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(role ? eq(users.role, role) : undefined)
    .orderBy(users.createdAt)

  return c.json({ data: rows })
})

// ─── POST /users — crear admin ────────────────────────────────────────────────

const createSchema = z.object({
  name:     z.string().min(2).max(100),
  email:    z.string().email(),
  phone:    z.string().min(8).max(20),
  password: z.string().min(6).max(100),
})

usersRouter.post('/', zValidator('json', createSchema), async (c) => {
  const body = c.req.valid('json')

  const [dup] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, body.email))
    .limit(1)

  if (dup) return c.json({ error: 'Email ya registrado' }, 409)

  const passwordHash = await hashPassword(body.password)

  const [user] = await db
    .insert(users)
    .values({ name: body.name, email: body.email, phone: body.phone, passwordHash, role: 'admin' })
    .returning({
      id: users.id, name: users.name, email: users.email,
      phone: users.phone, role: users.role, isActive: users.isActive, createdAt: users.createdAt,
    })

  return c.json({ data: user }, 201)
})

// ─── PATCH /users/:id ─────────────────────────────────────────────────────────

const updateSchema = z.object({
  name:     z.string().min(2).max(100).optional(),
  email:    z.string().email().optional(),
  phone:    z.string().min(8).max(20).optional(),
  password: z.string().min(6).max(100).optional(),
  isActive: z.boolean().optional(),
})

usersRouter.patch('/:id', zValidator('json', updateSchema), async (c) => {
  const id   = c.req.param('id')
  const body = c.req.valid('json')
  const me   = c.get('user')

  if (id === me.sub && body.isActive === false) {
    return c.json({ error: 'No puedes desactivarte a ti mismo' }, 400)
  }

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1)
  if (!existing) return c.json({ error: 'Usuario no encontrado' }, 404)

  const patch: Record<string, unknown> = { updatedAt: new Date() }
  if (body.name     !== undefined) patch['name']         = body.name
  if (body.email    !== undefined) patch['email']        = body.email
  if (body.phone    !== undefined) patch['phone']        = body.phone
  if (body.isActive !== undefined) patch['isActive']     = body.isActive
  if (body.password)               patch['passwordHash'] = await hashPassword(body.password)

  const [updated] = await db
    .update(users)
    .set(patch)
    .where(eq(users.id, id))
    .returning({
      id: users.id, name: users.name, email: users.email,
      phone: users.phone, role: users.role, isActive: users.isActive, createdAt: users.createdAt,
    })

  return c.json({ data: updated })
})
