'use client'

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import type { ApiResponse } from '@aerotaxi/shared'
import { AdminSidebar } from '@/components/AdminSidebar'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'empresa' | 'seo' | 'integraciones'

type EmpresaForm = {
  app_name: string; app_logo: string
  phone_main: string; phone_whatsapp: string
  email_contact: string; address: string
}
type SeoForm = {
  seo_title: string; seo_description: string
  seo_keywords: string; seo_og_image: string
  google_site_verification: string
}
type IntegForm = {
  gtm_id: string; analytics_id: string; facebook_pixel_id: string
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConfiguracionPage() {
  const { user, token, clearAuth, _hasHydrated } = useAuthStore()
  const router = useRouter()

  const [tab, setTab]               = useState<Tab>('empresa')
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [uploadingLogo, setUL]      = useState(false)
  const [toast, setToast]           = useState<{ ok: boolean; msg: string } | null>(null)
  const logoRef                     = useRef<HTMLInputElement>(null)

  const [empresa, setEmpresa]       = useState<EmpresaForm>({
    app_name: '', app_logo: '', phone_main: '', phone_whatsapp: '', email_contact: '', address: '',
  })
  const [seo, setSeo]               = useState<SeoForm>({
    seo_title: '', seo_description: '', seo_keywords: '', seo_og_image: '', google_site_verification: '',
  })
  const [integ, setInteg]           = useState<IntegForm>({
    gtm_id: '', analytics_id: '', facebook_pixel_id: '',
  })

  // ── Auth guard ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!_hasHydrated) return
    if (!user || !token) { router.push('/auth/login'); return }
    if (user.role !== 'admin') { router.push('/dashboard'); return }
    load()
  }, [_hasHydrated, user, token]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load all settings ───────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await api.get<ApiResponse<Record<string, string>>>('/settings', token)
      const s = res.data ?? {}
      setEmpresa({
        app_name:      s['app_name']      ?? '',
        app_logo:      s['app_logo']      ?? '',
        phone_main:    s['phone_main']    ?? '',
        phone_whatsapp:s['phone_whatsapp']?? '',
        email_contact: s['email_contact'] ?? '',
        address:       s['address']       ?? '',
      })
      setSeo({
        seo_title:               s['seo_title']               ?? '',
        seo_description:         s['seo_description']         ?? '',
        seo_keywords:            s['seo_keywords']            ?? '',
        seo_og_image:            s['seo_og_image']            ?? '',
        google_site_verification:s['google_site_verification']?? '',
      })
      setInteg({
        gtm_id:            s['gtm_id']            ?? '',
        analytics_id:      s['analytics_id']      ?? '',
        facebook_pixel_id: s['facebook_pixel_id'] ?? '',
      })
    } catch { /* silencioso */ }
    finally { setLoading(false) }
  }, [token])

  // ── Save helpers ────────────────────────────────────────────────────────────

  const showToast = (ok: boolean, msg: string) => {
    setToast({ ok, msg })
    setTimeout(() => setToast(null), 3000)
  }

  const saveMap = async <T extends Readonly<Record<string, string>>>(data: T) => {
    if (!token) return
    setSaving(true)
    try {
      await Promise.all(
        Object.entries(data).map(([key, value]) =>
          value.trim()
            ? api.patch(`/settings/${key}`, { value: value.trim() }, token)
            : Promise.resolve()
        )
      )
      showToast(true, 'Cambios guardados correctamente')
    } catch (e) {
      showToast(false, e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  // ── Logo upload ─────────────────────────────────────────────────────────────

  const handleLogoFile = async (file: File) => {
    if (!token) return
    setUL(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res  = await fetch(`${API_URL}/uploads/logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      const json = await res.json()
      if (!res.ok) throw new Error((json as { error: string }).error ?? 'Error al subir')
      const url = (json as { data: { url: string } }).data.url
      setEmpresa(prev => ({ ...prev, app_logo: url }))
      await api.patch('/settings/app_logo', { value: url }, token)
      showToast(true, 'Logo actualizado')
    } catch (e) {
      showToast(false, e instanceof Error ? e.message : 'Error al subir el logo')
    } finally { setUL(false) }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      <AdminSidebar active="configuracion" clearAuth={clearAuth} router={router} />

      <main className="flex-1 overflow-y-auto">

        {/* Header */}
        <header className="bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between sticky top-0 z-40">
          <div>
            <p className="text-xs text-slate-400 font-medium">Sistema</p>
            <h1 className="text-xl font-black text-slate-900 leading-tight">Configuración</h1>
          </div>
          {/* Toast */}
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
        </header>

        <div className="px-8 py-6 max-w-3xl">

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
            {([
              { key: 'empresa',       icon: 'business',      label: 'Empresa'          },
              { key: 'seo',           icon: 'travel_explore', label: 'SEO & Google'     },
              { key: 'integraciones', icon: 'extension',     label: 'Integraciones'    },
            ] as { key: Tab; icon: string; label: string }[]).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  tab === t.key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="material-symbols-outlined text-base"
                  style={{ fontVariationSettings: tab === t.key ? "'FILL' 1" : "'FILL' 0" }}>
                  {t.icon}
                </span>
                {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center gap-3 py-12 text-slate-400">
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              Cargando configuración…
            </div>
          ) : (
            <>
              {/* ── EMPRESA ─────────────────────────────────────────────────── */}
              {tab === 'empresa' && (
                <div className="space-y-5">

                  {/* Logo */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h2 className="font-black text-slate-900 text-sm mb-4">Logo de la aplicación</h2>
                    <div className="flex items-center gap-5">
                      <div className="w-20 h-20 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                        {empresa.app_logo ? (
                          <img src={empresa.app_logo} alt="Logo" className="w-full h-full object-contain p-1" />
                        ) : (
                          <span className="material-symbols-outlined text-slate-400 text-3xl">image</span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Imagen del logo</p>
                        <p className="text-xs text-slate-400 mt-0.5 mb-3">PNG, JPG o WebP · máx 5 MB · recomendado 512×512px</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => logoRef.current?.click()}
                            disabled={uploadingLogo}
                            className="flex items-center gap-1.5 text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                          >
                            {uploadingLogo ? (
                              <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                            ) : (
                              <span className="material-symbols-outlined text-base">upload</span>
                            )}
                            {uploadingLogo ? 'Subiendo…' : 'Subir logo'}
                          </button>
                          {empresa.app_logo && (
                            <button
                              onClick={() => setEmpresa(p => ({ ...p, app_logo: '' }))}
                              className="text-sm font-semibold text-slate-500 hover:text-red-500 px-3 py-2 rounded-xl transition-colors"
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                        <input
                          ref={logoRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoFile(f) }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
                    <h2 className="font-black text-slate-900 text-sm">Información de la empresa</h2>

                    <Field label="Nombre de la app / empresa" required>
                      <input
                        value={empresa.app_name}
                        onChange={e => setEmpresa(p => ({ ...p, app_name: e.target.value }))}
                        placeholder="AeroTaxi Chile"
                        className={inputCls}
                      />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Teléfono principal">
                        <input
                          value={empresa.phone_main}
                          onChange={e => setEmpresa(p => ({ ...p, phone_main: e.target.value }))}
                          placeholder="+56 9 1234 5678"
                          className={inputCls}
                        />
                      </Field>
                      <Field label="WhatsApp">
                        <input
                          value={empresa.phone_whatsapp}
                          onChange={e => setEmpresa(p => ({ ...p, phone_whatsapp: e.target.value }))}
                          placeholder="+56 9 1234 5678"
                          className={inputCls}
                        />
                      </Field>
                    </div>

                    <Field label="Email de contacto">
                      <input
                        type="email"
                        value={empresa.email_contact}
                        onChange={e => setEmpresa(p => ({ ...p, email_contact: e.target.value }))}
                        placeholder="contacto@aerotaxichile.cl"
                        className={inputCls}
                      />
                    </Field>

                    <Field label="Dirección">
                      <input
                        value={empresa.address}
                        onChange={e => setEmpresa(p => ({ ...p, address: e.target.value }))}
                        placeholder="Av. Libertador Bernardo O'Higgins 1234, Santiago"
                        className={inputCls}
                      />
                    </Field>
                  </div>

                  <SaveButton saving={saving} onClick={() => saveMap(empresa)} />
                </div>
              )}

              {/* ── SEO ─────────────────────────────────────────────────────── */}
              {tab === 'seo' && (
                <div className="space-y-5">
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-base text-blue-600" style={{ fontVariationSettings: "'FILL' 1" }}>travel_explore</span>
                      </div>
                      <div>
                        <h2 className="font-black text-slate-900 text-sm">Metadatos SEO</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Estos datos aparecen en Google y redes sociales al compartir tu sitio.</p>
                      </div>
                    </div>

                    <Field label="Título SEO" hint={`${seo.seo_title.length}/60`}>
                      <input
                        value={seo.seo_title}
                        onChange={e => setSeo(p => ({ ...p, seo_title: e.target.value }))}
                        placeholder="AeroTaxi Chile — Traslados al Aeropuerto"
                        maxLength={60}
                        className={inputCls}
                      />
                    </Field>

                    <Field label="Descripción SEO" hint={`${seo.seo_description.length}/160`}>
                      <textarea
                        value={seo.seo_description}
                        onChange={e => setSeo(p => ({ ...p, seo_description: e.target.value }))}
                        placeholder="Traslados ejecutivos al Aeropuerto AMB desde cualquier punto de Santiago. Reserva en línea, precio fijo, sin sorpresas."
                        maxLength={160}
                        rows={3}
                        className={`${inputCls} resize-none`}
                      />
                    </Field>

                    <Field label="Palabras clave (separadas por comas)">
                      <input
                        value={seo.seo_keywords}
                        onChange={e => setSeo(p => ({ ...p, seo_keywords: e.target.value }))}
                        placeholder="aerotaxi, traslado aeropuerto santiago, taxi aeropuerto"
                        className={inputCls}
                      />
                    </Field>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-base text-emerald-600" style={{ fontVariationSettings: "'FILL' 1" }}>share</span>
                      </div>
                      <div>
                        <h2 className="font-black text-slate-900 text-sm">Open Graph (redes sociales)</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Imagen y verificación para Facebook, Twitter y Google.</p>
                      </div>
                    </div>

                    <Field label="URL de imagen OG (1200×630px)">
                      <input
                        value={seo.seo_og_image}
                        onChange={e => setSeo(p => ({ ...p, seo_og_image: e.target.value }))}
                        placeholder="https://aerotaxichile.cl/og-image.jpg"
                        className={inputCls}
                      />
                    </Field>

                    <Field label="Google Site Verification" hint="Código del meta tag de Search Console">
                      <input
                        value={seo.google_site_verification}
                        onChange={e => setSeo(p => ({ ...p, google_site_verification: e.target.value }))}
                        placeholder="abc123def456..."
                        className={inputCls}
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Obtén este código en <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" className="underline text-blue-500">Google Search Console</a> → Verificar propiedad → Meta etiqueta HTML.
                      </p>
                    </Field>
                  </div>

                  <SaveButton saving={saving} onClick={() => saveMap(seo)} />
                </div>
              )}

              {/* ── INTEGRACIONES ────────────────────────────────────────────── */}
              {tab === 'integraciones' && (
                <div className="space-y-5">
                  <IntegCard
                    icon="data_exploration"
                    iconBg="bg-orange-50"
                    iconColor="text-orange-500"
                    title="Google Tag Manager"
                    desc="Agrega el ID de tu contenedor GTM para gestionar todas tus etiquetas de marketing."
                    linkText="Ir a GTM"
                    linkHref="https://tagmanager.google.com"
                  >
                    <Field label="GTM ID" hint="Formato: GTM-XXXXXXX">
                      <input
                        value={integ.gtm_id}
                        onChange={e => setInteg(p => ({ ...p, gtm_id: e.target.value.trim() }))}
                        placeholder="GTM-XXXXXXX"
                        className={inputCls}
                      />
                    </Field>
                  </IntegCard>

                  <IntegCard
                    icon="analytics"
                    iconBg="bg-blue-50"
                    iconColor="text-blue-500"
                    title="Google Analytics 4"
                    desc="ID de medición para seguir el comportamiento de usuarios en tu sitio."
                    linkText="Ir a Analytics"
                    linkHref="https://analytics.google.com"
                  >
                    <Field label="Measurement ID" hint="Formato: G-XXXXXXXXXX">
                      <input
                        value={integ.analytics_id}
                        onChange={e => setInteg(p => ({ ...p, analytics_id: e.target.value.trim() }))}
                        placeholder="G-XXXXXXXXXX"
                        className={inputCls}
                      />
                    </Field>
                  </IntegCard>

                  <IntegCard
                    icon="thumb_up"
                    iconBg="bg-indigo-50"
                    iconColor="text-indigo-500"
                    title="Facebook Pixel"
                    desc="ID del píxel para rastrear conversiones y crear audiencias en Meta Ads."
                    linkText="Ir a Meta"
                    linkHref="https://business.facebook.com/events_manager"
                  >
                    <Field label="Pixel ID" hint="Número de 15–16 dígitos">
                      <input
                        value={integ.facebook_pixel_id}
                        onChange={e => setInteg(p => ({ ...p, facebook_pixel_id: e.target.value.trim() }))}
                        placeholder="1234567890123456"
                        className={inputCls}
                      />
                    </Field>
                  </IntegCard>

                  <SaveButton saving={saving} onClick={() => saveMap(integ)} />
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

// ─── Shared UI helpers ────────────────────────────────────────────────────────

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition'

function Field({ label, hint, required, children }: {
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

function SaveButton({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return (
    <div className="flex justify-end pt-1">
      <button
        onClick={onClick}
        disabled={saving}
        className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-colors shadow-sm disabled:opacity-60"
      >
        {saving ? (
          <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
        ) : (
          <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>save</span>
        )}
        {saving ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </div>
  )
}

function IntegCard({
  icon, iconBg, iconColor, title, desc, linkText, linkHref, children,
}: {
  icon: string; iconBg: string; iconColor: string
  title: string; desc: string; linkText: string; linkHref: string
  children: ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center shrink-0 mt-0.5`}>
            <span className={`material-symbols-outlined text-lg ${iconColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-sm">{title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
          </div>
        </div>
        <a
          href={linkHref}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-xs font-semibold text-brand-500 hover:text-brand-700 flex items-center gap-0.5"
        >
          {linkText}
          <span className="material-symbols-outlined text-sm">open_in_new</span>
        </a>
      </div>
      {children}
    </div>
  )
}
