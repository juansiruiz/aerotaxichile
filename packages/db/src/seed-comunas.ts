/**
 * Seed de comunas por zona — Región Metropolitana de Santiago
 * Ejecutar: pnpm --filter @aerotaxi/db seed:comunas
 */
import { eq } from 'drizzle-orm'
import { db } from './client.js'
import { zones } from './schema/index.js'

const COMUNAS: Record<string, string[]> = {
  central: [
    'Santiago', 'Providencia', 'Ñuñoa', 'San Miguel',
    'Estación Central', 'Pedro Aguirre Cerda',
  ],
  norte: [
    'Recoleta', 'Independencia', 'Conchalí', 'Huechuraba',
    'Quilicura', 'Renca',
  ],
  sur: [
    'El Bosque', 'La Cisterna', 'Lo Espejo', 'Maipú',
    'San Joaquín', 'Cerrillos', 'San Bernardo', 'Lo Prado',
    'Pudahuel',
  ],
  nororiente: [
    'Vitacura', 'Las Condes', 'Lo Barnechea', 'La Reina',
  ],
  suroriente: [
    'La Florida', 'Peñalolén', 'Macul', 'La Granja',
    'La Pintana', 'San Ramón',
  ],
  poniente: [
    'Cerro Navia', 'Quinta Normal', 'Lo Prado',
    'Noviciado', 'Bustos',
  ],
  rural: [
    'Colina', 'Lampa', 'Til Til', 'Calera de Tango',
    'Talagante', 'Peñaflor', 'El Monte', 'Isla de Maipo',
    'Padre Hurtado', 'Paine', 'Buin', 'San José de Maipo',
    'Pirque', 'Curacaví', 'Melipilla', 'María Pinto',
    'Alhué', 'San Pedro',
  ],
}

async function seedComunas() {
  console.log('\n🗺️  Seeding comunas por zona...\n')

  const allZones = await db.select().from(zones)

  for (const zone of allZones) {
    const comunas = COMUNAS[zone.name]
    if (!comunas) {
      console.log(`   ⚠️  Sin comunas definidas para zona: ${zone.name}`)
      continue
    }

    await db.update(zones).set({ comunas }).where(eq(zones.id, zone.id))
    console.log(`   ✅ ${zone.label} (${zone.name}): ${comunas.join(', ')}`)
  }

  console.log('\n' + '═'.repeat(54))
  console.log(`✅  ${allZones.length} zonas actualizadas con comunas`)
  console.log('═'.repeat(54) + '\n')

  process.exit(0)
}

seedComunas().catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})
