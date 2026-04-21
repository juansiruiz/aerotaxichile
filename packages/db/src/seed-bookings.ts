/**
 * Seed de reservas de ejemplo en distintos estados.
 * Ejecutar: pnpm --filter @aerotaxi/db seed:bookings
 *
 * Requiere que ya exista el seed base (zones, users, drivers, vehicles).
 */
import { eq } from 'drizzle-orm'
import { db } from './client.js'
import {
  bookings,
  bookingStatusHistory,
  drivers,
  users,
  vehicles,
  zones,
} from './schema/index.js'

// ─── Helpers ────────────────────────────────────────────────────────────────

const now = Date.now()
const HOUR = 3_600_000
const DAY = 24 * HOUR

const h = (hours: number) => new Date(now + hours * HOUR)
const d = (days: number) => new Date(now + days * DAY)

// ─── Main ───────────────────────────────────────────────────────────────────

async function seedBookings() {
  console.log('\n📋 Sembrando reservas de ejemplo en distintos estados...\n')

  // --- Lookup: clientes, conductores, vehículos, zonas -----------------------
  const clients = await db.select().from(users).where(eq(users.role, 'client'))
  const driversRows = await db.select().from(drivers)
  const vehiclesRows = await db.select().from(vehicles)
  const zonesRows = await db.select().from(zones)

  if (clients.length < 2 || driversRows.length < 1 || vehiclesRows.length < 1) {
    console.error(
      '❌ Falta data base. Ejecuta primero: pnpm --filter @aerotaxi/db db:seed\n',
    )
    process.exit(1)
  }

  const [c1, c2] = clients
  const [d1, d2, d3] = driversRows
  const [v1, v2, v3] = vehiclesRows

  const zCentral = zonesRows.find((z) => z.name === 'central')!
  const zNorte = zonesRows.find((z) => z.name === 'norte')!
  const zNororiente = zonesRows.find((z) => z.name === 'nororiente')!
  const zSuroriente = zonesRows.find((z) => z.name === 'suroriente')!
  const zPoniente = zonesRows.find((z) => z.name === 'poniente')!
  const zSur = zonesRows.find((z) => z.name === 'sur')!

  // --- Dataset -------------------------------------------------------------
  // Mezcla de estados para probar el panel de admin y el dashboard de chofer

  type NewBooking = typeof bookings.$inferInsert
  const data: NewBooking[] = [
    // 1) PENDING — recién creada, sin confirmar
    {
      clientId: c1!.id,
      zoneId: zCentral.id,
      direction: 'to_airport',
      origin: 'Av. Providencia 2345, Providencia',
      destination: 'Aeropuerto Internacional AMB, Pudahuel',
      scheduledAt: h(6),
      passengerCount: 2,
      vehicleType: 'sedan',
      totalPrice: zCentral.priceSedan,
      paymentMethod: 'cash',
      status: 'pending',
      adminConfirmed: false,
    },

    // 2) PENDING — confirmada por admin pero sin conductor aún
    {
      clientId: c2!.id,
      zoneId: zNorte.id,
      direction: 'from_airport',
      origin: 'Aeropuerto Internacional AMB, Pudahuel',
      destination: 'Av. Vitacura 8800, Vitacura',
      scheduledAt: h(24),
      passengerCount: 3,
      vehicleType: 'suv',
      totalPrice: zNorte.priceSuv,
      paymentMethod: 'online',
      paymentStatus: 'paid',
      status: 'pending',
      adminConfirmed: true,
      adminNotes: 'Cliente frecuente — llamar 10 min antes',
    },

    // 3) ASSIGNED — admin asignó conductor, chofer no ha confirmado
    {
      clientId: c1!.id,
      zoneId: zNororiente.id,
      direction: 'to_airport',
      origin: 'Av. Presidente Kennedy 5757, Las Condes',
      destination: 'Aeropuerto Internacional AMB, Pudahuel',
      scheduledAt: h(8),
      passengerCount: 4,
      vehicleType: 'suv',
      totalPrice: zNororiente.priceSuv,
      paymentMethod: 'online',
      paymentStatus: 'paid',
      status: 'assigned',
      adminConfirmed: true,
      driverId: d2?.id,
      vehicleId: v2?.id,
    },

    // 4) CONFIRMED — chofer aceptó el viaje
    {
      clientId: c2!.id,
      zoneId: zSuroriente.id,
      direction: 'to_airport',
      origin: 'Av. Apoquindo 4700, Las Condes',
      destination: 'Aeropuerto Internacional AMB, Pudahuel',
      scheduledAt: h(12),
      passengerCount: 6,
      vehicleType: 'minivan',
      totalPrice: zSuroriente.priceMinivan,
      paymentMethod: 'cash',
      status: 'confirmed',
      adminConfirmed: true,
      driverId: d3?.id,
      vehicleId: v3?.id,
      driverNotes: 'Puerta con reja, tocar timbre del 2B',
    },

    // 5) EN_ROUTE — chofer en camino al cliente
    {
      clientId: c1!.id,
      zoneId: zPoniente.id,
      direction: 'from_airport',
      origin: 'Aeropuerto Internacional AMB, Pudahuel',
      destination: 'Av. San Pablo 3200, Quinta Normal',
      scheduledAt: h(-1),
      passengerCount: 1,
      vehicleType: 'sedan',
      totalPrice: zPoniente.priceSedan,
      paymentMethod: 'online',
      paymentStatus: 'paid',
      status: 'en_route',
      adminConfirmed: true,
      driverId: d1?.id,
      vehicleId: v1?.id,
    },

    // 6) COMPLETED — viaje finalizado hace 2 horas
    {
      clientId: c1!.id,
      zoneId: zCentral.id,
      direction: 'to_airport',
      origin: 'Av. Matta 1500, Santiago',
      destination: 'Aeropuerto Internacional AMB, Pudahuel',
      scheduledAt: h(-3),
      passengerCount: 2,
      vehicleType: 'sedan',
      totalPrice: zCentral.priceSedan,
      paymentMethod: 'cash',
      status: 'completed',
      adminConfirmed: true,
      driverId: d1?.id,
      vehicleId: v1?.id,
      collectedBy: 'driver',
    },

    // 7) COMPLETED — viaje de la semana pasada
    {
      clientId: c2!.id,
      zoneId: zNororiente.id,
      direction: 'from_airport',
      origin: 'Aeropuerto Internacional AMB, Pudahuel',
      destination: 'Camino El Alba 9900, Las Condes',
      scheduledAt: d(-5),
      passengerCount: 4,
      vehicleType: 'suv',
      totalPrice: zNororiente.priceSuv,
      paymentMethod: 'online',
      paymentStatus: 'paid',
      status: 'completed',
      adminConfirmed: true,
      driverId: d2?.id,
      vehicleId: v2?.id,
      collectedBy: 'driver',
    },

    // 8) CANCELLED — cliente canceló
    {
      clientId: c1!.id,
      zoneId: zSur.id,
      direction: 'to_airport',
      origin: 'Av. San José 2100, La Cisterna',
      destination: 'Aeropuerto Internacional AMB, Pudahuel',
      scheduledAt: d(2),
      passengerCount: 3,
      vehicleType: 'suv',
      totalPrice: zSur.priceSuv,
      paymentMethod: 'cash',
      status: 'cancelled',
      adminConfirmed: true,
    },

    // 9) PENDING — reserva grande para mañana
    {
      clientId: c2!.id,
      zoneId: zNorte.id,
      direction: 'to_airport',
      origin: 'Av. Recoleta 4500, Recoleta',
      destination: 'Aeropuerto Internacional AMB, Pudahuel',
      scheduledAt: d(1),
      passengerCount: 10,
      vehicleType: 'van',
      totalPrice: zNorte.priceVan,
      paymentMethod: 'online',
      paymentStatus: 'pending',
      status: 'pending',
      adminConfirmed: false,
    },

    // 10) COMPLETED — hace un mes
    {
      clientId: c1!.id,
      zoneId: zPoniente.id,
      direction: 'to_airport',
      origin: 'Av. Pajaritos 3900, Maipú',
      destination: 'Aeropuerto Internacional AMB, Pudahuel',
      scheduledAt: d(-30),
      passengerCount: 2,
      vehicleType: 'sedan',
      totalPrice: zPoniente.priceSedan,
      paymentMethod: 'cash',
      status: 'completed',
      adminConfirmed: true,
      driverId: d3?.id,
      vehicleId: v3?.id,
      collectedBy: 'admin',
    },
  ]

  let created = 0
  for (const b of data) {
    const [inserted] = await db.insert(bookings).values(b).returning({
      id: bookings.id,
      status: bookings.status,
    })
    if (inserted) {
      await db.insert(bookingStatusHistory).values({
        bookingId: inserted.id,
        fromStatus: null,
        toStatus: inserted.status,
        notes: 'Reserva de ejemplo (seed)',
      })
      created++
      const dir = b.direction === 'to_airport' ? '🛫' : '🛬'
      const s = (b.status ?? 'pending').padEnd(9)
      const price = (b.totalPrice ?? 0).toLocaleString('es-CL')
      console.log(`   ${dir} [${s}] $${price} — ${b.origin?.slice(0, 40)}`)
    }
  }

  console.log('\n' + '═'.repeat(54))
  console.log(`✅  ${created} reservas de ejemplo creadas`)
  console.log('═'.repeat(54))
  console.log('\n  👉  Panel admin:    http://localhost:3000/admin/viajes')
  console.log('  👉  Panel chofer:   http://localhost:3000/driver')
  console.log('  👉  Mis reservas:   http://localhost:3000/mis-reservas\n')

  process.exit(0)
}

seedBookings().catch((err) => {
  console.error('\n❌ Seed de reservas falló:', err)
  process.exit(1)
})
