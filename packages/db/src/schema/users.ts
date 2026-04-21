import { pgTable, text, timestamp, pgEnum, boolean, integer } from 'drizzle-orm/pg-core'
import { createId } from '../utils.js'

export const userRoleEnum = pgEnum('user_role', ['client', 'driver', 'admin'])

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(createId),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('client'),
  isActive: boolean('is_active').notNull().default(true),
  photoUrl: text('photo_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const drivers = pgTable('drivers', {
  id: text('id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  licenseNumber: text('license_number').notNull().unique(),
  isAvailable: boolean('is_available').notNull().default(false),
  vehicleId: text('vehicle_id'), // FK added after vehicles table
  notes: text('notes'),                                          // Observaciones del admin
  commissionRate: integer('commission_rate').notNull().default(20), // % comisión (0-100)
})
