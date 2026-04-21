import { Hono } from 'hono'
import type { AppEnv } from '../lib/context.js'
import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { db, users } from '@aerotaxi/db'
import { loginSchema, registerClientSchema } from '@aerotaxi/shared'
import { hashPassword, comparePassword, signToken } from '../lib/auth.js'

export const authRouter = new Hono<AppEnv>()

// POST /auth/register
authRouter.post('/register', zValidator('json', registerClientSchema), async (c) => {
  const body = c.req.valid('json')

  const existing = await db.select().from(users).where(eq(users.email, body.email)).limit(1)
  if (existing.length > 0) {
    return c.json({ error: 'Email ya registrado' }, 409)
  }

  const passwordHash = await hashPassword(body.password)
  const [user] = await db
    .insert(users)
    .values({ name: body.name, email: body.email, phone: body.phone, passwordHash, role: 'client' })
    .returning({ id: users.id, name: users.name, email: users.email, role: users.role })

  const token = signToken({ sub: user!.id, role: user!.role, email: user!.email })
  return c.json({ data: { user, token } }, 201)
})

// POST /auth/check-email — devuelve si el email existe y el primer nombre
authRouter.post('/check-email', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const email = typeof body?.email === 'string' ? body.email.toLowerCase().trim() : null

  if (!email) return c.json({ error: 'Email requerido' }, 400)

  const [user] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  return c.json({
    data: {
      exists: !!user,
      firstName: user ? (user.name.split(' ')[0] ?? null) : null,
    },
  })
})

// POST /auth/login
authRouter.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json')

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (!user || !(await comparePassword(password, user.passwordHash))) {
    return c.json({ error: 'Credenciales inválidas' }, 401)
  }

  if (!user.isActive) {
    return c.json({ error: 'Cuenta desactivada' }, 403)
  }

  const token = signToken({ sub: user.id, role: user.role, email: user.email })
  return c.json({
    data: {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    },
  })
})
