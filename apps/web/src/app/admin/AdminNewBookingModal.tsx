'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '@/lib/api'
import type { ApiResponse } from '@aerotaxi/shared'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Zone {
  id: string
  name: string
  label: string
  priceSedan:   number
  priceSuv:     number
  priceMinivan: number
  priceVan:     number
}

interface ClientResult {
  id: string
  name: string
  email: string
  phone: string | null
  totalBookings: number
}

type VehicleType = 'sedan' | 'suv' | 'minivan' | 'van'
type Direction   = 'to_airport' | 'from_airport'
type PayMethod   = 'cash' | 'online'

// ─── Constants ────────────────────────────────────────────────────────────────

const VEHICLE_OPTIONS: { value: VehicleType; label: string; icon: string; cap: string }[] = [
  { value: 'sedan',   label: 'Sedan VIP',  icon: 'local_taxi',     cap: 'Hasta 4 pax' },
  { value: 'suv',     label: 'SUV',        icon: 'directions_car', cap: 'Hasta 7 pax' },
  { value: 'minivan', label: 'Minivan',    icon: 'airport_shuttle',cap: 'Hasta 8 pax' },
  { value: 'van',     label: 'Van',        icon: 'rv_hookup',      cap: 'Hasta 12 pax'},
]

const PRICE_KEY: Record<VehicleType, keyof Zone> = {
  sedan: 'priceSedan', suv: 'priceSuv', minivan: 'priceMinivan', van: 'priceVan',
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface Props {
  token: string
  onClose: () => void
  onSuccess: () => void
}

export default function AdminNewBookingModal({ token, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<1 | 2>(1)

  // ── Step 1: client ────────────────────────────────────────────────────────
  const [clientSearch,  setClientSearch]  = useState('')
  const [clients,       setClients]       = useState<ClientResult[]>([])
  const [loadingCli,    setLoadingCli]    = useState(false)
  const [selectedClient, setSelectedClient] = useState<ClientResult | null>(null)
  const [creatingNew,   setCreatingNew]   = useState(false)
  const [newName,  setNewName]   = useState('')
  const [newEmail, setNewEmail]  = useState('')
  const [newPhone, setNewPhone]  = useState('')

  // ── Step 2: booking ───────────────────────────────────────────────────────
  const [zones,         setZones]         = useState<Zone[]>([])
  const [selectedZone,  setSelectedZone]  = useState<Zone | null>(null)
  const [direction,     setDirection]     = useState<Direction>('to_airport')
  const [origin,        setOrigin]        = useState('')
  const [destination,   setDestination]   = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [passengerCount,setPassengerCount]= useState(1)
  const [vehicleType,   setVehicleType]   = useState<VehicleType>('sedan')
  const [paymentMethod, setPaymentMethod] = useState<PayMethod>('cash')
  const [adminNotes,    setAdminNotes]    = useState('')
  const [submitting,    setSubmitting]    = useState(false)
  const [error,         setError]         = useState('')

  // ── Load zones on mount ───────────────────────────────────────────────────
  useEffect(() => {
    api.get<ApiResponse<Zone[]>>('/zones', token)
      .then((r) => setZones(r.data ?? []))
      .catch(() => {})
  }, [token])

  // ── Search clients ─────────────────────────────────────────────────────────
  const searchClients = useCallback(async (q: string) => {
    if (!q.trim()) { setClients([]); return }
    setLoadingCli(true)
    try {
      const res = await api.get<ApiResponse<ClientResult[]>>('/clients', token)
      const all = res.data ?? []
      const ql = q.toLowerCase()
      setClients(all.filter((c) =>
        c.name.toLowerCase().includes(ql) ||
        c.email.toLowerCase().includes(ql) ||
        (c.phone ?? '').includes(q)
      ).slice(0, 6))
    } catch { setClients([]) }
    finally { setLoadingCli(false) }
  }, [token])

  useEffect(() => {
    const t = setTimeout(() => searchClients(clientSearch), 250)
    return () => clearTimeout(t)
  }, [clientSearch, searchClients])

  // ── Computed price ────────────────────────────────────────────────────────
  const price = useMemo(() => {
    if (!selectedZone) return 0
    return selectedZone[PRICE_KEY[vehicleType]] as number
  }, [selectedZone, vehicleType])

  // ── Auto-fill direction fields ────────────────────────────────────────────
  useEffect(() => {
    if (direction === 'to_airport') {
      setDestination('Aeropuerto Internacional Arturo Merino Benítez')
    } else {
      setOrigin('Aeropuerto Internacional Arturo Merino Benítez')
    }
  }, [direction])

  // ── Validate step 1 ───────────────────────────────────────────────────────
  const step1Valid = selectedClient !== null ||
    (creatingNew && newName.length >= 2 && newEmail.includes('@') && newPhone.length >= 8)

  // ── Validate step 2 ───────────────────────────────────────────────────────
  const step2Valid = selectedZone && origin.trim().length >= 3 &&
    destination.trim().length >= 3 && scheduledDate && scheduledTime

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!step2Valid) return
    setSubmitting(true)
    setError('')
    try {
      const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`)

      const body: Record<string, unknown> = {
        zoneId:         selectedZone!.id,
        direction,
        origin:         origin.trim(),
        destination:    destination.trim(),
        scheduledAt:    scheduledAt.toISOString(),
        passengerCount,
        vehicleType,
        paymentMethod,
        adminNotes:     adminNotes.trim() || undefined,
      }

      if (selectedClient) {
        body.clientId = selectedClient.id
      } else {
        body.newClient = { name: newName.trim(), email: newEmail.trim(), phone: newPhone.trim() }
      }

      await api.post('/bookings/admin', body, token)
      onSuccess()
    } catch (e: any) {
      setError(e?.message ?? 'Error al crear la reserva')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Min datetime for scheduling ───────────────────────────────────────────
  const minDate = new Date()
  minDate.setMinutes(minDate.getMinutes() + 30)
  const minDateStr = minDate.toISOString().split('T')[0]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh]">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-brand-500 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>add_road</span>
            </div>
            <div>
              <h2 className="font-black text-slate-900 text-base leading-tight">Nueva Reserva Asistida</h2>
              <p className="text-xs text-slate-400">
                {step === 1 ? 'Paso 1 de 2 — Seleccionar cliente' : 'Paso 2 de 2 — Detalles del viaje'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* ── Step indicator ───────────────────────────────────────────── */}
        <div className="flex gap-1 px-6 pt-4 shrink-0">
          {[1, 2].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? 'bg-brand-500' : 'bg-slate-100'}`} />
          ))}
        </div>

        {/* ── Content ───────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* STEP 1 ─────────────────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">

              {/* Toggle: existing vs new */}
              <div className="flex gap-2">
                <button
                  onClick={() => { setCreatingNew(false); setSelectedClient(null) }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${
                    !creatingNew ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}>
                  <span className="material-symbols-outlined text-base align-middle mr-1">search</span>
                  Cliente existente
                </button>
                <button
                  onClick={() => { setCreatingNew(true); setSelectedClient(null) }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${
                    creatingNew ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}>
                  <span className="material-symbols-outlined text-base align-middle mr-1">person_add</span>
                  Cliente nuevo
                </button>
              </div>

              {/* Search existing */}
              {!creatingNew && (
                <div className="space-y-3">
                  {selectedClient ? (
                    /* Selected client chip */
                    <div className="flex items-center gap-3 p-3 bg-brand-50 border-2 border-brand-200 rounded-xl">
                      <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center text-white font-black text-sm shrink-0">
                        {selectedClient.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900">{selectedClient.name}</p>
                        <p className="text-xs text-slate-500">{selectedClient.email} · {selectedClient.phone ?? '—'}</p>
                      </div>
                      <button onClick={() => setSelectedClient(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <span className="material-symbols-outlined text-base">close</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">search</span>
                        <input
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          placeholder="Buscar por nombre, email o teléfono…"
                          className="w-full pl-9 pr-4 py-3 text-sm bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-brand-400 focus:outline-none"
                          autoFocus
                        />
                        {loadingCli && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                          </span>
                        )}
                      </div>
                      {clients.length > 0 && (
                        <div className="border-2 border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-50">
                          {clients.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => { setSelectedClient(c); setClientSearch('') }}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-50 transition-colors text-left"
                            >
                              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
                                {c.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">{c.name}</p>
                                <p className="text-xs text-slate-400 truncate">{c.email} · {c.phone ?? '—'}</p>
                              </div>
                              <span className="text-[10px] text-slate-400">{c.totalBookings} viaje{c.totalBookings !== 1 ? 's' : ''}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {clientSearch.trim() && clients.length === 0 && !loadingCli && (
                        <p className="text-xs text-slate-400 text-center py-3">Sin resultados para "{clientSearch}"</p>
                      )}
                      {!clientSearch.trim() && (
                        <p className="text-xs text-slate-400 text-center py-2">Escribe para buscar un cliente registrado</p>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Create new */}
              {creatingNew && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Nombre completo <span className="text-red-500">*</span></label>
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Juan Pérez González"
                      className="w-full px-4 py-3 text-sm bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-brand-400 focus:outline-none"
                      autoFocus
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Email <span className="text-red-500">*</span></label>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="juan@email.com"
                        className="w-full px-4 py-3 text-sm bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-brand-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Teléfono <span className="text-red-500">*</span></label>
                      <input
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        placeholder="+56 9 1234 5678"
                        className="w-full px-4 py-3 text-sm bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-brand-400 focus:outline-none"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
                    <span className="material-symbols-outlined text-xs align-middle mr-1">info</span>
                    Si el email ya existe, se usará el cliente registrado. Se creará una contraseña temporal que el cliente puede cambiar.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 2 ─────────────────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">

              {/* Client summary */}
              <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white font-black text-[10px] shrink-0">
                  {(selectedClient?.name ?? newName).split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{selectedClient?.name ?? newName}</p>
                  <p className="text-[10px] text-slate-400 truncate">{selectedClient?.email ?? newEmail}</p>
                </div>
                <button onClick={() => setStep(1)} className="ml-auto text-[10px] text-brand-600 hover:text-brand-700 font-semibold shrink-0">Cambiar</button>
              </div>

              {/* Direction */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Dirección del viaje</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: 'to_airport'   as const, label: 'Domicilio → Aeropuerto', icon: 'flight_takeoff' },
                    { value: 'from_airport' as const, label: 'Aeropuerto → Domicilio', icon: 'flight_land'    },
                  ]).map((opt) => (
                    <button key={opt.value} onClick={() => setDirection(opt.value)}
                      className={`flex items-center gap-2 px-3 py-3 rounded-xl border-2 text-sm font-semibold transition-colors text-left ${
                        direction === opt.value ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}>
                      <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>{opt.icon}</span>
                      <span className="text-xs leading-tight">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Origin & Destination */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    {direction === 'to_airport' ? 'Origen (domicilio)' : 'Origen'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="Dirección de origen"
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-brand-400 focus:outline-none"
                    readOnly={direction === 'from_airport'}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    {direction === 'from_airport' ? 'Destino (domicilio)' : 'Destino'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Dirección de destino"
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-brand-400 focus:outline-none"
                    readOnly={direction === 'to_airport'}
                  />
                </div>
              </div>

              {/* Date + Time + Passengers */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Fecha <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={scheduledDate}
                    min={minDateStr}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-brand-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Hora <span className="text-red-500">*</span></label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-brand-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Zone + Passengers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Zona <span className="text-red-500">*</span></label>
                  <select
                    value={selectedZone?.id ?? ''}
                    onChange={(e) => setSelectedZone(zones.find(z => z.id === e.target.value) ?? null)}
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-brand-400 focus:outline-none"
                  >
                    <option value="">Seleccionar zona</option>
                    {zones.map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Pasajeros</label>
                  <div className="flex items-center gap-2 bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2">
                    <button onClick={() => setPassengerCount(Math.max(1, passengerCount - 1))}
                      className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors font-bold text-sm">−</button>
                    <span className="flex-1 text-center text-sm font-bold text-slate-900">{passengerCount}</span>
                    <button onClick={() => setPassengerCount(Math.min(12, passengerCount + 1))}
                      className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors font-bold text-sm">+</button>
                  </div>
                </div>
              </div>

              {/* Vehicle type */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Tipo de vehículo</label>
                <div className="grid grid-cols-4 gap-2">
                  {VEHICLE_OPTIONS.map((v) => {
                    const vPrice = selectedZone ? (selectedZone[PRICE_KEY[v.value]] as number) : 0
                    return (
                      <button key={v.value} onClick={() => setVehicleType(v.value)}
                        className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border-2 transition-colors ${
                          vehicleType === v.value ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-slate-300'
                        }`}>
                        <span className={`material-symbols-outlined text-xl ${vehicleType === v.value ? 'text-brand-500' : 'text-slate-400'}`}
                          style={{ fontVariationSettings: "'FILL' 1" }}>{v.icon}</span>
                        <span className={`text-[10px] font-bold leading-tight text-center ${vehicleType === v.value ? 'text-brand-700' : 'text-slate-600'}`}>{v.label}</span>
                        <span className={`text-[9px] ${vehicleType === v.value ? 'text-brand-500' : 'text-slate-400'}`}>
                          {vPrice > 0 ? `$${vPrice.toLocaleString('es-CL')}` : '—'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Payment method */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Método de pago</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: 'cash'   as const, label: 'Efectivo',    icon: 'payments'      },
                    { value: 'online' as const, label: 'Online',      icon: 'credit_card'   },
                  ]).map((opt) => (
                    <button key={opt.value} onClick={() => setPaymentMethod(opt.value)}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors ${
                        paymentMethod === opt.value ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}>
                      <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Admin notes */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Notas del administrador</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Instrucciones especiales, vuelo, terminal…"
                  rows={2}
                  maxLength={500}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-brand-400 focus:outline-none resize-none"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  <span className="material-symbols-outlined text-base text-red-500">error</span>
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-3 shrink-0">
          {step === 2 && (
            /* Price badge */
            <div className={`mr-auto text-sm font-black transition-all ${price > 0 ? 'text-brand-600' : 'text-slate-400'}`}>
              {price > 0 ? (
                <span>${price.toLocaleString('es-CL')} <span className="font-normal text-slate-400 text-xs">CLP</span></span>
              ) : (
                <span className="text-xs font-normal">Selecciona zona</span>
              )}
            </div>
          )}
          {step === 1 ? (
            <>
              <button onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!step1Valid}
                className="flex-1 py-2 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm rounded-xl transition-colors">
                Continuar
                <span className="material-symbols-outlined text-base align-middle ml-1">arrow_forward</span>
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setStep(1)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Atrás
              </button>
              <button
                onClick={handleSubmit}
                disabled={!step2Valid || submitting}
                className="flex-1 py-2 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2">
                {submitting ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Creando…</>
                ) : (
                  <><span className="material-symbols-outlined text-base">check</span>Crear reserva</>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
