'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import type { ApiResponse } from '@aerotaxi/shared'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ChevronRight, X, Check, TrendingUp, AlertTriangle,
  Pencil, Plus, Upload, Camera, Eye, EyeOff, Filter,
  UserPen, Car, Wallet, History,
} from 'lucide-react'
import { AdminSidebar } from '@/components/AdminSidebar'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DriverSummary {
  id: string
  name: string
  photoUrl?: string | null
  email: string
  phone: string
  isActive: boolean
  createdAt: string
  licenseNumber: string
  isAvailable: boolean
  vehicleId: string | null
  notes: string | null
  commissionRate: number
  vehiclePlate: string | null
  vehicleBrand: string | null
  vehicleModel: string | null
  vehicleYear: number | null
  vehicleType: string | null
  vehicleCapacity: number | null
}

interface BookingHistory {
  id: string
  direction: 'to_airport' | 'from_airport'
  origin: string
  destination: string
  scheduledAt: string
  vehicleType: string
  totalPrice: number
  status: string
  collectedBy: 'driver' | 'admin' | null
  paymentMethod: string
  passengerCount: number
  zoneLabel: string | null
}

interface DriverStats {
  totalTrips: number
  completedTrips: number
  totalEarned: number
  totalCommission: number
  totalDriverNet: number
  collectedByDriver: number
  collectedByAdmin: number
  pendingCollection: number
  driverOwesApp: number
  appOwesDriver: number
}

interface DriverDetail extends DriverSummary {
  history: BookingHistory[]
  stats: DriverStats
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VEHICLE_TYPE_LABEL: Record<string, string> = {
  sedan: 'Sedan VIP', suv: 'SUV', minivan: 'Minivan', van: 'Van',
}
const VEHICLE_TYPES = [
  { value: 'sedan',   label: 'Sedan VIP' },
  { value: 'suv',     label: 'SUV' },
  { value: 'minivan', label: 'Minivan' },
  { value: 'van',     label: 'Van' },
]
const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente', assigned: 'Asignado', confirmed: 'Confirmado',
  rejected: 'Rechazado', en_route: 'En ruta', completed: 'Completado',
  cancelled: 'Cancelado', settled: 'Liquidado',
}
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  assigned: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  en_route: 'bg-violet-100 text-violet-700',
  completed: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-red-50 text-red-500',
  settled: 'bg-teal-100 text-teal-700',
}
const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConductoresPage() {
  const { user, token, clearAuth, _hasHydrated } = useAuthStore()
  const router = useRouter()

  const [drivers,       setDrivers]       = useState<DriverSummary[]>([])
  const [loading,       setLoading]       = useState(true)
  const [search,        setSearch]        = useState('')
  const [selected,      setSelected]      = useState<DriverDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [showCreate,    setShowCreate]    = useState(false)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await api.get<ApiResponse<DriverSummary[]>>('/drivers', token)
      setDrivers(res.data ?? [])
    } catch { /* silencioso */ }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => {
    if (!_hasHydrated) return
    if (!user || !token) { router.push('/auth/login'); return }
    if (user.role !== 'admin') { router.push('/dashboard'); return }
    load()
  }, [_hasHydrated, user, token, load, router])

  const openDetail = async (id: string, from?: string, to?: string) => {
    setLoadingDetail(true)
    try {
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to)   params.set('to',   to)
      const qs = params.toString()
      const res = await api.get<ApiResponse<DriverDetail>>(
        `/drivers/${id}${qs ? `?${qs}` : ''}`,
        token!,
      )
      setSelected(res.data)
    } catch { /* silencioso */ }
    finally { setLoadingDetail(false) }
  }

  const filtered = drivers.filter((d) =>
    !search ||
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.email.toLowerCase().includes(search.toLowerCase()) ||
    d.phone.includes(search) ||
    (d.vehiclePlate ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  const online  = drivers.filter((d) => d.isAvailable).length
  const offline = drivers.length - online

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      <AdminSidebar active="conductores" clearAuth={clearAuth} router={router} />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Conductores</h1>
            <p className="text-sm text-slate-500 mt-0.5">Gestión de flota de choferes</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              {online} en línea
            </span>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 bg-slate-400 rounded-full" />
              {offline} fuera de línea
            </span>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              <Plus size={16} />
              Nuevo Conductor
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-8 py-4">
          <div className="relative max-w-sm">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, email, patente…"
              className="w-full pl-10 pr-4 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none bg-white"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="px-8 pb-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 text-slate-400">
              <span className="material-symbols-outlined text-5xl block mb-3">person_off</span>
              <p className="font-bold text-slate-500">Sin conductores registrados</p>
              <p className="text-sm mt-1">Agrega conductores desde el panel de administración</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((d) => (
                <DriverCard
                  key={d.id}
                  driver={d}
                  loading={loadingDetail}
                  onClick={() => openDetail(d.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {selected && (
        <DriverDetailModal
          driver={selected}
          token={token!}
          onClose={() => setSelected(null)}
          onRefetch={(from, to) => openDetail(selected.id, from, to)}
          onUpdated={(updated) => {
            setSelected(updated)
            setDrivers((prev) => prev.map((d) => d.id === updated.id ? { ...d, ...updated } : d))
          }}
        />
      )}

      {showCreate && (
        <CreateDriverModal
          token={token!}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load() }}
        />
      )}
    </div>
  )
}


// ─── Driver card ──────────────────────────────────────────────────────────────

function DriverCard({ driver: d, onClick, loading }: { driver: DriverSummary; onClick: () => void; loading: boolean }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-300 transition-all cursor-pointer p-5 group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full shrink-0 overflow-hidden">
            {d.photoUrl
              ? <img src={d.photoUrl} alt={d.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-brand-500 flex items-center justify-center text-white font-black text-base">
                  {d.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                </div>
            }
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm leading-tight">{d.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{d.phone}</p>
          </div>
        </div>
        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
          d.isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${d.isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
          {d.isAvailable ? 'En línea' : 'Fuera'}
        </span>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
        <span className="material-symbols-outlined text-sm text-slate-400">badge</span>
        Licencia: <span className="font-semibold text-slate-700">{d.licenseNumber}</span>
      </div>

      {d.vehiclePlate ? (
        <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-slate-600 text-base">directions_car</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate">
              {d.vehicleBrand} {d.vehicleModel} {d.vehicleYear}
            </p>
            <p className="text-[10px] text-slate-500">
              {d.vehiclePlate} · {VEHICLE_TYPE_LABEL[d.vehicleType ?? ''] ?? d.vehicleType} · {d.vehicleCapacity} pax
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700 font-medium flex items-center gap-1.5">
          <AlertTriangle size={12} />
          Sin vehículo asignado
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
        <span className="text-xs text-slate-500 flex items-center gap-1">
          <TrendingUp size={12} className="text-brand-500" />
          Comisión app: <span className="font-bold text-slate-700 ml-0.5">{d.commissionRate}%</span>
        </span>
        <span className="text-[11px] font-semibold text-brand-600 group-hover:text-brand-700 flex items-center gap-0.5">
          Ver detalle <ChevronRight size={13} />
        </span>
      </div>
    </div>
  )
}

// ─── Driver detail modal ──────────────────────────────────────────────────────

interface DetailModalProps {
  driver: DriverDetail
  token: string
  onClose: () => void
  onRefetch: (from?: string, to?: string) => void
  onUpdated: (d: DriverDetail) => void
}

function DriverDetailModal({ driver: initial, token, onClose, onRefetch, onUpdated }: DetailModalProps) {
  const [driver, setDriver]   = useState<DriverDetail>(initial)
  const [toast,  setToast]    = useState<{ msg: string; ok: boolean } | null>(null)
  const [showEdit, setShowEdit] = useState(false)

  // Notes
  const [notes,       setNotes]       = useState(initial.notes ?? '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesSaved,  setNotesSaved]  = useState(false)

  // Commission
  const [editComm,   setEditComm]   = useState(false)
  const [commInput,  setCommInput]  = useState(String(initial.commissionRate))
  const [savingComm, setSavingComm] = useState(false)

  // Date filters (history + cobros)
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo,   setFilterTo]   = useState('')

  type Tab = 'info' | 'history' | 'cobros'
  const [tab, setTab] = useState<Tab>('info')

  // Keep local driver in sync with parent refreshes
  useEffect(() => {
    setDriver(initial)
    setNotes(initial.notes ?? '')
    setCommInput(String(initial.commissionRate))
  }, [initial])

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const applyDateFilter = () => onRefetch(filterFrom || undefined, filterTo || undefined)
  const clearDateFilter = () => {
    setFilterFrom('')
    setFilterTo('')
    onRefetch()
  }

  const saveNotes = async () => {
    setSavingNotes(true)
    try {
      await api.patch<ApiResponse<unknown>>(`/drivers/${driver.id}/notes`, { notes }, token)
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2000)
      showToast('Observaciones guardadas')
    } catch { showToast('Error al guardar', false) }
    finally { setSavingNotes(false) }
  }

  const saveCommission = async () => {
    const val = parseInt(commInput, 10)
    if (isNaN(val) || val < 0 || val > 100) { showToast('Comisión debe ser 0-100%', false); return }
    setSavingComm(true)
    try {
      await api.patch<ApiResponse<unknown>>(`/drivers/${driver.id}/commission`, { commissionRate: val }, token)
      setEditComm(false)
      showToast('Comisión actualizada')
    } catch { showToast('Error al actualizar', false) }
    finally { setSavingComm(false) }
  }

  const handleCollectionChange = async (bookingId: string, collectedBy: 'driver' | 'admin') => {
    try {
      await fetch(`${API_URL}/bookings/${bookingId}/collection`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ collectedBy }),
      })
      // Update local history
      setDriver((prev) => ({
        ...prev,
        history: prev.history.map((b) => b.id === bookingId ? { ...b, collectedBy } : b),
      }))
      showToast('Cobro actualizado')
    } catch { showToast('Error al actualizar cobro', false) }
  }

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'info',    label: 'Información',                             icon: <UserPen size={14} /> },
    { key: 'history', label: `Historial (${driver.history.length})`,    icon: <History size={14} /> },
    { key: 'cobros',  label: 'Cobros',                                  icon: <Wallet size={14} /> },
  ]

  const completedTrips = driver.history.filter((b) => ['completed', 'settled'].includes(b.status))

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

        <div className="relative w-full sm:max-w-2xl bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col">

          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
            <div className="w-11 h-11 rounded-full shrink-0 overflow-hidden">
              {driver.photoUrl
                ? <img src={driver.photoUrl} alt={driver.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-brand-500 flex items-center justify-center text-white font-black text-base">
                    {driver.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-black text-base text-slate-900 leading-tight">{driver.name}</h2>
              <p className="text-xs text-slate-400">{driver.email} · {driver.phone}</p>
            </div>
            <button
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors"
            >
              <Pencil size={13} />
              Editar
            </button>
            <span className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
              driver.isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
            }`}>
              <span className={`w-2 h-2 rounded-full ${driver.isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              {driver.isAvailable ? 'En línea' : 'Fuera de línea'}
            </span>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400">
              <X size={18} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-100 px-5 shrink-0">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
                  tab === t.key
                    ? 'border-brand-500 text-brand-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

            {/* ── Tab: Información ─────────────────────────────────── */}
            {tab === 'info' && (
              <>
                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total viajes',    value: driver.stats.totalTrips,     icon: 'local_taxi',    color: 'text-brand-600' },
                    { label: 'Completados',     value: driver.stats.completedTrips, icon: 'check_circle',  color: 'text-emerald-600' },
                    { label: 'Total facturado', value: `$${driver.stats.totalEarned.toLocaleString('es-CL')}`,    icon: 'payments',      color: 'text-slate-700',   small: true },
                    { label: 'Comisión app',    value: `$${driver.stats.totalCommission.toLocaleString('es-CL')}`, icon: 'percent',      color: 'text-violet-600',  small: true },
                  ].map(({ label, value, icon, color, small }) => (
                    <div key={label} className="bg-slate-50 rounded-2xl p-3 text-center">
                      <span className={`material-symbols-outlined text-xl ${color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                      <p className={`font-black mt-1 ${small ? 'text-sm' : 'text-xl'} text-slate-900`}>{value}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Datos personales */}
                <section className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Datos del Conductor</h3>
                  <div className="bg-slate-50 rounded-2xl p-4 grid grid-cols-2 gap-3">
                    {[
                      { icon: 'phone',          label: 'Teléfono',  value: driver.phone },
                      { icon: 'badge',          label: 'Licencia',  value: driver.licenseNumber },
                      { icon: 'mail',           label: 'Email',     value: driver.email },
                      { icon: 'calendar_month', label: 'Alta',      value: format(new Date(driver.createdAt), 'dd MMM yyyy', { locale: es }) },
                    ].map(({ icon, label, value }) => (
                      <div key={label}>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide flex items-center gap-1 mb-0.5">
                          <span className="material-symbols-outlined text-xs">{icon}</span>{label}
                        </p>
                        <p className="text-sm font-semibold text-slate-800 truncate">{value}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Vehículo */}
                <section className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Car size={12} /> Vehículo Asignado
                  </h3>
                  {driver.vehiclePlate ? (
                    <div className="bg-slate-50 rounded-2xl p-4 grid grid-cols-3 gap-3">
                      {[
                        { label: 'Marca / Modelo', value: `${driver.vehicleBrand} ${driver.vehicleModel}` },
                        { label: 'Patente',         value: driver.vehiclePlate },
                        { label: 'Año',             value: String(driver.vehicleYear) },
                        { label: 'Tipo',            value: VEHICLE_TYPE_LABEL[driver.vehicleType ?? ''] ?? (driver.vehicleType ?? '—') },
                        { label: 'Capacidad',       value: `${driver.vehicleCapacity} pax` },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
                          <p className="text-sm font-semibold text-slate-800">{value}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
                      <AlertTriangle size={15} />
                      Sin vehículo asignado — usa "Editar" para agregar uno
                    </div>
                  )}
                </section>

                {/* Comisión */}
                <section className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Comisión de la Aplicación</h3>
                  <div className="bg-violet-50 border border-violet-200 rounded-2xl px-4 py-3">
                    {editComm ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-violet-700 mr-1">%</span>
                        <input
                          type="number" min={0} max={100}
                          value={commInput}
                          onChange={(e) => setCommInput(e.target.value)}
                          className="w-20 px-3 py-1.5 text-sm font-bold border-2 border-violet-300 rounded-xl focus:outline-none focus:border-violet-500 bg-white"
                          autoFocus
                        />
                        <button onClick={saveCommission} disabled={savingComm}
                          className="flex items-center gap-1 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50">
                          {savingComm ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> : <Check size={13} />}
                          Guardar
                        </button>
                        <button onClick={() => { setEditComm(false); setCommInput(String(driver.commissionRate)) }}
                          className="p-1.5 text-violet-400 hover:text-violet-600 rounded-lg">
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-violet-600 font-semibold">Tasa de comisión (app)</p>
                          <p className="text-2xl font-black text-violet-700">{driver.commissionRate}%
                            <span className="text-xs font-normal text-violet-500 ml-1">del total por viaje completado</span>
                          </p>
                        </div>
                        <button onClick={() => setEditComm(true)}
                          className="p-2 text-violet-400 hover:text-violet-700 hover:bg-violet-100 rounded-xl transition-colors" title="Editar">
                          <Pencil size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                </section>

                {/* Observaciones */}
                <section className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Observaciones del Admin</h3>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    placeholder="Ej: Conductor puntual, conoce zona norte. Prefiere rutas por autopista…"
                    className="w-full px-4 py-3 text-sm border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-brand-400 resize-none transition-colors"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400">{notes.length}/1000</p>
                    <button
                      onClick={saveNotes}
                      disabled={savingNotes || notes === (driver.notes ?? '')}
                      className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors disabled:cursor-not-allowed"
                    >
                      {notesSaved
                        ? <><Check size={12} />Guardado</>
                        : savingNotes
                        ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>Guardando…</>
                        : <><span className="material-symbols-outlined text-sm">save</span>Guardar notas</>}
                    </button>
                  </div>
                </section>
              </>
            )}

            {/* ── Tab: Historial ───────────────────────────────────── */}
            {tab === 'history' && (
              <div className="space-y-3">
                {/* Date filters */}
                <div className="bg-slate-50 rounded-2xl p-3 flex flex-wrap items-end gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Desde</label>
                    <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)}
                      className="px-3 py-1.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none bg-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Hasta</label>
                    <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)}
                      className="px-3 py-1.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none bg-white" />
                  </div>
                  <button onClick={applyDateFilter}
                    className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors">
                    <Filter size={13} />
                    Filtrar
                  </button>
                  {(filterFrom || filterTo) && (
                    <button onClick={clearDateFilter}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-medium px-2 py-2 rounded-xl hover:bg-slate-200 transition-colors">
                      <X size={12} />
                      Limpiar
                    </button>
                  )}
                  <p className="ml-auto text-xs text-slate-400 self-center">{driver.history.length} viaje{driver.history.length !== 1 ? 's' : ''}</p>
                </div>

                {driver.history.length === 0 ? (
                  <div className="text-center py-16 text-slate-400">
                    <span className="material-symbols-outlined text-4xl block mb-2">history</span>
                    <p className="font-semibold">Sin viajes en ese rango</p>
                  </div>
                ) : (
                  driver.history.map((b) => (
                    <HistoryRow key={b.id} booking={b} commissionRate={driver.commissionRate} />
                  ))
                )}
              </div>
            )}

            {/* ── Tab: Cobros ──────────────────────────────────────── */}
            {tab === 'cobros' && (
              <div className="space-y-4">
                {/* Date filters */}
                <div className="bg-slate-50 rounded-2xl p-3 flex flex-wrap items-end gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Desde</label>
                    <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)}
                      className="px-3 py-1.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none bg-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Hasta</label>
                    <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)}
                      className="px-3 py-1.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none bg-white" />
                  </div>
                  <button onClick={applyDateFilter}
                    className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors">
                    <Filter size={13} />
                    Filtrar
                  </button>
                  {(filterFrom || filterTo) && (
                    <button onClick={clearDateFilter}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-medium px-2 py-2 rounded-xl hover:bg-slate-200 transition-colors">
                      <X size={12} />
                      Limpiar
                    </button>
                  )}
                </div>

                {/* Resumen financiero */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
                    <p className="text-[10px] text-emerald-600 font-bold uppercase">Cobrado por el conductor</p>
                    <p className="text-xl font-black text-emerald-700">${driver.stats.collectedByDriver.toLocaleString('es-CL')}</p>
                    <p className="text-[10px] text-emerald-500 mt-0.5">Pasajero pagó al chofer</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3">
                    <p className="text-[10px] text-blue-600 font-bold uppercase">Cobrado por la app</p>
                    <p className="text-xl font-black text-blue-700">${driver.stats.collectedByAdmin.toLocaleString('es-CL')}</p>
                    <p className="text-[10px] text-blue-500 mt-0.5">Pasajero pagó a la app</p>
                  </div>
                  <div className="bg-violet-50 border border-violet-200 rounded-2xl p-3">
                    <p className="text-[10px] text-violet-600 font-bold uppercase">Comisión total app</p>
                    <p className="text-xl font-black text-violet-700">${driver.stats.totalCommission.toLocaleString('es-CL')}</p>
                    <p className="text-[10px] text-violet-500 mt-0.5">{driver.commissionRate}% de viajes completados</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                    <p className="text-[10px] text-slate-600 font-bold uppercase">Sin marcar</p>
                    <p className="text-xl font-black text-slate-700">${driver.stats.pendingCollection.toLocaleString('es-CL')}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Pendiente de asignar cobrador</p>
                  </div>
                </div>

                {/* Balance */}
                <div className="bg-slate-800 rounded-2xl p-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Conductor debe a la app</p>
                    <p className="text-xl font-black text-amber-400">${driver.stats.driverOwesApp.toLocaleString('es-CL')}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Comisión de viajes que cobró él</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">App debe al conductor</p>
                    <p className="text-xl font-black text-emerald-400">${driver.stats.appOwesDriver.toLocaleString('es-CL')}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Neto de viajes que cobró la app</p>
                  </div>
                </div>

                {/* Detalle por viaje */}
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Viajes completados</h4>
                {completedTrips.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <span className="material-symbols-outlined text-3xl block mb-1">payments</span>
                    <p className="text-sm">Sin viajes completados en este rango</p>
                  </div>
                ) : (
                  completedTrips.map((b) => (
                    <BillingRow
                      key={b.id}
                      booking={b}
                      commissionRate={driver.commissionRate}
                      onCollectionChange={handleCollectionChange}
                    />
                  ))
                )}
              </div>
            )}
          </div>

          {/* Toast */}
          {toast && (
            <div className={`absolute bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-xl text-sm font-semibold text-white ${toast.ok ? 'bg-emerald-600' : 'bg-red-500'}`}>
              <span className="material-symbols-outlined text-base">{toast.ok ? 'check_circle' : 'error'}</span>
              {toast.msg}
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      {showEdit && (
        <EditDriverModal
          driver={driver}
          token={token}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false)
            onRefetch(filterFrom || undefined, filterTo || undefined)
            showToast('Conductor actualizado')
          }}
        />
      )}
    </>
  )
}

// ─── History row ──────────────────────────────────────────────────────────────

function HistoryRow({ booking: b, commissionRate }: { booking: BookingHistory; commissionRate: number }) {
  const isCompleted = ['completed', 'settled'].includes(b.status)
  const commission  = isCompleted ? Math.round(b.totalPrice * commissionRate / 100) : null

  return (
    <div className="bg-slate-50 rounded-2xl px-4 py-3 flex items-start gap-3">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${isCompleted ? 'bg-emerald-100' : 'bg-slate-200'}`}>
        <span className={`material-symbols-outlined text-base ${isCompleted ? 'text-emerald-600' : 'text-slate-500'}`}
          style={{ fontVariationSettings: "'FILL' 1" }}>
          {b.direction === 'to_airport' ? 'flight_takeoff' : 'flight_land'}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[b.status] ?? 'bg-slate-100 text-slate-500'}`}>
            {STATUS_LABEL[b.status] ?? b.status}
          </span>
          {b.collectedBy && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${b.collectedBy === 'driver' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
              Cobró: {b.collectedBy === 'driver' ? 'conductor' : 'app'}
            </span>
          )}
          <span className="text-[10px] text-slate-400">
            {format(new Date(b.scheduledAt), 'dd MMM yyyy · HH:mm', { locale: es })}
          </span>
        </div>
        <p className="text-xs text-slate-700 font-medium truncate">{b.origin} → {b.destination}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          {b.zoneLabel ?? '—'} · {VEHICLE_TYPE_LABEL[b.vehicleType] ?? b.vehicleType} · {b.passengerCount} pax
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-black text-slate-800">${b.totalPrice.toLocaleString('es-CL')}</p>
        {commission !== null && (
          <p className="text-[10px] text-violet-600 font-semibold mt-0.5">
            Comisión: ${commission.toLocaleString('es-CL')}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Billing row ─────────────────────────────────────────────────────────────

function BillingRow({
  booking: b, commissionRate, onCollectionChange,
}: {
  booking: BookingHistory
  commissionRate: number
  onCollectionChange: (id: string, by: 'driver' | 'admin') => void
}) {
  const commission = Math.round(b.totalPrice * commissionRate / 100)
  const driverNet  = b.totalPrice - commission

  return (
    <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-800 truncate">
            {b.direction === 'to_airport' ? '✈ Hacia' : '✈ Desde'} aeropuerto
          </p>
          <p className="text-[10px] text-slate-400">
            {format(new Date(b.scheduledAt), 'dd MMM yyyy · HH:mm', { locale: es })} · {b.zoneLabel ?? '—'}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-black text-slate-900">${b.totalPrice.toLocaleString('es-CL')}</p>
          <p className="text-[10px] text-violet-600">Comisión: ${commission.toLocaleString('es-CL')}</p>
          <p className="text-[10px] text-emerald-600">Neto conductor: ${driverNet.toLocaleString('es-CL')}</p>
        </div>
      </div>

      {/* Collection buttons */}
      <div className="mt-2.5 flex items-center gap-2">
        <span className="text-[10px] text-slate-400 font-semibold uppercase">¿Quién cobró?</span>
        <button
          onClick={() => onCollectionChange(b.id, 'driver')}
          className={`flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-lg transition-colors ${
            b.collectedBy === 'driver'
              ? 'bg-amber-500 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-700'
          }`}
        >
          <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
          Conductor
        </button>
        <button
          onClick={() => onCollectionChange(b.id, 'admin')}
          className={`flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-lg transition-colors ${
            b.collectedBy === 'admin'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700'
          }`}
        >
          <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>phone_iphone</span>
          App
        </button>
        {!b.collectedBy && (
          <span className="text-[10px] text-slate-400 italic ml-1">sin marcar</span>
        )}
      </div>
    </div>
  )
}

// ─── Edit Driver Modal ────────────────────────────────────────────────────────

interface EditDriverModalProps {
  driver: DriverDetail
  token: string
  onClose: () => void
  onSaved: () => void
}

function EditDriverModal({ driver: d, token, onClose, onSaved }: EditDriverModalProps) {
  // Photo
  const [photoFile,    setPhotoFile]    = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>(d.photoUrl ?? '')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // User fields
  const [name,    setName]    = useState(d.name)
  const [email,   setEmail]   = useState(d.email)
  const [phone,   setPhone]   = useState(d.phone)

  // Password reset
  const [resetPwd,    setResetPwd]    = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [showNewPwd,  setShowNewPwd]  = useState(false)

  // Driver fields
  const [license,        setLicense]        = useState(d.licenseNumber)
  const [commissionRate, setCommissionRate] = useState(String(d.commissionRate))
  const [isAvailable,    setIsAvailable]    = useState(d.isAvailable)
  const [notes,          setNotes]          = useState(d.notes ?? '')

  // Vehicle fields
  const hasVehicle = !!d.vehiclePlate
  const [editVehicle, setEditVehicle] = useState(hasVehicle)
  const [plate,    setPlate]    = useState(d.vehiclePlate ?? '')
  const [brand,    setBrand]    = useState(d.vehicleBrand ?? '')
  const [model,    setModel]    = useState(d.vehicleModel ?? '')
  const [year,     setYear]     = useState(String(d.vehicleYear ?? new Date().getFullYear()))
  const [vtype,    setVtype]    = useState<'sedan'|'suv'|'minivan'|'van'>((d.vehicleType as 'sedan'|'suv'|'minivan'|'van') ?? 'sedan')
  const [capacity, setCapacity] = useState(String(d.vehicleCapacity ?? 4))

  const [saving, setSaving]   = useState(false)
  const [error,  setError]    = useState('')

  type EditTab = 'personal' | 'driver' | 'vehicle'
  const [tab, setTab] = useState<EditTab>('personal')

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      let photoUrl: string | null | undefined = undefined

      // Upload new photo if selected
      if (photoFile) {
        setUploadingPhoto(true)
        const fd = new FormData()
        fd.append('file', photoFile)
        const res = await fetch(`${API_URL}/uploads/photo`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        })
        const json = await res.json() as { data?: { url: string }; error?: string }
        setUploadingPhoto(false)
        if (!res.ok) throw new Error(json.error ?? 'Error al subir foto')
        photoUrl = json.data?.url
      }

      // PATCH driver (user + driver fields)
      const body: Record<string, unknown> = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        licenseNumber: license.trim().toUpperCase(),
        commissionRate: parseInt(commissionRate, 10),
        isAvailable,
        notes: notes.trim() || null,
      }
      if (photoUrl !== undefined) body.photoUrl = photoUrl

      const patchRes = await fetch(`${API_URL}/drivers/${d.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!patchRes.ok) {
        const j = await patchRes.json() as { error?: string }
        throw new Error(j.error ?? 'Error al actualizar conductor')
      }

      // PATCH vehicle if section is active
      if (editVehicle && plate.trim()) {
        const vRes = await fetch(`${API_URL}/drivers/${d.id}/vehicle`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            plate: plate.trim().toUpperCase(),
            brand: brand.trim(),
            model: model.trim(),
            year: parseInt(year, 10),
            type: vtype,
            capacity: parseInt(capacity, 10),
          }),
        })
        if (!vRes.ok) {
          const j = await vRes.json() as { error?: string }
          throw new Error(j.error ?? 'Error al actualizar vehículo')
        }
      }

      // Reset password if requested
      if (resetPwd && newPassword.length >= 8) {
        const pwRes = await fetch(`${API_URL}/drivers/${d.id}/password`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ password: newPassword }),
        })
        if (!pwRes.ok) {
          const j = await pwRes.json() as { error?: string }
          throw new Error(j.error ?? 'Error al resetear contraseña')
        }
      }

      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setSaving(false)
      setUploadingPhoto(false)
    }
  }

  const EDIT_TABS: { key: EditTab; label: string }[] = [
    { key: 'personal', label: 'Datos personales' },
    { key: 'driver',   label: 'Conductor' },
    { key: 'vehicle',  label: 'Vehículo' },
  ]

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <form
        onSubmit={handleSubmit}
        className="relative w-full sm:max-w-2xl bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[95vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="font-black text-base text-slate-900">Editar Conductor</h2>
            <p className="text-xs text-slate-400 mt-0.5">{d.name}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-6 shrink-0">
          {EDIT_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* ── Datos personales ─────── */}
          {tab === 'personal' && (
            <>
              {/* Foto */}
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center shrink-0">
                  {photoPreview
                    ? <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                    : <Camera size={24} className="text-slate-400" />
                  }
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 border-2 border-slate-200 hover:border-brand-400 text-slate-700 text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                    <Upload size={14} className="text-brand-500" />
                    {photoPreview ? 'Cambiar foto' : 'Subir foto'}
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
                  </label>
                  <p className="text-[11px] text-slate-400 mt-1.5">JPG, PNG o WebP · máx. 5 MB</p>
                  {photoFile && <p className="text-[11px] text-brand-600 font-semibold mt-1">✓ {photoFile.name}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nombre completo *</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                    className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email *</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                    className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Teléfono *</label>
                  <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} required
                    className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none" />
                </div>
              </div>

              {/* Resetear contraseña */}
              <div>
                <button
                  type="button"
                  onClick={() => { setResetPwd((v) => !v); setNewPassword('') }}
                  className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl transition-colors ${
                    resetPwd
                      ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">lock_reset</span>
                  {resetPwd ? 'Cancelar cambio de contraseña' : 'Resetear contraseña de acceso'}
                </button>

                {resetPwd && (
                  <div className="mt-2 bg-amber-50 border border-amber-200 rounded-2xl p-3 space-y-2">
                    <p className="text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">warning</span>
                      El conductor deberá usar esta nueva contraseña para iniciar sesión.
                    </p>
                    <div className="relative">
                      <input
                        type={showNewPwd ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Nueva contraseña (mínimo 8 caracteres)"
                        minLength={8}
                        required={resetPwd}
                        className="w-full pl-3 pr-10 py-2.5 text-sm border-2 border-amber-300 rounded-xl focus:border-amber-500 focus:outline-none bg-white"
                        autoFocus
                      />
                      <button type="button" onClick={() => setShowNewPwd((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showNewPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {newPassword.length > 0 && newPassword.length < 8 && (
                      <p className="text-[11px] text-red-600">Mínimo 8 caracteres ({newPassword.length}/8)</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Datos conductor ─────── */}
          {tab === 'driver' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Licencia de conducir *</label>
                  <input type="text" value={license} onChange={(e) => setLicense(e.target.value.toUpperCase())} required
                    className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Comisión app (%) *</label>
                  <input type="number" min="0" max="100" value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)} required
                    className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none" />
                  <p className="text-[10px] text-slate-400 mt-1">Porcentaje que recibe la aplicación</p>
                </div>
              </div>

              {/* Disponibilidad */}
              <div>
                <label
                  className="flex items-center justify-between cursor-pointer select-none bg-slate-50 rounded-2xl px-4 py-3"
                  onClick={() => setIsAvailable((v) => !v)}
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Disponible para viajes</p>
                    <p className="text-xs text-slate-400 mt-0.5">El conductor aparecerá como activo en el sistema</p>
                  </div>
                  <div className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${isAvailable ? 'bg-brand-500' : 'bg-slate-300'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isAvailable ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                </label>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Observaciones del admin</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
                  placeholder="Conductor puntual, conoce bien la zona norte…"
                  className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none resize-none" />
                <p className="text-[10px] text-slate-400 mt-1">{notes.length}/1000</p>
              </div>
            </div>
          )}

          {/* ── Vehículo ─────── */}
          {tab === 'vehicle' && (
            <div className="space-y-4">
              <label
                className="flex items-center justify-between cursor-pointer select-none"
                onClick={() => setEditVehicle((v) => !v)}
              >
                <span className="text-sm font-semibold text-slate-700">
                  {hasVehicle ? 'Editar vehículo existente' : 'Registrar vehículo ahora'}
                </span>
                <div className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${editVehicle ? 'bg-brand-500' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${editVehicle ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
              </label>

              {editVehicle && (
                <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-2xl p-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Patente *</label>
                    <input type="text" value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())}
                      placeholder="ABCD12"
                      className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none font-mono bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tipo *</label>
                    <select value={vtype} onChange={(e) => setVtype(e.target.value as typeof vtype)}
                      className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none bg-white">
                      {VEHICLE_TYPES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Marca *</label>
                    <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Toyota"
                      className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Modelo *</label>
                    <input type="text" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Camry"
                      className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Año *</label>
                    <input type="number" value={year} onChange={(e) => setYear(e.target.value)}
                      min={2000} max={new Date().getFullYear() + 1}
                      className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Capacidad (pax) *</label>
                    <input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)}
                      min={1} max={12}
                      className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none bg-white" />
                  </div>
                </div>
              )}

              {!editVehicle && !hasVehicle && (
                <p className="text-sm text-slate-500 bg-slate-50 rounded-2xl px-4 py-3">
                  Puedes registrar el vehículo más tarde activando el toggle de arriba.
                </p>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700">
              <AlertTriangle size={15} />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 disabled:bg-slate-300 rounded-xl transition-colors">
            {saving
              ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                  {uploadingPhoto ? 'Subiendo foto…' : 'Guardando…'}</>
              : <><Check size={15} />Guardar cambios</>}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Create Driver Modal ──────────────────────────────────────────────────────

interface CreateModalProps {
  token: string
  onClose: () => void
  onCreated: () => void
}

function CreateDriverModal({ token, onClose, onCreated }: CreateModalProps) {
  const [photoFile,    setPhotoFile]    = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [phone,    setPhone]    = useState('+569')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [license,  setLicense]  = useState('')

  const [addVehicle, setAddVehicle] = useState(false)
  const [plate,      setPlate]      = useState('')
  const [brand,      setBrand]      = useState('')
  const [model,      setModel]      = useState('')
  const [year,       setYear]       = useState(String(new Date().getFullYear()))
  const [vtype,      setVtype]      = useState<'sedan'|'suv'|'minivan'|'van'>('sedan')
  const [capacity,   setCapacity]   = useState('4')

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      let photoUrl: string | undefined

      if (photoFile) {
        setUploadingPhoto(true)
        const fd = new FormData()
        fd.append('file', photoFile)
        const res = await fetch(`${API_URL}/uploads/photo`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        })
        const json = await res.json() as { data?: { url: string }; error?: string }
        setUploadingPhoto(false)
        if (!res.ok) throw new Error(json.error ?? 'Error al subir foto')
        photoUrl = json.data?.url
      }

      const body: Record<string, unknown> = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        licenseNumber: license.trim().toUpperCase(),
        ...(photoUrl ? { photoUrl } : {}),
      }

      if (addVehicle && plate.trim()) {
        body.vehicle = {
          plate: plate.trim().toUpperCase(),
          brand: brand.trim(),
          model: model.trim(),
          year: parseInt(year, 10),
          type: vtype,
          capacity: parseInt(capacity, 10),
        }
      }

      const res = await fetch(`${API_URL}/drivers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const json = await res.json() as { error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Error al crear conductor')

      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setSaving(false)
      setUploadingPhoto(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <form onSubmit={handleSubmit}
        className="relative w-full sm:max-w-2xl bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="font-black text-lg text-slate-900">Nuevo Conductor</h2>
            <p className="text-xs text-slate-400 mt-0.5">Crea el usuario, sube su foto y registra su vehículo</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Foto */}
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Foto del Conductor</h3>
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center shrink-0">
                {photoPreview
                  ? <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                  : <Camera size={24} className="text-slate-400" />
                }
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 border-2 border-slate-200 hover:border-brand-400 text-slate-700 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
                  <Upload size={15} className="text-brand-500" />
                  {photoPreview ? 'Cambiar foto' : 'Subir foto'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
                </label>
                <p className="text-[11px] text-slate-400 mt-1.5">JPG, PNG o WebP · máx. 5 MB</p>
                {photoFile && <p className="text-[11px] text-brand-600 font-semibold mt-1">✓ {photoFile.name}</p>}
              </div>
            </div>
          </section>

          {/* Datos conductor */}
          {/* Datos personales */}
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Datos del Conductor</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nombre completo *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Carlos Muñoz Reyes" required
                  className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Teléfono *</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="+56912345678" required
                  className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Licencia de conducir *</label>
                <input type="text" value={license} onChange={(e) => setLicense(e.target.value.toUpperCase())}
                  placeholder="B-12345678" required
                  className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none font-mono" />
              </div>
            </div>
          </section>

          {/* Acceso al sistema */}
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Acceso al Sistema</h3>
            <p className="text-xs text-slate-500 mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-brand-500">key</span>
              El conductor usará este email y contraseña para iniciar sesión en la app.
            </p>
            <div className="grid grid-cols-2 gap-4 bg-brand-50 border border-brand-200 rounded-2xl p-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email de acceso *</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="conductor@email.com" required
                  className="w-full px-3 py-2.5 text-sm border-2 border-brand-200 rounded-xl focus:border-brand-500 focus:outline-none bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Contraseña *</label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres" required minLength={8}
                    className="w-full pl-3 pr-10 py-2.5 text-sm border-2 border-brand-200 rounded-xl focus:border-brand-500 focus:outline-none bg-white" />
                  <button type="button" onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Vehículo */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Datos del Vehículo</h3>
              <label className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setAddVehicle((v) => !v)}>
                <span className="text-xs font-semibold text-slate-600">Registrar vehículo ahora</span>
                <div className={`relative w-10 h-5 rounded-full transition-colors ${addVehicle ? 'bg-brand-500' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${addVehicle ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
              </label>
            </div>

            {addVehicle ? (
              <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-2xl p-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Patente *</label>
                  <input type="text" value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="ABCD12"
                    className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none font-mono bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tipo *</label>
                  <select value={vtype} onChange={(e) => setVtype(e.target.value as typeof vtype)}
                    className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none bg-white">
                    {VEHICLE_TYPES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Marca *</label>
                  <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Toyota"
                    className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Modelo *</label>
                  <input type="text" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Camry"
                    className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Año *</label>
                  <input type="number" value={year} onChange={(e) => setYear(e.target.value)} min={2000} max={new Date().getFullYear() + 1}
                    className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Capacidad (pax) *</label>
                  <input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} min={1} max={12}
                    className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none bg-white" />
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500 bg-slate-50 rounded-2xl px-4 py-3">
                Puedes registrar el vehículo más tarde desde el detalle del conductor.
              </p>
            )}
          </section>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700">
              <AlertTriangle size={15} />
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 disabled:bg-slate-300 rounded-xl transition-colors">
            {saving
              ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                  {uploadingPhoto ? 'Subiendo foto…' : 'Creando conductor…'}</>
              : <><Check size={15} />Crear Conductor</>}
          </button>
        </div>
      </form>
    </div>
  )
}
