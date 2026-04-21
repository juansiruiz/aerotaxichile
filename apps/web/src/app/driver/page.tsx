'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import type { Booking, ApiResponse, BookingStatus } from '@aerotaxi/shared'
import { format, isToday, isTomorrow, startOfWeek, startOfMonth, startOfYear, isAfter } from 'date-fns'
import { es } from 'date-fns/locale'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'home' | 'active' | 'planning' | 'history' | 'profile'
type HistorySubTab = 'trips' | 'income'
type EarningsPeriod = 'week' | 'month' | 'year' | 'all'

interface DriverBooking extends Omit<Booking, 'status'> {
  status: BookingStatus | 'settled'
  collectedBy?: 'driver' | 'admin' | null
}

interface DriverProfile {
  id: string
  name: string
  email: string
  phone: string | null
  photoUrl: string | null
  licenseNumber: string
  isAvailable: boolean
  commissionRate: number
  vehicleId: string | null
  vehiclePlate: string | null
  vehicleBrand: string | null
  vehicleModel: string | null
  vehicleYear: number | null
  vehicleType: string | null
  vehicleCapacity: number | null
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface NotificationItem {
  id: string
  title: string
  body: string | null
  url: string | null
  isRead: boolean
  createdAt: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NEXT_STATUS: Record<string, { label: string; next: string; icon: string; color: string }> = {
  assigned:  { label: 'Aceptar viaje',    next: 'confirmed', icon: 'check_circle',   color: 'bg-emerald-500 hover:bg-emerald-600' },
  confirmed: { label: 'Iniciar traslado', next: 'en_route',  icon: 'directions_car', color: 'bg-blue-500 hover:bg-blue-600' },
  en_route:  { label: 'Completar viaje',  next: 'completed', icon: 'flag',           color: 'bg-brand-500 hover:bg-brand-600' },
}

const STATUS_LABEL: Record<string, string> = {
  assigned: 'Asignado', confirmed: 'Confirmado', en_route: 'En ruta',
  completed: 'Completado', settled: 'Liquidado', cancelled: 'Cancelado', rejected: 'Rechazado',
}

const STATUS_COLOR: Record<string, string> = {
  assigned:  'bg-blue-100 text-blue-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  en_route:  'bg-violet-100 text-violet-700',
  completed: 'bg-slate-100 text-slate-600',
  settled:   'bg-teal-100 text-teal-700',
  cancelled: 'bg-red-100 text-red-600',
  rejected:  'bg-red-50 text-red-400',
}

const TAB_CONFIG: { key: Tab; icon: string; label: string }[] = [
  { key: 'home',     icon: 'home',         label: 'Inicio'   },
  { key: 'active',   icon: 'local_taxi',   label: 'Activos'  },
  { key: 'planning', icon: 'event',        label: 'Programa' },
  { key: 'history',  icon: 'history',      label: 'Historial'},
  { key: 'profile',  icon: 'person',       label: 'Perfil'   },
]

const TAB_TITLE: Record<Tab, string> = {
  home:     'Inicio',
  active:   'Mis Viajes Activos',
  planning: 'Planificación',
  history:  'Historial',
  profile:  'Mi Perfil',
}

const PERIOD_LABEL: Record<EarningsPeriod, string> = {
  week: 'Esta semana', month: 'Este mes', year: 'Este año', all: 'Total',
}

// ─── VAPID helper ─────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const bytes = Uint8Array.from([...atob(b64)].map((c) => c.charCodeAt(0)))
  return bytes.buffer as ArrayBuffer
}

async function subscribePush(token: string, apiBase: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
  if (Notification.permission === 'denied') return
  try {
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') return
    const reg = await navigator.serviceWorker.ready
    if (await reg.pushManager.getSubscription()) return
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) return
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) })
    await fetch(`${apiBase}/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(sub.toJSON()),
    })
  } catch { /* silent */ }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DriverPage() {
  const { user, token, clearAuth, _hasHydrated } = useAuthStore()
  const router = useRouter()

  const [tab,          setTab]          = useState<Tab>('home')
  const [bookings,     setBookings]     = useState<DriverBooking[]>([])
  const [profile,      setProfile]      = useState<DriverProfile | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [updating,     setUpdating]     = useState<string | null>(null)
  const [togglingAvail, setTogglingAvail] = useState(false)
  const [historySubTab,  setHistorySubTab]  = useState<HistorySubTab>('trips')
  const [earningsPeriod, setEarningsPeriod] = useState<EarningsPeriod>('month')
  const [notifs,       setNotifs]       = useState<NotificationItem[]>([])
  const [showNotifs,   setShowNotifs]   = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled,  setIsInstalled]  = useState(false)
  const pushSubscribed = useRef(false)

  const unreadCount = notifs.filter((n) => !n.isRead).length

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadBookings = useCallback(() => {
    if (!token) return
    api.get<ApiResponse<DriverBooking[]>>('/bookings?pageSize=200', token)
      .then((res) => setBookings(res.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [token])

  const loadProfile = useCallback(() => {
    if (!token) return
    api.get<ApiResponse<DriverProfile>>('/drivers/me', token)
      .then((res) => setProfile(res.data))
      .catch(console.error)
  }, [token])

  const loadNotifications = useCallback(() => {
    if (!token) return
    api.get<ApiResponse<NotificationItem[]>>('/notifications', token)
      .then((res) => setNotifs(res.data ?? []))
      .catch(console.error)
  }, [token])

  // ── Auth + init ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!_hasHydrated) return
    if (!user || !token) { router.push('/auth/login'); return }
    if (user.role !== 'driver') { router.push('/dashboard'); return }
    loadBookings()
    loadProfile()
    loadNotifications()
    if (!pushSubscribed.current) {
      pushSubscribed.current = true
      subscribePush(token, apiBase)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_hasHydrated, user, token])

  // ── Install prompt ────────────────────────────────────────────────────────

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) { setIsInstalled(true); return }
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e as BeforeInstallPromptEvent) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // ── Derived state ─────────────────────────────────────────────────────────

  const activeBookings = useMemo(() =>
    bookings.filter((b) => ['assigned', 'confirmed', 'en_route'].includes(b.status)), [bookings])

  const planningBookings = useMemo(() =>
    bookings
      .filter((b) => ['assigned', 'confirmed'].includes(b.status) && isAfter(new Date(b.scheduledAt), new Date()))
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [bookings])

  const historyBookings = useMemo(() =>
    bookings.filter((b) => ['completed', 'settled', 'cancelled', 'rejected'].includes(b.status)), [bookings])

  const completedBookings = useMemo(() =>
    historyBookings.filter((b) => ['completed', 'settled'].includes(b.status)), [historyBookings])

  const earningsBookings = useMemo(() => {
    const now = new Date()
    const periodStart: Record<EarningsPeriod, Date | null> = {
      week:  startOfWeek(now, { weekStartsOn: 1 }),
      month: startOfMonth(now),
      year:  startOfYear(now),
      all:   null,
    }
    const start = periodStart[earningsPeriod]
    return start
      ? completedBookings.filter((b) => isAfter(new Date(b.scheduledAt), start))
      : completedBookings
  }, [completedBookings, earningsPeriod])

  const commission = profile?.commissionRate ?? 20
  const gross      = earningsBookings.reduce((s, b) => s + b.totalPrice, 0)
  const commAmt    = Math.round(gross * commission / 100)
  const net        = gross - commAmt

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleStatusUpdate = async (bookingId: string, status: string) => {
    setUpdating(bookingId)
    try {
      await api.patch(`/bookings/${bookingId}/status`, { bookingId, status }, token!)
      loadBookings()
    } catch (err) { console.error(err) }
    finally { setUpdating(null) }
  }

  const handleReject = async (bookingId: string) => {
    setUpdating(bookingId)
    try {
      await api.patch(`/bookings/${bookingId}/status`, { bookingId, status: 'rejected' }, token!)
      loadBookings()
    } finally { setUpdating(null) }
  }

  const handleOpenNotifications = async () => {
    setShowNotifs(true)
    if (unreadCount > 0) {
      try {
        await api.patch('/notifications/read-all', {}, token!)
        setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })))
      } catch { /* silent */ }
    }
  }

  const handleToggleAvailability = async () => {
    if (!profile || !user) return
    setTogglingAvail(true)
    try {
      const next = !profile.isAvailable
      await api.patch(`/drivers/${user.id}/availability`, { isAvailable: next }, token!)
      setProfile((p) => p ? { ...p, isAvailable: next } : p)
    } catch (err) { console.error(err) }
    finally { setTogglingAvail(false) }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 19) return 'Buenas tardes'
    return 'Buenas noches'
  })()

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans overflow-hidden">

      {/* Install banner */}
      {deferredPrompt && !isInstalled && (
        <div className="bg-brand-500 text-white px-4 py-2.5 flex items-center justify-between gap-3 shrink-0 z-50">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-base shrink-0">install_mobile</span>
            <span className="text-sm font-semibold truncate">Instala la app en tu teléfono</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={async () => {
              await deferredPrompt.prompt()
              const { outcome } = await deferredPrompt.userChoice
              if (outcome === 'accepted') setIsInstalled(true)
              setDeferredPrompt(null)
            }} className="text-xs bg-white text-brand-600 font-bold px-3 py-1.5 rounded-full">
              Instalar
            </button>
            <button onClick={() => setDeferredPrompt(null)}>
              <span className="material-symbols-outlined text-sm opacity-70">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-brand-400 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            flight_takeoff
          </span>
          <div>
            <p className="text-[10px] text-slate-400 leading-none uppercase tracking-wide">AeroTaxi</p>
            <p className="text-sm font-bold leading-tight">{TAB_TITLE[tab]}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Notification bell */}
          <button onClick={handleOpenNotifications}
            className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-700 transition-colors">
            <span className="material-symbols-outlined text-slate-300 text-xl"
              style={{ fontVariationSettings: unreadCount > 0 ? "'FILL' 1" : "'FILL' 0" }}>
              notifications
            </span>
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {/* Active trips pill */}
          {activeBookings.length > 0 && (
            <button onClick={() => setTab('active')}
              className="flex items-center gap-1.5 bg-brand-500/20 border border-brand-500/40 text-brand-300 text-xs font-bold px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-pulse" />
              {activeBookings.length} activo{activeBookings.length !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Cargando...</p>
          </div>
        ) : (
          <>
            {tab === 'home'     && <DashboardSection bookings={bookings} profile={profile} activeCount={activeBookings.length} completedCount={completedBookings.length} greeting={greeting} onToggleAvail={handleToggleAvailability} togglingAvail={togglingAvail} onNavigate={setTab} nextTrip={planningBookings[0] ?? null} />}
            {tab === 'active'   && <ActiveSection bookings={activeBookings} updating={updating} onStatusUpdate={handleStatusUpdate} onReject={handleReject} />}
            {tab === 'planning' && <PlanningSection bookings={planningBookings} updating={updating} onStatusUpdate={handleStatusUpdate} onReject={handleReject} />}
            {tab === 'history'  && <HistorySection historyBookings={historyBookings} earningsBookings={earningsBookings} gross={gross} commAmt={commAmt} net={net} commission={commission} subTab={historySubTab} onSubTab={setHistorySubTab} period={earningsPeriod} onPeriod={setEarningsPeriod} />}
            {tab === 'profile'  && <ProfileSection profile={profile} onToggleAvail={handleToggleAvailability} togglingAvail={togglingAvail} onLogout={() => { clearAuth(); router.push('/') }} />}
          </>
        )}
      </main>

      {/* Notification panel overlay */}
      {showNotifs && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowNotifs(false)} />
          <NotificationPanel
            notifs={notifs}
            onClose={() => setShowNotifs(false)}
            onMarkAllRead={async () => {
              try {
                await api.patch('/notifications/read-all', {}, token!)
                setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })))
              } catch { /* silent */ }
            }}
          />
        </div>
      )}

      {/* Bottom navigation */}
      <nav className="bg-white border-t border-slate-100 px-2 pb-safe-bottom shrink-0 z-40">
        <div className="flex">
          {TAB_CONFIG.map(({ key, icon, label }) => {
            const isActive = tab === key
            const badge = key === 'active' ? activeBookings.length : 0
            return (
              <button key={key} onClick={() => setTab(key)}
                className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 relative transition-colors ${isActive ? 'text-brand-500' : 'text-slate-400 hover:text-slate-600'}`}>
                <div className="relative">
                  <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                    {icon}
                  </span>
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-1.5 bg-brand-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center leading-none">
                      {badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-semibold ${isActive ? 'text-brand-500' : ''}`}>{label}</span>
                {isActive && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-brand-500 rounded-full" />}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

// ─── Dashboard Section ────────────────────────────────────────────────────────

function DashboardSection({ bookings, profile, activeCount, completedCount, greeting, onToggleAvail, togglingAvail, onNavigate, nextTrip }: {
  bookings: DriverBooking[]
  profile: DriverProfile | null
  activeCount: number
  completedCount: number
  greeting: string
  onToggleAvail: () => void
  togglingAvail: boolean
  onNavigate: (tab: Tab) => void
  nextTrip: DriverBooking | null
}) {
  const now = new Date()
  const todayTrips = bookings.filter((b) =>
    ['completed', 'settled'].includes(b.status) && isToday(new Date(b.scheduledAt))
  )
  const todayGross = todayTrips.reduce((s, b) => s + b.totalPrice, 0)
  const monthStart = startOfMonth(now)
  const monthTrips = bookings.filter((b) =>
    ['completed', 'settled'].includes(b.status) && isAfter(new Date(b.scheduledAt), monthStart)
  )
  const monthGross = monthTrips.reduce((s, b) => s + b.totalPrice, 0)
  const commission = profile?.commissionRate ?? 20
  const monthNet   = Math.round(monthGross * (1 - commission / 100))

  return (
    <div className="p-4 space-y-4">

      {/* Greeting + availability */}
      <div className="bg-slate-900 text-white rounded-2xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-slate-400 text-xs">{greeting}</p>
            <p className="text-xl font-black leading-tight">{profile?.name ?? '—'}</p>
            <p className="text-slate-400 text-xs mt-0.5">{profile?.licenseNumber}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-brand-500 flex items-center justify-center text-white font-black text-xl shrink-0">
            {(profile?.name ?? 'D').charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Availability toggle */}
        <button onClick={onToggleAvail} disabled={togglingAvail}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
            profile?.isAvailable
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              : 'bg-slate-700 border-slate-600 text-slate-400'
          }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${profile?.isAvailable ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span className="text-sm font-bold">
              {togglingAvail ? 'Actualizando...' : profile?.isAvailable ? 'Disponible' : 'No disponible'}
            </span>
          </div>
          <span className="material-symbols-outlined text-base">
            {profile?.isAvailable ? 'toggle_on' : 'toggle_off'}
          </span>
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Viajes hoy',    value: todayTrips.length.toString(),             sub: `$${todayGross.toLocaleString('es-CL')}`, icon: 'today',          color: 'text-brand-500' },
          { label: 'Este mes (net)', value: `$${Math.floor(monthNet/1000)}k`,         sub: `${monthTrips.length} viajes`,           icon: 'account_balance_wallet', color: 'text-emerald-500' },
          { label: 'Total viajes',  value: completedCount.toString(),                 sub: 'completados',                           icon: 'done_all',       color: 'text-blue-500' },
        ].map(({ label, value, sub, icon, color }) => (
          <div key={label} className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm text-center">
            <span className={`material-symbols-outlined text-xl ${color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
            <p className="text-lg font-black text-slate-900 mt-1 leading-tight">{value}</p>
            <p className="text-[10px] text-slate-400 font-medium">{label}</p>
            <p className="text-[10px] text-slate-300">{sub}</p>
          </div>
        ))}
      </div>

      {/* Active trips alert */}
      {activeCount > 0 && (
        <button onClick={() => onNavigate('active')} className="w-full bg-brand-50 border-2 border-brand-200 rounded-2xl p-4 flex items-center gap-3 text-left">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-white text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>local_taxi</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-brand-700">{activeCount} viaje{activeCount !== 1 ? 's' : ''} activo{activeCount !== 1 ? 's' : ''}</p>
            <p className="text-xs text-brand-500">Toca para ver y actualizar estado</p>
          </div>
          <span className="material-symbols-outlined text-brand-400">chevron_right</span>
        </button>
      )}

      {/* Next upcoming trip */}
      {nextTrip && (
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-3">Próximo viaje</p>
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-brand-400 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
              {nextTrip.direction === 'to_airport' ? 'flight_takeoff' : 'flight_land'}
            </span>
            <span className="text-sm font-bold text-slate-800">
              {format(new Date(nextTrip.scheduledAt), "EEEE dd MMM · HH:mm", { locale: es })}
            </span>
            <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[nextTrip.status] ?? ''}`}>
              {STATUS_LABEL[nextTrip.status] ?? nextTrip.status}
            </span>
          </div>
          <p className="text-xs text-slate-500 truncate">📍 {nextTrip.origin?.split(',')[0]}</p>
          <p className="text-xs text-slate-500 truncate">🏁 {nextTrip.destination?.split(',')[0]}</p>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: 'event',   label: 'Mi planificación',  tab: 'planning' as Tab },
          { icon: 'payments', label: 'Ver ingresos',     tab: 'history'  as Tab },
        ].map(({ icon, label, tab }) => (
          <button key={tab} onClick={() => onNavigate(tab)}
            className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:border-brand-200 transition-colors">
            <span className="material-symbols-outlined text-slate-400 text-lg">{icon}</span>
            <span className="text-sm font-semibold text-slate-700">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Active Section ───────────────────────────────────────────────────────────

function ActiveSection({ bookings, updating, onStatusUpdate, onReject }: {
  bookings: DriverBooking[]
  updating: string | null
  onStatusUpdate: (id: string, status: string) => void
  onReject: (id: string) => void
}) {
  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 gap-3 text-center">
        <span className="material-symbols-outlined text-5xl text-slate-200">directions_car</span>
        <p className="text-slate-400 font-semibold">Sin viajes activos</p>
        <p className="text-slate-300 text-sm">Recibirás una notificación cuando te asignen un viaje</p>
      </div>
    )
  }
  return (
    <div className="p-4 space-y-4">
      {bookings.map((b) => (
        <TripCard key={b.id} booking={b} updating={updating === b.id} onStatusUpdate={onStatusUpdate} onReject={onReject} />
      ))}
    </div>
  )
}

// ─── Planning Section ─────────────────────────────────────────────────────────

function PlanningSection({ bookings, updating, onStatusUpdate, onReject }: {
  bookings: DriverBooking[]
  updating: string | null
  onStatusUpdate: (id: string, status: string) => void
  onReject: (id: string) => void
}) {
  // Group by day
  const groups = useMemo(() => {
    const map = new Map<string, DriverBooking[]>()
    for (const b of bookings) {
      const d = new Date(b.scheduledAt)
      const key = isToday(d) ? 'Hoy' : isTomorrow(d) ? 'Mañana' : format(d, "EEEE d MMM", { locale: es })
      const existing = map.get(key) ?? []
      map.set(key, [...existing, b])
    }
    return Array.from(map.entries())
  }, [bookings])

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 gap-3 text-center">
        <span className="material-symbols-outlined text-5xl text-slate-200">event_available</span>
        <p className="text-slate-400 font-semibold">Sin viajes programados</p>
        <p className="text-slate-300 text-sm">Tus próximas asignaciones aparecerán aquí</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-5">
      {groups.map(([dayLabel, trips]) => (
        <div key={dayLabel}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{dayLabel}</span>
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[10px] text-slate-400">{trips.length} viaje{trips.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-3">
            {trips.map((b) => (
              <PlanningCard key={b.id} booking={b} updating={updating === b.id} onStatusUpdate={onStatusUpdate} onReject={onReject} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function PlanningCard({ booking: b, updating, onStatusUpdate, onReject }: {
  booking: DriverBooking; updating: boolean
  onStatusUpdate: (id: string, status: string) => void
  onReject: (id: string) => void
}) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <div className="shrink-0 text-center bg-slate-50 rounded-xl px-3 py-2 min-w-[52px]">
          <p className="text-base font-black text-slate-900 leading-none">{format(new Date(b.scheduledAt), 'HH:mm')}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">hrs</p>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="material-symbols-outlined text-brand-400 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
              {b.direction === 'to_airport' ? 'flight_takeoff' : 'flight_land'}
            </span>
            <p className="text-sm font-semibold text-slate-800 truncate">{b.origin?.split(',')[0]}</p>
          </div>
          <p className="text-xs text-slate-400 truncate pl-5">→ {b.destination?.split(',')[0]}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[b.status] ?? ''}`}>
              {STATUS_LABEL[b.status] ?? b.status}
            </span>
            <span className="text-[10px] text-slate-400">{b.passengerCount} pax · {b.vehicleType}</span>
            <span className="text-[10px] font-black text-slate-600 ml-auto">${b.totalPrice.toLocaleString('es-CL')}</span>
          </div>
        </div>
      </div>
      {b.status === 'assigned' && (
        <div className="flex gap-2 px-3 pb-3">
          <button onClick={() => onStatusUpdate(b.id, 'confirmed')} disabled={updating}
            className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-2.5 rounded-xl transition-colors disabled:opacity-60 min-h-[40px]">
            {updating ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>Aceptar</>}
          </button>
          <button onClick={() => onReject(b.id)} disabled={updating}
            className="flex items-center gap-1 bg-red-50 border border-red-200 text-red-600 text-xs font-bold py-2.5 px-3 rounded-xl transition-colors disabled:opacity-60 min-h-[40px]">
            <span className="material-symbols-outlined text-sm">close</span>Rechazar
          </button>
        </div>
      )}
    </div>
  )
}

// ─── History Section ──────────────────────────────────────────────────────────

function HistorySection({ historyBookings, earningsBookings, gross, commAmt, net, commission, subTab, onSubTab, period, onPeriod }: {
  historyBookings: DriverBooking[]
  earningsBookings: DriverBooking[]
  gross: number; commAmt: number; net: number; commission: number
  subTab: HistorySubTab; onSubTab: (t: HistorySubTab) => void
  period: EarningsPeriod; onPeriod: (p: EarningsPeriod) => void
}) {
  return (
    <div className="flex flex-col h-full">

      {/* Sub-tabs */}
      <div className="flex border-b border-slate-100 bg-white px-4 gap-1 shrink-0">
        {(['trips', 'income'] as HistorySubTab[]).map((t) => (
          <button key={t} onClick={() => onSubTab(t)}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors -mb-px ${subTab === t ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500'}`}>
            {t === 'trips' ? 'Viajes hechos' : 'Ingresos'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {subTab === 'trips' ? (
          historyBookings.length === 0 ? (
            <div className="flex flex-col items-center py-20 gap-3 text-center">
              <span className="material-symbols-outlined text-5xl text-slate-200">history</span>
              <p className="text-slate-400 font-semibold text-sm">Sin historial de viajes</p>
            </div>
          ) : (
            historyBookings.map((b) => <HistoryRow key={b.id} booking={b} />)
          )
        ) : (
          /* Income tab */
          <>
            {/* Period selector */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {(Object.keys(PERIOD_LABEL) as EarningsPeriod[]).map((p) => (
                <button key={p} onClick={() => onPeriod(p)}
                  className={`shrink-0 text-xs font-bold px-3 py-2 rounded-full border-2 transition-colors ${period === p ? 'bg-brand-500 border-brand-500 text-white' : 'border-slate-200 text-slate-500 bg-white'}`}>
                  {PERIOD_LABEL[p]}
                </button>
              ))}
            </div>

            {/* Earnings summary card */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-3">
              <p className="text-xs text-slate-400 uppercase tracking-wide">{PERIOD_LABEL[period]} · {earningsBookings.length} viaje{earningsBookings.length !== 1 ? 's' : ''}</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-300">Facturado bruto</span>
                  <span className="text-base font-black">${gross.toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Comisión empresa ({commission}%)</span>
                  <span className="text-sm font-bold text-red-400">−${commAmt.toLocaleString('es-CL')}</span>
                </div>
                <div className="h-px bg-slate-700" />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-emerald-300">Tus ingresos netos</span>
                  <span className="text-xl font-black text-emerald-400">${net.toLocaleString('es-CL')}</span>
                </div>
              </div>
            </div>

            {/* Breakdown */}
            <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3 shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Desglose por cobro</p>
              {[
                { label: 'Cobrado por ti',      value: earningsBookings.filter(b => b.collectedBy === 'driver').reduce((s, b) => s + b.totalPrice, 0), icon: 'payments',       color: 'text-brand-500'  },
                { label: 'Cobrado por empresa', value: earningsBookings.filter(b => b.collectedBy === 'admin').reduce((s, b) => s + b.totalPrice, 0),  icon: 'account_balance', color: 'text-blue-500'   },
                { label: 'Sin registrar',       value: earningsBookings.filter(b => !b.collectedBy).reduce((s, b) => s + b.totalPrice, 0),             icon: 'help_outline',    color: 'text-slate-400'  },
              ].map(({ label, value, icon, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-sm ${color}`}>{icon}</span>
                    <span className="text-sm text-slate-600">{label}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-800">${value.toLocaleString('es-CL')}</span>
                </div>
              ))}
            </div>

            {/* Trip list for period */}
            {earningsBookings.length > 0 && (
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-50">
                {earningsBookings.map((b) => <HistoryRow key={b.id} booking={b} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Profile Section ──────────────────────────────────────────────────────────

function ProfileSection({ profile: p, onToggleAvail, togglingAvail, onLogout }: {
  profile: DriverProfile | null
  onToggleAvail: () => void
  togglingAvail: boolean
  onLogout: () => void
}) {
  return (
    <div className="p-4 space-y-4">

      {/* Driver card */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-brand-500 flex items-center justify-center text-white font-black text-2xl shrink-0">
            {(p?.name ?? 'D').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-black text-slate-900">{p?.name ?? '—'}</p>
            <p className="text-sm text-slate-500">{p?.email}</p>
            {p?.phone && <p className="text-sm text-slate-400">{p.phone}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Licencia',    value: p?.licenseNumber ?? '—',  icon: 'badge'           },
            { label: 'Comisión',    value: `${p?.commissionRate ?? 20}%`, icon: 'percent'    },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-slate-50 rounded-xl p-3">
              <span className="material-symbols-outlined text-slate-400 text-base">{icon}</span>
              <p className="text-sm font-bold text-slate-800 mt-1">{value}</p>
              <p className="text-[10px] text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Vehicle card */}
      {p?.vehicleBrand && (
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-brand-400 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>directions_car</span>
            <p className="text-sm font-black text-slate-900">Mi vehículo</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Marca / Modelo', value: `${p.vehicleBrand} ${p.vehicleModel}` },
              { label: 'Año',            value: p.vehicleYear?.toString() ?? '—'       },
              { label: 'Patente',        value: p.vehiclePlate ?? '—'                  },
              { label: 'Tipo / Capacidad', value: `${p.vehicleType} · ${p.vehicleCapacity} pax` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-3">
                <p className="text-sm font-bold text-slate-800 truncate">{value}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Availability toggle */}
      <button onClick={onToggleAvail} disabled={togglingAvail}
        className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-all shadow-sm ${
          p?.isAvailable
            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
            : 'bg-white border-slate-200 text-slate-500'
        }`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${p?.isAvailable ? 'bg-emerald-500' : 'bg-slate-200'}`}>
            <span className="material-symbols-outlined text-white text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
              {p?.isAvailable ? 'check_circle' : 'cancel'}
            </span>
          </div>
          <div className="text-left">
            <p className="text-sm font-bold">{p?.isAvailable ? 'Disponible' : 'No disponible'}</p>
            <p className="text-xs text-slate-400">{p?.isAvailable ? 'Puedes recibir asignaciones' : 'No recibirás nuevos viajes'}</p>
          </div>
        </div>
        {togglingAvail
          ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          : <span className="material-symbols-outlined text-xl">{p?.isAvailable ? 'toggle_on' : 'toggle_off'}</span>
        }
      </button>

      {/* Logout */}
      <button onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 bg-red-50 border-2 border-red-100 text-red-500 font-bold text-sm py-4 rounded-2xl hover:bg-red-100 transition-colors">
        <span className="material-symbols-outlined text-base">logout</span>
        Cerrar sesión
      </button>

      <p className="text-center text-[10px] text-slate-300 pb-2">AeroTaxi Chile · Panel Conductor</p>
    </div>
  )
}

// ─── TripCard ─────────────────────────────────────────────────────────────────

function TripCard({ booking: b, updating, onStatusUpdate, onReject }: {
  booking: DriverBooking; updating: boolean
  onStatusUpdate: (id: string, status: string) => void
  onReject: (id: string) => void
}) {
  const next = NEXT_STATUS[b.status]
  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
      <div className={`px-4 py-2 flex items-center justify-between ${
        b.status === 'assigned' ? 'bg-blue-50 border-b border-blue-100' :
        b.status === 'confirmed' ? 'bg-emerald-50 border-b border-emerald-100' :
        'bg-violet-50 border-b border-violet-100'
      }`}>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLOR[b.status] ?? ''}`}>
          {STATUS_LABEL[b.status] ?? b.status}
        </span>
        <span className="text-xs font-black text-slate-700">${b.totalPrice?.toLocaleString('es-CL')} CLP</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-brand-400 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
            {b.direction === 'to_airport' ? 'flight_takeoff' : 'flight_land'}
          </span>
          <span className="text-sm font-semibold text-slate-800">
            {b.direction === 'to_airport' ? 'Al aeropuerto' : 'Desde aeropuerto'}
          </span>
          <span className="ml-auto text-xs text-slate-500 font-medium">
            {format(new Date(b.scheduledAt), 'dd MMM · HH:mm', { locale: es })}
          </span>
        </div>
        <div className="space-y-1.5 bg-slate-50 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-emerald-500 text-sm mt-0.5 shrink-0">trip_origin</span>
            <p className="text-xs text-slate-700 leading-snug">{b.origin}</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-red-400 text-sm mt-0.5 shrink-0">location_on</span>
            <p className="text-xs text-slate-700 leading-snug">{b.destination}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">group</span>{b.passengerCount} pax</span>
          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">directions_car</span>{b.vehicleType}</span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">{b.paymentMethod === 'cash' ? 'payments' : 'credit_card'}</span>
            {b.paymentMethod === 'cash' ? 'Efectivo' : 'Online'}
          </span>
        </div>
        {b.adminNotes && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
            <span className="material-symbols-outlined text-amber-500 text-sm shrink-0 mt-0.5">info</span>
            <p className="text-xs text-amber-800 leading-snug">{b.adminNotes}</p>
          </div>
        )}
        <div className="flex gap-2 pt-1">
          {next && (
            <button onClick={() => onStatusUpdate(b.id, next.next)} disabled={updating}
              className={`flex-1 flex items-center justify-center gap-2 ${next.color} text-white text-sm font-bold py-3 rounded-xl transition-colors min-h-[44px] disabled:opacity-60`}>
              {updating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>{next.icon}</span>{next.label}</>}
            </button>
          )}
          {b.status === 'assigned' && (
            <button onClick={() => onReject(b.id)} disabled={updating}
              className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-bold py-3 px-4 rounded-xl transition-colors min-h-[44px] border border-red-200 disabled:opacity-60">
              <span className="material-symbols-outlined text-sm">close</span>Rechazar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── HistoryRow ───────────────────────────────────────────────────────────────

function HistoryRow({ booking: b }: { booking: DriverBooking }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${b.direction === 'to_airport' ? 'bg-blue-50' : 'bg-emerald-50'}`}>
        <span className={`material-symbols-outlined text-sm ${b.direction === 'to_airport' ? 'text-blue-400' : 'text-emerald-400'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
          {b.direction === 'to_airport' ? 'flight_takeoff' : 'flight_land'}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-700 truncate">{b.origin?.split(',')[0]}</p>
        <p className="text-xs text-slate-400">{format(new Date(b.scheduledAt), 'dd MMM · HH:mm', { locale: es })}</p>
      </div>
      <div className="text-right shrink-0">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[b.status] ?? 'bg-slate-100 text-slate-500'}`}>
          {STATUS_LABEL[b.status] ?? b.status}
        </span>
        <p className="text-xs font-black text-slate-700 mt-1">${b.totalPrice?.toLocaleString('es-CL')}</p>
      </div>
    </div>
  )
}

// ─── Notification helpers ─────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const date   = new Date(dateStr)
  const diffMs = Date.now() - date.getTime()
  const mins   = Math.floor(diffMs / 60_000)
  if (mins < 1)  return 'Ahora mismo'
  if (mins < 60) return `Hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs  < 24) return `Hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7)  return `Hace ${days} día${days !== 1 ? 's' : ''}`
  return format(date, 'd MMM', { locale: es })
}

// ─── NotificationPanel ────────────────────────────────────────────────────────

function NotificationPanel({ notifs, onClose, onMarkAllRead }: {
  notifs: NotificationItem[]
  onClose: () => void
  onMarkAllRead: () => void
}) {
  const hasUnread = notifs.some((n) => !n.isRead)

  return (
    <div className="relative bg-white rounded-t-3xl max-h-[82vh] flex flex-col overflow-hidden shadow-2xl">

      {/* Drag handle */}
      <div className="flex justify-center pt-3 pb-0 shrink-0">
        <div className="w-10 h-1 bg-slate-200 rounded-full" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-brand-500 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            notifications
          </span>
          <h3 className="text-base font-black text-slate-900">Notificaciones</h3>
          {notifs.length > 0 && (
            <span className="text-xs text-slate-400 font-medium">({notifs.length})</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasUnread && (
            <button onClick={onMarkAllRead}
              className="text-xs text-brand-500 font-bold px-3 py-1.5 rounded-full hover:bg-brand-50 transition-colors">
              Leer todo
            </button>
          )}
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
            <span className="material-symbols-outlined text-slate-500 text-base">close</span>
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {notifs.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-center px-8">
            <span className="material-symbols-outlined text-6xl text-slate-200">notifications_none</span>
            <p className="text-slate-400 font-semibold text-sm">Sin notificaciones</p>
            <p className="text-slate-300 text-xs leading-relaxed">
              Aquí verás tus asignaciones, cancelaciones y actualizaciones de viajes
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {notifs.map((n) => (
              <NotificationRow key={n.id} notif={n} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── NotificationRow ──────────────────────────────────────────────────────────

function NotificationRow({ notif: n }: { notif: NotificationItem }) {
  const isAssignment   = n.title.toLowerCase().includes('asignado')
  const isCancellation = n.title.toLowerCase().includes('cancelado')

  const iconName  = isAssignment ? 'local_taxi' : isCancellation ? 'cancel' : 'info'
  const iconColor = isAssignment ? 'text-emerald-600' : isCancellation ? 'text-red-500' : 'text-brand-500'
  const iconBg    = isAssignment ? 'bg-emerald-50'   : isCancellation ? 'bg-red-50'    : 'bg-brand-50'

  return (
    <div className={`flex items-start gap-3 px-5 py-4 transition-colors ${!n.isRead ? 'bg-brand-50/60' : 'hover:bg-slate-50'}`}>
      {/* Icon */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <span className={`material-symbols-outlined text-base ${iconColor}`}
          style={{ fontVariationSettings: "'FILL' 1" }}>
          {iconName}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm leading-snug ${!n.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
            {n.title}
          </p>
          {!n.isRead && (
            <span className="w-2 h-2 bg-brand-500 rounded-full shrink-0 mt-1.5" />
          )}
        </div>
        {n.body && (
          <p className="text-xs text-slate-500 mt-0.5 leading-snug">{n.body}</p>
        )}
        <p className="text-[10px] text-slate-400 mt-1.5">{formatRelativeTime(n.createdAt)}</p>
      </div>
    </div>
  )
}
