/**
 * Migración manual: reemplaza base_price con 4 columnas de precios por tipo de vehículo
 * Ejecutar: pnpm --filter @aerotaxi/db db:migrate-prices
 */
import { sql } from 'drizzle-orm'
import { db } from './client.js'

async function migrate() {
  console.log('🔄 Migrando columnas de precios en tabla zones...')

  // 1. Agregar nuevas columnas
  await db.execute(sql`
    ALTER TABLE zones
      ADD COLUMN IF NOT EXISTS price_sedan   integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS price_suv     integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS price_minivan integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS price_van     integer NOT NULL DEFAULT 0
  `)
  console.log('   ✅ Columnas price_sedan/suv/minivan/van agregadas')

  // 2. Actualizar precios por zona
  const updates = [
    { name: 'central',    priceSedan: 18000, priceSuv: 24000, priceMinivan: 30000, priceVan: 42000 },
    { name: 'sur',        priceSedan: 22000, priceSuv: 28000, priceMinivan: 35000, priceVan: 48000 },
    { name: 'norte',      priceSedan: 25000, priceSuv: 32000, priceMinivan: 40000, priceVan: 55000 },
    { name: 'nororiente', priceSedan: 28000, priceSuv: 36000, priceMinivan: 45000, priceVan: 60000 },
    { name: 'suroriente', priceSedan: 26000, priceSuv: 33000, priceMinivan: 42000, priceVan: 56000 },
    { name: 'poniente',   priceSedan: 20000, priceSuv: 26000, priceMinivan: 32000, priceVan: 45000 },
    { name: 'rural',      priceSedan: 35000, priceSuv: 45000, priceMinivan: 55000, priceVan: 72000 },
  ]

  for (const z of updates) {
    await db.execute(sql`
      UPDATE zones SET
        price_sedan   = ${z.priceSedan},
        price_suv     = ${z.priceSuv},
        price_minivan = ${z.priceMinivan},
        price_van     = ${z.priceVan}
      WHERE name = ${z.name}
    `)
    console.log(`   ✅ ${z.name}: sedan=$${z.priceSedan.toLocaleString('es-CL')} suv=$${z.priceSuv.toLocaleString('es-CL')} minivan=$${z.priceMinivan.toLocaleString('es-CL')} van=$${z.priceVan.toLocaleString('es-CL')}`)
  }

  // 3. Eliminar la columna antigua base_price (si existe)
  await db.execute(sql`
    ALTER TABLE zones DROP COLUMN IF EXISTS base_price
  `)
  console.log('   ✅ Columna base_price eliminada')

  console.log('\n✅  Migración completada\n')
  process.exit(0)
}

migrate().catch((err) => {
  console.error('❌ Migración falló:', err)
  process.exit(1)
})
