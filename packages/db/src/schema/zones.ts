import { pgTable, text, integer, pgEnum } from 'drizzle-orm/pg-core'
import { createId } from '../utils.js'

export const zoneNameEnum = pgEnum('zone_name', [
  'sur',
  'central',
  'nororiente',
  'norte',
  'rural',
  'suroriente',
  'poniente',
])

export const zones = pgTable('zones', {
  id: text('id').primaryKey().$defaultFn(createId),
  name: zoneNameEnum('name').notNull().unique(),
  label: text('label').notNull(),
  // Precios por tipo de vehículo (CLP, sin decimales)
  priceSedan:   integer('price_sedan').notNull().default(0),
  priceSuv:     integer('price_suv').notNull().default(0),
  priceMinivan: integer('price_minivan').notNull().default(0),
  priceVan:     integer('price_van').notNull().default(0),
  comunas: text('comunas').array().notNull().default([]),
})
