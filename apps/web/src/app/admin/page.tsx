'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import type { ApiResponse } from '@aerotaxi/shared'
import { format, subDays, isSameDay, isThisMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import AssignDriverModal from './AssignDriverModal'
import BookingDetailModal, { type AdminBooking } from './BookingDetailModal'
import { AdminSidebar } from '@/components/AdminSidebar'
import AdminNewBookingModal from './AdminNewBookingModal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DriverSummary {
  id: string
  name: string
  photoUrl?: string | null
  isAvailable: boolean
  vehicleType: string | null
  vehiclePlate: string | null
  vehicleBrand: string | null
  vehicleModel: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente', assigned: 'Asignado', confirmed: 'Confirmado',
  rejected: 'Rechazado', en_route: 'En ruta', completed: 'Completado',
  cancelled: 'Cancelado', settled: 'Liquidado',
}
const STATUS_COLOR: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700',
  assigned:  'bg-blue-100 text-blue-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  rejected:  'bg-red-100 text-red-700',
  en_route:  'bg-violet-100 text-violet-700',
  completed: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-red-50 text-red-500',
  settled:   'bg-teal-100 text-teal-700',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user, token, clearAuth, _hasHydrated } = useAuthStore()
  const router = useRouter()

  const [bookings, setBookings]         = useState<AdminBooking[]>([])
  const [drivers,  setDrivers]          = useState<DriverSummary[]>([])
  const [selectedBooking, setSelected]  = useState<AdminBooking | null>(null)
  const [detailBooking,   setDetail]    = useState<AdminBooking | null>(null)
  const [showNewModal,    setShowNew]   = useState(false)

  const loadData = useCallback(async () => {
    if (!token) return
    try {
      const [bRes, dRes] = await Promise.all([
        api.get<ApiResponse<AdminBooking[]>>('/bookings', token),
        api.get<ApiResponse<DriverSummary[]>>('/drivers', token),
      ])
      setBookings(bRes.data ?? [])
      setDrivers(dRes.data ?? [])
    } catch { /* silencioso */ }
  }, [token])

  useEffect(() => {
    if (!_hasHydrated) return
    if (!user || !token) { router.push('/auth/login'); return }
    if (user.role !== 'admin') { router.push('/dashboard'); return }
    loadData()
  }, [_hasHydrated, user, token, loadData, router])

  // ── Derived stats ────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const today      = new Date()
    const todayBk    = bookings.filter((b) => isSameDay(new Date(b.scheduledAt), today))
    const activeBk   = bookings.filter((b) => ['assigned','confirmed','en_route'].includes(b.status))
    const pending    = bookings.filter((b) => ['pending','rejected'].includes(b.status))
    const history    = bookings.filter((b) => ['completed','settled','cancelled'].includes(b.status))
    const completed  = bookings.filter((b) => ['completed','settled'].includes(b.status))
    const cancelled  = bookings.filter((b) => b.status === 'cancelled')
    const monthBk    = bookings.filter((b) => isThisMonth(new Date(b.scheduledAt)))
    const monthComp  = monthBk.filter((b) => ['completed','settled'].includes(b.status))
    const monthRev   = monthComp.reduce((s, b) => s + b.totalPrice, 0)
    const totalRev   = completed.reduce((s, b) => s + b.totalPrice, 0)
    const avgTicket  = completed.length ? Math.round(totalRev / completed.length) : 0
    const compRate   = (completed.length + cancelled.length) > 0
      ? Math.round(completed.length / (completed.length + cancelled.length) * 100)
      : 0
    const availDrv   = drivers.filter((d) => d.isAvailable).length

    // Last 14 days data for bar chart
    const last14 = Array.from({ length: 14 }, (_, i) => {
      const d = subDays(today, 13 - i)
      const dayBk = bookings.filter((b) => isSameDay(new Date(b.scheduledAt), d))
      const dayRev = dayBk.filter((b) => ['completed','settled'].includes(b.status))
        .reduce((s, b) => s + b.totalPrice, 0)
      return {
        date: d,
        label: format(d, 'dd/MM'),
        shortLabel: format(d, 'EEE', { locale: es }).slice(0, 2),
        count: dayBk.length,
        revenue: dayRev,
        isToday: isSameDay(d, today),
      }
    })

    // Status breakdown
    const statusCounts = {
      pending:   pending.length,
      active:    activeBk.length,
      completed: completed.length,
      cancelled: cancelled.length,
    }
    const totalForBreakdown = Object.values(statusCounts).reduce((a, b) => a + b, 0) || 1

    // Urgent: pending without driver, nearest first
    const urgent = pending
      .filter((b) => !b.driverId)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
      .slice(0, 3)

    // Recent 8 bookings
    const recent = [...bookings]
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
      .slice(0, 8)

    return {
      todayCount: todayBk.length, activeBk, pending, history, completed, cancelled,
      monthRev, totalRev, avgTicket, compRate, availDrv,
      last14, statusCounts, totalForBreakdown, urgent, recent, monthBk,
    }
  }, [bookings, drivers])

  const handleConfirmed = (updated: AdminBooking) => {
    setBookings((prev) => prev.map((b) => b.id === updated.id ? { ...b, adminConfirmed: true } : b))
    setDetail((prev) => prev ? { ...prev, adminConfirmed: true } : prev)
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <AdminSidebar active="dashboard" clearAuth={clearAuth} router={router} />

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">

        {/* Top header */}
        <header className="bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between sticky top-0 z-40">
          <div>
            <p className="text-xs text-slate-400 font-medium">{greeting}, {user?.name?.split(' ')[0]}</p>
            <h1 className="text-xl font-black text-slate-900 leading-tight">
              {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {stats.activeBk.length > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                {stats.activeBk.length} viaje{stats.activeBk.length > 1 ? 's' : ''} en curso
              </span>
            )}
            {stats.urgent.length > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
                <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                {stats.urgent.length} sin asignar
              </span>
            )}
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors shadow-sm">
              <span className="material-symbols-outlined text-base">add</span>
              Nuevo viaje
            </button>
          </div>
        </header>

        <div className="px-8 py-6 space-y-6">

          {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard
              icon="calendar_today"
              iconBg="bg-orange-100"
              iconColor="text-orange-600"
              label="Reservas hoy"
              value={String(stats.todayCount)}
              sub={`${stats.monthBk.length} este mes`}
              accent="border-l-orange-500"
              chart={stats.last14.slice(-7).map(d => d.count)}
              chartColor="#f97316"
            />
            <KpiCard
              icon="local_taxi"
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
              label="Viajes activos"
              value={String(stats.activeBk.length)}
              sub={`${stats.pending.length} pendiente${stats.pending.length !== 1 ? 's' : ''}`}
              accent="border-l-blue-500"
              live={stats.activeBk.length > 0}
              chart={[0,0,0,1,0,stats.activeBk.length > 0 ? stats.activeBk.length : 0, stats.activeBk.length]}
              chartColor="#3b82f6"
            />
            <KpiCard
              icon="payments"
              iconBg="bg-emerald-100"
              iconColor="text-emerald-600"
              label="Ingresos del mes"
              value={`$${stats.monthRev.toLocaleString('es-CL')}`}
              sub={`${stats.completed.length} viajes completados`}
              accent="border-l-emerald-500"
              small
              chart={stats.last14.slice(-7).map(d => d.revenue)}
              chartColor="#10b981"
            />
            <KpiCard
              icon="drive_eta"
              iconBg="bg-violet-100"
              iconColor="text-violet-600"
              label="Conductores disponibles"
              value={`${stats.availDrv} / ${drivers.length}`}
              sub={`${drivers.length - stats.availDrv} fuera de línea`}
              accent="border-l-violet-500"
              chart={[2,2,3,3,stats.availDrv,stats.availDrv,stats.availDrv]}
              chartColor="#8b5cf6"
            />
          </div>

          {/* ── Charts row ────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

            {/* Bar chart: 14 días */}
            <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Actividad últimos 14 días</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Reservas programadas por día</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-brand-500 rounded-sm inline-block" />Hoy</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-slate-200 rounded-sm inline-block" />Días anteriores</span>
                </div>
              </div>
              <BookingBarChart data={stats.last14} />
            </div>

            {/* Stats sidebar */}
            <div className="space-y-4">

              {/* Status breakdown */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h3 className="font-black text-slate-900 text-sm mb-3">Estado de reservas</h3>
                <div className="space-y-2.5">
                  {[
                    { key: 'pending',   label: 'Pendientes',  count: stats.statusCounts.pending,   color: 'bg-amber-400' },
                    { key: 'active',    label: 'Activos',     count: stats.statusCounts.active,    color: 'bg-blue-500' },
                    { key: 'completed', label: 'Completados', count: stats.statusCounts.completed, color: 'bg-emerald-500' },
                    { key: 'cancelled', label: 'Cancelados',  count: stats.statusCounts.cancelled, color: 'bg-red-400' },
                  ].map(({ label, count, color }) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-slate-600 font-medium">{label}</span>
                          <span className="text-xs font-bold text-slate-900">{count}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${color}`}
                            style={{ width: `${Math.round((count / stats.totalForBreakdown) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Métricas clave */}
              <div className="bg-slate-900 rounded-2xl p-5 space-y-4">
                <h3 className="font-black text-white text-sm">Métricas clave</h3>
                {[
                  { label: 'Tasa de completitud', value: `${stats.compRate}%`, icon: 'check_circle', color: 'text-emerald-400' },
                  { label: 'Ticket promedio',      value: `$${stats.avgTicket.toLocaleString('es-CL')}`, icon: 'receipt', color: 'text-brand-400' },
                  { label: 'Total facturado',      value: `$${stats.totalRev.toLocaleString('es-CL')}`, icon: 'savings', color: 'text-violet-400' },
                ].map(({ label, value, icon, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`material-symbols-outlined text-base ${color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                      <span className="text-xs text-slate-400">{label}</span>
                    </div>
                    <span className={`text-sm font-black ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Mid row: Recent + Urgent + Fleet ─────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

            {/* Recent bookings */}
            <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
                <h3 className="font-black text-slate-900 text-sm">Últimas reservas</h3>
                <span className="text-xs text-slate-400">{stats.recent.length} registros</span>
              </div>
              <div className="divide-y divide-slate-50">
                {stats.recent.length === 0 ? (
                  <div className="py-10 text-center text-slate-400">
                    <span className="material-symbols-outlined text-3xl block mb-1">inbox</span>
                    <p className="text-sm">Sin reservas aún</p>
                  </div>
                ) : stats.recent.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setDetail(b)}
                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      b.direction === 'to_airport' ? 'bg-blue-50' : 'bg-emerald-50'
                    }`}>
                      <span className={`material-symbols-outlined text-sm ${
                        b.direction === 'to_airport' ? 'text-blue-500' : 'text-emerald-500'
                      }`} style={{ fontVariationSettings: "'FILL' 1" }}>
                        {b.direction === 'to_airport' ? 'flight_takeoff' : 'flight_land'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {b.clientName ?? 'Cliente'} · {b.origin?.split(',')[0]} → {b.destination?.split(',')[0]}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {format(new Date(b.scheduledAt), "d MMM · HH:mm", { locale: es })} · {b.vehicleType}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[b.status] ?? 'bg-slate-100 text-slate-500'}`}>
                        {STATUS_LABELS[b.status] ?? b.status}
                      </span>
                      <span className="text-xs font-black text-slate-800">${b.totalPrice.toLocaleString('es-CL')}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right column: Urgent + Fleet */}
            <div className="space-y-4">

              {/* Urgentes */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-50 bg-amber-50">
                  <span className="material-symbols-outlined text-sm text-amber-600" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                  <h3 className="font-black text-amber-800 text-sm">Sin conductor asignado</h3>
                  {stats.urgent.length > 0 && (
                    <span className="ml-auto text-[11px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-full">
                      {stats.urgent.length}
                    </span>
                  )}
                </div>
                {stats.urgent.length === 0 ? (
                  <div className="px-5 py-6 text-center">
                    <span className="material-symbols-outlined text-2xl text-emerald-400 block mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <p className="text-xs text-slate-400 font-medium">Todo asignado ✓</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {stats.urgent.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => setSelected(b)}
                        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-amber-50/50 transition-colors text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{b.clientName ?? 'Cliente'}</p>
                          <p className="text-[10px] text-slate-400">
                            {format(new Date(b.scheduledAt), "d MMM · HH:mm", { locale: es })}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-lg flex items-center gap-1 shrink-0">
                          Asignar
                          <span className="material-symbols-outlined text-xs">chevron_right</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Conductores */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-50">
                  <h3 className="font-black text-slate-900 text-sm">Flota</h3>
                </div>
                <div className="divide-y divide-slate-50 max-h-52 overflow-y-auto">
                  {drivers.length === 0 && (
                    <div className="py-6 text-center text-xs text-slate-400">
                      Sin conductores registrados
                    </div>
                  )}
                  {drivers.slice(0, 5).map((d) => (
                    <div key={d.id} className="flex items-center gap-3 px-5 py-2.5">
                      <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white font-black text-[10px] shrink-0">
                        {d.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{d.name.split(' ').slice(0, 2).join(' ')}</p>
                        <p className="text-[10px] text-slate-400">{d.vehiclePlate ?? 'Sin vehículo'}</p>
                      </div>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${d.isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* ── Modals ──────────────────────────────────────────────────────────────── */}
      {showNewModal && token && (
        <AdminNewBookingModal
          token={token}
          onClose={() => setShowNew(false)}
          onSuccess={() => { setShowNew(false); loadData() }}
        />
      )}
      {detailBooking && token && (
        <BookingDetailModal
          booking={detailBooking}
          token={token}
          onClose={() => setDetail(null)}
          onConfirmed={handleConfirmed}
          onAssign={() => { setSelected(detailBooking); setDetail(null) }}
        />
      )}
      {selectedBooking && token && (
        <AssignDriverModal
          booking={selectedBooking as any}
          token={token}
          onClose={() => setSelected(null)}
          onSuccess={() => { setSelected(null); loadData() }}
        />
      )}
    </div>
  )
}


// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon, iconBg, iconColor, label, value, sub, accent, live, small, chart, chartColor,
}: {
  icon: string; iconBg: string; iconColor: string; label: string; value: string
  sub: string; accent: string; live?: boolean; small?: boolean; chart: number[]; chartColor: string
}) {
  return (
    <div className={`bg-white rounded-2xl border-l-4 ${accent} border-t border-r border-b border-slate-100 shadow-sm p-5 flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center`}>
          <span className={`material-symbols-outlined text-lg ${iconColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        </div>
        {live && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />LIVE
          </span>
        )}
      </div>
      <div>
        <p className={`font-black text-slate-900 leading-tight ${small ? 'text-lg' : 'text-2xl'}`}>{value}</p>
        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mt-0.5">{label}</p>
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className="text-[11px] text-slate-500">{sub}</p>
        <MiniSparkline values={chart} color={chartColor} />
      </div>
    </div>
  )
}

// ─── Mini sparkline ───────────────────────────────────────────────────────────

function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1)
  const W = 56
  const H = 22
  const step = W / (values.length - 1 || 1)
  const pts = values.map((v, i) => ({ x: i * step, y: H - (v / max) * (H - 2) + 1 }))
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const area = `${d} L ${W} ${H} L 0 ${H} Z`

  return (
    <svg width={W} height={H} className="shrink-0">
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${color.replace('#', '')})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Booking bar chart ────────────────────────────────────────────────────────

function BookingBarChart({ data }: {
  data: { label: string; shortLabel: string; count: number; isToday: boolean }[]
}) {
  const max = Math.max(...data.map(d => d.count), 1)
  const BAR_W = 18
  const GAP   = 6
  const H     = 90
  const LBL_H = 18
  const totalW = data.length * (BAR_W + GAP) - GAP

  return (
    <div className="overflow-x-auto">
      <svg width={totalW} height={H + LBL_H} className="min-w-full">
        {data.map((d, i) => {
          const barH = d.count > 0 ? Math.max((d.count / max) * H, 6) : 0
          const x = i * (BAR_W + GAP)
          const y = H - barH
          const fill = d.isToday ? '#f97316' : '#e2e8f0'
          const textFill = d.isToday ? '#f97316' : '#94a3b8'
          return (
            <g key={i}>
              {/* Background track */}
              <rect x={x} y={0} width={BAR_W} height={H} rx={4} fill="#f8fafc" />
              {/* Bar */}
              {barH > 0 && (
                <rect x={x} y={y} width={BAR_W} height={barH} rx={4} fill={fill} />
              )}
              {/* Count label */}
              {d.count > 0 && (
                <text x={x + BAR_W / 2} y={y - 4} textAnchor="middle" fontSize={9} fill={textFill} fontWeight="700">
                  {d.count}
                </text>
              )}
              {/* Day label */}
              <text x={x + BAR_W / 2} y={H + LBL_H - 3} textAnchor="middle" fontSize={9}
                fill={textFill} fontWeight={d.isToday ? '700' : '400'}>
                {d.shortLabel}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

