import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq, desc, and } from 'drizzle-orm'
import { z } from 'zod'
import { db, bookings, bookingStatusHistory, zones, communeRoutes, users } from '@aerotaxi/db'
import {
  createBookingSchema,
  assignDriverSchema,
  updateBookingStatusSchema,
  paginationSchema,
} from '@aerotaxi/shared'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { hashPassword } from '../lib/auth.js'
import type { AppEnv } from '../lib/context.js'
import { sendPushToUser } from './push.js'
import { saveNotification } from './notifications.js'

export const bookingsRouter = new Hono<AppEnv>()

bookingsRouter.use('*', authMiddleware)

// GET /bookings — cliente ve sus reservas, admin ve todas (con datos del cliente)
bookingsRouter.get('/', zValidator('query', paginationSchema), async (c) => {
  const { page, pageSize } = c.req.valid('query')
  const user = c.get('user')
  const offset = (page - 1) * pageSize

  if (user.role === 'client') {
    const results = await db
      .select()
      .from(bookings)
      .where(eq(bookings.clientId, user.sub))
      .orderBy(desc(bookings.scheduledAt))
      .limit(pageSize)
      .offset(offset)
    return c.json({ data: results })
  }

  if (user.role === 'driver') {
    const results = await db
      .select()
      .from(bookings)
      .where(eq(bookings.driverId, user.sub))
      .orderBy(desc(bookings.scheduledAt))
      .limit(pageSize)
      .offset(offset)
    return c.json({ data: results })
  }

  // Admin: LEFT JOIN con users para traer nombre y teléfono del cliente
  const results = await db
    .select({
      id: bookings.id,
      clientId: bookings.clientId,
      clientName: users.name,
      clientPhone: users.phone,
      clientEmail: users.email,
      driverId: bookings.driverId,
      vehicleId: bookings.vehicleId,
      zoneId: bookings.zoneId,
      direction: bookings.direction,
      origin: bookings.origin,
      destination: bookings.destination,
      scheduledAt: bookings.scheduledAt,
      passengerCount: bookings.passengerCount,
      vehicleType: bookings.vehicleType,
      totalPrice: bookings.totalPrice,
      paymentMethod: bookings.paymentMethod,
      paymentStatus: bookings.paymentStatus,
      status: bookings.status,
      adminConfirmed: bookings.adminConfirmed,
      adminNotes: bookings.adminNotes,
      driverNotes: bookings.driverNotes,
      createdAt: bookings.createdAt,
      updatedAt: bookings.updatedAt,
    })
    .from(bookings)
    .leftJoin(users, eq(bookings.clientId, users.id))
    .orderBy(desc(bookings.scheduledAt))
    .limit(pageSize)
    .offset(offset)

  return c.json({ data: results })
})

// GET /bookings/:id
bookingsRouter.get('/:id', async (c) => {
  const id = c.req.param('id')
  const user = c.get('user')

  if (user.role === 'admin') {
    const [result] = await db
      .select({
        id: bookings.id,
        clientId: bookings.clientId,
        clientName: users.name,
        clientPhone: users.phone,
        clientEmail: users.email,
        driverId: bookings.driverId,
        vehicleId: bookings.vehicleId,
        zoneId: bookings.zoneId,
        direction: bookings.direction,
        origin: bookings.origin,
        destination: bookings.destination,
        scheduledAt: bookings.scheduledAt,
        passengerCount: bookings.passengerCount,
        vehicleType: bookings.vehicleType,
        totalPrice: bookings.totalPrice,
        paymentMethod: bookings.paymentMethod,
        paymentStatus: bookings.paymentStatus,
        status: bookings.status,
        adminConfirmed: bookings.adminConfirmed,
        adminNotes: bookings.adminNotes,
        driverNotes: bookings.driverNotes,
        createdAt: bookings.createdAt,
        updatedAt: bookings.updatedAt,
      })
      .from(bookings)
      .leftJoin(users, eq(bookings.clientId, users.id))
      .where(eq(bookings.id, id))
      .limit(1)

    if (!result) return c.json({ error: 'Reserva no encontrada' }, 404)
    return c.json({ data: result })
  }

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1)
  if (!booking) return c.json({ error: 'Reserva no encontrada' }, 404)
  if (user.role === 'client' && booking.clientId !== user.sub) return c.json({ error: 'Sin acceso' }, 403)
  return c.json({ data: booking })
})

// POST /bookings — solo clientes
bookingsRouter.post(
  '/',
  requireRole('client'),
  zValidator('json', createBookingSchema),
  async (c) => {
    const body = c.req.valid('json')
    const user = c.get('user')

    let totalPrice = 0
    if (body.zoneId) {
      const [zone] = await db.select().from(zones).where(eq(zones.id, body.zoneId)).limit(1)
      if (!zone) return c.json({ error: 'Zona no encontrada' }, 404)
      const pm: Record<string, number> = { sedan: zone.priceSedan, suv: zone.priceSuv, minivan: zone.priceMinivan, van: zone.priceVan }
      totalPrice = pm[body.vehicleType] ?? 0
    } else if (body.communeRouteId) {
      const [route] = await db.select().from(communeRoutes)
        .where(and(eq(communeRoutes.id, body.communeRouteId), eq(communeRoutes.isActive, true)))
        .limit(1)
      if (!route) return c.json({ error: 'Ruta comunal no encontrada' }, 404)
      const pm: Record<string, number> = { sedan: route.priceSedan, suv: route.priceSuv, minivan: route.priceMinivan, van: route.priceVan }
      totalPrice = pm[body.vehicleType] ?? 0
    }
    if (totalPrice === 0) return c.json({ error: 'Precio no configurado para esta selección' }, 422)

    const [booking] = await db
      .insert(bookings)
      .values({
        clientId: user.sub,
        zoneId: body.zoneId ?? null,
        communeRouteId: body.communeRouteId ?? null,
        direction: body.direction ?? 'to_destination',
        origin: body.origin,
        destination: body.destination,
        scheduledAt: body.scheduledAt,
        passengerCount: body.passengerCount,
        vehicleType: body.vehicleType,
        totalPrice,
        paymentMethod: body.paymentMethod,
        status: 'pending',
      })
      .returning()

    return c.json({ data: booking }, 201)
  },
)

// ─── POST /bookings/admin — admin crea reserva asistida ──────────────────────

const adminBookingSchema = z.object({
  // Cliente: existente o nuevo
  clientId:   z.string().optional(),
  newClient: z.object({
    name:  z.string().min(2).max(100),
    email: z.string().email(),
    phone: z.string().min(8),
  }).optional(),
  // Reserva
  zoneId:         z.string(),
  direction:      z.enum(['to_airport', 'from_airport']),
  origin:         z.string().min(3),
  destination:    z.string().min(3),
  scheduledAt:    z.coerce.date(),
  passengerCount: z.number().int().min(1).max(12).default(1),
  vehicleType:    z.enum(['sedan', 'suv', 'minivan', 'van']),
  paymentMethod:  z.enum(['online', 'cash']),
  totalPrice:     z.number().int().positive().optional(), // override si se necesita
  adminNotes:     z.string().max(500).optional(),
}).refine((d) => d.clientId || d.newClient, {
  message: 'Se requiere clientId o newClient',
})

bookingsRouter.post(
  '/admin',
  requireRole('admin'),
  zValidator('json', adminBookingSchema),
  async (c) => {
    const body = c.req.valid('json')
    const admin = c.get('user')

    // ── 1. Resolver cliente ─────────────────────────────────────────────────
    let clientId = body.clientId ?? ''

    if (!clientId && body.newClient) {
      const nc = body.newClient
      // Verificar que el email no exista ya
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, nc.email))
        .limit(1)

      if (existing) {
        // Usar el usuario existente si coincide el email
        clientId = existing.id
      } else {
        const tempPassword = Math.random().toString(36).slice(2, 10) + 'Aa1!'
        const passwordHash = await hashPassword(tempPassword)
        const [created] = await db
          .insert(users)
          .values({ name: nc.name, email: nc.email, phone: nc.phone, passwordHash, role: 'client' })
          .returning()
        clientId = created!.id
      }
    }

    // ── 2. Calcular precio ──────────────────────────────────────────────────
    const [zone] = await db.select().from(zones).where(eq(zones.id, body.zoneId)).limit(1)
    if (!zone) return c.json({ error: 'Zona no encontrada' }, 404)

    const priceMap: Record<string, number> = {
      sedan: zone.priceSedan, suv: zone.priceSuv, minivan: zone.priceMinivan, van: zone.priceVan,
    }
    const totalPrice = body.totalPrice ?? priceMap[body.vehicleType] ?? 0

    // ── 3. Crear reserva ────────────────────────────────────────────────────
    const [booking] = await db
      .insert(bookings)
      .values({
        clientId,
        zoneId:         body.zoneId,
        direction:      body.direction,
        origin:         body.origin,
        destination:    body.destination,
        scheduledAt:    body.scheduledAt,
        passengerCount: body.passengerCount,
        vehicleType:    body.vehicleType,
        totalPrice,
        paymentMethod:  body.paymentMethod,
        status:         'pending',
        adminConfirmed: true,
        adminNotes:     body.adminNotes ?? null,
      })
      .returning()

    await db.insert(bookingStatusHistory).values({
      bookingId:   booking!.id,
      fromStatus:  null,
      toStatus:    'pending',
      changedById: admin.sub,
      notes:       'Reserva creada por administrador',
    })

    return c.json({ data: booking }, 201)
  },
)

// PATCH /bookings/:id/confirm — admin confirma reserva (antes de asignar conductor)
bookingsRouter.patch(
  '/:id/confirm',
  requireRole('admin'),
  zValidator('json', z.object({ adminNotes: z.string().max(500).optional() })),
  async (c) => {
    const id = c.req.param('id')
    const { adminNotes } = c.req.valid('json')
    const user = c.get('user')

    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1)
    if (!booking) return c.json({ error: 'Reserva no encontrada' }, 404)

    const [updated] = await db
      .update(bookings)
      .set({
        adminConfirmed: true,
        adminNotes: adminNotes ?? booking.adminNotes,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, id))
      .returning()

    await db.insert(bookingStatusHistory).values({
      bookingId: id,
      fromStatus: booking.status,
      toStatus: booking.status, // no cambia status, solo adminConfirmed
      changedById: user.sub,
      notes: 'Reserva confirmada por administrador',
    })

    return c.json({ data: updated })
  },
)

// PATCH /bookings/:id/price — admin ajusta tarifa (cualquier estado)
bookingsRouter.patch(
  '/:id/price',
  requireRole('admin'),
  zValidator('json', z.object({ totalPrice: z.number().int().positive() })),
  async (c) => {
    const id = c.req.param('id')
    const { totalPrice } = c.req.valid('json')

    const [updated] = await db
      .update(bookings)
      .set({ totalPrice, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning()

    if (!updated) return c.json({ error: 'Reserva no encontrada' }, 404)
    return c.json({ data: updated })
  },
)

// PATCH /bookings/:id/collection — admin marca quién cobró al pasajero
bookingsRouter.patch(
  '/:id/collection',
  requireRole('admin'),
  zValidator('json', z.object({ collectedBy: z.enum(['driver', 'admin']) })),
  async (c) => {
    const id = c.req.param('id')
    const { collectedBy } = c.req.valid('json')

    const [updated] = await db
      .update(bookings)
      .set({ collectedBy, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning()

    if (!updated) return c.json({ error: 'Reserva no encontrada' }, 404)
    return c.json({ data: { id, collectedBy } })
  },
)

// PATCH /bookings/:id/notes — admin guarda observaciones
bookingsRouter.patch(
  '/:id/notes',
  requireRole('admin'),
  zValidator('json', z.object({ adminNotes: z.string().max(500) })),
  async (c) => {
    const id = c.req.param('id')
    const { adminNotes } = c.req.valid('json')

    const [updated] = await db
      .update(bookings)
      .set({ adminNotes, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning()

    if (!updated) return c.json({ error: 'Reserva no encontrada' }, 404)
    return c.json({ data: updated })
  },
)

// PATCH /bookings/:id/edit — cliente modifica reserva pendiente
bookingsRouter.patch(
  '/:id/edit',
  requireRole('client'),
  zValidator(
    'json',
    z.object({
      origin:         z.string().min(5).optional(),
      destination:    z.string().min(5).optional(),
      scheduledAt:    z.coerce.date().optional(),
      passengerCount: z.number().int().min(1).max(12).optional(),
    }),
  ),
  async (c) => {
    const id   = c.req.param('id')
    const user = c.get('user')
    const body = c.req.valid('json')

    const [booking] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, id), eq(bookings.clientId, user.sub)))
      .limit(1)

    if (!booking) return c.json({ error: 'Reserva no encontrada' }, 404)
    if (booking.status !== 'pending') {
      return c.json({ error: 'Solo puedes modificar reservas pendientes' }, 400)
    }
    if (body.scheduledAt && body.scheduledAt <= new Date()) {
      return c.json({ error: 'La fecha debe ser futura' }, 400)
    }

    const [updated] = await db
      .update(bookings)
      .set({
        ...(body.origin         !== undefined && { origin:         body.origin }),
        ...(body.destination    !== undefined && { destination:    body.destination }),
        ...(body.scheduledAt    !== undefined && { scheduledAt:    body.scheduledAt }),
        ...(body.passengerCount !== undefined && { passengerCount: body.passengerCount }),
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, id))
      .returning()

    return c.json({ data: updated })
  },
)

// PATCH /bookings/:id/cancel — cliente o admin cancela una reserva
bookingsRouter.patch(
  '/:id/cancel',
  requireRole('client', 'admin'),
  async (c) => {
    const id   = c.req.param('id')
    const user = c.get('user')

    // Cliente solo puede cancelar sus propias reservas
    const [booking] = await db
      .select()
      .from(bookings)
      .where(
        user.role === 'admin'
          ? eq(bookings.id, id)
          : and(eq(bookings.id, id), eq(bookings.clientId, user.sub))
      )
      .limit(1)

    if (!booking) return c.json({ error: 'Reserva no encontrada' }, 404)

    const cancellable = ['pending', 'assigned', 'confirmed']
    if (!cancellable.includes(booking.status)) {
      return c.json({ error: 'Esta reserva no puede cancelarse' }, 400)
    }

    const cancelledBy = user.role === 'admin' ? 'Cancelado por el administrador' : 'Cancelado por el cliente'

    const [updated] = await db
      .update(bookings)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning()

    await db.insert(bookingStatusHistory).values({
      bookingId:   id,
      fromStatus:  booking.status,
      toStatus:    'cancelled',
      changedById: user.sub,
      notes:       cancelledBy,
    })

    // Notificar al conductor si ya estaba asignado
    if (booking.driverId) {
      const cancelDate = booking.scheduledAt
        ? new Date(booking.scheduledAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
        : ''
      const cancelPayload = {
        title: 'Viaje cancelado',
        body:  `${cancelledBy} — viaje del ${cancelDate}`,
        url:   '/driver',
      }
      sendPushToUser(booking.driverId, cancelPayload).catch(() => {})
      saveNotification(booking.driverId, cancelPayload)
    }

    return c.json({ data: updated })
  },
)

// PATCH /bookings/:id/assign — solo admin
bookingsRouter.patch(
  '/:id/assign',
  requireRole('admin'),
  zValidator('json', assignDriverSchema),
  async (c) => {
    const id = c.req.param('id')
    const body = c.req.valid('json')
    const user = c.get('user')

    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1)
    if (!booking) return c.json({ error: 'Reserva no encontrada' }, 404)
    if (!booking.adminConfirmed) {
      return c.json({ error: 'Debes confirmar la reserva antes de asignar un conductor' }, 400)
    }
    if (!['pending', 'rejected'].includes(booking.status)) {
      return c.json({ error: 'Solo se pueden asignar reservas pendientes o rechazadas' }, 400)
    }

    const [updated] = await db
      .update(bookings)
      .set({
        driverId: body.driverId,
        vehicleId: body.vehicleId,
        adminNotes: body.adminNotes ?? booking.adminNotes,
        status: 'assigned',
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, id))
      .returning()

    await db.insert(bookingStatusHistory).values({
      bookingId: id,
      fromStatus: booking.status,
      toStatus: 'assigned',
      changedById: user.sub,
      notes: body.adminNotes,
    })

    // ── Notificar al conductor via Web Push ─────────────────────────────────
    const scheduledDate = updated!.scheduledAt
    const dateStr = scheduledDate
      ? new Date(scheduledDate).toLocaleDateString('es-CL', {
          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
        })
      : ''
    const originShort = (updated!.origin ?? '').split(',')[0]
    const notifPayload = {
      title: '¡Nuevo viaje asignado!',
      body:  `${dateStr} · ${originShort}`,
      url:   '/driver',
    }
    sendPushToUser(body.driverId, notifPayload).catch(() => { /* non-blocking */ })
    saveNotification(body.driverId, notifPayload)

    return c.json({ data: updated })
  },
)

// PATCH /bookings/:id/status — conductor actualiza estado
bookingsRouter.patch(
  '/:id/status',
  requireRole('driver', 'admin'),
  zValidator('json', updateBookingStatusSchema),
  async (c) => {
    const id = c.req.param('id')
    const body = c.req.valid('json')
    const user = c.get('user')

    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1)
    if (!booking) return c.json({ error: 'Reserva no encontrada' }, 404)

    if (user.role === 'driver' && booking.driverId !== user.sub) {
      return c.json({ error: 'Sin acceso' }, 403)
    }

    const [updated] = await db
      .update(bookings)
      .set({
        status: body.status,
        driverNotes: body.driverNotes ?? booking.driverNotes,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, id))
      .returning()

    await db.insert(bookingStatusHistory).values({
      bookingId: id,
      fromStatus: booking.status,
      toStatus: body.status,
      changedById: user.sub,
      notes: body.driverNotes,
    })

    return c.json({ data: updated })
  },
)
