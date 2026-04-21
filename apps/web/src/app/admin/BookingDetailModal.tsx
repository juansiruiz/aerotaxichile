'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { api } from '@/lib/api'
import type { ApiResponse } from '@aerotaxi/shared'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminBooking {
  id: string
  clientId: string
  clientName: string | null
  clientPhone: string | null
  clientEmail: string | null
  driverId: string | null
  vehicleId: string | null
  zoneId: string
  direction: 'to_airport' | 'from_airport'
  origin: string
  destination: string
  scheduledAt: string
  passengerCount: number
  vehicleType: string
  totalPrice: number
  paymentMethod: 'cash' | 'online'
  paymentStatus: string
  status: string
  adminConfirmed: boolean
  adminNotes: string | null
  driverNotes: string | null
  createdAt: string
  updatedAt: string
}

const VEHICLE_LABELS: Record<string, string> = {
  sedan: 'Sedan VIP', suv: 'SUV', minivan: 'Minivan', van: 'Van',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente', assigned: 'Conductor asignado', confirmed: 'Confirmado',
  rejected: 'Rechazado', en_route: 'En camino', completed: 'Completado',
  cancelled: 'Cancelado', settled: 'Liquidado',
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800', assigned: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-emerald-100 text-emerald-800', rejected: 'bg-red-100 text-red-800',
  en_route: 'bg-violet-100 text-violet-800', completed: 'bg-slate-100 text-slate-700',
  cancelled: 'bg-red-100 text-red-800', settled: 'bg-slate-100 text-slate-700',
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  booking: AdminBooking
  token: string
  onClose: () => void
  onConfirmed: (updated: AdminBooking) => void
  onAssign: () => void
}

export default function BookingDetailModal({ booking: initial, token, onClose, onConfirmed, onAssign }: Props) {
  const [booking, setBooking] = useState<AdminBooking>(initial)
  const [notes, setNotes] = useState(initial.adminNotes ?? '')
  const [savingNotes, setSavingNotes]   = useState(false)
  const [confirming, setConfirming]     = useState(false)
  const [notesSaved, setNotesSaved]     = useState(false)
  const [toast, setToast]               = useState<{ msg: string; ok: boolean } | null>(null)

  // Price editing
  const [editingPrice, setEditingPrice]   = useState(false)
  const [priceInput,   setPriceInput]     = useState(String(initial.totalPrice))
  const [savingPrice,  setSavingPrice]    = useState(false)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Save notes ─────────────────────────────────────────────────────
  const saveNotes = async () => {
    setSavingNotes(true)
    try {
      await api.patch<ApiResponse<AdminBooking>>(`/bookings/${booking.id}/notes`, { adminNotes: notes }, token)
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2000)
      showToast('Observaciones guardadas')
    } catch {
      showToast('Error al guardar', false)
    } finally {
      setSavingNotes(false)
    }
  }

  // ── Confirm booking ────────────────────────────────────────────────
  const handleConfirm = async () => {
    setConfirming(true)
    try {
      const res = await api.patch<ApiResponse<AdminBooking>>(
        `/bookings/${booking.id}/confirm`,
        { adminNotes: notes || undefined },
        token,
      )
      const updated = { ...res.data, clientName: booking.clientName, clientPhone: booking.clientPhone, clientEmail: booking.clientEmail }
      setBooking(updated)
      onConfirmed(updated)
      showToast('¡Reserva confirmada! Ya puedes asignar conductor.')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error al confirmar', false)
    } finally {
      setConfirming(false)
    }
  }

  // ── Save price ─────────────────────────────────────────────────────
  const savePrice = async () => {
    const val = parseInt(priceInput.replace(/\D/g, ''), 10)
    if (!val || val <= 0) { showToast('Ingresa un precio válido', false); return }
    setSavingPrice(true)
    try {
      const res = await api.patch<ApiResponse<AdminBooking>>(
        `/bookings/${booking.id}/price`,
        { totalPrice: val },
        token,
      )
      const updated = { ...res.data, clientName: booking.clientName, clientPhone: booking.clientPhone, clientEmail: booking.clientEmail }
      setBooking(updated)
      onConfirmed(updated)
      setEditingPrice(false)
      showToast('Tarifa actualizada')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error al actualizar tarifa', false)
    } finally {
      setSavingPrice(false)
    }
  }

  const wa = booking.clientPhone
    ? `https://wa.me/${booking.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
        `Hola ${booking.clientName ?? ''}, tu reserva AeroTaxi #${booking.id.slice(-6).toUpperCase()} ha sido confirmada. Te contactaremos pronto.`
      )}`
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full sm:max-w-xl bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10 rounded-t-3xl">
          <div>
            <h2 className="font-black text-lg text-slate-900">Detalle de Reserva</h2>
            <p className="text-xs text-slate-400">#{booking.id.slice(-8).toUpperCase()}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${STATUS_COLOR[booking.status] ?? ''}`}>
              {STATUS_LABEL[booking.status] ?? booking.status}
            </span>
            {booking.adminConfirmed && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                Confirmada
              </span>
            )}
            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition-colors">
              <span className="material-symbols-outlined text-slate-400">close</span>
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Cliente */}
          <section className="bg-slate-50 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
              Datos del Cliente
            </h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-500 text-white font-bold text-sm flex items-center justify-center shrink-0">
                  {booking.clientName?.charAt(0).toUpperCase() ?? '?'}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{booking.clientName ?? 'Cliente'}</p>
                  <p className="text-xs text-slate-500">{booking.clientEmail}</p>
                  <p className="text-xs text-slate-500">{booking.clientPhone}</p>
                </div>
              </div>
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-[#25D366] text-white text-xs font-bold px-3 py-2 rounded-xl hover:opacity-90 transition shrink-0">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                  WhatsApp
                </a>
              )}
            </div>
          </section>

          {/* Viaje */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                {booking.direction === 'to_airport' ? 'flight_takeoff' : 'flight_land'}
              </span>
              Detalles del Viaje
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: 'calendar_month', label: 'Fecha',      value: format(new Date(booking.scheduledAt), "EEEE dd 'de' MMMM · HH:mm", { locale: es }) },
                { icon: 'directions_car', label: 'Vehículo',   value: VEHICLE_LABELS[booking.vehicleType] ?? booking.vehicleType },
                { icon: 'group',          label: 'Pasajeros',  value: `${booking.passengerCount} personas` },
                { icon: 'payments',       label: 'Pago',       value: booking.paymentMethod === 'cash' ? 'Efectivo' : 'Online' },
              ].map(({ icon, label, value }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">{icon}</span>{label}
                  </p>
                  <p className="text-sm font-semibold text-slate-800">{value}</p>
                </div>
              ))}
            </div>
            <div className="bg-slate-50 rounded-xl p-3 space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <span className="material-symbols-outlined text-slate-400 text-base shrink-0 mt-0.5">radio_button_checked</span>
                <div><p className="text-[10px] text-slate-400 uppercase">Origen</p><p className="font-medium text-slate-800">{booking.origin}</p></div>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="material-symbols-outlined text-brand-400 text-base shrink-0 mt-0.5">location_on</span>
                <div><p className="text-[10px] text-slate-400 uppercase">Destino</p><p className="font-medium text-slate-800">{booking.destination}</p></div>
              </div>
            </div>
            {/* Tarifa — editable por admin */}
            <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
              {editingPrice ? (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-brand-500">payments</span>
                    Editar tarifa (CLP)
                  </p>
                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">$</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={priceInput}
                        onChange={(e) => setPriceInput(e.target.value.replace(/\D/g, ''))}
                        className="w-full pl-7 pr-3 py-2.5 text-base font-bold border-2 border-brand-400 rounded-xl focus:outline-none focus:border-brand-600 bg-white"
                        autoFocus
                      />
                    </div>
                    <button
                      onClick={savePrice}
                      disabled={savingPrice}
                      className="flex items-center gap-1 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50"
                    >
                      {savingPrice
                        ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                        : <span className="material-symbols-outlined text-sm">check</span>}
                      Guardar
                    </button>
                    <button
                      onClick={() => { setEditingPrice(false); setPriceInput(String(booking.totalPrice)) }}
                      className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">Tarifa total</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-brand-600">
                      ${booking.totalPrice.toLocaleString('es-CL')}
                      <span className="text-xs font-normal text-slate-400 ml-1">CLP</span>
                    </span>
                    <button
                      onClick={() => { setEditingPrice(true); setPriceInput(String(booking.totalPrice)) }}
                      className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                      title="Editar tarifa"
                    >
                      <span className="material-symbols-outlined text-base">edit</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Observaciones Admin */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">edit_note</span>
              Observaciones del Administrador
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Ej: Cliente VIP, requiere silla de bebé, llevar letrero con nombre..."
              className="w-full px-4 py-3 text-sm border-2 border-slate-200 rounded-xl focus:outline-none focus:border-brand-400 resize-none transition-colors"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">{notes.length}/500 caracteres</p>
              <button
                onClick={saveNotes}
                disabled={savingNotes || notes === (booking.adminNotes ?? '')}
                className="flex items-center gap-1.5 bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-slate-800 transition-colors disabled:cursor-not-allowed"
              >
                {notesSaved ? (
                  <><span className="material-symbols-outlined text-xs">check</span>Guardado</>
                ) : savingNotes ? (
                  <><span className="material-symbols-outlined text-xs animate-spin">progress_activity</span>Guardando…</>
                ) : (
                  <><span className="material-symbols-outlined text-xs">save</span>Guardar notas</>
                )}
              </button>
            </div>
          </section>

          {/* Notas del conductor (si existen) */}
          {booking.driverNotes && (
            <section className="bg-violet-50 border border-violet-200 rounded-xl p-4">
              <p className="text-xs font-bold text-violet-600 uppercase mb-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">person</span>
                Notas del conductor
              </p>
              <p className="text-sm text-violet-900">{booking.driverNotes}</p>
            </section>
          )}

          {/* Acciones */}
          <section className="space-y-3 pt-2 pb-2">
            {!booking.adminConfirmed && ['pending', 'rejected'].includes(booking.status) && (
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-colors shadow-sm"
              >
                {confirming ? (
                  <><span className="material-symbols-outlined animate-spin">progress_activity</span>Confirmando…</>
                ) : (
                  <><span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>Confirmar reserva</>
                )}
              </button>
            )}

            {booking.adminConfirmed && ['pending', 'rejected'].includes(booking.status) && (
              <button
                onClick={() => { onClose(); onAssign() }}
                className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold py-3.5 rounded-xl transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>person_add</span>
                Asignar Conductor
              </button>
            )}

            {!booking.adminConfirmed && ['pending', 'rejected'].includes(booking.status) && (
              <p className="text-center text-xs text-slate-400 flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-sm text-amber-400">lock</span>
                Debes confirmar la reserva antes de asignar conductor
              </p>
            )}
          </section>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-xl text-sm font-semibold text-white ${toast.ok ? 'bg-emerald-600' : 'bg-red-500'}`}>
            <span className="material-symbols-outlined text-base">{toast.ok ? 'check_circle' : 'error'}</span>
            {toast.msg}
          </div>
        )}
      </div>
    </div>
  )
}
