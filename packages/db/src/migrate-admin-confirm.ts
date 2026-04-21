import { sql } from 'drizzle-orm'
import { db } from './client.js'

async function migrate() {
  console.log('🔄 Agregando columna admin_confirmed a bookings...')
  await db.execute(sql`
    ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS admin_confirmed boolean NOT NULL DEFAULT false
  `)
  console.log('✅ Columna admin_confirmed agregada\n')
  process.exit(0)
}

migrate().catch((err) => { console.error('❌', err); process.exit(1) })
