import { pgTable, text, integer, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core'
import { users } from './users.js'
import { vehicles } from './vehicles.js'
import { zones } from './zones.js'
import { vehicleTypeEnum } from './vehicles.js'
import { communeRoutes } from './commune-routes.js'
import { createId } from '../utils.js'

export const collectedByEnum = pgEnum('collected_by', ['driver', 'admin'])

export const bookingStatusEnum = pgEnum('booking_status', [
  'pending',    // Reserva creada, sin conductor asignado
  'assigned',   // Admin asignó conductor
  'confirmed',  // Conductor aceptó
  'rejected',   // Conductor rechazó → vuelve a pending
  'en_route',   // Conductor en camino al cliente
  'completed',  // Viaje finalizado
  'cancelled',  // Cancelado
  'settled',    // Liquidado financieramente
])

export const bookingDirectionEnum = pgEnum('booking_direction', [
  'to_airport',      // Desde domicilio al aeropuerto
  'from_airport',    // Desde aeropuerto al domicilio
  'to_destination',  // Hacia un destino general (terminal, puerto, etc.)
])

export const paymentMethodEnum = pgEnum('payment_method', ['online', 'cash'])

export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'paid', 'refunded'])

export const bookings = pgTable('bookings', {
  id: text('id').primaryKey().$defaultFn(createId),

  clientId: text('client_id').notNull().references(() => users.id),
  driverId: text('driver_id').references(() => users.id, { onDelete: 'set null' }),
  vehicleId: text('vehicle_id').references(() => vehicles.id, { onDelete: 'set null' }),
  zoneId: text('zone_id').references(() => zones.id),
  communeRouteId: text('commune_route_id').references(() => communeRoutes.id),

  direction: bookingDirectionEnum('direction').notNull(),
  origin: text('origin').notNull(),
  destination: text('destination').notNull(),

  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  passengerCount: integer('passenger_count').notNull().default(1),
  vehicleType: vehicleTypeEnum('vehicle_type').notNull(),

  totalPrice: integer('total_price').notNull(), // CLP
  paymentMethod: paymentMethodEnum('payment_method').notNull(),
  paymentStatus: paymentStatusEnum('payment_status').notNull().default('pending'),
  ventiPayOrderId: text('ventipay_order_id'),

  status: bookingStatusEnum('status').notNull().default('pending'),
  collectedBy: collectedByEnum('collected_by'), // quién cobró al pasajero (null = pendiente)
  adminConfirmed: boolean('admin_confirmed').notNull().default(false),
  adminNotes: text('admin_notes'),
  driverNotes: text('driver_notes'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// Historial de cambios de estado (auditoría)
export const bookingStatusHistory = pgTable('booking_status_history', {
  id: text('id').primaryKey().$defaultFn(createId),
  bookingId: text('booking_id').notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  fromStatus: bookingStatusEnum('from_status'),
  toStatus: bookingStatusEnum('to_status').notNull(),
  changedById: text('changed_by_id').references(() => users.id, { onDelete: 'set null' }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
