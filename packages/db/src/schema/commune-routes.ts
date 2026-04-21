import { pgTable, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core'
import { createId } from '../utils.js'

// Tarifas punto a punto: una comuna de origen → una comuna de destino
export const communeRoutes = pgTable('commune_routes', {
  id:           text('id').primaryKey().$defaultFn(createId),
  fromCommune:  text('from_commune').notNull(),
  toCommune:    text('to_commune').notNull(),
  priceSedan:   integer('price_sedan').notNull().default(0),
  priceSuv:     integer('price_suv').notNull().default(0),
  priceMinivan: integer('price_minivan').notNull().default(0),
  priceVan:     integer('price_van').notNull().default(0),
  isActive:     boolean('is_active').notNull().default(true),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
