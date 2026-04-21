// ─── Roles ───────────────────────────────────────────────────────────────────

export type UserRole = 'client' | 'driver' | 'admin'

// ─── Users ───────────────────────────────────────────────────────────────────

export interface User {
  id: string
  name: string
  email: string
  phone: string
  role: UserRole
  createdAt: Date
}

export interface Driver extends User {
  role: 'driver'
  licenseNumber: string
  isAvailable: boolean
  vehicleId: string | null
}

// ─── Vehicles ────────────────────────────────────────────────────────────────

export type VehicleType = 'sedan' | 'suv' | 'minivan' | 'van'

export interface Vehicle {
  id: string
  plate: string
  brand: string
  model: string
  year: number
  type: VehicleType
  capacity: number
  driverId: string | null
}

// ─── Zones & Pricing ─────────────────────────────────────────────────────────

export type ZoneName =
  | 'sur'
  | 'central'
  | 'nororiente'
  | 'norte'
  | 'rural'
  | 'suroriente'
  | 'poniente'

export interface Zone {
  id: string
  name: ZoneName
  label: string
  // Precios por tipo de vehículo (CLP)
  priceSedan:   number
  priceSuv:     number
  priceMinivan: number
  priceVan:     number
  comunas: string[]
}

// ─── Bookings ────────────────────────────────────────────────────────────────

export type BookingDirection = 'to_airport' | 'from_airport'

export type BookingStatus =
  | 'pending'       // Reserva creada, sin conductor asignado
  | 'assigned'      // Admin asignó conductor
  | 'confirmed'     // Conductor aceptó
  | 'rejected'      // Conductor rechazó (vuelve a pending)
  | 'en_route'      // Conductor en camino
  | 'completed'     // Viaje finalizado
  | 'cancelled'     // Cancelado por cliente o admin
  | 'settled'       // Liquidado financieramente

export type PaymentMethod = 'online' | 'cash'
export type PaymentStatus = 'pending' | 'paid' | 'refunded'

export interface Booking {
  id: string
  clientId: string
  driverId: string | null
  vehicleId: string | null
  zoneId: string

  direction: BookingDirection
  origin: string
  destination: string

  scheduledAt: Date
  passengerCount: number
  vehicleType: VehicleType

  totalPrice: number // CLP
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus

  status: BookingStatus
  adminNotes: string | null
  driverNotes: string | null

  createdAt: Date
  updatedAt: Date
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  error: string
  details?: unknown
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}
