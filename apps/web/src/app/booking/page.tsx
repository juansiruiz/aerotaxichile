'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import { detectZoneFromAddress } from '@aerotaxi/shared'
import type { Zone, ApiResponse } from '@aerotaxi/shared'
import { AddressAutocomplete } from '@/components/AddressAutocomplete'
import {
  ChevronRight, ChevronLeft, Check,
  Plane, Car, MapPin, Calendar, Clock, Users, CreditCard,
  Mail, User, Phone, Lock, Eye, EyeOff, MessageCircle,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const VEHICLE_OPTIONS = [
  { value: 'sedan',   label: 'Sedan VIP', cap: 'Hasta 4 pax', icon: 'local_taxi' },
  { value: 'suv',     label: 'SUV',       cap: 'Hasta 5 pax', icon: 'directions_car' },
  { value: 'minivan', label: 'Minivan',   cap: 'Hasta 7 pax', icon: 'airport_shuttle' },
  { value: 'van',     label: 'Van',       cap: 'Hasta 12 pax', icon: 'airport_shuttle' },
]

const STEP_LABELS = ['Datos personales', 'Tu traslado', 'Confirmar']

const DEST_TYPE_CONFIG: Record<string, {
  iconTo: string; iconFrom: string
  labelTo: string; labelFrom: string
  shortTo: string; shortFrom: string
}> = {
  airport:       { iconTo: 'flight_takeoff', iconFrom: 'flight_land',   labelTo: 'Al aeropuerto',  labelFrom: 'Desde aeropuerto', shortTo: 'Casa → AMB',      shortFrom: 'AMB → Casa' },
  bus_terminal:  { iconTo: 'directions_bus', iconFrom: 'directions_bus', labelTo: 'Al terminal',   labelFrom: 'Desde terminal',   shortTo: 'Casa → Terminal', shortFrom: 'Terminal → Casa' },
  train_station: { iconTo: 'train',          iconFrom: 'train',          labelTo: 'A la estación', labelFrom: 'Desde estación',   shortTo: 'Casa → Estación', shortFrom: 'Estación → Casa' },
  port:          { iconTo: 'anchor',         iconFrom: 'anchor',         labelTo: 'Al puerto',     labelFrom: 'Desde puerto',     shortTo: 'Casa → Puerto',   shortFrom: 'Puerto → Casa' },
  other:         { iconTo: 'location_on',    iconFrom: 'location_on',    labelTo: 'Al destino',    labelFrom: 'Desde destino',    shortTo: 'Casa → Destino',  shortFrom: 'Destino → Casa' },
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConfirmedBooking {
  id: string
  origin: string
  destination: string
  scheduledAt: string
  vehicleType: string
  passengerCount: number
  totalPrice: number
  paymentMethod: string
  direction: string
  zoneLabel?: string
}

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

// ─── Page export (Suspense boundary for useSearchParams) ─────────────────────

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Cargando…</p>
          </div>
        </div>
      }
    >
      <BookingWizard />
    </Suspense>
  )
}

// ─── Wizard orchestrator ──────────────────────────────────────────────────────

function BookingWizard() {
  const { user: storeUser, token: storeToken, setAuth, _hasHydrated } = useAuthStore()
  const router      = useRouter()
  const searchParams = useSearchParams()

  // ── Wizard step ───────────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // ── Auth (may come from store or freshly acquired in step 1) ─────────────
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [authUser, setAuthUser]   = useState<{ id: string; name: string; email: string; role: string } | null>(null)

  // ── Step 1: identity ──────────────────────────────────────────────────────
  const [email, setEmail]           = useState('')
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'exists' | 'new'>('idle')
  const [firstName, setFirstName]   = useState('')
  const [password, setPassword]     = useState('')
  const [showPw, setShowPw]         = useState(false)
  const [regName, setRegName]       = useState('')
  const [regPhone, setRegPhone]     = useState('')
  const [step1Error, setStep1Error] = useState('')
  const [step1Loading, setStep1Loading] = useState(false)

  // ── Step 2: trip details ──────────────────────────────────────────────────
  const [zones, setZones]             = useState<Zone[]>([])
  const [direction, setDirection]     = useState<'to_airport' | 'from_airport'>(
    (searchParams.get('direction') as 'to_airport' | 'from_airport') ?? 'to_airport',
  )
  const [date, setDate]               = useState(searchParams.get('date') ?? '')
  const [time, setTime]               = useState(searchParams.get('time') ?? '')
  const [zoneId, setZoneId]           = useState(searchParams.get('zoneId') ?? '')
  const [vehicleType, setVehicleType] = useState(searchParams.get('vehicleType') ?? 'sedan')
  const [origin, setOrigin]           = useState('')
  const [destination, setDestination] = useState('')
  const [passengerCount, setPax]      = useState(1)
  const [paymentMethod, setPayment]   = useState<'cash' | 'online'>('cash')
  const [detectedZone, setDetected]   = useState<Zone | null>(null)
  const [step2Error, setStep2Error]   = useState('')

  // ── Settings & destination config ────────────────────────────────────────
  const [pricingMode,   setPricingMode]   = useState<'zone' | 'commune'>('zone')
  const [destType,      setDestType]      = useState<'airport' | 'bus_terminal' | 'train_station' | 'port' | 'other'>('airport')
  const [destName,      setDestName]      = useState('Aeropuerto AMB')
  const [destAddress,   setDestAddress]   = useState('Aeropuerto Internacional Arturo Merino Benítez, Pudahuel')

  // ── Commune mode ─────────────────────────────────────────────────────────
  const [communeRoutes,  setCommuneRoutes]  = useState<CommuneRoute[]>([])
  const [fromCommune,    setFromCommune]    = useState(searchParams.get('fromCommune') ?? '')
  const [toCommune,      setToCommune]      = useState(searchParams.get('toCommune') ?? '')
  const [communeRouteId, setCommuneRouteId] = useState(searchParams.get('communeRouteId') ?? '')

  // ── Step 3 ────────────────────────────────────────────────────────────────
  const [submitting, setSubmitting]   = useState(false)
  const [submitError, setSubmitError] = useState('')

  // ── Confirmation ─────────────────────────────────────────────────────────
  const [confirmed, setConfirmed]     = useState<ConfirmedBooking | null>(null)

  // ── Derived ───────────────────────────────────────────────────────────────
  const selectedZone = zones.find((z) => z.id === zoneId) ?? null
  const priceMap: Record<string, number> = selectedZone
    ? { sedan: selectedZone.priceSedan, suv: selectedZone.priceSuv, minivan: selectedZone.priceMinivan, van: selectedZone.priceVan }
    : {}

  const selectedCommuneRoute = communeRoutes.find(r => r.id === communeRouteId) ?? null
  const communePriceMap: Record<string, number> = selectedCommuneRoute
    ? { sedan: selectedCommuneRoute.priceSedan, suv: selectedCommuneRoute.priceSuv, minivan: selectedCommuneRoute.priceMinivan, van: selectedCommuneRoute.priceVan }
    : {}
  const effectivePriceMap = pricingMode === 'commune' ? communePriceMap : priceMap
  const currentPrice = effectivePriceMap[vehicleType] ?? 0

  // ── Load zones, settings, commune routes ────────────────────────────────
  useEffect(() => {
    Promise.all([
      api.get<ApiResponse<Zone[]>>('/zones'),
      api.get<ApiResponse<Record<string, string>>>('/settings'),
      api.get<ApiResponse<CommuneRoute[]>>('/commune-routes'),
    ]).then(([zonesRes, settingsRes, communeRes]) => {
      setZones(zonesRes.data ?? [])
      const s = settingsRes.data ?? {}
      const mode = (s.pricing_mode ?? 'zone') as 'zone' | 'commune'
      setPricingMode(mode)
      if (s.destination_type) setDestType(s.destination_type as typeof destType)
      if (s.destination_name) setDestName(s.destination_name)
      if (s.destination_address) setDestAddress(s.destination_address)
      setCommuneRoutes(communeRes.data ?? [])
    }).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Skip step 1 if already logged in ────────────────────────────────────
  useEffect(() => {
    if (!_hasHydrated) return
    if (storeUser && storeToken) {
      setAuthToken(storeToken)
      setAuthUser(storeUser)
      setStep(2)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_hasHydrated])

  // ── Set destination address when direction changes ───────────────────────
  const applyDirection = useCallback((d: 'to_airport' | 'from_airport') => {
    setDirection(d)
    setDetected(null)
    if (d === 'to_airport') {
      setOrigin('')
      setDestination(destAddress)
    } else {
      setOrigin(destAddress)
      setDestination('')
    }
  }, [destAddress])

  // Init destination address once destAddress loads
  useEffect(() => {
    if (!destAddress) return
    if (direction === 'to_airport') setDestination(destAddress)
    else setOrigin(destAddress)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destAddress])

  // ── Auto-detect zone from address ────────────────────────────────────────
  const tryDetect = useCallback((addr: string) => {
    if (!addr || addr === destAddress || !zones.length) return
    const found = detectZoneFromAddress(addr, zones)
    if (found) { setDetected(found); setZoneId(found.id) }
  }, [zones, destAddress])

  useEffect(() => {
    const addr = direction === 'to_airport' ? origin : destination
    tryDetect(addr)
  }, [origin, destination, direction, tryDetect])

  // ── Step 1: check email ──────────────────────────────────────────────────
  const handleCheckEmail = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const trimEmail = email.trim()
    if (!trimEmail) return
    setEmailStatus('checking')
    setStep1Error('')
    try {
      const res = await api.post<ApiResponse<{ exists: boolean; firstName: string | null }>>(
        '/auth/check-email',
        { email: trimEmail },
      )
      setEmailStatus(res.data.exists ? 'exists' : 'new')
      setFirstName(res.data.firstName ?? '')
    } catch {
      setStep1Error('No pudimos verificar el email. Intenta de nuevo.')
      setEmailStatus('idle')
    }
  }

  // ── Step 1: login or register ────────────────────────────────────────────
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStep1Error('')
    setStep1Loading(true)
    try {
      type AuthResult = ApiResponse<{ token: string; user: { id: string; name: string; email: string; role: string } }>

      if (emailStatus === 'exists') {
        const res = await api.post<AuthResult>('/auth/login', { email: email.trim(), password })
        setAuth(res.data.user as Parameters<typeof setAuth>[0], res.data.token)
        setAuthToken(res.data.token)
        setAuthUser(res.data.user)
      } else {
        const res = await api.post<AuthResult>('/auth/register', {
          email: email.trim(), password,
          name: regName.trim(), phone: regPhone.trim(),
        })
        setAuth(res.data.user as Parameters<typeof setAuth>[0], res.data.token)
        setAuthToken(res.data.token)
        setAuthUser(res.data.user)
      }
      setStep(2)
    } catch (err) {
      setStep1Error(err instanceof Error ? err.message : 'Error al autenticarse')
    } finally {
      setStep1Loading(false)
    }
  }

  // ── Step 2: validate and proceed ─────────────────────────────────────────
  const handleStep2Next = () => {
    setStep2Error('')
    if (pricingMode === 'commune') {
      if (!fromCommune)    { setStep2Error('Selecciona la comuna de origen'); return }
      if (!toCommune)      { setStep2Error('Selecciona la comuna de destino'); return }
      if (!communeRouteId) { setStep2Error('No hay ruta disponible entre estas comunas'); return }
      if (!origin)         { setStep2Error('Ingresa tu dirección de origen'); return }
      if (!destination)    { setStep2Error('Ingresa tu dirección de destino'); return }
    } else {
      const freeAddr = direction === 'to_airport' ? origin : destination
      if (!freeAddr || freeAddr === destAddress) {
        setStep2Error(`Ingresa la dirección de ${direction === 'to_airport' ? 'recogida' : 'destino'}`)
        return
      }
      if (!zoneId) { setStep2Error('Selecciona tu zona de servicio'); return }
    }
    if (!date) { setStep2Error('Selecciona la fecha de recogida'); return }
    if (!time) { setStep2Error('Selecciona la hora de recogida'); return }
    setStep(3)
  }

  // ── Step 3: submit booking ───────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!authToken) { setStep(1); return }
    setSubmitting(true)
    setSubmitError('')
    try {
      const scheduledAt = `${date}T${time}:00`
      const payload = pricingMode === 'commune'
        ? { direction: 'to_destination' as const, origin, destination, communeRouteId, vehicleType, passengerCount, paymentMethod, scheduledAt }
        : { direction, origin, destination, zoneId, vehicleType, passengerCount, paymentMethod, scheduledAt }
      const res = await api.post<ApiResponse<ConfirmedBooking>>('/bookings', payload, authToken)
      setConfirmed({ ...res.data, zoneLabel: pricingMode === 'commune' ? `${fromCommune} → ${toCommune}` : selectedZone?.label })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al crear la reserva')
    } finally {
      setSubmitting(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  if (confirmed) return <ConfirmationScreen confirmed={confirmed} onDashboard={() => router.push('/dashboard')} />

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Sticky progress header ────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => (step > 1 ? setStep((step - 1) as 1 | 2 | 3) : router.back())}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="flex-1 flex items-center">
            {[1, 2, 3].map((s, i) => (
              <div key={s} className="flex items-center flex-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                      s < step  ? 'bg-green-500 text-white' :
                      s === step ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30' :
                                   'bg-slate-200 text-slate-400'
                    }`}
                  >
                    {s < step ? <Check size={13} /> : s}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block whitespace-nowrap ${
                    s === step ? 'text-brand-600' : s < step ? 'text-green-600' : 'text-slate-400'
                  }`}>
                    {STEP_LABELS[s - 1]}
                  </span>
                </div>
                {i < 2 && <div className="flex-1 h-px bg-slate-200 mx-2" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Step content ──────────────────────────────────────────────── */}
      <div className="max-w-xl mx-auto px-4 py-8">
        {step === 1 && (
          <Step1Identity
            email={email} setEmail={setEmail}
            emailStatus={emailStatus} firstName={firstName}
            password={password} setPassword={setPassword}
            showPw={showPw} setShowPw={setShowPw}
            regName={regName} setRegName={setRegName}
            regPhone={regPhone} setRegPhone={setRegPhone}
            step1Error={step1Error} step1Loading={step1Loading}
            onCheckEmail={handleCheckEmail}
            onSubmit={handleStep1Submit}
            onResetEmail={() => setEmailStatus('idle')}
          />
        )}
        {step === 2 && (
          <Step2Trip
            authUser={authUser}
            pricingMode={pricingMode}
            destType={destType}
            destName={destName}
            destAddress={destAddress}
            direction={direction} onDirectionChange={applyDirection}
            date={date} setDate={setDate}
            time={time} setTime={setTime}
            origin={origin} setOrigin={setOrigin}
            destination={destination} setDestination={setDestination}
            zones={zones} zoneId={zoneId} setZoneId={setZoneId}
            detectedZone={detectedZone}
            vehicleType={vehicleType} setVehicleType={setVehicleType}
            passengerCount={passengerCount} setPax={setPax}
            paymentMethod={paymentMethod} setPayment={setPayment}
            selectedZone={selectedZone} priceMap={priceMap} currentPrice={currentPrice}
            communeRoutes={communeRoutes}
            fromCommune={fromCommune}
            toCommune={toCommune}
            communeRouteId={communeRouteId}
            selectedCommuneRoute={selectedCommuneRoute}
            communePriceMap={communePriceMap}
            onFromCommuneChange={setFromCommune}
            onToCommuneChange={setToCommune}
            onCommuneRouteIdChange={setCommuneRouteId}
            step2Error={step2Error} onNext={handleStep2Next}
          />
        )}
        {step === 3 && (
          <Step3Confirm
            direction={direction}
            pricingMode={pricingMode}
            fromCommune={fromCommune}
            toCommune={toCommune}
            origin={origin} destination={destination}
            date={date} time={time}
            vehicleType={vehicleType} passengerCount={passengerCount}
            paymentMethod={paymentMethod}
            selectedZone={selectedZone} currentPrice={currentPrice}
            submitting={submitting} submitError={submitError}
            onSubmit={handleSubmit} onBack={() => setStep(2)}
          />
        )}
      </div>
    </div>
  )
}

// ─── Step 1: Identity ─────────────────────────────────────────────────────────

interface Step1Props {
  email: string; setEmail: (v: string) => void
  emailStatus: 'idle' | 'checking' | 'exists' | 'new'
  firstName: string
  password: string; setPassword: (v: string) => void
  showPw: boolean; setShowPw: (v: boolean) => void
  regName: string; setRegName: (v: string) => void
  regPhone: string; setRegPhone: (v: string) => void
  step1Error: string; step1Loading: boolean
  onCheckEmail: (e?: React.FormEvent) => void
  onSubmit: (e: React.FormEvent) => void
  onResetEmail: () => void
}

function Step1Identity({
  email, setEmail, emailStatus, firstName,
  password, setPassword, showPw, setShowPw,
  regName, setRegName, regPhone, setRegPhone,
  step1Error, step1Loading, onCheckEmail, onSubmit, onResetEmail,
}: Step1Props) {
  return (
    <div>
      <div className="mb-8">
        <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center mb-4">
          <User size={22} className="text-brand-500" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-1">¿Quién reserva?</h1>
        <p className="text-slate-500 text-sm">Ingresa tu email para continuar con la reserva</p>
      </div>

      {/* ── Email check ───────────────────────────────────────────────── */}
      {(emailStatus === 'idle' || emailStatus === 'checking') && (
        <form onSubmit={onCheckEmail} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                autoFocus
                className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none text-sm transition-colors"
              />
            </div>
          </div>
          {step1Error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">{step1Error}</p>
          )}
          <button
            type="submit"
            disabled={emailStatus === 'checking' || !email}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {emailStatus === 'checking' ? 'Verificando…' : 'Continuar'}
            {emailStatus !== 'checking' && <ChevronRight size={18} />}
          </button>
        </form>
      )}

      {/* ── Existing user: login ──────────────────────────────────────── */}
      {emailStatus === 'exists' && (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
              {firstName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-green-800">¡Hola, {firstName}! 👋</p>
              <p className="text-xs text-green-600 truncate">Cuenta encontrada · {email}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Contraseña</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                required
                autoFocus
                className="w-full pl-10 pr-10 py-3 border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none text-sm transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {step1Error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">{step1Error}</p>
          )}

          <button
            type="submit"
            disabled={step1Loading || !password}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {step1Loading ? 'Entrando…' : 'Entrar y continuar'}
            {!step1Loading && <ChevronRight size={18} />}
          </button>

          <button
            type="button"
            onClick={onResetEmail}
            className="w-full text-slate-500 text-sm hover:text-slate-700 transition-colors py-1"
          >
            ← Usar otro email
          </button>
        </form>
      )}

      {/* ── New user: register ────────────────────────────────────────── */}
      {emailStatus === 'new' && (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <p className="text-sm font-bold text-blue-800">¡Te damos la bienvenida! 🎉</p>
            <p className="text-xs text-blue-600 mt-0.5">Crea tu cuenta con {email}</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre completo</label>
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Juan Pérez"
                required
                autoFocus
                className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none text-sm transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Teléfono</label>
            <div className="relative">
              <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                placeholder="+56912345678"
                required
                className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none text-sm transition-colors"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Formato: +56912345678</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Contraseña</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                minLength={8}
                className="w-full pl-10 pr-10 py-3 border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none text-sm transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {step1Error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">{step1Error}</p>
          )}

          <button
            type="submit"
            disabled={step1Loading || !regName || !regPhone || !password}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {step1Loading ? 'Creando cuenta…' : 'Crear cuenta y continuar'}
            {!step1Loading && <ChevronRight size={18} />}
          </button>

          <button
            type="button"
            onClick={onResetEmail}
            className="w-full text-slate-500 text-sm hover:text-slate-700 transition-colors py-1"
          >
            ← Usar otro email
          </button>
        </form>
      )}
    </div>
  )
}

// ─── Step 2: Trip details ─────────────────────────────────────────────────────

interface Step2Props {
  authUser: { id: string; name: string; email: string; role: string } | null
  pricingMode: 'zone' | 'commune'
  destType: 'airport' | 'bus_terminal' | 'train_station' | 'port' | 'other'
  destName: string
  destAddress: string
  direction: 'to_airport' | 'from_airport'; onDirectionChange: (d: 'to_airport' | 'from_airport') => void
  date: string; setDate: (v: string) => void
  time: string; setTime: (v: string) => void
  origin: string; setOrigin: (v: string) => void
  destination: string; setDestination: (v: string) => void
  zones: Zone[]; zoneId: string; setZoneId: (v: string) => void
  detectedZone: Zone | null
  vehicleType: string; setVehicleType: (v: string) => void
  passengerCount: number; setPax: (v: number) => void
  paymentMethod: 'cash' | 'online'; setPayment: (v: 'cash' | 'online') => void
  selectedZone: Zone | null; priceMap: Record<string, number>; currentPrice: number
  communeRoutes: CommuneRoute[]
  fromCommune: string
  toCommune: string
  communeRouteId: string
  selectedCommuneRoute: CommuneRoute | null
  communePriceMap: Record<string, number>
  onFromCommuneChange: (v: string) => void
  onToCommuneChange: (v: string) => void
  onCommuneRouteIdChange: (v: string) => void
  step2Error: string; onNext: () => void
}

function Step2Trip({
  authUser, pricingMode, destType, destName, destAddress,
  direction, onDirectionChange,
  date, setDate, time, setTime,
  origin, setOrigin, destination, setDestination,
  zones, zoneId, setZoneId, detectedZone,
  vehicleType, setVehicleType, passengerCount, setPax,
  paymentMethod, setPayment,
  selectedZone, priceMap, currentPrice,
  communeRoutes, fromCommune, toCommune, communeRouteId,
  selectedCommuneRoute, communePriceMap,
  onFromCommuneChange, onToCommuneChange, onCommuneRouteIdChange,
  step2Error, onNext,
}: Step2Props) {
  const todayStr = new Date().toISOString().split('T')[0]!
  const dtConfig = DEST_TYPE_CONFIG[destType] ?? DEST_TYPE_CONFIG.airport!

  // Commune selects
  const fromCommunes = [...new Set(communeRoutes.map(r => r.fromCommune))].sort((a, b) => a.localeCompare(b, 'es'))
  const toCommunes   = communeRoutes
    .filter(r => r.fromCommune === fromCommune)
    .map(r => r.toCommune)
    .sort((a, b) => a.localeCompare(b, 'es'))

  const effectivePriceMap = pricingMode === 'commune' ? communePriceMap : priceMap

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900 mb-1">Tu traslado</h1>
        {authUser && (
          <p className="text-slate-500 text-sm">
            Hola {authUser.name.split(' ')[0]} Completa los detalles del viaje
          </p>
        )}
      </div>

      <div className="space-y-4">

        {/* ── Commune mode: route selectors ──────────────────────────── */}
        {pricingMode === 'commune' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ruta del traslado</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Desde (comuna)</label>
                <div className="relative">
                  <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    value={fromCommune}
                    onChange={e => {
                      onFromCommuneChange(e.target.value)
                      onToCommuneChange('')
                      onCommuneRouteIdChange('')
                    }}
                    className="w-full pl-8 pr-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none bg-white appearance-none"
                  >
                    <option value="">Selecciona origen…</option>
                    {fromCommunes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Hasta (comuna)</label>
                <div className="relative">
                  <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    value={toCommune}
                    onChange={e => {
                      onToCommuneChange(e.target.value)
                      const r = communeRoutes.find(cr => cr.fromCommune === fromCommune && cr.toCommune === e.target.value)
                      onCommuneRouteIdChange(r?.id ?? '')
                    }}
                    disabled={!fromCommune}
                    className="w-full pl-8 pr-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none bg-white appearance-none disabled:opacity-50"
                  >
                    <option value="">Selecciona destino…</option>
                    {toCommunes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>
            {selectedCommuneRoute && (
              <div className="grid grid-cols-2 gap-1.5">
                {VEHICLE_OPTIONS.map(({ value, label }) => (
                  <div key={value} className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs border transition-all ${vehicleType === value ? 'bg-orange-50 border-brand-300' : 'bg-slate-50 border-slate-100'}`}>
                    <span className={vehicleType === value ? 'font-semibold text-brand-700' : 'text-slate-600'}>{label}</span>
                    <span className={`font-black ${vehicleType === value ? 'text-brand-600' : 'text-slate-700'}`}>
                      ${(communePriceMap[value] ?? 0).toLocaleString('es-CL')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Zone mode: Direction ────────────────────────────────────── */}
        {pricingMode === 'zone' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Tipo de traslado</h2>
            <div className="grid grid-cols-2 gap-2">
              {(['to_airport', 'from_airport'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onDirectionChange(d)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                    direction === d ? 'border-brand-500 bg-orange-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-2xl ${direction === d ? 'text-brand-500' : 'text-slate-400'}`}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {d === 'to_airport' ? dtConfig.iconTo : dtConfig.iconFrom}
                  </span>
                  <div>
                    <p className={`text-xs font-bold ${direction === d ? 'text-brand-700' : 'text-slate-700'}`}>
                      {d === 'to_airport' ? dtConfig.labelTo : dtConfig.labelFrom}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {d === 'to_airport' ? dtConfig.shortTo : dtConfig.shortFrom}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Date + Time ────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Fecha y hora</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Fecha de recogida</label>
              <div className="relative">
                <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={date}
                  min={todayStr}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-8 pr-2 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Hora</label>
              <div className="relative">
                <Clock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full pl-8 pr-2 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Addresses ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ruta</h2>

          {/* Origin */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              {pricingMode === 'commune'
                ? 'Dirección de recogida'
                : direction === 'to_airport' ? 'Dirección de recogida' : `${destName} (origen)`}
            </label>
            {pricingMode === 'zone' && direction !== 'to_airport' ? (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm text-slate-500">
                <Plane size={13} className="text-slate-400 shrink-0" />
                <span className="truncate">{destName}</span>
              </div>
            ) : (
              <div className="relative">
                <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <AddressAutocomplete
                  value={origin}
                  onChange={setOrigin}
                  placeholder="Ej: Av. Las Condes 1234, Las Condes"
                  className="w-full pl-8 pr-4 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none transition-colors"
                />
              </div>
            )}
          </div>

          {/* Arrow */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-slate-100" />
            <div className="w-7 h-7 bg-orange-50 border-2 border-orange-100 rounded-full flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-brand-500 text-[14px]">arrow_downward</span>
            </div>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {/* Destination */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              {pricingMode === 'commune'
                ? 'Dirección de destino'
                : direction === 'to_airport' ? `${destName} (destino)` : 'Dirección de destino'}
            </label>
            {pricingMode === 'zone' && direction === 'to_airport' ? (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm text-slate-500">
                <Plane size={13} className="text-slate-400 shrink-0" />
                <span className="truncate">{destName}</span>
              </div>
            ) : (
              <div className="relative">
                <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <AddressAutocomplete
                  value={destination}
                  onChange={setDestination}
                  placeholder="Ej: Av. Providencia 456, Providencia"
                  className="w-full pl-8 pr-4 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none transition-colors"
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Zone (zone mode only) ───────────────────────────────────── */}
        {pricingMode === 'zone' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Zona de servicio</h2>

            {detectedZone && zoneId === detectedZone.id && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                <Check size={13} className="text-green-600 shrink-0" />
                <p className="text-xs text-green-800 font-medium">
                  Zona detectada: <strong>{detectedZone.label}</strong> · Puedes cambiarla
                </p>
              </div>
            )}

            <div className="relative">
              <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none bg-white appearance-none"
              >
                <option value="">Selecciona tu zona</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>{z.label}</option>
                ))}
              </select>
            </div>

            {selectedZone && (
              <div className="grid grid-cols-2 gap-1.5">
                {VEHICLE_OPTIONS.map(({ value, label }) => (
                  <div
                    key={value}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs border transition-all ${
                      vehicleType === value ? 'bg-orange-50 border-brand-300' : 'bg-slate-50 border-slate-100'
                    }`}
                  >
                    <span className={vehicleType === value ? 'font-semibold text-brand-700' : 'text-slate-600'}>
                      {label}
                    </span>
                    <span className={`font-black ${vehicleType === value ? 'text-brand-600' : 'text-slate-700'}`}>
                      ${(priceMap[value] ?? 0).toLocaleString('es-CL')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Vehicle type ────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Tipo de vehículo</h2>
          <div className="grid grid-cols-2 gap-2">
            {VEHICLE_OPTIONS.map(({ value, label, cap, icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setVehicleType(value)}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                  vehicleType === value ? 'border-brand-500 bg-orange-50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-2xl shrink-0 ${vehicleType === value ? 'text-brand-500' : 'text-slate-400'}`}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {icon}
                </span>
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${vehicleType === value ? 'text-brand-700' : 'text-slate-800'}`}>{label}</p>
                  <p className="text-[11px] text-slate-500">{cap}</p>
                  {(selectedZone || selectedCommuneRoute) && (
                    <p className={`text-xs font-black mt-0.5 ${vehicleType === value ? 'text-brand-600' : 'text-slate-500'}`}>
                      ${(effectivePriceMap[value] ?? 0).toLocaleString('es-CL')}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>

          {(selectedZone || selectedCommuneRoute) && (
            <div className="mt-3 flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5">
              <span className="text-sm text-slate-600 font-medium">Tu tarifa estimada</span>
              <span className="text-xl font-black text-brand-500">
                ${currentPrice.toLocaleString('es-CL')}{' '}
                <span className="text-xs font-normal text-slate-400">CLP</span>
              </span>
            </div>
          )}
        </div>

        {/* ── Passengers + Payment ────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Detalles adicionales</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Pasajeros</label>
              <div className="relative">
                <Users size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number" min={1} max={12}
                  value={passengerCount}
                  onChange={(e) => setPax(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
                  className="w-full pl-8 pr-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Método de pago</label>
              <div className="relative">
                <CreditCard size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={paymentMethod}
                  onChange={(e) => setPayment(e.target.value as 'cash' | 'online')}
                  className="w-full pl-8 pr-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none bg-white"
                >
                  <option value="cash">Efectivo</option>
                  <option value="online">Pago online</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {step2Error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-red-500 text-[16px]">error</span>
            <p className="text-red-700 text-sm">{step2Error}</p>
          </div>
        )}

        <button
          type="button"
          onClick={onNext}
          className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-base shadow-lg shadow-brand-500/20"
        >
          Revisar reserva
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}

// ─── Step 3: Confirmation ─────────────────────────────────────────────────────

interface Step3Props {
  direction: string
  pricingMode: 'zone' | 'commune'
  fromCommune: string
  toCommune: string
  origin: string; destination: string
  date: string; time: string
  vehicleType: string; passengerCount: number; paymentMethod: string
  selectedZone: Zone | null; currentPrice: number
  submitting: boolean; submitError: string
  onSubmit: () => void; onBack: () => void
}

function Step3Confirm({
  direction, pricingMode, fromCommune, toCommune,
  origin, destination, date, time,
  vehicleType, passengerCount, paymentMethod,
  selectedZone, currentPrice, submitting, submitError, onSubmit, onBack,
}: Step3Props) {
  const vLabel = VEHICLE_OPTIONS.find((v) => v.value === vehicleType)?.label ?? vehicleType

  let dateFormatted = '—'
  if (date && time) {
    try {
      dateFormatted = format(new Date(`${date}T${time}:00`), "dd 'de' MMMM yyyy · HH:mm", { locale: es })
    } catch { /* ignore */ }
  }

  const traslado = pricingMode === 'commune'
    ? `${fromCommune} → ${toCommune}`
    : direction === 'to_airport' ? 'Al aeropuerto' : 'Desde aeropuerto'

  const zonaLabel = pricingMode === 'commune'
    ? `${fromCommune} → ${toCommune}`
    : selectedZone?.label ?? '—'

  const details = [
    { icon: 'flight', label: 'Traslado', value: traslado },
    { icon: 'calendar_month', label: 'Fecha', value: dateFormatted },
    { icon: 'home', label: 'Recogida', value: origin },
    { icon: 'location_on', label: 'Destino', value: destination },
    { icon: 'map', label: pricingMode === 'commune' ? 'Ruta' : 'Zona', value: zonaLabel },
    { icon: 'directions_car', label: 'Vehículo', value: vLabel },
    { icon: 'groups', label: 'Pasajeros', value: String(passengerCount) },
    { icon: 'payments', label: 'Pago', value: paymentMethod === 'cash' ? 'Efectivo' : 'Online' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900 mb-1">Revisa tu reserva</h1>
        <p className="text-slate-500 text-sm">Confirma todos los datos antes de enviar</p>
      </div>

      {/* Summary card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
        {details.map(({ icon, label, value }) => (
          <div key={label} className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
            <span
              className="material-symbols-outlined text-brand-400 text-[15px] mt-0.5 shrink-0"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {icon}
            </span>
            <span className="text-xs text-slate-400 w-20 shrink-0 pt-0.5">{label}</span>
            <span className="text-sm font-medium text-slate-800 flex-1">{value}</span>
          </div>
        ))}

        {/* Price */}
        <div className="flex items-center justify-between pt-4 mt-2 border-t-2 border-dashed border-slate-200">
          <div>
            <p className="text-slate-600 font-semibold text-sm">Tarifa estimada</p>
            <p className="text-[11px] text-slate-400">Precio fijo · incluye peajes</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-brand-500">${currentPrice.toLocaleString('es-CL')}</p>
            <p className="text-xs text-slate-400">CLP</p>
          </div>
        </div>
      </div>

      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-red-500 text-[16px]">error</span>
          <p className="text-red-700 text-sm">{submitError}</p>
        </div>
      )}

      <div className="space-y-3">
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-base shadow-lg shadow-brand-500/25 disabled:opacity-50"
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          {submitting ? 'Creando reserva…' : 'Confirmar reserva'}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="w-full text-slate-500 text-sm font-medium py-2 hover:text-slate-700 transition-colors"
        >
          ← Editar detalles
        </button>
      </div>
    </div>
  )
}

// ─── Confirmation screen ──────────────────────────────────────────────────────

function ConfirmationScreen({
  confirmed,
  onDashboard,
}: {
  confirmed: ConfirmedBooking
  onDashboard: () => void
}) {
  const vLabel = VEHICLE_OPTIONS.find((v) => v.value === confirmed.vehicleType)?.label ?? confirmed.vehicleType

  let fecha = '—'
  try {
    fecha = format(new Date(confirmed.scheduledAt), "dd 'de' MMMM yyyy 'a las' HH:mm", { locale: es })
  } catch { /* ignore */ }

  const wa = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '56963552132'
  const dir = confirmed.direction === 'to_airport'
    ? 'Al Aeropuerto ✈️'
    : confirmed.direction === 'from_airport'
      ? 'Desde Aeropuerto 🛬'
      : confirmed.zoneLabel
        ? `${confirmed.zoneLabel}`
        : 'Traslado'
  const msg = [
    `¡Hola! Confirmo mi reserva *AeroTaxi Chile*:`,
    ``,
    `🆔 Reserva: *#${confirmed.id.slice(-6).toUpperCase()}*`,
    `🗓 Fecha: *${fecha}*`,
    `📍 ${dir}`,
    `🏠 Desde: ${confirmed.origin}`,
    `🏁 Hasta: ${confirmed.destination}`,
    `🚗 Vehículo: *${vLabel}*`,
    `👥 Pasajeros: ${confirmed.passengerCount}`,
    `💰 Tarifa: *$${confirmed.totalPrice.toLocaleString('es-CL')} CLP*`,
    `💳 Pago: ${confirmed.paymentMethod === 'cash' ? 'Efectivo' : 'Online'}`,
    ``,
    `Quedo atento/a a la confirmación. ¡Gracias!`,
  ].join('\n')
  const waUrl = `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        {/* Check animation */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <span
              className="material-symbols-outlined text-5xl text-green-500"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">¡Reserva creada!</h1>
          <p className="text-slate-500 text-sm text-center mt-2 max-w-xs">
            Tu solicitud fue recibida. Confirma por WhatsApp para asegurar tu conductor.
          </p>
        </div>

        {/* Booking summary */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4 space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="font-bold text-slate-800 text-sm">Reserva #{confirmed.id.slice(-6).toUpperCase()}</span>
            <span className="text-brand-500 font-black text-lg">${confirmed.totalPrice.toLocaleString('es-CL')}</span>
          </div>
          {[
            { icon: 'calendar_month', label: fecha },
            {
              icon: confirmed.direction === 'to_airport'
                ? 'flight_takeoff'
                : confirmed.direction === 'from_airport'
                  ? 'flight_land'
                  : 'route',
              label: confirmed.origin,
            },
            { icon: 'location_on', label: confirmed.destination },
            { icon: 'directions_car', label: `${vLabel} · ${confirmed.passengerCount} pax` },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-start gap-3 text-sm">
              <span
                className="material-symbols-outlined text-brand-400 text-[15px] mt-0.5 shrink-0"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {icon}
              </span>
              <span className="text-slate-600">{label}</span>
            </div>
          ))}
        </div>

        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 w-full bg-[#25D366] text-white font-bold py-4 rounded-2xl hover:opacity-90 transition shadow-lg mb-3"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
          </svg>
          Confirmar por WhatsApp
        </a>

        <button
          onClick={onDashboard}
          className="w-full border-2 border-slate-200 text-slate-700 font-semibold py-3 rounded-2xl hover:bg-slate-50 transition text-sm"
        >
          Ver mis reservas
        </button>
      </div>
    </div>
  )
}
