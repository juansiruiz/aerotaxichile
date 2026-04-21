import Link from 'next/link'
import {
  Plane, Users, Calendar, Clock, MapPin, Star,
  CheckCircle, Phone, MessageCircle, Instagram, Facebook,
  ChevronRight, Car, Award, Zap,
} from 'lucide-react'
import Navbar from '@/components/Navbar'
import HeroBookingWidget from '@/components/HeroBookingWidget'
import { fetchSiteContent, parseHighlight, parseFleetPhotos } from '@/lib/site-content'

// ─── Static icon maps ─────────────────────────────────────────────────────────

const STAT_ICONS  = [Car, Star, Award, Clock]
const STEP_ICONS  = [Calendar, CheckCircle, MapPin]
const SERVICE_ICONS = [Plane, Users, Star, Zap]
const SERVICE_COLORS = [
  'bg-blue-50 text-blue-600',
  'bg-green-50 text-green-600',
  'bg-purple-50 text-purple-600',
  'bg-orange-50 text-orange-600',
]
const FLEET_GRADIENTS = [
  'from-slate-800 to-slate-600',
  'from-blue-900 to-blue-700',
  'from-brand-700 to-brand-500',
  'from-green-800 to-green-600',
]
const ZONES = [
  { name: 'Zona Central',    price: '$15.000' },
  { name: 'Zona Sur',        price: '$18.000' },
  { name: 'Zona Norte',      price: '$18.000' },
  { name: 'Zona Nororiente', price: '$20.000' },
  { name: 'Zona Suroriente', price: '$20.000' },
  { name: 'Zona Poniente',   price: '$22.000' },
  { name: 'Zona Rural',      price: '$28.000' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const sc = await fetchSiteContent()
  const heroTitle = parseHighlight(sc['hero_title'] ?? '')
  const fleetPhotos = parseFleetPhotos(sc['fleet_photos'] ?? '[]')

  return (
    <>
      <Navbar />
      <main className="pt-16">

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section className="relative min-h-[92vh] flex items-center overflow-hidden bg-slate-900">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `radial-gradient(circle at 25% 50%, #f97316 0%, transparent 50%),
                              radial-gradient(circle at 75% 20%, #fb923c 0%, transparent 40%)`,
          }} />
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-brand-500/20 to-transparent" />
            <div className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-white/5 to-transparent" />
          </div>

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-24 grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/30 text-brand-400 text-sm font-medium px-3 py-1.5 rounded-full mb-6">
                <Star size={14} className="fill-brand-400" />
                {sc['hero_badge']}
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight mb-6">
                {heroTitle.pre}
                <span className="text-brand-500">{heroTitle.highlight}</span>
                {heroTitle.post}
              </h1>

              <p className="text-lg text-slate-300 mb-8 max-w-lg leading-relaxed">
                {sc['hero_subtitle']}
              </p>

              <div className="flex flex-wrap gap-5 text-sm text-slate-400">
                {[sc['hero_trust_1'], sc['hero_trust_2'], sc['hero_trust_3']].filter(Boolean).map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <CheckCircle size={14} className="text-brand-500" />
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-sm">
                <HeroBookingWidget />
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats ──────────────────────────────────────────────────────── */}
        <section className="bg-white border-b border-slate-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-slate-100">
              {STAT_ICONS.map((Icon, i) => {
                const n = i + 1
                return (
                  <div key={n} className="flex flex-col items-center justify-center py-10 px-4 text-center">
                    <Icon size={24} className="text-brand-500 mb-3" />
                    <span className="text-3xl lg:text-4xl font-black text-slate-900">{sc[`stat_${n}_value`]}</span>
                    <span className="text-sm text-slate-500 mt-1 font-medium">{sc[`stat_${n}_label`]}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Cómo funciona ──────────────────────────────────────────────── */}
        <section id="servicios" className="bg-slate-50 py-20 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <span className="text-brand-500 font-semibold text-sm uppercase tracking-widest">{sc['how_badge']}</span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-2 tracking-tight">{sc['how_title']}</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {STEP_ICONS.map((Icon, i) => {
                const n = i + 1
                const num = String(n).padStart(2, '0')
                return (
                  <div key={n} className="relative">
                    {i < 2 && (
                      <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-brand-200 to-transparent -translate-y-1/2 z-0" />
                    )}
                    <div className="relative bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-4">
                        <span className="text-4xl font-black text-brand-100 leading-none select-none">{num}</span>
                        <div>
                          <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center mb-3">
                            <Icon size={20} className="text-brand-500" />
                          </div>
                          <h3 className="font-bold text-slate-900 mb-2">{sc[`step_${n}_title`]}</h3>
                          <p className="text-sm text-slate-500 leading-relaxed">{sc[`step_${n}_desc`]}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Servicios ──────────────────────────────────────────────────── */}
        <section className="bg-white py-20 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <span className="text-brand-500 font-semibold text-sm uppercase tracking-widest">{sc['services_badge']}</span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-2 tracking-tight">{sc['services_title']}</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              {SERVICE_ICONS.map((Icon, i) => {
                const n = i + 1
                return (
                  <div key={n} className="group flex gap-5 p-5 rounded-2xl border border-slate-100 hover:border-brand-200 hover:shadow-md transition-all">
                    <div className={`${SERVICE_COLORS[i]} w-12 h-12 rounded-xl flex items-center justify-center shrink-0`}>
                      <Icon size={22} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900 mb-1">{sc[`service_${n}_title`]}</h3>
                      <p className="text-sm text-slate-500 leading-relaxed">{sc[`service_${n}_desc`]}</p>
                      <Link href="/booking" className="inline-flex items-center gap-1 text-brand-500 hover:text-brand-600 text-sm font-semibold mt-3 transition-colors">
                        Reservar <ChevronRight size={14} />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Flota ──────────────────────────────────────────────────────── */}
        <section className="bg-slate-50 py-20 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <span className="text-brand-500 font-semibold text-sm uppercase tracking-widest">{sc['fleet_badge']}</span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-2 tracking-tight">{sc['fleet_title']}</h2>
              <p className="text-slate-500 mt-3 max-w-lg mx-auto">{sc['fleet_subtitle']}</p>
            </div>

            {/* Vehicle cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {FLEET_GRADIENTS.map((grad, i) => {
                const n = i + 1
                return (
                  <div key={n} className="group rounded-2xl overflow-hidden border border-slate-100 hover:shadow-lg transition-all bg-white">
                    {/* Photo or gradient placeholder */}
                    {fleetPhotos[i] ? (
                      <div className="h-40 overflow-hidden">
                        <img
                          src={fleetPhotos[i]!.url}
                          alt={fleetPhotos[i]!.caption || sc[`fleet_${n}_name`] || ''}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    ) : (
                      <div className={`bg-gradient-to-br ${grad} h-40 flex items-center justify-center`}>
                        <Car size={56} className="text-white/40 group-hover:text-white/60 transition-colors" />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-bold text-slate-900">{sc[`fleet_${n}_name`]}</h3>
                      <p className="text-xs text-slate-400 mt-0.5 mb-2">{sc[`fleet_${n}_capacity`]}</p>
                      <p className="text-xs text-slate-500 mb-3">{sc[`fleet_${n}_desc`]}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-brand-500 font-bold text-sm">{sc[`fleet_${n}_price`]}</span>
                        <Link href="/booking" className="text-xs bg-brand-50 hover:bg-brand-100 text-brand-600 font-semibold px-3 py-1.5 rounded-lg transition-colors">
                          Reservar
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Extra fleet photos (beyond 4) */}
            {fleetPhotos.length > 4 && (
              <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {fleetPhotos.slice(4).map((photo, i) => (
                  <div key={i} className="rounded-2xl overflow-hidden border border-slate-100 hover:shadow-md transition-all group">
                    <div className="h-36 overflow-hidden">
                      <img
                        src={photo.url}
                        alt={photo.caption}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    {photo.caption && (
                      <div className="px-3 py-2 bg-white">
                        <p className="text-xs font-semibold text-slate-600">{photo.caption}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Tarifas ────────────────────────────────────────────────────── */}
        <section id="tarifas" className="bg-brand-50 py-20 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <span className="text-brand-500 font-semibold text-sm uppercase tracking-widest">{sc['pricing_badge']}</span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-2 tracking-tight">{sc['pricing_title']}</h2>
              <p className="text-slate-500 mt-3 max-w-md mx-auto text-sm">{sc['pricing_desc']}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-10">
              {ZONES.map((z) => (
                <div key={z.name} className="bg-white rounded-xl p-4 border border-brand-100 hover:border-brand-300 hover:shadow-sm transition-all text-center">
                  <MapPin size={18} className="text-brand-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700 mb-1">{z.name}</p>
                  <p className="text-xl font-black text-brand-500">{z.price}</p>
                  <p className="text-xs text-slate-400 mt-0.5">CLP</p>
                </div>
              ))}
            </div>
            <div className="text-center">
              <Link href="/booking" className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 py-3.5 rounded-xl transition-colors text-base">
                {sc['pricing_cta']} <ChevronRight size={18} />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Testimonios ────────────────────────────────────────────────── */}
        <section className="bg-white py-20 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <span className="text-brand-500 font-semibold text-sm uppercase tracking-widest">{sc['testimonials_badge']}</span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-2 tracking-tight">{sc['testimonials_title']}</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-slate-50 rounded-2xl p-6 border border-slate-100 hover:shadow-md transition-all">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={16} className="fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed mb-5">"{sc[`testimonial_${n}_text`]}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-500 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {sc[`testimonial_${n}_initials`]}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{sc[`testimonial_${n}_name`]}</p>
                      <p className="text-slate-400 text-xs">{sc[`testimonial_${n}_location`]}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA Final ──────────────────────────────────────────────────── */}
        <section className="bg-brand-500 py-20 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 tracking-tight">{sc['cta_title']}</h2>
            <p className="text-brand-100 mb-8 text-lg">{sc['cta_subtitle']}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/booking" className="bg-white hover:bg-slate-50 text-brand-600 font-bold px-8 py-3.5 rounded-xl transition-colors text-base">
                {sc['cta_btn1']}
              </Link>
              <a
                href={`https://api.whatsapp.com/send?phone=${sc['cta_whatsapp']}&text=Hola,%20quiero%20reservar%20un%20traslado`}
                target="_blank" rel="noopener noreferrer"
                className="border-2 border-white/40 hover:border-white text-white font-bold px-8 py-3.5 rounded-xl transition-colors text-base flex items-center justify-center gap-2"
              >
                <MessageCircle size={18} /> WhatsApp
              </a>
            </div>
          </div>
        </section>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <footer id="contacto" className="bg-slate-900 text-slate-400 py-14 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
              <div className="lg:col-span-2">
                <div className="flex items-center gap-2 text-white font-bold mb-3">
                  <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
                    <Plane size={18} className="text-white" />
                  </div>
                  Aerotaxi Chile
                </div>
                <p className="text-sm leading-relaxed max-w-xs">{sc['footer_desc']}</p>
                <div className="flex gap-3 mt-4">
                  <a href={sc['footer_instagram']} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors">
                    <Instagram size={16} />
                  </a>
                  <a href={sc['footer_facebook']} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors">
                    <Facebook size={16} />
                  </a>
                </div>
              </div>

              <div>
                <h4 className="text-white font-semibold text-sm mb-4">Navegación</h4>
                <ul className="space-y-2 text-sm">
                  {[
                    { label: 'Servicios',      href: '#servicios' },
                    { label: 'Tarifas',        href: '#tarifas'   },
                    { label: 'Reservar',       href: '/booking'   },
                    { label: 'Iniciar sesión', href: '/auth/login'},
                  ].map((l) => (
                    <li key={l.label}><a href={l.href} className="hover:text-white transition-colors">{l.label}</a></li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-white font-semibold text-sm mb-4">Contacto</h4>
                <ul className="space-y-3 text-sm">
                  <li>
                    <a href={`tel:${sc['footer_phone']}`} className="flex items-center gap-2 hover:text-white transition-colors">
                      <Phone size={14} /> {sc['footer_phone']}
                    </a>
                  </li>
                  <li>
                    <a href={`https://api.whatsapp.com/send?phone=${sc['footer_whatsapp']}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:text-white transition-colors">
                      <MessageCircle size={14} /> WhatsApp
                    </a>
                  </li>
                  <li className="flex items-start gap-2">
                    <MapPin size={14} className="mt-0.5 shrink-0" />
                    <span>{sc['footer_address']}</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
              <p>© {new Date().getFullYear()} AeroTaxi Chile. Todos los derechos reservados.</p>
              <p>Desarrollado con ❤️ en Chile</p>
            </div>
          </div>
        </footer>

      </main>
    </>
  )
}
