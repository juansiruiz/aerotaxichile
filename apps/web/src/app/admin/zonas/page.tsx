'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import type { ApiResponse } from '@aerotaxi/shared'
import { AdminSidebar } from '@/components/AdminSidebar'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Zone {
  id: string
  name: string
  label: string
  priceSedan:   number
  priceSuv:     number
  priceMinivan: number
  priceVan:     number
  comunas: string[]
}

interface CommuneRoute {
  id: string
  fromCommune: string
  toCommune: string
  priceSedan:   number
  priceSuv:     number
  priceMinivan: number
  priceVan:     number
  isActive: boolean
}

type VehicleKey = 'priceSedan' | 'priceSuv' | 'priceMinivan' | 'priceVan'
type PricingMode = 'zone' | 'commune'
type DestType = 'airport' | 'bus_terminal' | 'train_station' | 'port' | 'other'

// ─── Constants ────────────────────────────────────────────────────────────────

const VEHICLES: { key: VehicleKey; label: string; icon: string; cap: string; color: string }[] = [
  { key: 'priceSedan',   label: 'Sedan VIP',  icon: 'local_taxi',      cap: 'Hasta 4 pax', color: 'text-blue-600 bg-blue-50 ring-blue-200'    },
  { key: 'priceSuv',     label: 'SUV',        icon: 'directions_car',  cap: 'Hasta 7 pax', color: 'text-violet-600 bg-violet-50 ring-violet-200' },
  { key: 'priceMinivan', label: 'Minivan',    icon: 'airport_shuttle', cap: 'Hasta 8 pax', color: 'text-emerald-600 bg-emerald-50 ring-emerald-200' },
  { key: 'priceVan',     label: 'Van',        icon: 'rv_hookup',       cap: 'Hasta 12 pax', color: 'text-amber-600 bg-amber-50 ring-amber-200'  },
]

const ZONE_ICONS: Record<string, string> = {
  central: 'location_city', norte: 'north', sur: 'south',
  nororiente: 'north_east', suroriente: 'south_east', poniente: 'west', rural: 'park',
}

const ZONE_COLORS: Record<string, string> = {
  central:    'bg-blue-50 border-blue-200 text-blue-700',
  norte:      'bg-green-50 border-green-200 text-green-700',
  sur:        'bg-purple-50 border-purple-200 text-purple-700',
  nororiente: 'bg-orange-50 border-orange-200 text-orange-700',
  suroriente: 'bg-rose-50 border-rose-200 text-rose-700',
  poniente:   'bg-teal-50 border-teal-200 text-teal-700',
  rural:      'bg-amber-50 border-amber-200 text-amber-700',
}

const EMPTY_NEW_ROUTE = {
  fromCommune: '',
  toCommune: '',
  priceSedan: 0,
  priceSuv: 0,
  priceMinivan: 0,
  priceVan: 0,
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ZonasPage() {
  const { user, token, clearAuth, _hasHydrated } = useAuthStore()
  const router = useRouter()

  // ── Global UI ──────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  // ── Pricing mode ───────────────────────────────────────────────────────────
  const [pricingMode, setPricingMode]   = useState<PricingMode>('zone')
  const [loadingMode, setLoadingMode]   = useState(true)
  const [savingMode,  setSavingMode]    = useState(false)

  // ── Destination config state ───────────────────────────────────────────────
  const [destType,    setDestType]    = useState<DestType>('airport')
  const [destName,    setDestName]    = useState('Aeropuerto AMB')
  const [destAddress, setDestAddress] = useState('Aeropuerto Internacional Arturo Merino Benítez, Pudahuel')
  const [loadingDest, setLoadingDest] = useState(false)
  const [savingDest,  setSavingDest]  = useState(false)

  // ── Zone state ─────────────────────────────────────────────────────────────
  const [zones,   setZones]   = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)

  const [editing,    setEditing]    = useState<{ zoneId: string; vehicleKey: VehicleKey } | null>(null)
  const [editValue,  setEditValue]  = useState('')
  const [saving,     setSaving]     = useState(false)

  const [editingComunasId, setEditingComunasId] = useState<string | null>(null)
  const [comunasInput,     setComunasInput]     = useState('')
  const [savingComunas,    setSavingComunas]    = useState(false)

  // ── Commune routes state ───────────────────────────────────────────────────
  const [routes,        setRoutes]        = useState<CommuneRoute[]>([])
  const [loadingRoutes, setLoadingRoutes] = useState(false)

  const [editingRouteId, setEditingRouteId] = useState<string | null>(null)
  const [editRouteData,  setEditRouteData]  = useState<Partial<CommuneRoute>>({})

  const [addingRoute, setAddingRoute] = useState(false)
  const [newRoute,    setNewRoute]    = useState({ ...EMPTY_NEW_ROUTE })
  const [savingRoute, setSavingRoute] = useState(false)

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!_hasHydrated) return
    if (!user || !token) { router.push('/auth/login'); return }
    if (user.role !== 'admin') { router.push('/dashboard'); return }
    loadPricingMode()
    loadZones()
    loadDestination()
  }, [_hasHydrated, user, token]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loaders ────────────────────────────────────────────────────────────────
  const loadDestination = useCallback(() => {
    setLoadingDest(true)
    api.get<ApiResponse<Record<string, string>>>('/settings', token ?? '')
      .then((res) => {
        const d = res.data
        if (d.destination_type) setDestType(d.destination_type as DestType)
        if (d.destination_name) setDestName(d.destination_name)
        if (d.destination_address) setDestAddress(d.destination_address)
      })
      .catch(console.error)
      .finally(() => setLoadingDest(false))
  }, [token])

  const loadPricingMode = useCallback(() => {
    setLoadingMode(true)
    api.get<ApiResponse<{ key: string; value: PricingMode }>>('/settings/pricing_mode', token ?? '')
      .then((res) => setPricingMode(res.data.value))
      .catch(console.error)
      .finally(() => setLoadingMode(false))
  }, [token])

  const loadZones = useCallback(() => {
    setLoading(true)
    api.get<ApiResponse<Zone[]>>('/zones', token ?? '')
      .then((res) => setZones(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [token])

  const loadRoutes = useCallback(() => {
    setLoadingRoutes(true)
    api.get<ApiResponse<CommuneRoute[]>>('/commune-routes/all', token ?? '')
      .then((res) => setRoutes(res.data))
      .catch(console.error)
      .finally(() => setLoadingRoutes(false))
  }, [token])

  // Load commune routes when switching to commune mode
  useEffect(() => {
    if (pricingMode === 'commune' && token) {
      loadRoutes()
    }
  }, [pricingMode, token, loadRoutes])

  // ── Toast ──────────────────────────────────────────────────────────────────
  const showToast = (msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Mode toggle ────────────────────────────────────────────────────────────
  const switchMode = async (mode: PricingMode) => {
    if (mode === pricingMode || savingMode) return
    setSavingMode(true)
    try {
      await api.patch('/settings/pricing_mode', { value: mode }, token ?? '')
      setPricingMode(mode)
      showToast(
        mode === 'zone'
          ? 'Modo cambiado a Zonas fijas'
          : 'Modo cambiado a Por comunas',
        'ok'
      )
    } catch {
      showToast('Error al cambiar el modo de tarifas', 'err')
    } finally {
      setSavingMode(false)
    }
  }

  // ── Destination config ─────────────────────────────────────────────────────
  const saveDestination = async () => {
    if (!destName.trim() || !destAddress.trim()) {
      showToast('Nombre y dirección son obligatorios', 'err'); return
    }
    setSavingDest(true)
    try {
      await Promise.all([
        api.patch('/settings/destination_type',    { value: destType },    token ?? ''),
        api.patch('/settings/destination_name',    { value: destName },    token ?? ''),
        api.patch('/settings/destination_address', { value: destAddress }, token ?? ''),
      ])
      showToast('Destino principal guardado', 'ok')
    } catch {
      showToast('Error al guardar el destino', 'err')
    } finally {
      setSavingDest(false)
    }
  }

  // ── Price editing (zones) ──────────────────────────────────────────────────
  const startEdit = (zoneId: string, vehicleKey: VehicleKey, currentPrice: number) => {
    setEditing({ zoneId, vehicleKey })
    setEditValue(String(currentPrice))
  }

  const cancelEdit = () => {
    setEditing(null)
    setEditValue('')
  }

  const savePrice = async (zone: Zone, vehicleKey: VehicleKey) => {
    const newPrice = parseInt(editValue.replace(/\D/g, ''), 10)
    if (!newPrice || newPrice < 1000) { showToast('El precio mínimo es $1.000 CLP', 'err'); return }
    if (newPrice === zone[vehicleKey]) { cancelEdit(); return }

    setSaving(true)
    try {
      await api.patch(`/zones/${zone.id}`, { [vehicleKey]: newPrice }, token ?? '')
      setZones((prev) => prev.map((z) => z.id === zone.id ? { ...z, [vehicleKey]: newPrice } : z))
      const vLabel = VEHICLES.find((v) => v.key === vehicleKey)?.label ?? vehicleKey
      showToast(`${zone.label} · ${vLabel} → $${newPrice.toLocaleString('es-CL')}`, 'ok')
      cancelEdit()
    } catch {
      showToast('Error al guardar el precio', 'err')
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, zone: Zone, vehicleKey: VehicleKey) => {
    if (e.key === 'Enter') savePrice(zone, vehicleKey)
    if (e.key === 'Escape') cancelEdit()
  }

  // ── Comunas editing ────────────────────────────────────────────────────────
  const startEditComunas = (zone: Zone) => {
    setEditingComunasId(zone.id)
    setComunasInput(zone.comunas.join(', '))
  }

  const cancelEditComunas = () => {
    setEditingComunasId(null)
    setComunasInput('')
  }

  const saveComunas = async (zone: Zone) => {
    const nuevas = comunasInput.split(',').map((c) => c.trim()).filter((c) => c.length > 0)
    if (nuevas.length === 0) { showToast('Agrega al menos una comuna', 'err'); return }

    setSavingComunas(true)
    try {
      await api.patch(`/zones/${zone.id}/comunas`, { comunas: nuevas }, token ?? '')
      setZones((prev) => prev.map((z) => z.id === zone.id ? { ...z, comunas: nuevas } : z))
      showToast(`Comunas de ${zone.label} actualizadas`, 'ok')
      cancelEditComunas()
    } catch {
      showToast('Error al guardar comunas', 'err')
    } finally {
      setSavingComunas(false)
    }
  }

  const removeComuna = async (zone: Zone, comunaToRemove: string) => {
    const nuevas = zone.comunas.filter((c) => c !== comunaToRemove)
    try {
      await api.patch(`/zones/${zone.id}/comunas`, { comunas: nuevas }, token ?? '')
      setZones((prev) => prev.map((z) => z.id === zone.id ? { ...z, comunas: nuevas } : z))
      showToast(`"${comunaToRemove}" eliminada de ${zone.label}`, 'ok')
    } catch {
      showToast('Error al eliminar comuna', 'err')
    }
  }

  // ── Commune routes CRUD ────────────────────────────────────────────────────
  const startEditRoute = (route: CommuneRoute) => {
    setEditingRouteId(route.id)
    setEditRouteData({
      fromCommune: route.fromCommune,
      toCommune:   route.toCommune,
      priceSedan:  route.priceSedan,
      priceSuv:    route.priceSuv,
      priceMinivan: route.priceMinivan,
      priceVan:    route.priceVan,
    })
  }

  const cancelEditRoute = () => {
    setEditingRouteId(null)
    setEditRouteData({})
  }

  const saveEditRoute = async () => {
    if (!editingRouteId) return
    setSavingRoute(true)
    try {
      await api.patch(`/commune-routes/${editingRouteId}`, editRouteData, token ?? '')
      setRoutes((prev) =>
        prev.map((r) => r.id === editingRouteId ? { ...r, ...editRouteData } as CommuneRoute : r)
      )
      showToast('Ruta actualizada', 'ok')
      cancelEditRoute()
    } catch {
      showToast('Error al guardar la ruta', 'err')
    } finally {
      setSavingRoute(false)
    }
  }

  const deleteRoute = async (id: string) => {
    try {
      await api.delete(`/commune-routes/${id}`, token ?? '')
      setRoutes((prev) =>
        prev.map((r) => r.id === id ? { ...r, isActive: false } : r)
      )
      showToast('Ruta desactivada', 'ok')
    } catch {
      showToast('Error al desactivar la ruta', 'err')
    }
  }

  const restoreRoute = async (id: string) => {
    try {
      await api.patch(`/commune-routes/${id}`, { isActive: true }, token ?? '')
      setRoutes((prev) =>
        prev.map((r) => r.id === id ? { ...r, isActive: true } : r)
      )
      showToast('Ruta activada', 'ok')
    } catch {
      showToast('Error al activar la ruta', 'err')
    }
  }

  const createRoute = async () => {
    if (!newRoute.fromCommune.trim() || !newRoute.toCommune.trim()) {
      showToast('Origen y destino son obligatorios', 'err')
      return
    }
    if (
      !newRoute.priceSedan || newRoute.priceSedan < 1000 ||
      !newRoute.priceSuv   || newRoute.priceSuv < 1000 ||
      !newRoute.priceMinivan || newRoute.priceMinivan < 1000 ||
      !newRoute.priceVan   || newRoute.priceVan < 1000
    ) {
      showToast('Todos los precios deben ser mínimo $1.000', 'err')
      return
    }

    setSavingRoute(true)
    try {
      const res = await api.post<ApiResponse<CommuneRoute>>('/commune-routes', newRoute, token ?? '')
      setRoutes((prev) => [res.data, ...prev])
      setNewRoute({ ...EMPTY_NEW_ROUTE })
      setAddingRoute(false)
      showToast('Ruta creada correctamente', 'ok')
    } catch {
      showToast('Error al crear la ruta', 'err')
    } finally {
      setSavingRoute(false)
    }
  }

  // ── Summary stats (zones) ──────────────────────────────────────────────────
  const allPrices = zones.flatMap((z) => VEHICLES.map((v) => z[v.key]))
  const minPrice  = allPrices.length ? Math.min(...allPrices) : 0
  const maxPrice  = allPrices.length ? Math.max(...allPrices) : 0
  const avgPrice  = allPrices.length ? Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length) : 0

  // ── Render helpers ─────────────────────────────────────────────────────────
  const priceInput = (
    value: number,
    onChange: (v: number) => void,
    placeholder = '0'
  ) => (
    <div className="relative">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold pointer-events-none">$</span>
      <input
        type="number"
        value={value || ''}
        onChange={(e) => onChange(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
        placeholder={placeholder}
        min={1000}
        step={1000}
        className="w-full pl-5 pr-2 py-1.5 text-sm font-semibold border border-slate-300 rounded-lg focus:outline-none focus:border-brand-400 bg-white"
      />
    </div>
  )

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">

      {/* ── Sidebar ── */}
      <AdminSidebar active="zonas" clearAuth={clearAuth} router={router} />

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto">

        {/* Top bar */}
        <header className="flex justify-between items-center px-8 py-3 bg-white/80 backdrop-blur-xl sticky top-0 z-40 border-b border-surface-container">
          <nav className="flex items-center gap-2 text-sm text-on-surface-variant">
            <a href="/admin" className="hover:text-primary transition-colors">Panel</a>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="font-semibold text-on-surface">Zonas y Tarifas</span>
          </nav>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-bold text-on-surface">{user?.name ?? 'Admin'}</p>
              <p className="text-xs text-on-surface-variant">Administrador</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="px-6 py-8 flex flex-col gap-8 max-w-6xl w-full mx-auto">

          {/* ── Page header ── */}
          <div>
            <h2 className="text-4xl font-black font-headline tracking-tighter text-slate-900">
              Zonas y Tarifas
            </h2>
            <p className="text-slate-500 mt-1 font-medium">
              Configura el modo de tarificación y los precios por tipo de vehículo
            </p>
          </div>

          {/* ── Mode toggle banner ── */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Zonas fijas */}
            <button
              onClick={() => switchMode('zone')}
              disabled={savingMode || loadingMode}
              className={`flex-1 flex items-start gap-4 p-5 rounded-2xl border-2 text-left transition-all duration-200 shadow-sm
                ${pricingMode === 'zone'
                  ? 'border-brand-500 bg-orange-50/60 shadow-orange-100'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                } disabled:opacity-60 disabled:cursor-wait`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors
                ${pricingMode === 'zone' ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  flight_takeoff
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`font-bold text-base ${pricingMode === 'zone' ? 'text-brand-600' : 'text-slate-800'}`}>
                    Zonas fijas
                  </p>
                  {pricingMode === 'zone' && (
                    <span className="inline-flex items-center gap-1 bg-brand-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      <span className="material-symbols-outlined text-[10px]">check</span>
                      ACTIVO
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                  Tarifa por zona de origen hacia un destino fijo (aeropuerto, terminal, etc.)
                </p>
              </div>
            </button>

            {/* Por comunas */}
            <button
              onClick={() => switchMode('commune')}
              disabled={savingMode || loadingMode}
              className={`flex-1 flex items-start gap-4 p-5 rounded-2xl border-2 text-left transition-all duration-200 shadow-sm
                ${pricingMode === 'commune'
                  ? 'border-brand-500 bg-orange-50/60 shadow-orange-100'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                } disabled:opacity-60 disabled:cursor-wait`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors
                ${pricingMode === 'commune' ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  route
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`font-bold text-base ${pricingMode === 'commune' ? 'text-brand-600' : 'text-slate-800'}`}>
                    Por comunas
                  </p>
                  {pricingMode === 'commune' && (
                    <span className="inline-flex items-center gap-1 bg-brand-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      <span className="material-symbols-outlined text-[10px]">check</span>
                      ACTIVO
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                  Tarifa personalizada entre cualquier par de comunas
                </p>
              </div>
            </button>
          </div>

          {/* ══════════════════════════════════════════════════════════
              ZONE MODE CONTENT
          ══════════════════════════════════════════════════════════ */}
          {pricingMode === 'zone' && (
            <>
              {/* ── Destination config card ── */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-brand-500 text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {destType === 'airport' ? 'flight' : destType === 'bus_terminal' ? 'directions_bus' : destType === 'train_station' ? 'train' : destType === 'port' ? 'anchor' : 'location_on'}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">Destino Principal</p>
                      <p className="text-xs text-slate-400">El lugar al que se dirigen todos los traslados en este modo</p>
                    </div>
                  </div>
                  {loadingDest && <span className="text-xs text-slate-400">Cargando…</span>}
                </div>
                <div className="p-5 space-y-4">
                  {/* Icon type picker */}
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Tipo de destino</p>
                    <div className="grid grid-cols-5 gap-2">
                      {([
                        { type: 'airport',       icon: 'flight',        label: 'Aeropuerto' },
                        { type: 'bus_terminal',  icon: 'directions_bus', label: 'Terminal' },
                        { type: 'train_station', icon: 'train',          label: 'Tren' },
                        { type: 'port',          icon: 'anchor',         label: 'Puerto' },
                        { type: 'other',         icon: 'location_on',    label: 'Otro' },
                      ] as { type: DestType; icon: string; label: string }[]).map(({ type, icon, label }) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setDestType(type)}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                            destType === type
                              ? 'border-brand-500 bg-orange-50'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <span
                            className={`material-symbols-outlined text-2xl ${destType === type ? 'text-brand-500' : 'text-slate-400'}`}
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            {icon}
                          </span>
                          <span className={`text-[10px] font-bold ${destType === type ? 'text-brand-600' : 'text-slate-500'}`}>
                            {label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Name + Address */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nombre del destino</label>
                      <input
                        type="text"
                        value={destName}
                        onChange={(e) => setDestName(e.target.value)}
                        placeholder="Ej: Terminal de Buses Alameda"
                        className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Dirección completa</label>
                      <input
                        type="text"
                        value={destAddress}
                        onChange={(e) => setDestAddress(e.target.value)}
                        placeholder="Ej: Av. O'Higgins 3848, Santiago"
                        className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                  {/* Save button */}
                  <div className="flex justify-end">
                    <button
                      onClick={saveDestination}
                      disabled={savingDest || !destName.trim() || !destAddress.trim()}
                      className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl disabled:opacity-50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">save</span>
                      {savingDest ? 'Guardando…' : 'Guardar destino'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Vehicle legend */}
              <div className="flex flex-wrap gap-2">
                {VEHICLES.map((v) => (
                  <span key={v.key} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ring-1 ${v.color}`}>
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>{v.icon}</span>
                    {v.label}
                    <span className="opacity-60">· {v.cap}</span>
                  </span>
                ))}
              </div>

              {/* Zone grid */}
              {loading ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl p-6 animate-pulse h-40 border border-slate-100" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {zones.map((zone) => {
                    const colorClass = ZONE_COLORS[zone.name] ?? 'bg-gray-50 border-gray-200 text-gray-700'
                    const icon = ZONE_ICONS[zone.name] ?? 'place'
                    const isEditingComunas = editingComunasId === zone.id

                    return (
                      <div key={zone.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

                        {/* Zone header */}
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${colorClass}`}>
                              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                {icon}
                              </span>
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{zone.label}</p>
                              <p className="text-xs text-slate-400 capitalize">{zone.name}</p>
                            </div>
                          </div>
                          <div className="text-right text-xs text-slate-400">
                            <p>{zone.comunas.length} comunas</p>
                          </div>
                        </div>

                        {/* Price grid — 4 vehicles */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-slate-100">
                          {VEHICLES.map((v) => {
                            const isEditingThis = editing?.zoneId === zone.id && editing?.vehicleKey === v.key
                            const price = zone[v.key]

                            return (
                              <div
                                key={v.key}
                                className={`p-4 transition-colors ${
                                  isEditingThis
                                    ? 'bg-brand-50'
                                    : 'hover:bg-slate-50 cursor-pointer'
                                }`}
                                onClick={() => !isEditingThis && !editing && startEdit(zone.id, v.key, price)}
                              >
                                <div className="flex items-center gap-1.5 mb-3">
                                  <span className={`material-symbols-outlined text-base ${isEditingThis ? 'text-brand-500' : 'text-slate-400'}`}
                                    style={{ fontVariationSettings: "'FILL' 1" }}>
                                    {v.icon}
                                  </span>
                                  <span className={`text-xs font-semibold ${isEditingThis ? 'text-brand-600' : 'text-slate-500'}`}>
                                    {v.label}
                                  </span>
                                </div>

                                {isEditingThis ? (
                                  <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                                    <div className="relative">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
                                      <input
                                        autoFocus
                                        type="number"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, zone, v.key)}
                                        min={1000}
                                        step={1000}
                                        className="w-full pl-5 pr-2 py-2 text-sm font-bold border-2 border-brand-400 rounded-lg focus:outline-none bg-white"
                                      />
                                    </div>
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => savePrice(zone, v.key)}
                                        disabled={saving}
                                        className="flex-1 bg-brand-500 text-white text-xs font-bold py-1.5 rounded-lg hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-1"
                                      >
                                        <span className="material-symbols-outlined text-xs">check</span>
                                        {saving ? '…' : 'OK'}
                                      </button>
                                      <button
                                        onClick={cancelEdit}
                                        className="px-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200"
                                      >
                                        <span className="material-symbols-outlined text-xs">close</span>
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-end justify-between">
                                    <div>
                                      <p className="text-xl font-black text-slate-900">
                                        ${price.toLocaleString('es-CL')}
                                      </p>
                                      <p className="text-[10px] text-slate-400">CLP</p>
                                    </div>
                                    <span className="material-symbols-outlined text-slate-300 text-sm opacity-0 group-hover:opacity-100">edit</span>
                                  </div>
                                )}

                                {!isEditingThis && (
                                  <p className="text-[10px] text-slate-300 mt-1">≈ USD ${(price / 950).toFixed(0)}</p>
                                )}
                              </div>
                            )
                          })}
                        </div>

                        {/* Comunas section */}
                        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                              Comunas ({zone.comunas.length})
                            </p>
                            <button
                              onClick={() => isEditingComunas ? cancelEditComunas() : startEditComunas(zone)}
                              className="text-xs text-brand-600 hover:underline flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[13px]">{isEditingComunas ? 'close' : 'edit'}</span>
                              {isEditingComunas ? 'Cancelar' : 'Editar'}
                            </button>
                          </div>

                          {isEditingComunas ? (
                            <div className="space-y-2">
                              <textarea
                                autoFocus
                                value={comunasInput}
                                onChange={(e) => setComunasInput(e.target.value)}
                                rows={2}
                                placeholder="Las Condes, Vitacura, Lo Barnechea..."
                                className="w-full px-3 py-2 text-xs border-2 border-brand-400 rounded-xl focus:outline-none resize-none bg-white"
                              />
                              <div className="flex gap-2 items-center">
                                <button onClick={() => saveComunas(zone)} disabled={savingComunas}
                                  className="bg-brand-500 text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-brand-600 disabled:opacity-50">
                                  {savingComunas ? 'Guardando…' : 'Guardar'}
                                </button>
                                <p className="text-[10px] text-slate-400">Separa con comas</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {zone.comunas.length === 0 ? (
                                <span className="text-xs text-slate-400 italic">Sin comunas definidas</span>
                              ) : zone.comunas.map((c) => (
                                <span key={c}
                                  className="group inline-flex items-center gap-1 px-2 py-0.5 bg-white rounded-full text-[11px] font-medium text-slate-600 border border-slate-200">
                                  {c}
                                  <button
                                    onClick={() => removeComuna(zone, c)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500"
                                  >
                                    <span className="material-symbols-outlined text-[11px]">close</span>
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Summary bar */}
              {zones.length > 0 && (
                <div className="bg-slate-700 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
                    </div>
                    <div>
                      <p className="text-white font-bold text-lg">Resumen de tarifas</p>
                      <p className="text-slate-400 text-sm">{zones.length} zonas · {VEHICLES.length} vehículos = {zones.length * VEHICLES.length} tarifas</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-6 text-center">
                    <div>
                      <p className="text-slate-400 text-xs uppercase tracking-wide">Mínima</p>
                      <p className="text-white font-black text-xl">${minPrice.toLocaleString('es-CL')}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs uppercase tracking-wide">Promedio</p>
                      <p className="text-white font-black text-xl">${avgPrice.toLocaleString('es-CL')}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs uppercase tracking-wide">Máxima</p>
                      <p className="text-white font-black text-xl">${maxPrice.toLocaleString('es-CL')}</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ══════════════════════════════════════════════════════════
              COMMUNE MODE CONTENT
          ══════════════════════════════════════════════════════════ */}
          {pricingMode === 'commune' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

              {/* Table toolbar */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <p className="font-bold text-slate-900">Rutas entre comunas</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {routes.filter((r) => r.isActive).length} rutas activas · {routes.filter((r) => !r.isActive).length} inactivas
                  </p>
                </div>
                <button
                  onClick={() => { setAddingRoute(true); setEditingRouteId(null) }}
                  disabled={addingRoute}
                  className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  Agregar ruta
                </button>
              </div>

              {loadingRoutes ? (
                <div className="p-8 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Origen</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Destino</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wide">Sedan</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wide">SUV</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wide">Minivan</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wide">Van</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wide">Activa</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wide">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">

                      {/* ── Add new route row ── */}
                      {addingRoute && (
                        <tr className="bg-orange-50/40 border-b-2 border-brand-200">
                          <td className="px-3 py-3">
                            <input
                              autoFocus
                              type="text"
                              value={newRoute.fromCommune}
                              onChange={(e) => setNewRoute((p) => ({ ...p, fromCommune: e.target.value }))}
                              placeholder="Ej: Estación Central"
                              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-brand-400 bg-white"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="text"
                              value={newRoute.toCommune}
                              onChange={(e) => setNewRoute((p) => ({ ...p, toCommune: e.target.value }))}
                              placeholder="Ej: Lo Barnechea"
                              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-brand-400 bg-white"
                            />
                          </td>
                          <td className="px-3 py-3">
                            {priceInput(newRoute.priceSedan, (v) => setNewRoute((p) => ({ ...p, priceSedan: v })))}
                          </td>
                          <td className="px-3 py-3">
                            {priceInput(newRoute.priceSuv, (v) => setNewRoute((p) => ({ ...p, priceSuv: v })))}
                          </td>
                          <td className="px-3 py-3">
                            {priceInput(newRoute.priceMinivan, (v) => setNewRoute((p) => ({ ...p, priceMinivan: v })))}
                          </td>
                          <td className="px-3 py-3">
                            {priceInput(newRoute.priceVan, (v) => setNewRoute((p) => ({ ...p, priceVan: v })))}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="text-xs text-slate-400">—</span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={createRoute}
                                disabled={savingRoute}
                                className="inline-flex items-center gap-1 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                              >
                                <span className="material-symbols-outlined text-xs">add</span>
                                {savingRoute ? 'Creando…' : 'Crear'}
                              </button>
                              <button
                                onClick={() => { setAddingRoute(false); setNewRoute({ ...EMPTY_NEW_ROUTE }) }}
                                className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                              >
                                <span className="material-symbols-outlined text-xs">close</span>
                                Cancelar
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* ── Route rows ── */}
                      {routes.length === 0 && !addingRoute ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-16 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                                <span className="material-symbols-outlined text-2xl text-slate-400" style={{ fontVariationSettings: "'FILL' 1" }}>
                                  route
                                </span>
                              </div>
                              <p className="text-slate-500 font-medium">Sin rutas configuradas. Agrega la primera ruta.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        routes.map((route) => {
                          const isEditing = editingRouteId === route.id
                          const inactive = !route.isActive

                          return (
                            <tr
                              key={route.id}
                              className={`transition-colors ${
                                inactive
                                  ? 'opacity-50 bg-slate-50'
                                  : isEditing
                                    ? 'bg-orange-50/30'
                                    : 'hover:bg-slate-50/60'
                              }`}
                            >
                              {/* Origen */}
                              <td className="px-4 py-3">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editRouteData.fromCommune ?? ''}
                                    onChange={(e) => setEditRouteData((p) => ({ ...p, fromCommune: e.target.value }))}
                                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-brand-400 bg-white"
                                  />
                                ) : (
                                  <span className="font-medium text-slate-800">{route.fromCommune}</span>
                                )}
                              </td>

                              {/* Destino */}
                              <td className="px-4 py-3">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editRouteData.toCommune ?? ''}
                                    onChange={(e) => setEditRouteData((p) => ({ ...p, toCommune: e.target.value }))}
                                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-brand-400 bg-white"
                                  />
                                ) : (
                                  <span className="font-medium text-slate-800">{route.toCommune}</span>
                                )}
                              </td>

                              {/* Sedan */}
                              <td className="px-4 py-3 text-right">
                                {isEditing ? (
                                  <div className="w-28 ml-auto">
                                    {priceInput(editRouteData.priceSedan ?? 0, (v) => setEditRouteData((p) => ({ ...p, priceSedan: v })))}
                                  </div>
                                ) : (
                                  <span className="font-semibold text-slate-700">${route.priceSedan.toLocaleString('es-CL')}</span>
                                )}
                              </td>

                              {/* SUV */}
                              <td className="px-4 py-3 text-right">
                                {isEditing ? (
                                  <div className="w-28 ml-auto">
                                    {priceInput(editRouteData.priceSuv ?? 0, (v) => setEditRouteData((p) => ({ ...p, priceSuv: v })))}
                                  </div>
                                ) : (
                                  <span className="font-semibold text-slate-700">${route.priceSuv.toLocaleString('es-CL')}</span>
                                )}
                              </td>

                              {/* Minivan */}
                              <td className="px-4 py-3 text-right">
                                {isEditing ? (
                                  <div className="w-28 ml-auto">
                                    {priceInput(editRouteData.priceMinivan ?? 0, (v) => setEditRouteData((p) => ({ ...p, priceMinivan: v })))}
                                  </div>
                                ) : (
                                  <span className="font-semibold text-slate-700">${route.priceMinivan.toLocaleString('es-CL')}</span>
                                )}
                              </td>

                              {/* Van */}
                              <td className="px-4 py-3 text-right">
                                {isEditing ? (
                                  <div className="w-28 ml-auto">
                                    {priceInput(editRouteData.priceVan ?? 0, (v) => setEditRouteData((p) => ({ ...p, priceVan: v })))}
                                  </div>
                                ) : (
                                  <span className="font-semibold text-slate-700">${route.priceVan.toLocaleString('es-CL')}</span>
                                )}
                              </td>

                              {/* Activa badge */}
                              <td className="px-4 py-3 text-center">
                                {route.isActive ? (
                                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                                    <span className="material-symbols-outlined text-[11px]">check_circle</span>
                                    Sí
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-200 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                                    <span className="material-symbols-outlined text-[11px]">cancel</span>
                                    No
                                  </span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-2">
                                  {isEditing ? (
                                    <>
                                      <button
                                        onClick={saveEditRoute}
                                        disabled={savingRoute}
                                        className="inline-flex items-center gap-1 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                                      >
                                        <span className="material-symbols-outlined text-xs">check</span>
                                        {savingRoute ? 'Guardando…' : 'Guardar'}
                                      </button>
                                      <button
                                        onClick={cancelEditRoute}
                                        className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                                      >
                                        <span className="material-symbols-outlined text-xs">close</span>
                                        Cancelar
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      {route.isActive ? (
                                        <>
                                          <button
                                            onClick={() => startEditRoute(route)}
                                            className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                                          >
                                            <span className="material-symbols-outlined text-xs">edit</span>
                                            Editar
                                          </button>
                                          <button
                                            onClick={() => deleteRoute(route.id)}
                                            className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-2 py-1.5 rounded-lg transition-colors"
                                            title="Desactivar ruta"
                                          >
                                            <span className="material-symbols-outlined text-xs">close</span>
                                          </button>
                                        </>
                                      ) : (
                                        <button
                                          onClick={() => restoreRoute(route.id)}
                                          className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                                        >
                                          <span className="material-symbols-outlined text-xs">refresh</span>
                                          Activar
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white font-semibold text-sm transition-all ${
          toast.type === 'ok' ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          <span className="material-symbols-outlined text-sm">
            {toast.type === 'ok' ? 'check_circle' : 'error'}
          </span>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
