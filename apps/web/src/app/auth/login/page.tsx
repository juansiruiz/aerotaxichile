'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { loginSchema, type LoginInput } from '@aerotaxi/shared'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import type { ApiResponse } from '@aerotaxi/shared'

interface LoginResponse {
  token: string
  user: { id: string; name: string; email: string; role: 'client' | 'driver' | 'admin' }
}

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginInput) => {
    try {
      const res = await api.post<ApiResponse<LoginResponse>>('/auth/login', data)
      setAuth(res.data.user, res.data.token)

      const role = res.data.user.role
      if (role === 'admin') router.push('/admin')
      else if (role === 'driver') router.push('/driver')
      else router.push('/dashboard')
    } catch (err) {
      setError('root', { message: err instanceof Error ? err.message : 'Error al iniciar sesión' })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="card w-full max-w-sm">
        <h1 className="text-xl font-bold mb-6 text-center">Iniciar sesión</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input {...register('email')} type="email" className="input" placeholder="tu@email.com" />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
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
            {isSubmitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          ¿No tienes cuenta?{' '}
          <Link href="/auth/register" className="text-brand-600 font-medium hover:underline">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  )
}
