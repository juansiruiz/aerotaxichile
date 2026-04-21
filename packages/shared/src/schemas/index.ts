import { z } from 'zod'

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
})

export const registerClientSchema = z.object({
  name: z.string().min(2, 'Nombre muy corto').max(100),
  email: z.string().email('Email inválido'),
  phone: z.string().regex(/^\+?56[0-9]{9}$/, 'Teléfono chileno inválido (+56XXXXXXXXX)'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
})

// ─── Bookings ────────────────────────────────────────────────────────────────

export const createBookingSchema = z.object({
  direction: z.enum(['to_airport', 'from_airport', 'to_destination']).default('to_destination'),
  origin: z.string().min(5, 'Dirección de origen requerida'),
  destination: z.string().min(5, 'Dirección de destino requerida'),
  zoneId: z.string().optional(),
  communeRouteId: z.string().optional(),
  scheduledAt: z.coerce.date().refine((d) => d > new Date(), 'La fecha debe ser futura'),
  passengerCount: z.number().int().min(1).max(10),
  vehicleType: z.enum(['sedan', 'suv', 'minivan', 'van']),
  paymentMethod: z.enum(['online', 'cash']),
}).refine(
  (d) => d.zoneId || d.communeRouteId,
  { message: 'Debe especificar zona o ruta comunal', path: ['zoneId'] }
)

export const assignDriverSchema = z.object({
  bookingId: z.string().uuid(),
  driverId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  adminNotes: z.string().max(500).optional(),
})

export const updateBookingStatusSchema = z.object({
  bookingId: z.string().uuid(),
  status: z.enum(['confirmed', 'rejected', 'en_route', 'completed', 'cancelled']),
  driverNotes: z.string().max(500).optional(),
})

// ─── Drivers ─────────────────────────────────────────────────────────────────

export const createDriverSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().regex(/^\+?56[0-9]{9}$/),
  password: z.string().min(8),
  licenseNumber: z.string().min(5).max(20),
})

export const updateDriverAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
})

// ─── Vehicles ────────────────────────────────────────────────────────────────

export const createVehicleSchema = z.object({
  plate: z.string().min(6).max(8).toUpperCase(),
  brand: z.string().min(2).max(50),
  model: z.string().min(2).max(50),
  year: z.number().int().min(2000).max(new Date().getFullYear() + 1),
  type: z.enum(['sedan', 'suv', 'minivan', 'van']),
  capacity: z.number().int().min(1).max(12),
  driverId: z.string().uuid().nullable().optional(),
})

// ─── Zones ────────────────────────────────────────────────────────────────────

const priceField = z.number().int().min(1000, 'Mínimo $1.000 CLP')

export const updateZonePricesSchema = z.object({
  priceSedan:   priceField.optional(),
  priceSuv:     priceField.optional(),
  priceMinivan: priceField.optional(),
  priceVan:     priceField.optional(),
}).refine(
  (v) => Object.values(v).some((x) => x !== undefined),
  'Debe enviarse al menos un precio',
)

// ─── Pagination ──────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(20),
})

// ─── Inferred types ──────────────────────────────────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterClientInput = z.infer<typeof registerClientSchema>
export type CreateBookingInput = z.infer<typeof createBookingSchema>
export type AssignDriverInput = z.infer<typeof assignDriverSchema>
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>
export type CreateDriverInput = z.infer<typeof createDriverSchema>
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>
export type UpdateZonePricesInput = z.infer<typeof updateZonePricesSchema>
