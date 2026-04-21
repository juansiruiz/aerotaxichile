import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq, desc, and, gte, lte } from 'drizzle-orm'
import { z } from 'zod'
import { db, users, drivers, vehicles, bookings, zones } from '@aerotaxi/db'
import { updateDriverAvailabilitySchema } from '@aerotaxi/shared'
import { hashPassword } from '../lib/auth.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import type { AppEnv } from '../lib/context.js'

export const driversRouter = new Hono<AppEnv>()

driversRouter.use('*', authMiddleware)

// ─── GET /drivers — lista de conductores (admin) ──────────────────────────────

driversRouter.get('/', requireRole('admin'), async (c) => {
  const results = await db
    .select({
      id:              users.id,
      name:            users.name,
      email:           users.email,
      phone:           users.phone,
      photoUrl:        users.photoUrl,
      isActive:        users.isActive,
      createdAt:       users.createdAt,
      licenseNumber:   drivers.licenseNumber,
      isAvailable:     drivers.isAvailable,
      vehicleId:       drivers.vehicleId,
      notes:           drivers.notes,
      commissionRate:  drivers.commissionRate,
      vehiclePlate:    vehicles.plate,
      vehicleBrand:    vehicles.brand,
      vehicleModel:    vehicles.model,
      vehicleYear:     vehicles.year,
      vehicleType:     vehicles.type,
      vehicleCapacity: vehicles.capacity,
    })
    .from(users)
    .innerJoin(drivers, eq(users.id, drivers.id))
    .leftJoin(vehicles, eq(drivers.vehicleId, vehicles.id))
    .where(eq(users.isActive, true))

  return c.json({ data: results })
})

// ─── GET /drivers/me — conductor ve su propio perfil + vehículo ──────────────
// Must be defined BEFORE /:id to avoid Hono matching "me" as the id param.

driversRouter.get('/me', requireRole('driver'), async (c) => {
  const user = c.get('user')
  const id = user.sub

  const [row] = await db
    .select({
      id:              users.id,
      name:            users.name,
      email:           users.email,
      phone:           users.phone,
      photoUrl:        users.photoUrl,
      isActive:        users.isActive,
      licenseNumber:   drivers.licenseNumber,
      isAvailable:     drivers.isAvailable,
      vehicleId:       drivers.vehicleId,
      commissionRate:  drivers.commissionRate,
      vehiclePlate:    vehicles.plate,
      vehicleBrand:    vehicles.brand,
      vehicleModel:    vehicles.model,
      vehicleYear:     vehicles.year,
      vehicleType:     vehicles.type,
      vehicleCapacity: vehicles.capacity,
    })
    .from(users)
    .innerJoin(drivers, eq(users.id, drivers.id))
    .leftJoin(vehicles, eq(drivers.vehicleId, vehicles.id))
    .where(eq(users.id, id))
    .limit(1)

  if (!row) return c.json({ error: 'Conductor no encontrado' }, 404)
  return c.json({ data: row })
})

// ─── GET /drivers/:id — detalle completo + historial + stats ─────────────────

driversRouter.get('/:id', requireRole('admin'), async (c) => {
  const id = c.req.param('id')
  const from = c.req.query('from')  // ISO date string
  const to   = c.req.query('to')    // ISO date string

  const [driver] = await db
    .select({
      id:              users.id,
      name:            users.name,
      email:           users.email,
      phone:           users.phone,
      photoUrl:        users.photoUrl,
      isActive:        users.isActive,
      createdAt:       users.createdAt,
      licenseNumber:   drivers.licenseNumber,
      isAvailable:     drivers.isAvailable,
      vehicleId:       drivers.vehicleId,
      notes:           drivers.notes,
      commissionRate:  drivers.commissionRate,
      vehiclePlate:    vehicles.plate,
      vehicleBrand:    vehicles.brand,
      vehicleModel:    vehicles.model,
      vehicleYear:     vehicles.year,
      vehicleType:     vehicles.type,
      vehicleCapacity: vehicles.capacity,
    })
    .from(users)
    .innerJoin(drivers, eq(users.id, drivers.id))
    .leftJoin(vehicles, eq(drivers.vehicleId, vehicles.id))
    .where(eq(users.id, id))
    .limit(1)

  if (!driver) return c.json({ error: 'Conductor no encontrado' }, 404)

  // Build date filters
  const dateFilters = [eq(bookings.driverId, id)] as ReturnType<typeof eq>[]
  if (from) dateFilters.push(gte(bookings.scheduledAt, new Date(from)))
  if (to) {
    const toDate = new Date(to)
    toDate.setHours(23, 59, 59, 999)
    dateFilters.push(lte(bookings.scheduledAt, toDate))
  }

  const history = await db
    .select({
      id:             bookings.id,
      direction:      bookings.direction,
      origin:         bookings.origin,
      destination:    bookings.destination,
      scheduledAt:    bookings.scheduledAt,
      vehicleType:    bookings.vehicleType,
      totalPrice:     bookings.totalPrice,
      status:         bookings.status,
      collectedBy:    bookings.collectedBy,
      paymentMethod:  bookings.paymentMethod,
      passengerCount: bookings.passengerCount,
      zoneLabel:      zones.label,
    })
    .from(bookings)
    .leftJoin(zones, eq(bookings.zoneId, zones.id))
    .where(and(...dateFilters))
    .orderBy(desc(bookings.scheduledAt))
    .limit(200)

  const completed = history.filter((b) => ['completed', 'settled'].includes(b.status))
  const totalEarned      = completed.reduce((s, b) => s + b.totalPrice, 0)
  const totalCommission  = Math.round(completed.reduce((s, b) => s + b.totalPrice * (driver.commissionRate / 100), 0))
  const totalDriverNet   = totalEarned - totalCommission

  // Cobros: quién cobró qué
  const collectedByDriver = completed
    .filter((b) => b.collectedBy === 'driver')
    .reduce((s, b) => s + b.totalPrice, 0)
  const collectedByAdmin  = completed
    .filter((b) => b.collectedBy === 'admin')
    .reduce((s, b) => s + b.totalPrice, 0)
  const pendingCollection = completed
    .filter((b) => !b.collectedBy)
    .reduce((s, b) => s + b.totalPrice, 0)

  // Balance: driver owes app (commission on trips driver collected)
  const driverOwesApp = completed
    .filter((b) => b.collectedBy === 'driver')
    .reduce((s, b) => s + Math.round(b.totalPrice * (driver.commissionRate / 100)), 0)
  // App owes driver (net on trips admin collected)
  const appOwesDriver = completed
    .filter((b) => b.collectedBy === 'admin')
    .reduce((s, b) => s + Math.round(b.totalPrice * (1 - driver.commissionRate / 100)), 0)

  return c.json({
    data: {
      ...driver,
      history,
      stats: {
        totalTrips:         history.length,
        completedTrips:     completed.length,
        totalEarned,
        totalCommission,
        totalDriverNet,
        collectedByDriver,
        collectedByAdmin,
        pendingCollection,
        driverOwesApp,
        appOwesDriver,
      },
    },
  })
})

// ─── POST /drivers — crear conductor ─────────────────────────────────────────

const createDriverSchema = z.object({
  name:          z.string().min(2).max(100),
  email:         z.string().email(),
  phone:         z.string().min(8),
  password:      z.string().min(8),
  licenseNumber: z.string().min(5).max(20),
  photoUrl:      z.string().url().optional(),
  vehicle: z.object({
    plate:    z.string().min(4).max(8),
    brand:    z.string().min(2).max(50),
    model:    z.string().min(2).max(50),
    year:     z.number().int().min(2000).max(new Date().getFullYear() + 1),
    type:     z.enum(['sedan', 'suv', 'minivan', 'van']),
    capacity: z.number().int().min(1).max(12),
  }).optional(),
})

driversRouter.post(
  '/',
  requireRole('admin'),
  zValidator('json', createDriverSchema),
  async (c) => {
    const body = c.req.valid('json')
    const passwordHash = await hashPassword(body.password)

    const [user] = await db
      .insert(users)
      .values({
        name: body.name,
        email: body.email,
        phone: body.phone,
        passwordHash,
        role: 'driver',
        photoUrl: body.photoUrl ?? null,
      })
      .returning()

    const [driver] = await db
      .insert(drivers)
      .values({ id: user!.id, licenseNumber: body.licenseNumber.toUpperCase() })
      .returning()

    let vehicle = null
    if (body.vehicle) {
      const [v] = await db
        .insert(vehicles)
        .values({ ...body.vehicle, plate: body.vehicle.plate.toUpperCase(), driverId: user!.id })
        .returning()
      vehicle = v
      await db.update(drivers).set({ vehicleId: v!.id }).where(eq(drivers.id, user!.id))
    }

    return c.json({ data: { id: user!.id, name: user!.name, email: user!.email, vehicle } }, 201)
  },
)

// ─── PATCH /drivers/:id — edición completa del conductor (admin) ─────────────

const updateDriverFullSchema = z.object({
  name:           z.string().min(2).max(100).optional(),
  email:          z.string().email().optional(),
  phone:          z.string().min(8).optional(),
  photoUrl:       z.string().url().nullable().optional(),
  licenseNumber:  z.string().min(5).max(20).optional(),
  isAvailable:    z.boolean().optional(),
  notes:          z.string().max(1000).nullable().optional(),
  commissionRate: z.number().int().min(0).max(100).optional(),
})

driversRouter.patch(
  '/:id',
  requireRole('admin'),
  zValidator('json', updateDriverFullSchema),
  async (c) => {
    const id   = c.req.param('id')
    const body = c.req.valid('json')

    const [existing] = await db.select({ id: drivers.id }).from(drivers).where(eq(drivers.id, id)).limit(1)
    if (!existing) return c.json({ error: 'Conductor no encontrado' }, 404)

    // Update users table
    const userFields: Record<string, unknown> = {}
    if (body.name       !== undefined) userFields.name     = body.name
    if (body.email      !== undefined) userFields.email    = body.email
    if (body.phone      !== undefined) userFields.phone    = body.phone
    if (body.photoUrl   !== undefined) userFields.photoUrl = body.photoUrl
    if (Object.keys(userFields).length > 0) {
      userFields.updatedAt = new Date()
      await db.update(users).set(userFields).where(eq(users.id, id))
    }

    // Update drivers table
    const driverFields: Record<string, unknown> = {}
    if (body.licenseNumber  !== undefined) driverFields.licenseNumber  = body.licenseNumber.toUpperCase()
    if (body.isAvailable    !== undefined) driverFields.isAvailable    = body.isAvailable
    if (body.notes          !== undefined) driverFields.notes          = body.notes
    if (body.commissionRate !== undefined) driverFields.commissionRate = body.commissionRate
    if (Object.keys(driverFields).length > 0) {
      await db.update(drivers).set(driverFields).where(eq(drivers.id, id))
    }

    return c.json({ data: { id } })
  },
)

// ─── PATCH /drivers/:id/vehicle — crear o actualizar vehículo ────────────────

const vehicleSchema = z.object({
  plate:    z.string().min(4).max(8),
  brand:    z.string().min(2).max(50),
  model:    z.string().min(2).max(50),
  year:     z.number().int().min(2000).max(new Date().getFullYear() + 1),
  type:     z.enum(['sedan', 'suv', 'minivan', 'van']),
  capacity: z.number().int().min(1).max(12),
})

driversRouter.patch(
  '/:id/vehicle',
  requireRole('admin'),
  zValidator('json', vehicleSchema),
  async (c) => {
    const id   = c.req.param('id')
    const body = c.req.valid('json')
    const plate = body.plate.toUpperCase()

    const [driver] = await db
      .select({ id: drivers.id, vehicleId: drivers.vehicleId })
      .from(drivers)
      .where(eq(drivers.id, id))
      .limit(1)
    if (!driver) return c.json({ error: 'Conductor no encontrado' }, 404)

    let vehicle
    if (driver.vehicleId) {
      // Update existing
      const [v] = await db
        .update(vehicles)
        .set({ ...body, plate })
        .where(eq(vehicles.id, driver.vehicleId))
        .returning()
      vehicle = v
    } else {
      // Create new
      const [v] = await db
        .insert(vehicles)
        .values({ ...body, plate, driverId: id })
        .returning()
      vehicle = v
      await db.update(drivers).set({ vehicleId: v!.id }).where(eq(drivers.id, id))
    }

    return c.json({ data: vehicle })
  },
)

// ─── PATCH /drivers/:id/availability ─────────────────────────────────────────

driversRouter.patch(
  '/:id/availability',
  requireRole('driver', 'admin'),
  zValidator('json', updateDriverAvailabilitySchema),
  async (c) => {
    const id = c.req.param('id')
    const { isAvailable } = c.req.valid('json')
    const user = c.get('user')

    if (user.role === 'driver' && user.sub !== id) {
      return c.json({ error: 'Sin acceso' }, 403)
    }

    await db.update(drivers).set({ isAvailable }).where(eq(drivers.id, id))
    return c.json({ data: { id, isAvailable } })
  },
)

// ─── PATCH /drivers/:id/notes ─────────────────────────────────────────────────

driversRouter.patch(
  '/:id/notes',
  requireRole('admin'),
  zValidator('json', z.object({ notes: z.string().max(1000) })),
  async (c) => {
    const id = c.req.param('id')
    const { notes } = c.req.valid('json')
    const [driver] = await db.select({ id: drivers.id }).from(drivers).where(eq(drivers.id, id)).limit(1)
    if (!driver) return c.json({ error: 'Conductor no encontrado' }, 404)
    await db.update(drivers).set({ notes }).where(eq(drivers.id, id))
    return c.json({ data: { id, notes } })
  },
)

// ─── PATCH /drivers/:id/commission ───────────────────────────────────────────

driversRouter.patch(
  '/:id/commission',
  requireRole('admin'),
  zValidator('json', z.object({ commissionRate: z.number().int().min(0).max(100) })),
  async (c) => {
    const id = c.req.param('id')
    const { commissionRate } = c.req.valid('json')
    const [driver] = await db.select({ id: drivers.id }).from(drivers).where(eq(drivers.id, id)).limit(1)
    if (!driver) return c.json({ error: 'Conductor no encontrado' }, 404)
    await db.update(drivers).set({ commissionRate }).where(eq(drivers.id, id))
    return c.json({ data: { id, commissionRate } })
  },
)

// ─── PATCH /drivers/:id/password — admin resetea contraseña ──────────────────

driversRouter.patch(
  '/:id/password',
  requireRole('admin'),
  zValidator('json', z.object({ password: z.string().min(8) })),
  async (c) => {
    const id = c.req.param('id')
    const { password } = c.req.valid('json')

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, id))
      .limit(1)
    if (!existing) return c.json({ error: 'Conductor no encontrado' }, 404)

    const passwordHash = await hashPassword(password)
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, id))

    return c.json({ data: { id } })
  },
)
