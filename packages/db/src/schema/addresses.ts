import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users.js'
import { zones } from './zones.js'
import { createId } from '../utils.js'

export const clientAddresses = pgTable('client_addresses', {
  id: text('id').primaryKey().$defaultFn(createId),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),          // "Casa", "Trabajo", "Otro"
  address: text('address').notNull(),       // Dirección completa
  comunaDetected: text('comuna_detected'),  // Comuna auto-detectada
  zoneId: text('zone_id').references(() => zones.id, { onDelete: 'set null' }),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
