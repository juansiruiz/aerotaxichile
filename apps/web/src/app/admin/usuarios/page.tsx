'use client'

import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import type { ApiResponse } from '@aerotaxi/shared'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { AdminSidebar } from '@/components/AdminSidebar'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminUser {
  id: string
  name: string
  email: string
  phone: string
  role: 'admin' | 'client' | 'driver'
  isActive: boolean
  createdAt: string
}

interface UserForm {
  name: string; email: string; phone: string; password: string
}

const emptyForm: UserForm = { name: '', email: '', phone: '', password: '' }

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsuariosPage() {
  const { user, token, clearAuth, _hasHydrated } = useAuthStore()
  const router = useRouter()

  const [admins,   setAdmins]   = useState<AdminUser[]>([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState<'create' | 'edit' | null>(null)
  const [editing,  setEditing]  = useState<AdminUser | null>(null)
  const [form,     setForm]     = useState<UserForm>(emptyForm)
  const [saving,   setSaving]   = useState(false)
  const [toast,    setToast]    = useState<{ ok: boolean; msg: string } | null>(null)
  const [confirm,  setConfirm]  = useState<AdminUser | null>(null)

  // ── Auth guard ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!_hasHydrated) return
    if (!user || !token) { router.push('/auth/login'); return }
    if (user.role !== 'admin') { router.push('/dashboard'); return }
    loadAdmins()
  }, [_hasHydrated, user, token]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadAdmins = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await api.get<ApiResponse<AdminUser[]>>('/users?role=admin', token)
      setAdmins(res.data ?? [])
    } catch { /* silencioso */ }
    finally { setLoading(false) }
  }, [token])

  // ── Toast ───────────────────────────────────────────────────────────────────

  const showToast = (ok: boolean, msg: string) => {
    setToast({ ok, msg })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Create modal ────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setModal('create')
  }

  const openEdit = (u: AdminUser) => {
    setEditing(u)
    setForm({ name: u.name, email: u.email, phone: u.phone, password: '' })
    setModal('edit')
  }

  const closeModal = () => { setModal(null); setEditing(null); setForm(emptyForm) }

  const handleSubmit = async () => {
    if (!token) return
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      showToast(false, 'Completa nombre, email y teléfono')
      return
    }
    if (modal === 'create' && !form.password.trim()) {
      showToast(false, 'La contraseña es obligatoria al crear')
      return
    }
    setSaving(true)
    try {
      if (modal === 'create') {
        const res = await api.post<ApiResponse<AdminUser>>('/users', {
          name: form.name.trim(), email: form.email.trim(),
          phone: form.phone.trim(), password: form.password,
        }, token)
        setAdmins(prev => [...prev, res.data!])
        showToast(true, 'Administrador creado')
      } else if (editing) {
        const body: Record<string, unknown> = {
          name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(),
        }
        if (form.password) body['password'] = form.password
        const res = await api.patch<ApiResponse<AdminUser>>(`/users/${editing.id}`, body, token)
        setAdmins(prev => prev.map(u => u.id === editing.id ? res.data! : u))
        showToast(true, 'Datos actualizados')
      }
      closeModal()
    } catch (e) {
      showToast(false, e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  // ── Toggle active ───────────────────────────────────────────────────────────

  const toggleActive = async (u: AdminUser) => {
    if (!token) return
    if (u.id === user?.id) { showToast(false, 'No puedes desactivarte a ti mismo'); return }
    try {
      await api.patch(`/users/${u.id}`, { isActive: !u.isActive }, token)
      setAdmins(prev => prev.map(a => a.id === u.id ? { ...a, isActive: !a.isActive } : a))
      showToast(true, u.isActive ? 'Usuario desactivado' : 'Usuario activado')
    } catch (e) {
      showToast(false, e instanceof Error ? e.message : 'Error')
    }
    setConfirm(null)
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      <AdminSidebar active="usuarios" clearAuth={clearAuth} router={router} />

      <main className="flex-1 overflow-y-auto">

        {/* Header */}
        <header className="bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between sticky top-0 z-40">
          <div>
            <p className="text-xs text-slate-400 font-medium">Sistema</p>
            <h1 className="text-xl font-black text-slate-900 leading-tight">Usuarios administradores</h1>
          </div>
          <div className="flex items-center gap-3">
            {toast && (
              <div className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl ${
                toast.ok
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {toast.ok ? 'check_circle' : 'error'}
                </span>
                {toast.msg}
              </div>
            )}
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-base">person_add</span>
              Nuevo admin
            </button>
          </div>
        </header>

        <div className="px-8 py-6">

          {/* Info banner */}
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 mb-6">
            <span className="material-symbols-outlined text-blue-500 text-xl shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
            <div>
              <p className="text-sm font-bold text-blue-800">Acceso al panel de administración</p>
              <p className="text-xs text-blue-600 mt-0.5">
                Los usuarios con rol <span className="font-bold">admin</span> pueden acceder a todas las secciones del panel.
                Asegúrate de crear cuentas solo para personas de confianza.
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
              <h3 className="font-black text-slate-900 text-sm">
                Administradores
                <span className="ml-2 text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {admins.length}
                </span>
              </h3>
            </div>

            {loading ? (
              <div className="flex items-center gap-3 px-6 py-10 text-slate-400 text-sm">
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                Cargando usuarios…
              </div>
            ) : admins.length === 0 ? (
              <div className="py-12 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-300 block mb-2">manage_accounts</span>
                <p className="text-sm text-slate-400">Sin administradores registrados</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {admins.map((u) => (
                  <div key={u.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors">
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${
                      u.isActive ? 'bg-brand-500 text-white' : 'bg-slate-200 text-slate-400'
                    }`}>
                      {u.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 truncate">{u.name}</p>
                        {u.id === user?.id && (
                          <span className="text-[10px] font-bold bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded-full">Tú</span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-500'
                        }`}>
                          {u.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">{u.email}</p>
                    </div>

                    {/* Phone */}
                    <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="material-symbols-outlined text-sm text-slate-400">phone</span>
                      {u.phone}
                    </div>

                    {/* Date */}
                    <div className="hidden md:block text-xs text-slate-400 shrink-0">
                      Desde {format(new Date(u.createdAt), "d MMM yyyy", { locale: es })}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEdit(u)}
                        title="Editar"
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">edit</span>
                      </button>
                      {u.id !== user?.id && (
                        <button
                          onClick={() => setConfirm(u)}
                          title={u.isActive ? 'Desactivar' : 'Activar'}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                            u.isActive
                              ? 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          <span className="material-symbols-outlined text-base">
                            {u.isActive ? 'person_off' : 'person'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Create / Edit modal ──────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">

            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  {modal === 'create' ? 'Nuevo administrador' : 'Editar administrador'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {modal === 'create' ? 'Crea una cuenta con acceso completo al panel' : 'Modifica los datos del administrador'}
                </p>
              </div>
              <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <ModalField label="Nombre completo" required>
                <input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Juan Pérez González"
                  className={inputCls}
                  autoFocus
                />
              </ModalField>

              <ModalField label="Email" required>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="juan@aerotaxichile.cl"
                  className={inputCls}
                />
              </ModalField>

              <ModalField label="Teléfono" required>
                <input
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+56 9 1234 5678"
                  className={inputCls}
                />
              </ModalField>

              <ModalField
                label="Contraseña"
                required={modal === 'create'}
                hint={modal === 'edit' ? 'Dejar en blanco para no cambiar' : undefined}
              >
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder={modal === 'create' ? 'Mínimo 6 caracteres' : '••••••••'}
                  className={inputCls}
                />
              </ModalField>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeModal}
                className="flex-1 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60"
              >
                {saving ? (
                  <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {modal === 'create' ? 'person_add' : 'save'}
                  </span>
                )}
                {saving ? 'Guardando…' : modal === 'create' ? 'Crear admin' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toggle confirm modal ─────────────────────────────────────────────── */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirm(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10 text-center">
            <div className={`w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center ${
              confirm.isActive ? 'bg-red-50' : 'bg-emerald-50'
            }`}>
              <span className={`material-symbols-outlined text-3xl ${confirm.isActive ? 'text-red-500' : 'text-emerald-500'}`}
                style={{ fontVariationSettings: "'FILL' 1" }}>
                {confirm.isActive ? 'person_off' : 'person'}
              </span>
            </div>
            <h3 className="text-base font-black text-slate-900 mb-1">
              {confirm.isActive ? 'Desactivar administrador' : 'Activar administrador'}
            </h3>
            <p className="text-sm text-slate-500 mb-5">
              {confirm.isActive
                ? `${confirm.name} ya no podrá iniciar sesión en el panel.`
                : `${confirm.name} recuperará acceso al panel de administración.`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => toggleActive(confirm)}
                className={`flex-1 text-sm font-bold text-white px-4 py-2.5 rounded-xl transition-colors ${
                  confirm.isActive ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'
                }`}
              >
                {confirm.isActive ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Shared UI helpers ────────────────────────────────────────────────────────

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition'

function ModalField({ label, hint, required, children }: {
  label: string; hint?: string; required?: boolean; children: ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
      </div>
      {children}
    </div>
  )
}
