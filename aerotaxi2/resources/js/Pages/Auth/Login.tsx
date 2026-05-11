import { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import type { ApiResponse } from '@aerotaxi/shared'

interface LoginResponse {
  token: string
  user: { id: string; name: string; email: string; role: 'client' | 'driver' | 'admin' }
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const setAuth = useAuthStore((s) => s.setAuth)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await api.post<ApiResponse<LoginResponse>>('/auth/login', { email, password })
      setAuth(res.data.user, res.data.token)

      const role = res.data.user.role
      if (role === 'admin') router.visit('/admin')
      else if (role === 'driver') router.visit('/driver')
      else router.visit('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans px-4">
      <Head title="Iniciar Sesión - AeroTaxi Chile" />
      
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/" className="inline-block">
            <h2 className="text-3xl font-black tracking-tighter text-slate-900">
              AERO<span className="text-brand-500">TAXI</span>
            </h2>
          </Link>
          <p className="mt-3 text-slate-500 font-medium italic">Tu conexión premium al aeropuerto</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-2xl shadow-slate-200 border border-slate-100">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Bienvenido de nuevo</h1>
          <p className="text-slate-500 text-sm mb-8">Ingresa tus credenciales para acceder a tu cuenta</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 px-1">Email</label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 group-focus-within:text-brand-500 transition-colors">mail</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none text-slate-900"
                  placeholder="ejemplo@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <label className="text-sm font-bold text-slate-700">Contraseña</label>
                <Link href="/forgot-password" title="Recuperar contraseña" className="text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 group-focus-within:text-brand-500 transition-colors">lock</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none text-slate-900"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium animate-shake">
                <span className="material-symbols-outlined text-base">error</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-slate-300 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-brand-500/20 active:scale-[0.98] flex items-center justify-center gap-2 overflow-hidden"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Ingresar al sistema</span>
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500 font-medium">
              ¿No tienes una cuenta?{' '}
              <Link href="/register" title="Crear una cuenta" className="text-brand-600 font-black hover:text-brand-700 hover:underline transition-all">
                Regístrate gratis
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-center gap-6 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
          <img src="/img/visa.svg" alt="Visa" className="h-6" />
          <img src="/img/mastercard.svg" alt="Mastercard" className="h-6" />
          <img src="/img/amex.svg" alt="Amex" className="h-6" />
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  )
}
