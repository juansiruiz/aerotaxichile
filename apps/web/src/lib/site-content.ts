// ─── Site content defaults + server-side fetcher ──────────────────────────────
// All landing-page text lives here as defaults. The admin can override any key
// via PATCH /settings/:key → stored in the DB → fetched here at render time.

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000'

export type SiteContent = Record<string, string>

export const CONTENT_DEFAULTS: SiteContent = {
  // ── Hero ──────────────────────────────────────────────────────────────────
  hero_badge:    '4.9 · +5.000 viajes realizados en Santiago',
  // Use [word] to highlight a word in the title
  hero_title:    'Tu traslado al [aeropuerto], sin sorpresas',
  hero_subtitle: 'Sedan VIP, SUVs y Vans para toda la familia. Reserva en minutos, paga online o en efectivo. Servicio 7×24 en todo Santiago.',
  hero_trust_1:  'Pago online seguro',
  hero_trust_2:  'Conductores certificados',
  hero_trust_3:  'Cobertura en todo Santiago',

  // ── Stats ─────────────────────────────────────────────────────────────────
  stat_1_value: '+5.000', stat_1_label: 'Viajes realizados',
  stat_2_value: '4.9',    stat_2_label: 'Puntuación promedio',
  stat_3_value: '8 años', stat_3_label: 'En operación',
  stat_4_value: '7×24',   stat_4_label: 'Disponibilidad',

  // ── Cómo funciona ─────────────────────────────────────────────────────────
  how_badge: 'Simple y rápido',
  how_title: '¿Cómo funciona?',
  step_1_title: 'Reserva en minutos',
  step_1_desc:  'Elige origen, destino, fecha y tipo de vehículo desde nuestra plataforma web o WhatsApp.',
  step_2_title: 'Confirmamos tu viaje',
  step_2_desc:  'Nuestro equipo asigna un conductor disponible y te enviamos la confirmación al instante.',
  step_3_title: 'Te buscamos en tu puerta',
  step_3_desc:  'El conductor llega puntual a tu dirección. Seguimiento en tiempo real disponible.',

  // ── Servicios ─────────────────────────────────────────────────────────────
  services_badge: 'Lo que hacemos',
  services_title: 'Nuestros servicios',
  service_1_title: 'Traslado al Aeropuerto',   service_1_desc: 'Llegamos puntual para que nunca pierdas tu vuelo. Servicio desde y hacia AMB.',
  service_2_title: 'Viajes Familiares',         service_2_desc: 'Vehículos amplios y cómodos para toda la familia. Ideal para viajes a la costa y más.',
  service_3_title: 'Traslado a Eventos',        service_3_desc: 'Disfruta sin preocuparte por conducir. Llegada y regreso seguros a eventos y celebraciones.',
  service_4_title: 'Traslado Trabajadores',     service_4_desc: 'Servicio empresarial 7×24. Puntualidad garantizada para equipos de trabajo.',

  // ── Flota ─────────────────────────────────────────────────────────────────
  fleet_badge:    'Vehículos',
  fleet_title:    'Nuestra flota',
  fleet_subtitle: 'Vehículos modernos, limpios y en perfectas condiciones para cada necesidad.',
  fleet_1_name: 'Sedan VIP',     fleet_1_capacity: '1–4 pasajeros',  fleet_1_price: 'Desde $15.000', fleet_1_desc: 'Mercedes o similar. Ideal para viajes ejecutivos.',
  fleet_2_name: 'SUV Espaciosa', fleet_2_capacity: '1–5 pasajeros',  fleet_2_price: 'Desde $18.000', fleet_2_desc: 'Amplio espacio para pasajeros y equipaje.',
  fleet_3_name: 'Minivan',       fleet_3_capacity: '1–7 pasajeros',  fleet_3_price: 'Desde $22.000', fleet_3_desc: 'Perfecta para grupos familiares o corporativos.',
  fleet_4_name: 'Van',           fleet_4_capacity: '1–12 pasajeros', fleet_4_price: 'Desde $28.000', fleet_4_desc: 'Máxima capacidad para grupos y equipaje extra.',
  fleet_photos: '[]',

  // ── Tarifas ───────────────────────────────────────────────────────────────
  pricing_badge: 'Precios claros',
  pricing_title: 'Tarifas por zona',
  pricing_desc:  'Precios base en Sedan VIP desde aeropuerto AMB. El precio final se confirma al reservar.',
  pricing_cta:   'Reserva y confirma tu precio',

  // ── Testimonios ───────────────────────────────────────────────────────────
  testimonials_badge: 'Lo que dicen',
  testimonials_title: 'Clientes satisfechos',
  testimonial_1_initials: 'MG', testimonial_1_name: 'María González', testimonial_1_location: 'Las Condes',
  testimonial_1_text: 'Excelente servicio. El conductor llegó 10 minutos antes, el auto impecable y muy puntual. Ya los tengo guardados para siempre.',
  testimonial_2_initials: 'CP', testimonial_2_name: 'Carlos Pérez',   testimonial_2_location: 'Maipú',
  testimonial_2_text: 'Reservé una van para toda la familia al aeropuerto. Todo perfecto, el conductor muy amable y profesional. 100% recomendado.',
  testimonial_3_initials: 'AR', testimonial_3_name: 'Ana Rodríguez',  testimonial_3_location: 'Providencia',
  testimonial_3_text: 'Los uso cada vez que viajo por trabajo. Siempre puntuales, el servicio es confiable y los precios son muy razonables.',

  // ── CTA Final ─────────────────────────────────────────────────────────────
  cta_title:    '¿Listo para tu próximo viaje?',
  cta_subtitle: 'Reserva en menos de 2 minutos. Sin filas, sin esperas.',
  cta_btn1:     'Reservar ahora',
  cta_whatsapp: '+56963552132',

  // ── Footer ────────────────────────────────────────────────────────────────
  footer_desc:      'Servicio profesional de traslados al aeropuerto en Santiago de Chile. Puntualidad, seguridad y confort garantizados.',
  footer_phone:     '+56 9 6355 2132',
  footer_whatsapp:  '+56963552132',
  footer_address:   'Santiago de Chile',
  footer_instagram: '#',
  footer_facebook:  '#',
}

// ── Fetches all settings from the API and merges with defaults ──────────────
// Runs server-side; revalidates every 60 s (ISR).
export async function fetchSiteContent(): Promise<SiteContent> {
  try {
    const res = await fetch(`${API_URL}/settings`, {
      cache: 'no-store',
    })
    if (!res.ok) return { ...CONTENT_DEFAULTS }
    const json = (await res.json()) as { data?: Record<string, string> }
    const merged = { ...CONTENT_DEFAULTS }
    for (const [key, value] of Object.entries(json.data ?? {})) {
      if (typeof value === 'string' && value.trim()) merged[key] = value
    }
    return merged
  } catch {
    return { ...CONTENT_DEFAULTS }
  }
}

// ── Parses [highlight] syntax in hero title ───────────────────────────────
export function parseHighlight(text: string): { pre: string; highlight: string; post: string } {
  const m = text.match(/^(.*?)\[(.+?)\](.*)$/)
  if (m) return { pre: m[1] ?? '', highlight: m[2] ?? '', post: m[3] ?? '' }
  return { pre: '', highlight: text, post: '' }
}

// ── Parse fleet_photos JSON safely ───────────────────────────────────────
export interface FleetPhoto { url: string; caption: string }
export function parseFleetPhotos(json: string): FleetPhoto[] {
  try { return JSON.parse(json) as FleetPhoto[] } catch { return [] }
}
