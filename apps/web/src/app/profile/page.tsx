'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { z } from 'zod'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import type { ApiResponse } from '@aerotaxi/shared'

// ─── Schema ───────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  name:  z.string().min(2, 'Mínimo 2 caracteres').max(100),
  email: z.string().email('Email inválido'),
  phone: z
    .string()
    .regex(/^\+?56[0-9]{9}$/, 'Formato: +56XXXXXXXXX (9 dígitos)')
    .optional()
    .or(z.literal('')),
})

type ProfileForm = z.infer<typeof profileSchema>

interface ProfileData {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, token, setUser, _hasHydrated } = useAuthStore()
  const router = useRouter()

  const [profile, setProfile]   = useState<ProfileData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [toast, setToast]       = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  })

  // ── Cargar perfil ──────────────────────────────────────────────────
  useEffect(() => {
    if (!_hasHydrated) return
    if (!user || !token) { router.push('/auth/login'); return }

    api.get<ApiResponse<ProfileData>>('/profile', token)
      .then((res) => {
        setProfile(res.data)
        reset({
          name:  res.data.name  ?? '',
          email: res.data.email ?? '',
          phone: res.data.phone ?? '',
        })
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [_hasHydrated, user, token, router, reset])

  // ── Auto-dismiss toast ─────────────────────────────────────────────
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  // ── Submit ─────────────────────────────────────────────────────────
  const onSubmit = async (data: ProfileForm) => {
    try {
      const body: Record<string, string> = { name: data.name, email: data.email }
      if (data.phone) body.phone = data.phone

      const res = await api.put<ApiResponse<ProfileData>>('/profile', body, token!)
      setProfile(res.data)

      // Actualizar nombre en el store global para que el header se actualice
      if (user) setUser({ ...user, name: res.data.name, email: res.data.email })

      reset({ name: res.data.name, email: res.data.email, phone: res.data.phone ?? '' })
      setToast({ type: 'success', msg: '¡Perfil actualizado correctamente!' })
    } catch (err) {
      setToast({ type: 'error', msg: err instanceof Error ? err.message : 'Error al guardar' })
    }
  }

  // ── Loading screen ─────────────────────────────────────────────────
  if (!_hasHydrated || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-brand-500 text-4xl">progress_activity</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Top App Bar ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <h1 className="text-lg font-bold text-slate-900">Mi perfil</h1>
        </div>
      </header>

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-500 text-white'
              : 'bg-red-500 text-white'
          }`}
        >
          <span className="material-symbols-outlined text-base">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {toast.msg}
        </div>
      )}

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* ── Avatar card ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center gap-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-brand-500 text-white text-2xl font-black flex items-center justify-center shrink-0 shadow-md">
            {profile?.name
              ? profile.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
              : '?'}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 text-lg truncate">{profile?.name}</p>
            <p className="text-sm text-slate-400 truncate">{profile?.email}</p>
            <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full ring-1 ring-brand-200">
              <span className="material-symbols-outlined text-sm">person</span>
              {profile?.role === 'client' ? 'Cliente' : profile?.role}
            </span>
          </div>
        </div>

        {/* ── Form card ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-brand-500">edit</span>
              Editar datos personales
            </h2>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">

            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Nombre completo
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-lg pointer-events-none">
                  badge
                </span>
                <input
                  {...register('name')}
                  placeholder="Tu nombre completo"
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-colors ${
                    errors.name
                      ? 'border-red-300 focus:ring-red-300'
                      : 'border-slate-200 focus:ring-brand-300 focus:border-brand-400'
                  }`}
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Correo electrónico
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-lg pointer-events-none">
                  mail
                </span>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="tu@email.com"
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-colors ${
                    errors.email
                      ? 'border-red-300 focus:ring-red-300'
                      : 'border-slate-200 focus:ring-brand-300 focus:border-brand-400'
                  }`}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Teléfono WhatsApp
                <span className="ml-1 text-slate-400 font-normal">(opcional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-lg pointer-events-none">
                  phone
                </span>
                <input
                  {...register('phone')}
                  type="tel"
                  placeholder="+56912345678"
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-colors ${
                    errors.phone
                      ? 'border-red-300 focus:ring-red-300'
                      : 'border-slate-200 focus:ring-brand-300 focus:border-brand-400'
                  }`}
                />
              </div>
              {errors.phone ? (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {errors.phone.message}
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-400">
                  Usado para confirmaciones de reserva por WhatsApp
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || !isDirty}
              className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors shadow-sm mt-2"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                  Guardando…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">save</span>
                  Guardar cambios
                </>
              )}
            </button>
          </form>
        </div>

        {/* ── Mis Reservas link ── */}
        <Link
          href="/dashboard"
          className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 p-4 hover:bg-slate-50 transition-colors shadow-sm group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-brand-500">confirmation_number</span>
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">Mis reservas</p>
              <p className="text-xs text-slate-400">Ver historial de viajes</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-slate-300 group-hover:text-slate-400 transition-colors">
            chevron_right
          </span>
        </Link>

        {/* ── Security link (placeholder) ── */}
        <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 p-4 shadow-sm opacity-50 cursor-not-allowed">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-slate-400">lock</span>
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">Cambiar contraseña</p>
              <p className="text-xs text-slate-400">Próximamente</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-slate-300">chevron_right</span>
        </div>

      </main>
    </div>
  )
}
