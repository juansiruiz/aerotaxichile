'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { registerClientSchema, type RegisterClientInput } from '@aerotaxi/shared'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import type { ApiResponse } from '@aerotaxi/shared'

interface RegisterResponse {
  token: string
  user: { id: string; name: string; email: string; role: 'client' }
}

export default function RegisterPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<RegisterClientInput>({
    resolver: zodResolver(registerClientSchema),
  })

  const onSubmit = async (data: RegisterClientInput) => {
    try {
      const res = await api.post<ApiResponse<RegisterResponse>>('/auth/register', data)
      setAuth(res.data.user, res.data.token)
      router.push('/dashboard')
    } catch (err) {
      setError('root', { message: err instanceof Error ? err.message : 'Error al registrarse' })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="card w-full max-w-sm">
        <h1 className="text-xl font-bold mb-6 text-center">Crear cuenta</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Nombre completo</label>
            <input {...register('name')} className="input" placeholder="Juan Pérez" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label">Email</label>
            <input {...register('email')} type="email" className="input" placeholder="tu@email.com" />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="label">Teléfono</label>
            <input {...register('phone')} className="input" placeholder="+56912345678" />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
          </div>

          <div>
            <label className="label">Contraseña</label>
            <input {...register('password')} type="password" className="input" placeholder="••••••••" />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>

          {errors.root && (
            <p className="text-red-500 text-sm text-center">{errors.root.message}</p>
          )}

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3">
            {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          ¿Ya tienes cuenta?{' '}
          <Link href="/auth/login" className="text-brand-600 font-medium hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
