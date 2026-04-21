/**
 * Seed de contenido del sitio web (textos de la landing page)
 * Ejecutar: pnpm --filter @aerotaxi/db seed:content
 */
import { db } from './client.js'
import { settings } from './schema/index.js'

const CONTENT: Record<string, string> = {
  // ── Empresa ────────────────────────────────────────────────────────────────
  app_name:       'AeroTaxi Chile',
  phone_main:     '+56 9 6355 2132',
  phone_whatsapp: '+56 9 6355 2132',
  email_contact:  'contacto@aerotaxichile.cl',
  address:        'Santiago de Chile',

  // ── SEO ────────────────────────────────────────────────────────────────────
  seo_title:       'AeroTaxi Chile — Traslados al Aeropuerto AMB',
  seo_description: 'Servicio de traslados profesionales al Aeropuerto Arturo Merino Benítez desde cualquier punto de Santiago. Sedan VIP, SUV y Van. Precio fijo, reserva online 7×24.',
  seo_keywords:    'aerotaxi, traslado aeropuerto santiago, taxi aeropuerto AMB, transfer aeropuerto chile, traslado AMB',

  // ── Hero ───────────────────────────────────────────────────────────────────
  hero_badge:    '4.9 · +5.000 viajes realizados en Santiago',
  hero_title:    'Tu traslado al [aeropuerto], sin sorpresas',
  hero_subtitle: 'Sedan ejecutivo, SUV y Vans para toda la familia. Reserva en minutos, paga online o en efectivo. Servicio 7×24 en todo Santiago.',
  hero_trust_1:  'Pago online seguro',
  hero_trust_2:  'Conductores certificados',
  hero_trust_3:  'Cobertura en todo Santiago',

  // ── Stats ──────────────────────────────────────────────────────────────────
  stat_1_value: '+5.000', stat_1_label: 'Viajes realizados',
  stat_2_value: '4.9',    stat_2_label: 'Puntuación promedio',
  stat_3_value: '8 años', stat_3_label: 'En operación',
  stat_4_value: '7×24',   stat_4_label: 'Disponibilidad',

  // ── Cómo funciona ──────────────────────────────────────────────────────────
  how_badge: 'Simple y rápido',
  how_title: '¿Cómo funciona?',
  step_1_title: 'Reserva en minutos',
  step_1_desc:  'Elige origen, destino, fecha y tipo de vehículo desde nuestra plataforma web o por WhatsApp. Confirmación inmediata.',
  step_2_title: 'Confirmamos tu viaje',
  step_2_desc:  'Nuestro equipo asigna el conductor disponible más cercano y te enviamos todos los detalles al instante.',
  step_3_title: 'Te buscamos en tu puerta',
  step_3_desc:  'El conductor llega puntual a la dirección indicada. Monitoreo en tiempo real disponible en la app.',

  // ── Servicios ──────────────────────────────────────────────────────────────
  services_badge: 'Lo que ofrecemos',
  services_title: 'Nuestros servicios',
  service_1_title: 'Traslado al Aeropuerto',
  service_1_desc:  'Llegamos puntual para que nunca pierdas tu vuelo. Servicio desde y hacia el Aeropuerto Arturo Merino Benítez.',
  service_2_title: 'Viajes Familiares',
  service_2_desc:  'Vehículos amplios y cómodos para toda la familia. Ideales para viajes a la playa, campo o interior del país.',
  service_3_title: 'Traslado a Eventos',
  service_3_desc:  'Disfruta sin preocuparte por el auto. Llegada y regreso seguros a matrimonios, eventos corporativos y celebraciones.',
  service_4_title: 'Traslado Empresarial',
  service_4_desc:  'Servicio ejecutivo 7×24 para empresas y equipos de trabajo. Factura disponible, puntualidad garantizada.',

  // ── Flota ──────────────────────────────────────────────────────────────────
  fleet_badge:    'Nuestra flota',
  fleet_title:    'Vehículos para cada necesidad',
  fleet_subtitle: 'Flota moderna con mantención al día, revisión técnica vigente y conductores con años de experiencia.',
  fleet_1_name:     'Sedan Ejecutivo',
  fleet_1_capacity: '1–4 pasajeros',
  fleet_1_price:    'Desde $18.000',
  fleet_1_desc:     'Toyota Camry o similar. Ideal para ejecutivos y viajes de negocios con estilo y confort.',
  fleet_2_name:     'SUV Familiar',
  fleet_2_capacity: '1–6 pasajeros',
  fleet_2_price:    'Desde $24.000',
  fleet_2_desc:     'Toyota Fortuner. Espacio amplio para pasajeros con mucho equipaje o grupos pequeños.',
  fleet_3_name:     'Minivan',
  fleet_3_capacity: '1–8 pasajeros',
  fleet_3_price:    'Desde $30.000',
  fleet_3_desc:     'Kia Grand Carnival. La opción perfecta para grupos familiares o traslados corporativos.',
  fleet_4_name:     'Van Grupal',
  fleet_4_capacity: '1–12 pasajeros',
  fleet_4_price:    'Desde $42.000',
  fleet_4_desc:     'Máxima capacidad para grupos grandes. Equipaje ilimitado y viaje cómodo para todos.',
  fleet_photos:     '[]',

  // ── Tarifas ────────────────────────────────────────────────────────────────
  pricing_badge: 'Precios claros',
  pricing_title: 'Tarifas por zona',
  pricing_desc:  'Precio base en Sedan Ejecutivo desde el Aeropuerto AMB. El valor exacto se calcula automáticamente al ingresar tu dirección.',
  pricing_cta:   'Ver precio exacto para mi dirección',

  // ── Testimonios ────────────────────────────────────────────────────────────
  testimonials_badge: 'Lo que dicen nuestros clientes',
  testimonials_title: 'Más de 5.000 viajes satisfechos',
  testimonial_1_initials: 'MG',
  testimonial_1_name:     'María González',
  testimonial_1_location: 'Las Condes',
  testimonial_1_text:     'Excelente servicio. El conductor llegó 15 minutos antes, el auto impecable y muy puntual. Ahora los uso siempre que viajo al aeropuerto, son mi primera opción.',
  testimonial_2_initials: 'CP',
  testimonial_2_name:     'Carlos Pérez',
  testimonial_2_location: 'Maipú',
  testimonial_2_text:     'Reservé una minivan para toda la familia rumbo al aeropuerto. Todo perfecto: el conductor muy profesional, puntual y el precio muy razonable. 100% recomendado.',
  testimonial_3_initials: 'AR',
  testimonial_3_name:     'Ana Rodríguez',
  testimonial_3_location: 'Providencia',
  testimonial_3_text:     'Los uso cada mes para mis viajes de trabajo. Siempre puntuales, el servicio es muy confiable y los conductores son súper amables. Ya no uso otra alternativa.',

  // ── CTA Final ──────────────────────────────────────────────────────────────
  cta_title:    '¿Listo para tu próximo viaje?',
  cta_subtitle: 'Reserva en menos de 2 minutos. Sin filas, sin esperas, precio fijo desde el primer momento.',
  cta_btn1:     'Reservar ahora',
  cta_whatsapp: '+56963552132',

  // ── Footer ─────────────────────────────────────────────────────────────────
  footer_desc:      'Empresa de traslados profesionales al Aeropuerto Arturo Merino Benítez de Santiago de Chile. Operamos desde 2016 con más de 5.000 viajes realizados.',
  footer_phone:     '+56 9 6355 2132',
  footer_whatsapp:  '+56963552132',
  footer_address:   'Santiago de Chile',
  footer_instagram: 'https://instagram.com/aerotaxichile',
  footer_facebook:  'https://facebook.com/aerotaxichile',
}

async function seedContent() {
  console.log('\n🌐 Insertando contenido del sitio web...\n')

  const entries = Object.entries(CONTENT)
  let ok = 0

  for (const [key, value] of entries) {
    await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
    ok++
    process.stdout.write(`\r   ✅  ${ok}/${entries.length} configuraciones`)
  }

  console.log('\n\n' + '═'.repeat(50))
  console.log('✅  Contenido de ejemplo cargado correctamente')
  console.log('═'.repeat(50))
  console.log(`\n   ${entries.length} claves guardadas en la tabla settings`)
  console.log('\n   👉  Abre http://localhost:3000 para ver los cambios')
  console.log('   👉  Edita desde http://localhost:3000/admin/contenido\n')

  process.exit(0)
}

seedContent().catch((err) => {
  console.error('\n❌ Seed de contenido falló:', err)
  process.exit(1)
})
