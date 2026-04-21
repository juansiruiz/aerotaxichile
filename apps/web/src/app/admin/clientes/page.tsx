'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import type { ApiResponse } from '@aerotaxi/shared'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { AdminSidebar } from '@/components/AdminSidebar'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Client {
  id: string
  name: string
  email: string
  phone: string | null
  createdAt: string
  totalBookings: number
  lastBookingAt: string | null
}

interface ClientBooking {
  id: string
  direction: string
  origin: string
  destination: string
  scheduledAt: string
  vehicleType: string
  passengerCount: number
  totalPrice: number
  paymentMethod: string
  status: string
  adminConfirmed: boolean
  createdAt: string
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente', assigned: 'Asignado', confirmed: 'Confirmado',
  rejected: 'Rechazado', en_route: 'En camino', completed: 'Completado',
  cancelled: 'Cancelado', settled: 'Liquidado',
}
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700', assigned: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-700',
  en_route: 'bg-violet-100 text-violet-700', completed: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-red-100 text-red-700', settled: 'bg-slate-100 text-slate-600',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientesPage() {
  const { user, token, clearAuth, _hasHydrated } = useAuthStore()
  const router = useRouter()

  const [clients, setClients]             = useState<Client[]>([])
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState('')
  const [selectedClient, setSelected]     = useState<Client | null>(null)
  const [clientBookings, setClientBookings] = useState<ClientBooking[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    if (!_hasHydrated) return
    if (!user || !token) { router.push('/auth/login'); return }
    if (user.role !== 'admin') { router.push('/dashboard'); return }

    api.get<ApiResponse<Client[]>>('/clients', token)
      .then((res) => setClients(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [_hasHydrated, user, token])

  const loadHistory = async (client: Client) => {
    if (selectedClient?.id === client.id) { setSelected(null); return }
    setSelected(client)
    setLoadingHistory(true)
    try {
      const res = await api.get<ApiResponse<{ client: Client; bookings: ClientBooking[] }>>(`/clients/${client.id}/bookings`, token!)
      setClientBookings(res.data.bookings)
    } catch {
      setClientBookings([])
    } finally {
      setLoadingHistory(false)
    }
  }

  const filtered = search.trim()
    ? clients.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search)
      )
    : clients

  const totalRevenue = clients.reduce((acc, c) => acc + c.totalBookings, 0)

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">

      {/* ── Sidebar ── */}
      <AdminSidebar active="clientes" clearAuth={clearAuth} router={router} />

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto bg-slate-50">

        {/* Top bar */}
        <header className="flex justify-between items-center px-8 py-3 bg-white/80 backdrop-blur-xl sticky top-0 z-40 border-b border-surface-container">
          <div className="relative w-full max-w-md group">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-container-high rounded-full border-none focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
              placeholder="Buscar por nombre, email o teléfono..." />
          </div>
          <div className="flex items-center gap-3 ml-6 pl-4 border-l border-surface-container-highest shrink-0">
            <div className="text-right">
              <p className="text-sm font-bold">{user?.name ?? 'Admin'}</p>
              <p className="text-xs text-on-surface-variant">Administrador</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="px-8 py-8 flex flex-col gap-8 max-w-6xl w-full mx-auto">

          {/* Header */}
          <div className="flex items-end justify-between">
            <div>
              <nav className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                <a href="/admin" className="hover:text-primary">Panel</a>
                <span className="material-symbols-outlined text-xs">chevron_right</span>
                <span className="font-semibold text-slate-700">Clientes</span>
              </nav>
              <h2 className="text-4xl font-black font-headline tracking-tighter text-on-surface">Clientes</h2>
              <p className="text-on-surface-variant mt-1">Gestión de clientes registrados · {clients.length} en total</p>
            </div>
            {/* Stats summary */}
            <div className="flex gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 text-center shadow-sm">
                <p className="text-2xl font-black text-slate-900">{clients.length}</p>
                <p className="text-xs text-slate-400">Clientes</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 text-center shadow-sm">
                <p className="text-2xl font-black text-brand-600">{totalRevenue}</p>
                <p className="text-xs text-slate-400">Reservas totales</p>
              </div>
            </div>
          </div>

          {/* Client list + detail panel */}
          <div className="flex gap-6">

            {/* Client list */}
            <div className={`flex flex-col gap-3 transition-all ${selectedClient ? 'w-1/2' : 'w-full'}`}>
              {loading ? (
                <div className="py-16 text-center text-slate-400 animate-pulse">Cargando clientes...</div>
              ) : filtered.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-10 flex flex-col items-center gap-3 text-center">
                  <span className="material-symbols-outlined text-4xl text-slate-300">group_off</span>
                  <p className="font-semibold text-slate-500">No se encontraron clientes</p>
                </div>
              ) : (
                filtered.map((client) => (
                  <ClientRow
                    key={client.id}
                    client={client}
                    isSelected={selectedClient?.id === client.id}
                    onClick={() => loadHistory(client)}
                  />
                ))
              )}
            </div>

            {/* History panel */}
            {selectedClient && (
              <div className="w-1/2 flex flex-col gap-3">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm sticky top-20">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-500 text-white font-bold flex items-center justify-center shrink-0">
                        {selectedClient.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{selectedClient.name}</p>
                        <p className="text-xs text-slate-400">{selectedClient.totalBookings} reservas · cliente desde {format(new Date(selectedClient.createdAt), "MMM yyyy", { locale: es })}</p>
                      </div>
                    </div>
                    <button onClick={() => setSelected(null)} className="p-1.5 rounded-full hover:bg-slate-100">
                      <span className="material-symbols-outlined text-slate-400 text-sm">close</span>
                    </button>
                  </div>

                  {/* Contact row */}
                  <div className="flex gap-2 mb-4">
                    <a href={`mailto:${selectedClient.email}`}
                      className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors">
                      <span className="material-symbols-outlined text-sm">mail</span>
                      {selectedClient.email}
                    </a>
                    {selectedClient.phone && (
                      <a href={`https://wa.me/${selectedClient.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 bg-[#25D366]/10 border border-[#25D366]/30 rounded-xl px-3 py-2 text-xs font-medium text-[#128C7E] hover:bg-[#25D366]/20 transition-colors">
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-[#25D366]"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                        {selectedClient.phone}
                      </a>
                    )}
                  </div>

                  {/* Booking history */}
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Historial de Reservas</h4>
                  {loadingHistory ? (
                    <p className="text-sm text-slate-400 text-center py-6 animate-pulse">Cargando historial...</p>
                  ) : clientBookings.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">Sin reservas registradas</p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {clientBookings.map((b) => (
                        <div key={b.id} className="border border-slate-100 rounded-xl p-3 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-brand-400 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                                {b.direction === 'to_airport' ? 'flight_takeoff' : 'flight_land'}
                              </span>
                              <span className="text-xs font-semibold text-slate-700">
                                {b.direction === 'to_airport' ? 'Al aeropuerto' : 'Desde aeropuerto'}
                              </span>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[b.status] ?? ''}`}>
                              {STATUS_LABEL[b.status] ?? b.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 truncate">{b.origin} → {b.destination}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] text-slate-400">
                              {format(new Date(b.scheduledAt), "dd MMM yyyy · HH:mm", { locale: es })}
                            </span>
                            <span className="text-xs font-black text-brand-600">
                              ${b.totalPrice.toLocaleString('es-CL')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

// ─── ClientRow ────────────────────────────────────────────────────────────────

function ClientRow({ client: c, isSelected, onClick }: { client: Client; isSelected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border-2 rounded-2xl p-4 cursor-pointer transition-all hover:shadow-md ${isSelected ? 'border-brand-400 shadow-md' : 'border-slate-100 hover:border-slate-200'}`}
    >
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0 ${isSelected ? 'bg-brand-500' : 'bg-slate-400'}`}>
          {c.name.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 truncate">{c.name}</p>
          <p className="text-xs text-slate-500 truncate">{c.email}</p>
          {c.phone && <p className="text-xs text-slate-400">{c.phone}</p>}
        </div>

        {/* Stats */}
        <div className="text-right shrink-0 space-y-1">
          <div className="flex items-center gap-1.5 justify-end">
            <span className="material-symbols-outlined text-sm text-brand-400">confirmation_number</span>
            <span className="text-sm font-black text-slate-800">{c.totalBookings}</span>
            <span className="text-xs text-slate-400">reservas</span>
          </div>
          {c.lastBookingAt && (
            <p className="text-[10px] text-slate-300">
              Última: {format(new Date(c.lastBookingAt), "dd MMM yy", { locale: es })}
            </p>
          )}
        </div>

        <span className={`material-symbols-outlined text-slate-300 transition-transform ${isSelected ? 'rotate-90 text-brand-400' : ''}`}>
          chevron_right
        </span>
      </div>
    </div>
  )
}
