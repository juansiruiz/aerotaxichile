/**
 * Seed completo: zonas, admin, conductores, vehículos, clientes y reservas
 * Ejecutar: pnpm --filter @aerotaxi/db db:seed
 */
import { hash } from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from './client.js'
import { zones, users, drivers, vehicles, bookings } from './schema/index.js'

// Precios reales por zona y tipo de vehículo (CLP)
// Sedan VIP / SUV / Minivan / Van
const ZONES_DATA = [
  { name: 'central' as const,    label: 'Zona Central',    priceSedan: 18000, priceSuv: 24000, priceMinivan: 30000, priceVan: 42000 },
  { name: 'sur' as const,        label: 'Zona Sur',        priceSedan: 22000, priceSuv: 28000, priceMinivan: 35000, priceVan: 48000 },
  { name: 'norte' as const,      label: 'Zona Norte',      priceSedan: 25000, priceSuv: 32000, priceMinivan: 40000, priceVan: 55000 },
  { name: 'nororiente' as const, label: 'Zona Nororiente', priceSedan: 28000, priceSuv: 36000, priceMinivan: 45000, priceVan: 60000 },
  { name: 'suroriente' as const, label: 'Zona Suroriente', priceSedan: 26000, priceSuv: 33000, priceMinivan: 42000, priceVan: 56000 },
  { name: 'poniente' as const,   label: 'Zona Poniente',   priceSedan: 20000, priceSuv: 26000, priceMinivan: 32000, priceVan: 45000 },
  { name: 'rural' as const,      label: 'Zona Rural',      priceSedan: 35000, priceSuv: 45000, priceMinivan: 55000, priceVan: 72000 },
]

async function seed() {
  console.log('\n🌱 Iniciando seed...\n')

  // ── Zonas ─────────────────────────────────────────────────────────────────
  console.log('📍 Zonas...')
  await db.insert(zones).values(ZONES_DATA).onConflictDoNothing()
  const allZones = await db.select().from(zones)
  const zoneMap = Object.fromEntries(allZones.map((z) => [z.name, z]))
  console.log(`   ${allZones.length} zonas OK`)

  // ── Admin ─────────────────────────────────────────────────────────────────
  console.log('👤 Admin...')
  const adminPwd = await hash('aerotaxi2024', 10)
  await db
    .insert(users)
    .values({
      name: 'Admin AeroTaxi',
      email: 'admin@aerotaxichile.cl',
      phone: '+56912345678',
      passwordHash: adminPwd,
      role: 'admin',
      isActive: true,
    })
    .onConflictDoNothing()

  // ── Conductores ───────────────────────────────────────────────────────────
  console.log('🚗 Conductores...')
  const driverPwd = await hash('chofer2024', 10)

  const driversInput = [
    { name: 'Carlos Muñoz Reyes',    email: 'carlos@aerotaxichile.cl', phone: '+56922222222', license: 'B-12345678' },
    { name: 'Roberto Silva Lagos',   email: 'roberto@aerotaxichile.cl', phone: '+56933333333', license: 'B-87654321' },
    { name: 'Juan Pérez Soto',       email: 'juan@aerotaxichile.cl',    phone: '+56944444444', license: 'B-11223344' },
  ]

  const driverIds: string[] = []

  for (const d of driversInput) {
    let [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, d.email)).limit(1)
    if (!existing) {
      const [created] = await db
        .insert(users)
        .values({ name: d.name, email: d.email, phone: d.phone, passwordHash: driverPwd, role: 'driver' })
        .returning({ id: users.id })
      existing = created!
    }
    driverIds.push(existing.id)
    await db
      .insert(drivers)
      .values({ id: existing.id, licenseNumber: d.license, isAvailable: true })
      .onConflictDoNothing()
    console.log(`   ✅ ${d.email}`)
  }

  // ── Vehículos ─────────────────────────────────────────────────────────────
  console.log('🚙 Vehículos...')
  const vehiclesInput = [
    { plate: 'BBJK12', brand: 'Toyota',   model: 'Camry',          year: 2023, type: 'sedan'   as const, capacity: 4, driverIdx: 0 },
    { plate: 'CCMN34', brand: 'Toyota',   model: 'Fortuner',       year: 2022, type: 'suv'     as const, capacity: 7, driverIdx: 1 },
    { plate: 'DDQR56', brand: 'Kia',      model: 'Grand Carnival', year: 2023, type: 'minivan' as const, capacity: 8, driverIdx: 2 },
  ]

  const vehicleIds: string[] = []

  for (const v of vehiclesInput) {
    const driverId = driverIds[v.driverIdx] ?? null
    let [existing] = await db.select({ id: vehicles.id }).from(vehicles).where(eq(vehicles.plate, v.plate)).limit(1)
    if (!existing) {
      const [created] = await db
        .insert(vehicles)
        .values({ plate: v.plate, brand: v.brand, model: v.model, year: v.year, type: v.type, capacity: v.capacity, driverId })
        .returning({ id: vehicles.id })
      existing = created!
    }
    vehicleIds.push(existing.id)
    if (driverId) {
      await db.update(drivers).set({ vehicleId: existing.id }).where(eq(drivers.id, driverId))
    }
    console.log(`   ✅ ${v.plate} – ${v.brand} ${v.model}`)
  }

  // ── Clientes ──────────────────────────────────────────────────────────────
  console.log('👥 Clientes...')
  const clientPwd = await hash('cliente2024', 10)

  const clientsInput = [
    { name: 'María González Vidal',    email: 'maria@gmail.com',  phone: '+56955555555' },
    { name: 'Pedro Rodríguez Torres',  email: 'pedro@gmail.com',  phone: '+56966666666' },
  ]

  const clientIds: string[] = []

  for (const cl of clientsInput) {
    let [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, cl.email)).limit(1)
    if (!existing) {
      const [created] = await db
        .insert(users)
        .values({ name: cl.name, email: cl.email, phone: cl.phone, passwordHash: clientPwd, role: 'client' })
        .returning({ id: users.id })
      existing = created!
    }
    clientIds.push(existing.id)
    console.log(`   ✅ ${cl.email}`)
  }

  // ── Reservas ──────────────────────────────────────────────────────────────
  const c1 = clientIds[0]
  const c2 = clientIds[1]
  const zC = zoneMap['central']
  const zN = zoneMap['norte']
  const zSO = zoneMap['suroriente']

  if (c1 && c2 && zC && zN && zSO) {
    console.log('📋 Reservas de ejemplo...')
    const now = Date.now()
    const d1 = (h: number) => new Date(now + h * 3_600_000)

    const bookingsInput = [
      {
        clientId: c1, zoneId: zC.id,
        direction: 'to_airport' as const,
        origin: 'Av. Providencia 1234, Providencia',
        destination: 'Aeropuerto AMB, Pudahuel',
        scheduledAt: d1(24), passengerCount: 2,
        vehicleType: 'sedan' as const,
        totalPrice: zC.priceSedan, paymentMethod: 'cash' as const,
        status: 'pending' as const,
      },
      {
        clientId: c2, zoneId: zN.id,
        direction: 'from_airport' as const,
        origin: 'Aeropuerto AMB, Pudahuel',
        destination: 'Av. Las Condes 8500, Las Condes',
        scheduledAt: d1(48), passengerCount: 4,
        vehicleType: 'suv' as const,
        totalPrice: zN.priceSuv, paymentMethod: 'online' as const,
        status: 'pending' as const,
      },
      {
        clientId: c1, zoneId: zSO.id,
        direction: 'to_airport' as const,
        origin: 'Av. Vicuña Mackenna 3000, Macul',
        destination: 'Aeropuerto AMB, Pudahuel',
        scheduledAt: d1(72), passengerCount: 6,
        vehicleType: 'minivan' as const,
        totalPrice: zSO.priceMinivan, paymentMethod: 'cash' as const,
        status: 'pending' as const,
      },
    ]

    for (const b of bookingsInput) {
      const [bk] = await db.insert(bookings).values(b).returning({ id: bookings.id })
      console.log(`   ✅ #${bk?.id?.slice(-6).toUpperCase()} ${b.direction === 'to_airport' ? '🛫' : '🛬'} $${b.totalPrice.toLocaleString('es-CL')}`)
    }
  }

  // ── Resumen ───────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(54))
  console.log('✅  Seed completado — Credenciales')
  console.log('═'.repeat(54))
  console.log('\n  🔐 ADMIN')
  console.log('     Email:    admin@aerotaxichile.cl')
  console.log('     Password: aerotaxi2024')
  console.log('     URL:      http://localhost:3000/auth/login\n')
  console.log('  🚗 CONDUCTORES  (password: chofer2024)')
  for (const d of driversInput) console.log(`     ${d.email}`)
  console.log('\n  👤 CLIENTES  (password: cliente2024)')
  for (const cl of clientsInput) console.log(`     ${cl.email}`)
  console.log('\n' + '═'.repeat(54) + '\n')

  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Seed falló:', err)
  process.exit(1)
})
