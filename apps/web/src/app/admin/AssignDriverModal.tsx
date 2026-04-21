'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { assignDriverSchema, type AssignDriverInput, type ApiResponse } from '@aerotaxi/shared'
import { api } from '@/lib/api'
import type { Booking } from '@aerotaxi/shared'

interface Driver {
  id: string
  name: string
  isAvailable: boolean
  vehicleId: string | null
}

interface Vehicle {
  id: string
  plate: string
  brand: string
  model: string
  type: string
}

export default function AssignDriverModal({
  booking,
  token,
  onClose,
  onSuccess,
}: {
  booking: Booking
  token: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } =
    useForm<AssignDriverInput>({
      resolver: zodResolver(assignDriverSchema),
      defaultValues: { bookingId: booking.id },
    })

  useEffect(() => {
    Promise.all([
      api.get<ApiResponse<Driver[]>>('/drivers', token),
      api.get<ApiResponse<Vehicle[]>>('/vehicles', token),
    ]).then(([d, v]) => {
      setDrivers(d.data.filter((dr) => dr.isAvailable))
      setVehicles(v.data)
    }).catch(console.error)
  }, [token])

  const onSubmit = async (data: AssignDriverInput) => {
    try {
      await api.patch(`/bookings/${booking.id}/assign`, data, token)
      onSuccess()
    } catch (err) {
      setError('root', { message: err instanceof Error ? err.message : 'Error al asignar' })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="card w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">Asignar conductor</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Reserva #{booking.id.slice(-6).toUpperCase()} · {booking.vehicleType}
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register('bookingId')} />

          <div>
            <label className="label">Conductor disponible</label>
            <select {...register('driverId')} className="input">
              <option value="">Seleccionar conductor</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            {errors.driverId && <p className="text-red-500 text-xs mt-1">{errors.driverId.message}</p>}
            {drivers.length === 0 && <p className="text-yellow-600 text-xs mt-1">No hay conductores disponibles</p>}
          </div>

          <div>
            <label className="label">Vehículo</label>
            <select {...register('vehicleId')} className="input">
              <option value="">Seleccionar vehículo</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.brand} {v.model} — {v.plate} ({v.type})
                </option>
              ))}
            </select>
            {errors.vehicleId && <p className="text-red-500 text-xs mt-1">{errors.vehicleId.message}</p>}
          </div>

          <div>
            <label className="label">Notas para el conductor (opcional)</label>
            <textarea {...register('adminNotes')} className="input" rows={2} placeholder="Indicaciones especiales..." />
          </div>

          {errors.root && <p className="text-red-500 text-sm">{errors.root.message}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? 'Asignando...' : 'Asignar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
