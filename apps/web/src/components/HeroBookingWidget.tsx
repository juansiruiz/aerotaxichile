'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, MapPin, Car, ChevronRight, X } from 'lucide-react'
import { api } from '@/lib/api'
import type { Zone, ApiResponse } from '@aerotaxi/shared'

// ─── Constants ────────────────────────────────────────────────────────────────

const VEHICLE_OPTIONS = [
  { value: 'sedan',   label: 'Sedan VIP', cap: '1–4 pax' },
  { value: 'suv',     label: 'SUV',       cap: '1–5 pax' },
  { value: 'minivan', label: 'Minivan',   cap: '1–7 pax' },
  { value: 'van',     label: 'Van',       cap: '1–12 pax' },
]

type DestType = 'airport' | 'bus_terminal' | 'train_station' | 'port' | 'other'

const DEST_CONFIG: Record<DestType, { emojiTo: string; emojiFrom: string; labelTo: string; labelFrom: string }> = {
  airport:       { emojiTo: '✈️', emojiFrom: '🛬', labelTo: 'Al aeropuerto',    labelFrom: 'Desde aeropuerto' },
  bus_terminal:  { emojiTo: '🚌', emojiFrom: '🚌', labelTo: 'Al terminal',      labelFrom: 'Desde terminal' },
  train_station: { emojiTo: '🚂', emojiFrom: '🚂', labelTo: 'A la estación',    labelFrom: 'Desde estación' },
  port:          { emojiTo: '⚓', emojiFrom: '⚓', labelTo: 'Al puerto',        labelFrom: 'Desde puerto' },
  other:         { emojiTo: '📍', emojiFrom: '📍', labelTo: 'Al destino',       labelFrom: 'Desde destino' },
}

interface ComunaOption { name: string; zoneId: string; zoneLabel: string }
interface CommuneRoute {
  id: string
  fromCommune: string
  toCommune: string
  priceSedan: number
  priceSuv: number
  priceMinivan: number
  priceVan: number
  isActive: boolean
}

// ─── ComunaAutocomplete ───────────────────────────────────────────────────────

interface ComunaAutocompleteProps {
  comunas: ComunaOption[]
  value: string
  zoneLabel: string
  onChange: (name: string, zoneId: string) => void
}

function ComunaAutocomplete({ comunas, value, zoneLabel, onChange }: ComunaAutocompleteProps) {
  const [query,       setQuery]       = useState(value)
  const [open,        setOpen]        = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const containerRef                  = useRef<HTMLDivElement>(null)
  const inputRef                      = useRef<HTMLInputElement>(null)

  // Sync query when value changes externally
  useEffect(() => { setQuery(value) }, [value])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        // If query doesn't match a valid commune, clear selection
        if (!comunas.find((c) => c.name === query)) {
          setQuery(value) // revert to last confirmed value
        }
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [comunas, query, value])

  const filtered = query.trim()
    ? comunas.filter((c) =>
        c.name.toLowerCase().includes(query.toLowerCase())
      )
    : comunas

  const select = useCallback((opt: ComunaOption) => {
    setQuery(opt.name)
    setOpen(false)
    onChange(opt.name, opt.zoneId)
  }, [onChange])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open && e.key !== 'Escape') { setOpen(true); return }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlighted((h) => Math.min(h + 1, filtered.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlighted((h) => Math.max(h - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (filtered[highlighted]) select(filtered[highlighted])
        break
      case 'Escape':
        setOpen(false)
        setQuery(value)
        break
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    setHighlighted(0)
    setOpen(true)
    // Clear confirmed selection if user edits
    if (value && e.target.value !== value) {
      onChange('', '')
    }
  }

  const handleClear = () => {
    setQuery('')
    onChange('', '')
    inputRef.current?.focus()
    setOpen(true)
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div className="relative">
        <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder="Escribe tu comuna…"
          onChange={handleInput}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          className={`w-full pl-8 pr-8 py-2.5 text-sm border-2 rounded-xl focus:outline-none transition-colors bg-white ${
            value
              ? 'border-brand-500 text-slate-900'
              : 'border-slate-200 focus:border-brand-500 text-slate-700'
          }`}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Zone hint */}
      {value && zoneLabel && (
        <p className="text-[11px] text-slate-400 mt-1 pl-1">
          Zona: <span className="font-semibold text-brand-600">{zoneLabel}</span>
        </p>
      )}

      {/* Dropdown */}
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
          {filtered.map((opt, i) => (
            <li
              key={`${opt.zoneId}-${opt.name}`}
              onMouseDown={(e) => { e.preventDefault(); select(opt) }}
              onMouseEnter={() => setHighlighted(i)}
              className={`flex items-center justify-between px-3 py-2.5 cursor-pointer text-sm transition-colors ${
                i === highlighted
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="font-medium">{opt.name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                i === highlighted
                  ? 'bg-brand-100 text-brand-600'
                  : 'bg-slate-100 text-slate-400'
              }`}>
                {opt.zoneLabel}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* No results */}
      {open && query.trim() && filtered.length === 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl px-3 py-3 text-sm text-slate-400 text-center">
          No se encontró &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  )
}

// ─── HeroBookingWidget ────────────────────────────────────────────────────────

export default function HeroBookingWidget() {
  const router = useRouter()

  // Settings
  const [pricingMode,   setPricingMode]   = useState<'zone' | 'commune'>('zone')
  const [destType,      setDestTypeState] = useState<DestType>('airport')
  const [destName,      setDestName]      = useState('Aeropuerto AMB')

  // Zone mode state
  const [comunas,    setComunas]    = useState<ComunaOption[]>([])
  const [direction,  setDirection]  = useState<'to_airport' | 'from_airport'>('to_airport')
  const [comunaName, setComunaName] = useState('')
  const [zoneId,     setZoneId]     = useState('')

  // Commune mode state
  const [communeRoutes,  setCommuneRoutes]  = useState<CommuneRoute[]>([])
  const [fromCommune,    setFromCommune]    = useState('')
  const [toCommune,      setToCommune]      = useState('')

  // Shared
  const [date,        setDate]    = useState('')
  const [time,        setTime]    = useState('')
  const [vehicleType, setVehicle] = useState('sedan')

  useEffect(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setDate(tomorrow.toISOString().split('T')[0]!)
    setTime('08:00')

    // Load settings + zone/commune data in parallel
    Promise.all([
      api.get<ApiResponse<Record<string, string>>>('/settings'),
      api.get<ApiResponse<Zone[]>>('/zones'),
      api.get<ApiResponse<CommuneRoute[]>>('/commune-routes'),
    ]).then(([settingsRes, zonesRes, routesRes]) => {
      const s = settingsRes.data ?? {}
      const mode = (s.pricing_mode ?? 'zone') as 'zone' | 'commune'
      setPricingMode(mode)
      if (s.destination_type) setDestTypeState(s.destination_type as DestType)
      if (s.destination_name) setDestName(s.destination_name)

      const zones = zonesRes.data ?? []
      const flat: ComunaOption[] = []
      for (const zone of zones) {
        for (const c of zone.comunas ?? []) {
          flat.push({ name: c, zoneId: zone.id, zoneLabel: zone.label })
        }
      }
      flat.sort((a, b) => a.name.localeCompare(b.name, 'es'))
      setComunas(flat)

      setCommuneRoutes(routesRes.data ?? [])
    }).catch(() => {})
  }, [])

  // Commune mode: unique from/to communes
  const fromCommunes = [...new Set(communeRoutes.map(r => r.fromCommune))].sort((a, b) => a.localeCompare(b, 'es'))
  const toCommunes   = communeRoutes
    .filter(r => r.fromCommune === fromCommune)
    .map(r => r.toCommune)
    .sort((a, b) => a.localeCompare(b, 'es'))

  const matchedRoute = communeRoutes.find(r => r.fromCommune === fromCommune && r.toCommune === toCommune)

  const handleSearch = () => {
    const params = new URLSearchParams({ vehicleType })
    if (date) params.set('date', date)
    if (time) params.set('time', time)

    if (pricingMode === 'commune') {
      if (fromCommune) params.set('fromCommune', fromCommune)
      if (toCommune)   params.set('toCommune', toCommune)
      if (matchedRoute) params.set('communeRouteId', matchedRoute.id)
      params.set('pricingMode', 'commune')
    } else {
      params.set('direction', direction)
      if (zoneId)     params.set('zoneId', zoneId)
      if (comunaName) params.set('comuna', comunaName)
    }
    router.push(`/booking?${params.toString()}`)
  }

  const dc = DEST_CONFIG[destType]
  const todayStr = new Date().toISOString().split('T')[0]!
  const selectedZoneOption = comunas.find(c => c.name === comunaName)

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-5 w-full border border-white/20">

      {pricingMode === 'zone' ? (
        <>
          {/* Zone mode: Direction toggle */}
          <div className="flex bg-slate-100 rounded-xl p-1 mb-4">
            {(['to_airport', 'from_airport'] as const).map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setDirection(val)}
                className={`flex-1 py-2.5 px-2 rounded-lg text-sm font-semibold transition-all ${
                  direction === val ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {val === 'to_airport'
                  ? `${dc.emojiTo} ${dc.labelTo}`
                  : `${dc.emojiFrom} ${dc.labelFrom}`
                }
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Commune mode: header label */}
          <div className="mb-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Ruta del traslado</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Desde</label>
                <div className="relative">
                  <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <select
                    value={fromCommune}
                    onChange={(e) => { setFromCommune(e.target.value); setToCommune('') }}
                    className="w-full pl-8 pr-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none bg-white appearance-none"
                  >
                    <option value="">Origen…</option>
                    {fromCommunes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Hasta</label>
                <div className="relative">
                  <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <select
                    value={toCommune}
                    onChange={(e) => setToCommune(e.target.value)}
                    disabled={!fromCommune}
                    className="w-full pl-8 pr-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none bg-white appearance-none disabled:opacity-50"
                  >
                    <option value="">Destino…</option>
                    {toCommunes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>
            {matchedRoute && (
              <p className="text-[11px] text-green-600 font-semibold mt-1.5 pl-1">
                ✓ Ruta disponible · Sedan desde ${matchedRoute.priceSedan.toLocaleString('es-CL')}
              </p>
            )}
          </div>
        </>
      )}

      <div className="space-y-3">
        {/* Date + Time (shared) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Fecha de recogida</label>
            <div className="relative">
              <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="date" value={date} min={todayStr} onChange={(e) => setDate(e.target.value)}
                className="w-full pl-8 pr-2 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Hora</label>
            <div className="relative">
              <Clock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                className="w-full pl-8 pr-2 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none transition-colors" />
            </div>
          </div>
        </div>

        {/* Zone mode: commune autocomplete */}
        {pricingMode === 'zone' && (
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">
              {direction === 'to_airport' ? 'Tu comuna de origen' : 'Tu comuna de destino'}
            </label>
            <ComunaAutocomplete
              comunas={comunas}
              value={comunaName}
              zoneLabel={selectedZoneOption?.zoneLabel ?? ''}
              onChange={(name, id) => { setComunaName(name); setZoneId(id) }}
            />
          </div>
        )}

        {/* Vehicle type (shared) */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">Tipo de vehículo</label>
          <div className="grid grid-cols-4 gap-1.5">
            {VEHICLE_OPTIONS.map((v) => (
              <button key={v.value} type="button" onClick={() => setVehicle(v.value)}
                className={`flex flex-col items-center py-2 px-1 rounded-xl border-2 transition-all ${
                  vehicleType === v.value ? 'border-brand-500 bg-orange-50 text-brand-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <Car size={16} className={`mb-0.5 ${vehicleType === v.value ? 'text-brand-500' : 'text-slate-400'}`} />
                <span className="text-[10px] font-bold leading-tight">{v.label}</span>
                <span className="text-[9px] text-slate-400 mt-0.5">{v.cap}</span>
              </button>
            ))}
          </div>
        </div>

        <button type="button" onClick={handleSearch}
          className="w-full bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-base shadow-lg shadow-brand-500/30 mt-1"
        >
          Buscar disponibilidad
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Unused destName reference to avoid lint warnings when in zone mode */}
      {false && destName}
    </div>
  )
}
