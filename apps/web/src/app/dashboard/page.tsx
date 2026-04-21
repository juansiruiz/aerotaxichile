'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import type { Booking, ApiResponse } from '@aerotaxi/shared'
import { format, isPast, isFuture } from 'date-fns'
import { es } from 'date-fns/locale'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  pending:   'Pendiente',
  assigned:  'Conductor asignado',
  confirmed: 'Confirmado',
  rejected:  'Rechazado',
  en_route:  'En camino',
  completed: 'Completado',
  cancelled: 'Cancelado',
  settled:   'Liquidado',
}

const STATUS_ICON: Record<string, string> = {
  pending:   'schedule',
  assigned:  'person_pin',
  confirmed: 'check_circle',
  rejected:  'cancel',
  en_route:  'directions_car',
  completed: 'task_alt',
  cancelled: 'do_not_disturb_on',
  settled:   'paid',
}

const STATUS_COLOR: Record<string, { bg: string; text: string; ring: string }> = {
  pending:   { bg: 'bg-amber-50',   text: 'text-amber-700',  ring: 'ring-amber-200' },
  assigned:  { bg: 'bg-blue-50',    text: 'text-blue-700',   ring: 'ring-blue-200'  },
  confirmed: { bg: 'bg-emerald-50', text: 'text-emerald-700',ring: 'ring-emerald-200'},
  rejected:  { bg: 'bg-red-50',     text: 'text-red-700',    ring: 'ring-red-200'   },
  en_route:  { bg: 'bg-violet-50',  text: 'text-violet-700', ring: 'ring-violet-200'},
  completed: { bg: 'bg-slate-50',   text: 'text-slate-600',  ring: 'ring-slate-200' },
  cancelled: { bg: 'bg-red-50',     text: 'text-red-700',    ring: 'ring-red-200'   },
  settled:   { bg: 'bg-slate-50',   text: 'text-slate-600',  ring: 'ring-slate-200' },
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, token, clearAuth, _hasHydrated } = useAuthStore()
  const router = useRouter()

  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<'upcoming' | 'past'>('upcoming')

  useEffect(() => {
    if (!_hasHydrated) return
    if (!user || !token) { router.push('/auth/login'); return }

    api.get<ApiResponse<Booking[]>>('/bookings', token)
      .then((res) => setBookings(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [_hasHydrated, user, token, router])

  const upcoming = bookings.filter((b) =>
    !['completed', 'cancelled', 'settled'].includes(b.status) ||
    isFuture(new Date(b.scheduledAt))
  )
  const past = bookings.filter((b) =>
    ['completed', 'cancelled', 'settled'].includes(b.status) &&
    isPast(new Date(b.scheduledAt))
  )
  const shown = tab === 'upcoming' ? upcoming : past

  if (!_hasHydrated || (!user && !token)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-brand-500 text-4xl">progress_activity</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Top App Bar ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="material-symbols-outlined text-brand-500 text-2xl">flight_takeoff</span>
            <span className="font-bold text-slate-900 tracking-tight hidden sm:block">AeroTaxi Chile</span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                {user?.name ? initials(user.name) : '?'}
              </div>
              <span className="text-sm font-medium text-slate-700 hidden sm:block">
                {user?.name?.split(' ')[0]}
              </span>
            </Link>

            <button
              onClick={() => { clearAuth(); router.push('/') }}
              className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500 hover:text-red-500"
              title="Cerrar sesión"
            >
              <span className="material-symbols-outlined text-xl">logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* ── Banner de bienvenida ── */}
        <div className="bg-gradient-to-r from-brand-500 to-brand-600 rounded-2xl p-5 text-white shadow-md">
          <p className="text-sm opacity-80 mb-0.5">Bienvenido de vuelta,</p>
          <h1 className="text-xl font-bold">{user?.name?.split(' ')[0]} 👋</h1>
          <div className="mt-4 flex items-center gap-3">
            <Link
              href="/booking"
              className="inline-flex items-center gap-1.5 bg-white text-brand-600 font-semibold text-sm px-4 py-2 rounded-full shadow hover:shadow-md transition-shadow"
            >
              <span className="material-symbols-outlined text-base">add_circle</span>
              Nueva reserva
            </Link>
            <Link
              href="/profile"
              className="inline-flex items-center gap-1.5 bg-white/20 text-white font-medium text-sm px-4 py-2 rounded-full hover:bg-white/30 transition-colors"
            >
              <span className="material-symbols-outlined text-base">manage_accounts</span>
              Mi perfil
            </Link>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex bg-white rounded-xl border border-slate-200 p-1 gap-1">
          {(['upcoming', 'past'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                tab === t
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'upcoming' ? `Próximas (${upcoming.length})` : `Historial (${past.length})`}
            </button>
          ))}
        </div>

        {/* ── Lista de reservas ── */}
        {loading ? (
          <div className="flex flex-col items-center py-14 gap-3">
            <span className="material-symbols-outlined animate-spin text-brand-400 text-5xl">progress_activity</span>
            <p className="text-slate-400 text-sm">Cargando reservas…</p>
          </div>
        ) : shown.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <div className="space-y-3">
            {shown.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

// ─── Booking Card ─────────────────────────────────────────────────────────────

function BookingCard({ booking: b }: { booking: Booking }) {
  const colors = STATUS_COLOR[b.status] ?? STATUS_COLOR.pending
  const icon   = STATUS_ICON[b.status]  ?? 'schedule'
  const label  = STATUS_LABEL[b.status] ?? b.status

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Color accent top bar */}
      <div className={`h-1 ${colors.bg} border-b ${colors.ring}`} />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Direction + date */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="material-symbols-outlined text-brand-500 text-lg">
                {b.direction === 'to_airport' ? 'flight_takeoff' : 'flight_land'}
              </span>
              <span className="text-sm font-semibold text-slate-900">
                {b.direction === 'to_airport' ? 'Al aeropuerto' : 'Desde aeropuerto'}
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">calendar_today</span>
              {format(new Date(b.scheduledAt), "EEEE dd 'de' MMMM · HH:mm", { locale: es })}
            </p>
          </div>

          {/* Status badge */}
          <span
            className={`shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ${colors.bg} ${colors.text} ${colors.ring}`}
          >
            <span className="material-symbols-outlined text-sm">{icon}</span>
            {label}
          </span>
        </div>

        {/* Route */}
        <div className="rounded-xl bg-slate-50 p-3 space-y-2 text-xs text-slate-600 mb-3">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-base text-slate-400 shrink-0 mt-0.5">radio_button_checked</span>
            <span className="line-clamp-2">{b.origin}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-base text-brand-400 shrink-0 mt-0.5">location_on</span>
            <span className="line-clamp-2">{b.destination}</span>
          </div>
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            {/* Vehicle */}
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">directions_car</span>
              {b.vehicleType === 'sedan'   ? 'Sedan VIP'  :
               b.vehicleType === 'suv'     ? 'SUV'        :
               b.vehicleType === 'minivan' ? 'Minivan'    : 'Van'}
            </span>
            {/* Passengers */}
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">group</span>
              {b.passengerCount} pax
            </span>
            {/* Payment */}
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">
                {b.paymentMethod === 'cash' ? 'payments' : 'credit_card'}
              </span>
              {b.paymentMethod === 'cash' ? 'Efectivo' : 'Online'}
            </span>
          </div>

          {/* Price */}
          <span className="font-black text-base text-brand-600">
            ${b.totalPrice.toLocaleString('es-CL')}
            <span className="text-xs font-normal text-slate-400 ml-1">CLP</span>
          </span>
        </div>

        {/* Booking ID */}
        <p className="text-right text-[10px] text-slate-300 mt-2 tracking-wider">
          #{b.id.slice(-8).toUpperCase()}
        </p>
      </div>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: 'upcoming' | 'past' }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-10 flex flex-col items-center text-center gap-4">
      <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-brand-300">
          {tab === 'upcoming' ? 'flight_takeoff' : 'history'}
        </span>
      </div>
      <div>
        <p className="font-semibold text-slate-700 mb-1">
          {tab === 'upcoming' ? 'No tienes reservas próximas' : 'Sin historial de viajes'}
        </p>
        <p className="text-sm text-slate-400">
          {tab === 'upcoming'
            ? 'Reserva tu traslado al aeropuerto en minutos.'
            : 'Tus viajes completados aparecerán aquí.'}
        </p>
      </div>
      {tab === 'upcoming' && (
        <Link
          href="/booking"
          className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-5 py-2.5 rounded-full transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-base">add_circle</span>
          Reservar ahora
        </Link>
      )}
    </div>
  )
}
