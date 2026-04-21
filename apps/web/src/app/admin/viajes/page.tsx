'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import type { ApiResponse } from '@aerotaxi/shared'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import AssignDriverModal from '../AssignDriverModal'
import BookingDetailModal, { type AdminBooking } from '../BookingDetailModal'
import AdminNewBookingModal from '../AdminNewBookingModal'
import { AdminSidebar } from '@/components/AdminSidebar'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DriverSummary {
  id: string
  name: string
  isAvailable: boolean
  vehicleType: string | null
  vehiclePlate: string | null
  vehicleBrand: string | null
  vehicleModel: string | null
}

type Tab = 'pending' | 'active' | 'history' | 'cancelled'

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

export default function ViajesPage() {
  const { user, token, clearAuth, _hasHydrated } = useAuthStore()
  const router = useRouter()

  const [bookings,  setBookings]  = useState<AdminBooking[]>([])
  const [drivers,   setDrivers]   = useState<DriverSummary[]>([])
  const [loading,   setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('pending')
  const [search,    setSearch]    = useState('')
  const [selected,       setSelected]      = useState<AdminBooking | null>(null)
  const [detail,         setDetail]        = useState<AdminBooking | null>(null)
  const [showNewModal,   setShowNewModal]   = useState(false)
  const [cancelTarget,   setCancelTarget]   = useState<AdminBooking | null>(null)
  const [cancelling,     setCancelling]     = useState(false)

  const loadData = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const [bRes, dRes] = await Promise.all([
        api.get<ApiResponse<AdminBooking[]>>('/bookings?pageSize=200', token),
        api.get<ApiResponse<DriverSummary[]>>('/drivers', token),
      ])
      setBookings(bRes.data ?? [])
      setDrivers(dRes.data ?? [])
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => {
    if (!_hasHydrated) return
    if (!user || !token) { router.push('/auth/login'); return }
    if (user.role !== 'admin') { router.push('/dashboard'); return }
    loadData()
  }, [_hasHydrated, user, token, loadData, router])

  // ── Tabs ─────────────────────────────────────────────────────────────────────

  const pending   = useMemo(() => bookings.filter((b) => ['pending', 'rejected'].includes(b.status)), [bookings])
  const active    = useMemo(() => bookings.filter((b) => ['assigned', 'confirmed', 'en_route'].includes(b.status)), [bookings])
  const history   = useMemo(() => bookings.filter((b) => ['completed', 'settled'].includes(b.status)), [bookings])
  const cancelled = useMemo(() => bookings.filter((b) => b.status === 'cancelled'), [bookings])

  const tabBookings =
    activeTab === 'pending'   ? pending   :
    activeTab === 'active'    ? active    :
    activeTab === 'cancelled' ? cancelled :
    history

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return tabBookings
    return tabBookings.filter((b) =>
      b.origin?.toLowerCase().includes(q) ||
      b.destination?.toLowerCase().includes(q) ||
      b.clientName?.toLowerCase().includes(q) ||
      b.clientPhone?.includes(q)
    )
  }, [tabBookings, search])

  const handleCancel = async () => {
    if (!cancelTarget || !token) return
    setCancelling(true)
    try {
      await api.patch(`/bookings/${cancelTarget.id}/cancel`, {}, token)
      setBookings((prev) => prev.map((b) => b.id === cancelTarget.id ? { ...b, status: 'cancelled' as const } : b))
      setCancelTarget(null)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al cancelar')
    } finally {
      setCancelling(false)
    }
  }

  const handleConfirmed = (updated: AdminBooking) => {
    setBookings((prev) => prev.map((b) => b.id === updated.id ? { ...b, adminConfirmed: true } : b))
    setDetail((prev) => prev ? { ...prev, adminConfirmed: true } : prev)
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <AdminSidebar active="viajes" clearAuth={clearAuth} router={router} />

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">

        {/* Header */}
        <header className="bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between sticky top-0 z-40">
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Gestión de Viajes</p>
            <h1 className="text-xl font-black text-slate-900 leading-tight">Reservas</h1>
          </div>
          <div className="flex items-center gap-3">
            {active.length > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                {active.length} en curso
              </span>
            )}
            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors shadow-sm">
              <span className="material-symbols-outlined text-base">add</span>
              Nuevo viaje
            </button>
          </div>
        </header>

        <div className="px-8 py-6">

          {/* ── Stats row ───────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Pendientes',   count: pending.length,                   color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-l-amber-500',   icon: 'pending_actions' },
              { label: 'En curso',     count: active.length,                    color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-l-blue-500',    icon: 'local_taxi'       },
              { label: 'Completados',  count: history.length,    color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-l-emerald-500', icon: 'check_circle' },
              { label: 'Cancelados',   count: cancelled.length,  color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-l-red-500',    icon: 'cancel'      },
            ].map(({ label, count, color, bg, border, icon }) => (
              <div key={label} className={`bg-white rounded-2xl border-l-4 ${border} border-t border-r border-b border-slate-100 shadow-sm p-5`}>
                <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                  <span className={`material-symbols-outlined text-lg ${color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                </div>
                <p className="text-2xl font-black text-slate-900">{count}</p>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* ── Booking management ─────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

            {/* Search + tabs header */}
            <div className="flex items-center justify-between px-6 pt-4 pb-0 border-b border-slate-100">
              <div className="flex gap-1">
                {([
                  { key: 'pending'   as const, label: 'Pendientes', badge: pending.length   },
                  { key: 'active'    as const, label: 'En Curso',   badge: active.length    },
                  { key: 'history'   as const, label: 'Completados',badge: undefined        },
                  { key: 'cancelled' as const, label: 'Cancelados', badge: cancelled.length > 0 ? cancelled.length : undefined },
                ]).map(({ key, label, badge }) => (
                  <button key={key} onClick={() => setActiveTab(key)}
                    className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                      activeTab === key
                        ? 'border-brand-500 text-brand-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}>
                    {label}
                    {badge !== undefined && badge > 0 && (
                      <span className="ml-1.5 bg-brand-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{badge}</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="relative mb-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">search</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar cliente, dirección…"
                  className="pl-9 pr-4 py-2 text-sm bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-brand-400 focus:outline-none w-72"
                />
              </div>
            </div>

            {/* Booking list */}
            <div className="divide-y divide-slate-50">
              {loading ? (
                <div className="flex justify-center py-20">
                  <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center py-20 text-slate-400 gap-2">
                  <span className="material-symbols-outlined text-5xl">
                    {activeTab === 'pending' ? 'task_alt' : activeTab === 'active' ? 'play_circle' : activeTab === 'cancelled' ? 'cancel' : 'history'}
                  </span>
                  <p className="font-semibold text-sm">
                    {activeTab === 'pending' ? 'Sin reservas pendientes' : activeTab === 'active' ? 'Sin viajes en curso' : activeTab === 'cancelled' ? 'Sin reservas canceladas' : 'Sin historial'}
                  </p>
                  {search && <p className="text-xs">Prueba con otra búsqueda</p>}
                </div>
              ) : (
                filtered.map((b) => (
                  <TripRow
                    key={b.id}
                    booking={b}
                    isPending={activeTab === 'pending'}
                    onDetail={() => setDetail(b)}
                    onAssign={() => setSelected(b)}
                    onCancel={() => setCancelTarget(b)}
                  />
                ))
              )}
            </div>

            {/* Footer count */}
            {!loading && filtered.length > 0 && (
              <div className="px-6 py-3 border-t border-slate-50 bg-slate-50/50">
                <p className="text-xs text-slate-400">{filtered.length} reserva{filtered.length !== 1 ? 's' : ''}</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Modals ──────────────────────────────────────────────────────────────── */}
      {showNewModal && token && (
        <AdminNewBookingModal
          token={token}
          onClose={() => setShowNewModal(false)}
          onSuccess={() => { setShowNewModal(false); loadData() }}
        />
      )}
      {detail && token && (
        <BookingDetailModal
          booking={detail}
          token={token}
          onClose={() => setDetail(null)}
          onConfirmed={handleConfirmed}
          onAssign={() => { setSelected(detail); setDetail(null) }}
        />
      )}
      {selected && token && (
        <AssignDriverModal
          booking={selected as any}
          token={token}
          onClose={() => setSelected(null)}
          onSuccess={() => { setSelected(null); loadData() }}
        />
      )}

      {/* ── Modal confirmar cancelación ──────────────────────────────────────── */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-red-600" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
              </div>
              <div>
                <p className="font-black text-slate-900 text-base">Cancelar reserva</p>
                <p className="text-xs text-slate-400">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl px-4 py-3 mb-5 text-sm text-slate-700 space-y-1">
              <p><span className="font-semibold">Cliente:</span> {cancelTarget.clientName ?? '—'}</p>
              <p><span className="font-semibold">Origen:</span> {cancelTarget.origin?.split(',')[0]}</p>
              <p><span className="font-semibold">Fecha:</span> {format(new Date(cancelTarget.scheduledAt), "dd MMM · HH:mm", { locale: es })}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelTarget(null)}
                disabled={cancelling}
                className="flex-1 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50">
                Volver
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 py-2.5 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {cancelling
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Cancelando…</>
                  : 'Sí, cancelar reserva'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Trip row ─────────────────────────────────────────────────────────────────

function TripRow({
  booking: b, isPending, onDetail, onAssign, onCancel,
}: {
  booking: AdminBooking; isPending: boolean
  onDetail: () => void; onAssign: () => void; onCancel: () => void
}) {
  const cancellable = ['pending', 'assigned', 'confirmed'].includes(b.status)

  return (
    <div className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 transition-colors">
      {/* Direction icon */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
        b.direction === 'to_airport' ? 'bg-blue-50' : 'bg-emerald-50'
      }`}>
        <span className={`material-symbols-outlined text-base ${
          b.direction === 'to_airport' ? 'text-blue-500' : 'text-emerald-500'
        }`} style={{ fontVariationSettings: "'FILL' 1" }}>
          {b.direction === 'to_airport' ? 'flight_takeoff' : 'flight_land'}
        </span>
      </div>

      {/* Route */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">
          {b.origin?.split(',')[0]} <span className="text-slate-400">→</span> {b.destination?.split(',')[0]}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          {b.clientName ?? '—'} · {format(new Date(b.scheduledAt), 'dd MMM · HH:mm', { locale: es })} · {b.vehicleType} · {b.passengerCount} pax
        </p>
      </div>

      {/* Status + price */}
      <div className="flex items-center gap-3 shrink-0">
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${STATUS_COLOR[b.status] ?? 'bg-slate-100 text-slate-500'}`}>
          {STATUS_LABELS[b.status] ?? b.status}
        </span>
        <span className="text-sm font-black text-slate-900 w-20 text-right">
          ${b.totalPrice.toLocaleString('es-CL')}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={onDetail}
          className="text-xs font-semibold text-slate-500 hover:text-brand-600 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors">
          Detalle
        </button>
        {/* Confirmar: solo si aún no fue confirmada */}
        {isPending && !b.adminConfirmed && (
          <button onClick={onDetail}
            className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg transition-colors">
            Confirmar
          </button>
        )}
        {/* Asignar: solo si ya fue confirmada y no tiene conductor */}
        {isPending && b.adminConfirmed && !b.driverId && (
          <button onClick={onAssign}
            className="text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 px-3 py-1.5 rounded-lg transition-colors">
            Asignar
          </button>
        )}
        {/* Cancelar: mientras sea cancelable */}
        {cancellable && (
          <button onClick={onCancel}
            className="text-xs font-bold text-red-600 hover:text-white hover:bg-red-500 border border-red-200 hover:border-red-500 px-3 py-1.5 rounded-lg transition-colors">
            Cancelar
          </button>
        )}
      </div>
    </div>
  )
}
