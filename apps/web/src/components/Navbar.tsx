'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Menu, X, Plane, ChevronDown, LogOut, Calendar, MapPin, User } from 'lucide-react'
import { useAuthStore } from '@/store/auth'

export default function Navbar() {
  const { user, clearAuth, _hasHydrated } = useAuthStore()
  const router = useRouter()

  const [scrolled,     setScrolled]     = useState(false)
  const [mobileOpen,   setMobileOpen]   = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Scroll shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close user dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => {
    clearAuth()
    setUserMenuOpen(false)
    setMobileOpen(false)
    router.push('/')
  }

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  const firstName = user?.name?.split(' ')[0] ?? ''

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white shadow-md' : 'bg-white/90 backdrop-blur-sm'
      }`}
    >
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-slate-900">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
            <Plane size={18} className="text-white" />
          </div>
          <span>Aerotaxi <span className="text-brand-500">Chile</span></span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#servicios" className="text-sm text-slate-600 hover:text-brand-500 transition-colors font-medium">
            Servicios
          </a>
          <a href="#tarifas" className="text-sm text-slate-600 hover:text-brand-500 transition-colors font-medium">
            Tarifas
          </a>
          <a href="#contacto" className="text-sm text-slate-600 hover:text-brand-500 transition-colors font-medium">
            Contacto
          </a>

          {/* Auth-aware section */}
          {_hasHydrated && user ? (
            // ── Logged-in: avatar + dropdown ──────────────────────────
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 rounded-full pl-1.5 pr-3 py-1 transition-colors"
              >
                <div className="w-7 h-7 bg-brand-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {initials}
                </div>
                <span className="text-sm font-semibold text-slate-700">{firstName}</span>
                <ChevronDown
                  size={13}
                  className={`text-slate-500 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* User info header */}
                  <div className="px-4 py-2.5 border-b border-slate-100 mb-1">
                    <p className="text-xs font-bold text-slate-800 truncate">{user.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                  </div>

                  {user.role === 'client' ? (
                    <>
                      <Link
                        href="/mis-reservas"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Calendar size={15} className="text-brand-500 shrink-0" />
                        Mis reservas
                      </Link>
                      <Link
                        href="/mis-direcciones"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <MapPin size={15} className="text-brand-500 shrink-0" />
                        Mis direcciones
                      </Link>
                    </>
                  ) : (
                    <Link
                      href="/dashboard"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Calendar size={15} className="text-brand-500 shrink-0" />
                      Panel de control
                    </Link>
                  )}

                  <Link
                    href="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <User size={15} className="text-brand-500 shrink-0" />
                    Mi perfil
                  </Link>

                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={15} className="shrink-0" />
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // ── Not logged in ─────────────────────────────────────────
            <Link
              href="/auth/login"
              className="text-sm text-slate-600 hover:text-slate-900 transition-colors font-medium"
            >
              Iniciar sesión
            </Link>
          )}

          <Link
            href="/booking"
            className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Reservar ahora
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="md:hidden p-2 text-slate-600 hover:text-slate-900"
          aria-label="Menú"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 px-4 py-4 space-y-0.5">
          <a href="#servicios" onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-slate-700 py-2.5">
            Servicios
          </a>
          <a href="#tarifas" onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-slate-700 py-2.5">
            Tarifas
          </a>
          <a href="#contacto" onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-slate-700 py-2.5">
            Contacto
          </a>

          {_hasHydrated && user ? (
            <>
              {/* User identity */}
              <div className="border-t border-slate-100 pt-3 pb-1 flex items-center gap-3">
                <div className="w-9 h-9 bg-brand-500 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>
              </div>

              {user.role === 'client' ? (
                <>
                  <Link
                    href="/mis-reservas"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 py-2.5 text-sm font-medium text-slate-700"
                  >
                    <Calendar size={16} className="text-brand-500 shrink-0" />
                    Mis reservas
                  </Link>
                  <Link
                    href="/mis-direcciones"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 py-2.5 text-sm font-medium text-slate-700"
                  >
                    <MapPin size={16} className="text-brand-500 shrink-0" />
                    Mis direcciones
                  </Link>
                </>
              ) : (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 py-2.5 text-sm font-medium text-slate-700"
                >
                  <Calendar size={16} className="text-brand-500 shrink-0" />
                  Panel de control
                </Link>
              )}

              <Link
                href="/profile"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 py-2.5 text-sm font-medium text-slate-700"
              >
                <User size={16} className="text-brand-500 shrink-0" />
                Mi perfil
              </Link>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 py-2.5 text-sm font-medium text-red-600"
              >
                <LogOut size={16} className="shrink-0" />
                Cerrar sesión
              </button>
            </>
          ) : (
            <Link
              href="/auth/login"
              onClick={() => setMobileOpen(false)}
              className="block text-sm font-medium text-slate-700 py-2.5"
            >
              Iniciar sesión
            </Link>
          )}

          <div className="pt-3 border-t border-slate-100">
            <Link
              href="/booking"
              onClick={() => setMobileOpen(false)}
              className="block bg-brand-500 text-white text-sm font-semibold text-center px-4 py-3 rounded-lg"
            >
              Reservar ahora
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
