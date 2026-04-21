import { pgTable, text, integer, pgEnum } from 'drizzle-orm/pg-core'
import { users } from './users.js'
import { createId } from '../utils.js'

export const vehicleTypeEnum = pgEnum('vehicle_type', ['sedan', 'suv', 'minivan', 'van'])

export const vehicles = pgTable('vehicles', {
  id: text('id').primaryKey().$defaultFn(createId),
  plate: text('plate').notNull().unique(),
  brand: text('brand').notNull(),
  model: text('model').notNull(),
  year: integer('year').notNull(),
  type: vehicleTypeEnum('type').notNull(),
  capacity: integer('capacity').notNull(),
  driverId: text('driver_id').references(() => users.id, { onDelete: 'set null' }),
  isActive: text('is_active').notNull().default('true'),
})
