import { Hono } from 'hono'
import { eq, desc, count, max } from 'drizzle-orm'
import { db, users, bookings } from '@aerotaxi/db'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import type { AppEnv } from '../lib/context.js'

export const clientsRouter = new Hono<AppEnv>()

clientsRouter.use('*', authMiddleware, requireRole('admin'))

// GET /clients — lista de clientes con estadísticas
clientsRouter.get('/', async (c) => {
  const results = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      createdAt: users.createdAt,
      totalBookings: count(bookings.id),
      lastBookingAt: max(bookings.createdAt),
    })
    .from(users)
    .leftJoin(bookings, eq(users.id, bookings.clientId))
    .where(eq(users.role, 'client'))
    .groupBy(users.id)
    .orderBy(desc(users.createdAt))

  return c.json({ data: results })
})

// GET /clients/:id/bookings — historial de reservas de un cliente
clientsRouter.get('/:id/bookings', async (c) => {
  const clientId = c.req.param('id')

  const [client] = await db
    .select({ id: users.id, name: users.name, email: users.email, phone: users.phone, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, clientId))
    .limit(1)

  if (!client) return c.json({ error: 'Cliente no encontrado' }, 404)

  const clientBookings = await db
    .select()
    .from(bookings)
    .where(eq(bookings.clientId, clientId))
    .orderBy(desc(bookings.scheduledAt))

  return c.json({ data: { client, bookings: clientBookings } })
})
