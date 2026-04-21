'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import type { ApiResponse } from '@aerotaxi/shared'
import {
  Plane, Calendar, Clock, MapPin, Car, Users,
  ChevronRight, Edit2, X, Check, AlertTriangle,
  Plus, ArrowLeft,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Booking {
  id: string
  direction: 'to_airport' | 'from_airport'
  origin: string
  destination: string
  scheduledAt: string
  passengerCount: number
  vehicleType: string
  totalPrice: number
  paymentMethod: string
  status: string
  adminNotes: string | null
  driverNotes: string | null
  createdAt: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AIRPORT = 'Aeropuerto Internacional Arturo Merino Benítez, Pudahuel'

const VEHICLE_LABELS: Record<string, string> = {
  sedan: 'Sedan VIP', suv: 'SUV', minivan: 'Minivan', van: 'Van',
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  pending:   { label: 'Pendiente',    color: 'bg-amber-50 text-amber-700 border-amber-200',   dot: 'bg-amber-400' },
  assigned:  { label: 'Conductor asignado', color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-400' },
  confirmed: { label: 'Confirmado',   color: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-400' },
  en_route:  { label: 'En camino',    color: 'bg-cyan-50 text-cyan-700 border-cyan-200',       dot: 'bg-cyan-400' },
  completed: { label: 'Completado',   color: 'bg-green-50 text-green-700 border-green-200',    dot: 'bg-green-400' },
  cancelled: { label: 'Cancelado',    color: 'bg-red-50 text-red-700 border-red-200',          dot: 'bg-red-400' },
  settled:   { label: 'Liquidado',    color: 'bg-slate-50 text-slate-600 border-slate-200',    dot: 'bg-slate-400' },
  rejected:  { label: 'Rechazado',    color: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-400' },
}

const ACTIVE_STATUSES  = ['pending', 'assigned', 'confirmed', 'en_route']
const EDITABLE_STATUSES  = ['pending']
const CANCELLABLE_STATUSES = ['pending', 'assigned', 'confirmed']

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MisReservasPage() {
  const { user, token, _hasHydrated } = useAuthStore()
  const router = useRouter()

  const [bookings, setBookings]   = useState<Booking[]>([])
  const [loading,  setLoading]    = useState(true)
  const [tab,      setTab]        = useState<'proximas' | 'historial'>('proximas')

  // Edit state
  const [editingId,    setEditingId]    = useState<string | null>(null)
  const [editOrigin,   setEditOrigin]   = useState('')
  const [editDest,     setEditDest]     = useState('')
  const [editDate,     setEditDate]     = useState('')
  const [editTime,     setEditTime]     = useState('')
  const [editPax,      setEditPax]      = useState(1)
  const [editLoading,  setEditLoading]  = useState(false)
  const [editError,    setEditError]    = useState('')

  // Cancel state
  const [cancelingId,  setCancelingId]  = useState<string | null>(null)
  const [cancelLoading, setCancelLoading] = useState(false)

  // ── Load bookings ──────────────────────────────────────────────────────────
  const loadBookings = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await api.get<ApiResponse<Booking[]>>('/bookings?pageSize=100', token)
      setBookings(res.data ?? [])
    } catch { /* silencioso */ }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => {
    if (!_hasHydrated) return
    if (!user || !token) { router.push('/auth/login'); return }
    if (user.role !== 'client') { router.push('/dashboard'); return }
    loadBookings()
  }, [_hasHydrated, user, token, loadBookings, router])

  // ── Split into tabs ────────────────────────────────────────────────────────
  const proximas  = bookings.filter((b) => ACTIVE_STATUSES.includes(b.status))
  const historial = bookings.filter((b) => !ACTIVE_STATUSES.includes(b.status))

  // ── Open edit form ─────────────────────────────────────────────────────────
  const openEdit = (b: Booking) => {
    setEditingId(b.id)
    setEditError('')
    // Free address: to_airport → origin is free, from_airport → destination is free
    setEditOrigin(b.direction === 'to_airport' ? b.origin : '')
    setEditDest(b.direction === 'from_airport' ? b.destination : '')
    // Parse scheduledAt
    const d = new Date(b.scheduledAt)
    setEditDate(d.toISOString().split('T')[0]!)
    setEditTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)
    setEditPax(b.passengerCount)
  }

  const closeEdit = () => {
    setEditingId(null)
    setEditError('')
  }

  // ── Submit edit ────────────────────────────────────────────────────────────
  const handleEdit = async (b: Booking) => {
    setEditLoading(true)
    setEditError('')
    try {
      const scheduledAt = `${editDate}T${editTime}:00`
      const body: Record<string, unknown> = { scheduledAt, passengerCount: editPax }
      if (b.direction === 'to_airport')   body.origin      = editOrigin
      if (b.direction === 'from_airport') body.destination = editDest

      await api.patch<ApiResponse<Booking>>(`/bookings/${b.id}/edit`, body, token!)
      await loadBookings()
      closeEdit()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setEditLoading(false)
    }
  }

  // ── Cancel booking ─────────────────────────────────────────────────────────
  const handleCancel = async (id: string) => {
    setCancelLoading(true)
    try {
      await api.patch<ApiResponse<Booking>>(`/bookings/${id}/cancel`, {}, token!)
      await loadBookings()
      setCancelingId(null)
    } catch { /* silencioso */ }
    finally { setCancelLoading(false) }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-black text-slate-900">Mis reservas</h1>
            <p className="text-xs text-slate-400">Hola {user?.name?.split(' ')[0]} 👋</p>
          </div>
          <Link
            href="/booking"
            className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors"
          >
            <Plus size={15} />
            Nueva
          </Link>
        </div>

        {/* Tabs */}
        <div className="max-w-2xl mx-auto px-4 flex gap-1 pb-0">
          {([['proximas', 'Próximas', proximas.length], ['historial', 'Historial', historial.length]] as const).map(
            ([key, label, count]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                  tab === key
                    ? 'border-brand-500 text-brand-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {label}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  tab === key ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            ),
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {(tab === 'proximas' ? proximas : historial).length === 0 ? (
              <EmptyState tab={tab} />
            ) : (
              (tab === 'proximas' ? proximas : historial).map((b) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  isEditing={editingId === b.id}
                  isCanceling={cancelingId === b.id}
                  editOrigin={editOrigin} setEditOrigin={setEditOrigin}
                  editDest={editDest} setEditDest={setEditDest}
                  editDate={editDate} setEditDate={setEditDate}
                  editTime={editTime} setEditTime={setEditTime}
                  editPax={editPax} setEditPax={setEditPax}
                  editLoading={editLoading}
                  editError={editError}
                  cancelLoading={cancelLoading}
                  onOpenEdit={() => openEdit(b)}
                  onCloseEdit={closeEdit}
                  onSaveEdit={() => handleEdit(b)}
                  onRequestCancel={() => setCancelingId(b.id)}
                  onConfirmCancel={() => handleCancel(b.id)}
                  onDismissCancel={() => setCancelingId(null)}
                />
              ))
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Booking card ─────────────────────────────────────────────────────────────

interface CardProps {
  booking: Booking
  isEditing: boolean; isCanceling: boolean
  editOrigin: string; setEditOrigin: (v: string) => void
  editDest: string; setEditDest: (v: string) => void
  editDate: string; setEditDate: (v: string) => void
  editTime: string; setEditTime: (v: string) => void
  editPax: number; setEditPax: (v: number) => void
  editLoading: boolean; editError: string
  cancelLoading: boolean
  onOpenEdit: () => void; onCloseEdit: () => void; onSaveEdit: () => void
  onRequestCancel: () => void; onConfirmCancel: () => void; onDismissCancel: () => void
}

function BookingCard({
  booking: b, isEditing, isCanceling,
  editOrigin, setEditOrigin, editDest, setEditDest,
  editDate, setEditDate, editTime, setEditTime,
  editPax, setEditPax,
  editLoading, editError, cancelLoading,
  onOpenEdit, onCloseEdit, onSaveEdit,
  onRequestCancel, onConfirmCancel, onDismissCancel,
}: CardProps) {
  const sc = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.pending!
  const vLabel = VEHICLE_LABELS[b.vehicleType] ?? b.vehicleType
  const isEditable    = EDITABLE_STATUSES.includes(b.status)
  const isCancellable = CANCELLABLE_STATUSES.includes(b.status)
  const isToAirport   = b.direction === 'to_airport'
  const freeAddress   = isToAirport ? b.origin : b.destination
  const todayStr = new Date().toISOString().split('T')[0]!

  let dateStr = '—'
  try { dateStr = format(new Date(b.scheduledAt), "dd MMM yyyy · HH:mm", { locale: es }) } catch { /* */ }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Card top: accent bar */}
      <div className={`h-1 ${b.status === 'cancelled' ? 'bg-red-400' : b.status === 'completed' ? 'bg-green-400' : 'bg-brand-500'}`} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isToAirport ? 'bg-blue-50' : 'bg-orange-50'
            }`}>
              <Plane size={16} className={isToAirport ? 'text-blue-500' : 'text-brand-500'} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">
                {isToAirport ? 'Al aeropuerto ✈️' : 'Desde aeropuerto 🛬'}
              </p>
              <p className="text-xs text-slate-400 font-mono">#{b.id.slice(-6).toUpperCase()}</p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${sc.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
            {sc.label}
          </span>
        </div>

        {/* Route */}
        <div className="space-y-2 mb-4">
          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mt-0.5 shrink-0">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
            </div>
            <p className="text-sm text-slate-700 leading-snug">{b.origin}</p>
          </div>
          <div className="ml-2.5 w-px h-3 bg-slate-200" />
          <div className="flex items-start gap-2.5">
            <MapPin size={18} className="text-brand-400 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-700 leading-snug">{b.destination}</p>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
            <Calendar size={13} className="text-slate-400 shrink-0" />
            <span className="text-xs text-slate-600 font-medium">{dateStr}</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
            <Car size={13} className="text-slate-400 shrink-0" />
            <span className="text-xs text-slate-600 font-medium">{vLabel}</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
            <Users size={13} className="text-slate-400 shrink-0" />
            <span className="text-xs text-slate-600 font-medium">{b.passengerCount} pax</span>
          </div>
          <div className="flex items-center justify-between bg-orange-50 rounded-lg px-3 py-2">
            <span className="text-xs text-slate-500">Tarifa</span>
            <span className="text-xs font-black text-brand-600">${b.totalPrice.toLocaleString('es-CL')}</span>
          </div>
        </div>

        {/* Driver notes */}
        {b.driverNotes && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl px-3 py-2 mb-4">
            <p className="text-[11px] font-bold text-purple-700 mb-0.5">Nota del conductor</p>
            <p className="text-xs text-purple-800">{b.driverNotes}</p>
          </div>
        )}

        {/* Action buttons */}
        {(isEditable || isCancellable) && !isEditing && !isCanceling && (
          <div className="flex gap-2 pt-3 border-t border-slate-100">
            {isEditable && (
              <button
                onClick={onOpenEdit}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors"
              >
                <Edit2 size={14} />
                Editar reserva
              </button>
            )}
            {isCancellable && (
              <button
                onClick={onRequestCancel}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold rounded-xl transition-colors"
              >
                <X size={14} />
                Cancelar
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Edit form panel ──────────────────────────────────────────────────── */}
      {isEditing && (
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Editar reserva</h3>
            <button onClick={onCloseEdit} className="text-slate-400 hover:text-slate-600 p-1">
              <X size={16} />
            </button>
          </div>

          {/* Free address */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              {isToAirport ? 'Dirección de recogida' : 'Dirección de destino'}
            </label>
            <div className="relative">
              <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={isToAirport ? editOrigin : editDest}
                onChange={(e) => isToAirport ? setEditOrigin(e.target.value) : setEditDest(e.target.value)}
                placeholder="Ingresa la dirección"
                className="w-full pl-8 pr-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none bg-white"
              />
            </div>
          </div>

          {/* Date + time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Fecha</label>
              <input
                type="date"
                value={editDate}
                min={todayStr}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Hora</label>
              <input
                type="time"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none bg-white"
              />
            </div>
          </div>

          {/* Passengers */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Pasajeros</label>
            <input
              type="number"
              value={editPax}
              min={1} max={12}
              onChange={(e) => setEditPax(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
              className="w-24 px-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none bg-white"
            />
          </div>

          {editError && (
            <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-xl px-3 py-2">{editError}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={onSaveEdit}
              disabled={editLoading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              <Check size={14} />
              {editLoading ? 'Guardando…' : 'Guardar cambios'}
            </button>
            <button
              onClick={onCloseEdit}
              className="px-4 py-2.5 bg-white border-2 border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Cancel confirmation panel ───────────────────────────────────────── */}
      {isCanceling && (
        <div className="border-t border-red-200 bg-red-50 px-5 py-4">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-800">¿Cancelar esta reserva?</p>
              <p className="text-xs text-red-600 mt-0.5">Esta acción no se puede deshacer. El servicio quedará anulado.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onConfirmCancel}
              disabled={cancelLoading}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              {cancelLoading ? 'Cancelando…' : 'Sí, cancelar reserva'}
            </button>
            <button
              onClick={onDismissCancel}
              className="px-4 py-2.5 bg-white border-2 border-red-200 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-100 transition-colors"
            >
              Volver
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: 'proximas' | 'historial' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
        {tab === 'proximas' ? (
          <Calendar size={28} className="text-slate-400" />
        ) : (
          <Plane size={28} className="text-slate-400" />
        )}
      </div>
      <p className="text-slate-600 font-semibold mb-1">
        {tab === 'proximas' ? 'No tienes reservas próximas' : 'Sin historial de viajes'}
      </p>
      <p className="text-sm text-slate-400 mb-6">
        {tab === 'proximas'
          ? 'Crea tu primera reserva y aparecerá aquí'
          : 'Tus viajes completados y cancelados aparecerán aquí'}
      </p>
      {tab === 'proximas' && (
        <Link
          href="/booking"
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm"
        >
          <Plus size={16} />
          Reservar ahora
        </Link>
      )}
    </div>
  )
}
