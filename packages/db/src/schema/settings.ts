import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

// Configuración global del sistema (clave-valor)
export const settings = pgTable('settings', {
  key:       text('key').primaryKey(),
  value:     text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
