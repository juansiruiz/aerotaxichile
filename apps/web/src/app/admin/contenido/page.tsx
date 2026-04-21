'use client'

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import type { ApiResponse } from '@aerotaxi/shared'
import { AdminSidebar } from '@/components/AdminSidebar'
import { CONTENT_DEFAULTS, type FleetPhoto } from '@/lib/site-content'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000'

// ─── Tab types ────────────────────────────────────────────────────────────────

type Tab = 'hero' | 'stats' | 'pasos' | 'servicios' | 'flota' | 'tarifas' | 'testimonios' | 'footer'

const TABS: { key: Tab; icon: string; label: string }[] = [
  { key: 'hero',        icon: 'home',         label: 'Hero'         },
  { key: 'stats',       icon: 'bar_chart',    label: 'Estadísticas' },
  { key: 'pasos',       icon: 'list_alt',     label: 'Cómo funciona'},
  { key: 'servicios',   icon: 'local_taxi',   label: 'Servicios'    },
  { key: 'flota',       icon: 'directions_car', label: 'Flota'      },
  { key: 'tarifas',     icon: 'sell',         label: 'Tarifas'      },
  { key: 'testimonios', icon: 'format_quote', label: 'Testimonios'  },
  { key: 'footer',      icon: 'web',          label: 'CTA & Footer' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContenidoPage() {
  const { user, token, clearAuth, _hasHydrated } = useAuthStore()
  const router = useRouter()

  const [tab, setTab]         = useState<Tab>('hero')
  const [fields, setFields]   = useState<Record<string, string>>({ ...CONTENT_DEFAULTS })
  const [photos, setPhotos]   = useState<FleetPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast]     = useState<{ ok: boolean; msg: string } | null>(null)
  const photoInputRef         = useRef<HTMLInputElement>(null)

  // ── Auth guard ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!_hasHydrated) return
    if (!user || !token) { router.push('/auth/login'); return }
    if (user.role !== 'admin') { router.push('/dashboard'); return }
    load()
  }, [_hasHydrated, user, token]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await api.get<ApiResponse<Record<string, string>>>('/settings', token)
      const s = res.data ?? {}
      setFields(prev => {
        const merged = { ...prev }
        for (const [k, v] of Object.entries(s)) {
          if (typeof v === 'string' && v.trim()) merged[k] = v
        }
        return merged
      })
      try {
        const raw = s['fleet_photos'] ?? '[]'
        setPhotos(JSON.parse(raw) as FleetPhoto[])
      } catch { setPhotos([]) }
    } catch { /* silencioso */ }
    finally { setLoading(false) }
  }, [token])

  // ── Toast ───────────────────────────────────────────────────────────────────

  const showToast = (ok: boolean, msg: string) => {
    setToast({ ok, msg })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Set field ───────────────────────────────────────────────────────────────

  const set = (key: string, value: string) =>
    setFields(prev => ({ ...prev, [key]: value }))

  // ── Save a set of keys ──────────────────────────────────────────────────────

  const saveKeys = async (keys: string[]) => {
    if (!token) return
    setSaving(true)
    try {
      await Promise.all(
        keys.map(k =>
          fields[k]?.trim()
            ? api.patch(`/settings/${k}`, { value: fields[k]!.trim() }, token)
            : Promise.resolve()
        )
      )
      showToast(true, 'Cambios guardados')
    } catch (e) {
      showToast(false, e instanceof Error ? e.message : 'Error al guardar')
    } finally { setSaving(false) }
  }

  // ── Save fleet photos JSON ──────────────────────────────────────────────────

  const savePhotos = async (updated: FleetPhoto[]) => {
    if (!token) return
    setSaving(true)
    try {
      await api.patch('/settings/fleet_photos', { value: JSON.stringify(updated) }, token)
      setPhotos(updated)
      showToast(true, 'Fotos actualizadas')
    } catch (e) {
      showToast(false, e instanceof Error ? e.message : 'Error al guardar fotos')
    } finally { setSaving(false) }
  }

  // ── Upload fleet photo ──────────────────────────────────────────────────────

  const uploadPhoto = async (file: File) => {
    if (!token) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res  = await fetch(`${API_URL}/uploads/fleet-photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      const json = await res.json() as { data?: { url: string }; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Error al subir')
      const newPhoto: FleetPhoto = { url: json.data!.url, caption: '' }
      const updated = [...photos, newPhoto]
      await savePhotos(updated)
    } catch (e) {
      showToast(false, e instanceof Error ? e.message : 'Error al subir foto')
    } finally { setUploading(false) }
  }

  const updateCaption = (index: number, caption: string) => {
    setPhotos(prev => prev.map((p, i) => i === index ? { ...p, caption } : p))
  }

  const removePhoto = async (index: number) => {
    const updated = photos.filter((_, i) => i !== index)
    await savePhotos(updated)
  }

  const saveCaptions = async () => {
    await savePhotos(photos)
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      <AdminSidebar active="contenido" clearAuth={clearAuth} router={router} />

      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between shrink-0 z-40">
          <div>
            <p className="text-xs text-slate-400 font-medium">Editor</p>
            <h1 className="text-xl font-black text-slate-900 leading-tight">Contenido del sitio web</h1>
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
            <a href="/" target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-brand-500 transition-colors">
              <span className="material-symbols-outlined text-base">open_in_new</span>
              Ver sitio
            </a>
          </div>
        </header>

        {/* Tab bar */}
        <div className="bg-white border-b border-slate-100 px-8 shrink-0 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                  tab === t.key
                    ? 'border-brand-500 text-brand-600'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
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
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {loading ? (
            <div className="flex items-center gap-3 py-12 text-slate-400">
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              Cargando contenido…
            </div>
          ) : (
            <div className="max-w-3xl space-y-5">

              {/* ── HERO ──────────────────────────────────────────────────── */}
              {tab === 'hero' && (
                <>
                  <SectionCard title="Sección Hero" desc="El primer bloque visible al entrar al sitio.">
                    <F label="Texto del badge (encima del título)">
                      <input value={fields['hero_badge'] ?? ''} onChange={e => set('hero_badge', e.target.value)}
                        placeholder={CONTENT_DEFAULTS['hero_badge']} className={ic} />
                    </F>
                    <F label="Título principal" hint="Usa [palabra] para resaltar en naranja">
                      <input value={fields['hero_title'] ?? ''} onChange={e => set('hero_title', e.target.value)}
                        placeholder={CONTENT_DEFAULTS['hero_title']} className={ic} />
                      <p className="text-[11px] text-slate-400 mt-1">Ejemplo: <code className="bg-slate-100 px-1 rounded">Tu traslado al [aeropuerto], sin sorpresas</code></p>
                    </F>
                    <F label="Párrafo subtítulo">
                      <textarea rows={3} value={fields['hero_subtitle'] ?? ''} onChange={e => set('hero_subtitle', e.target.value)}
                        placeholder={CONTENT_DEFAULTS['hero_subtitle']} className={`${ic} resize-none`} />
                    </F>
                    <div className="grid grid-cols-3 gap-3">
                      {[1, 2, 3].map(n => (
                        <F key={n} label={`Confianza ${n}`}>
                          <input value={fields[`hero_trust_${n}`] ?? ''} onChange={e => set(`hero_trust_${n}`, e.target.value)}
                            placeholder={CONTENT_DEFAULTS[`hero_trust_${n}`]} className={ic} />
                        </F>
                      ))}
                    </div>
                  </SectionCard>
                  <SaveBtn saving={saving} onClick={() => saveKeys(['hero_badge','hero_title','hero_subtitle','hero_trust_1','hero_trust_2','hero_trust_3'])} />
                </>
              )}

              {/* ── STATS ─────────────────────────────────────────────────── */}
              {tab === 'stats' && (
                <>
                  <SectionCard title="Estadísticas" desc="4 números destacados bajo el hero.">
                    {[1, 2, 3, 4].map(n => (
                      <div key={n} className="grid grid-cols-2 gap-3">
                        <F label={`Número ${n}`}>
                          <input value={fields[`stat_${n}_value`] ?? ''} onChange={e => set(`stat_${n}_value`, e.target.value)}
                            placeholder={CONTENT_DEFAULTS[`stat_${n}_value`]} className={ic} />
                        </F>
                        <F label={`Etiqueta ${n}`}>
                          <input value={fields[`stat_${n}_label`] ?? ''} onChange={e => set(`stat_${n}_label`, e.target.value)}
                            placeholder={CONTENT_DEFAULTS[`stat_${n}_label`]} className={ic} />
                        </F>
                      </div>
                    ))}
                  </SectionCard>
                  <SaveBtn saving={saving} onClick={() => saveKeys([1,2,3,4].flatMap(n => [`stat_${n}_value`,`stat_${n}_label`]))} />
                </>
              )}

              {/* ── PASOS ─────────────────────────────────────────────────── */}
              {tab === 'pasos' && (
                <>
                  <SectionCard title="¿Cómo funciona?" desc="Sección con 3 pasos del proceso.">
                    <div className="grid grid-cols-2 gap-3">
                      <F label="Badge sección">
                        <input value={fields['how_badge'] ?? ''} onChange={e => set('how_badge', e.target.value)}
                          placeholder={CONTENT_DEFAULTS['how_badge']} className={ic} />
                      </F>
                      <F label="Título sección">
                        <input value={fields['how_title'] ?? ''} onChange={e => set('how_title', e.target.value)}
                          placeholder={CONTENT_DEFAULTS['how_title']} className={ic} />
                      </F>
                    </div>
                    {[1, 2, 3].map(n => (
                      <div key={n} className="bg-slate-50 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-black text-slate-500 uppercase tracking-wide">Paso {n}</p>
                        <F label="Título">
                          <input value={fields[`step_${n}_title`] ?? ''} onChange={e => set(`step_${n}_title`, e.target.value)}
                            placeholder={CONTENT_DEFAULTS[`step_${n}_title`]} className={ic} />
                        </F>
                        <F label="Descripción">
                          <textarea rows={2} value={fields[`step_${n}_desc`] ?? ''} onChange={e => set(`step_${n}_desc`, e.target.value)}
                            placeholder={CONTENT_DEFAULTS[`step_${n}_desc`]} className={`${ic} resize-none`} />
                        </F>
                      </div>
                    ))}
                  </SectionCard>
                  <SaveBtn saving={saving} onClick={() => saveKeys(['how_badge','how_title',...[1,2,3].flatMap(n=>[`step_${n}_title`,`step_${n}_desc`])])} />
                </>
              )}

              {/* ── SERVICIOS ─────────────────────────────────────────────── */}
              {tab === 'servicios' && (
                <>
                  <SectionCard title="Nuestros servicios" desc="4 tarjetas de servicios ofrecidos.">
                    <div className="grid grid-cols-2 gap-3">
                      <F label="Badge sección">
                        <input value={fields['services_badge'] ?? ''} onChange={e => set('services_badge', e.target.value)}
                          placeholder={CONTENT_DEFAULTS['services_badge']} className={ic} />
                      </F>
                      <F label="Título sección">
                        <input value={fields['services_title'] ?? ''} onChange={e => set('services_title', e.target.value)}
                          placeholder={CONTENT_DEFAULTS['services_title']} className={ic} />
                      </F>
                    </div>
                    {[1, 2, 3, 4].map(n => (
                      <div key={n} className="bg-slate-50 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-black text-slate-500 uppercase tracking-wide">Servicio {n}</p>
                        <F label="Título">
                          <input value={fields[`service_${n}_title`] ?? ''} onChange={e => set(`service_${n}_title`, e.target.value)}
                            placeholder={CONTENT_DEFAULTS[`service_${n}_title`]} className={ic} />
                        </F>
                        <F label="Descripción">
                          <textarea rows={2} value={fields[`service_${n}_desc`] ?? ''} onChange={e => set(`service_${n}_desc`, e.target.value)}
                            placeholder={CONTENT_DEFAULTS[`service_${n}_desc`]} className={`${ic} resize-none`} />
                        </F>
                      </div>
                    ))}
                  </SectionCard>
                  <SaveBtn saving={saving} onClick={() => saveKeys(['services_badge','services_title',...[1,2,3,4].flatMap(n=>[`service_${n}_title`,`service_${n}_desc`])])} />
                </>
              )}

              {/* ── FLOTA ─────────────────────────────────────────────────── */}
              {tab === 'flota' && (
                <>
                  {/* Text fields */}
                  <SectionCard title="Textos de flota" desc="Títulos y datos de los 4 tipos de vehículo.">
                    <div className="grid grid-cols-3 gap-3">
                      <F label="Badge"><input value={fields['fleet_badge'] ?? ''} onChange={e => set('fleet_badge', e.target.value)} placeholder={CONTENT_DEFAULTS['fleet_badge']} className={ic} /></F>
                      <F label="Título"><input value={fields['fleet_title'] ?? ''} onChange={e => set('fleet_title', e.target.value)} placeholder={CONTENT_DEFAULTS['fleet_title']} className={ic} /></F>
                      <F label="Subtítulo"><input value={fields['fleet_subtitle'] ?? ''} onChange={e => set('fleet_subtitle', e.target.value)} placeholder={CONTENT_DEFAULTS['fleet_subtitle']} className={ic} /></F>
                    </div>
                    {[1, 2, 3, 4].map(n => (
                      <div key={n} className="bg-slate-50 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-black text-slate-500 uppercase tracking-wide">Vehículo {n}</p>
                        <div className="grid grid-cols-2 gap-3">
                          <F label="Nombre"><input value={fields[`fleet_${n}_name`] ?? ''} onChange={e => set(`fleet_${n}_name`, e.target.value)} placeholder={CONTENT_DEFAULTS[`fleet_${n}_name`]} className={ic} /></F>
                          <F label="Capacidad"><input value={fields[`fleet_${n}_capacity`] ?? ''} onChange={e => set(`fleet_${n}_capacity`, e.target.value)} placeholder={CONTENT_DEFAULTS[`fleet_${n}_capacity`]} className={ic} /></F>
                          <F label="Precio"><input value={fields[`fleet_${n}_price`] ?? ''} onChange={e => set(`fleet_${n}_price`, e.target.value)} placeholder={CONTENT_DEFAULTS[`fleet_${n}_price`]} className={ic} /></F>
                          <F label="Descripción"><input value={fields[`fleet_${n}_desc`] ?? ''} onChange={e => set(`fleet_${n}_desc`, e.target.value)} placeholder={CONTENT_DEFAULTS[`fleet_${n}_desc`]} className={ic} /></F>
                        </div>
                      </div>
                    ))}
                  </SectionCard>
                  <SaveBtn saving={saving} onClick={() => saveKeys(['fleet_badge','fleet_title','fleet_subtitle',...[1,2,3,4].flatMap(n=>[`fleet_${n}_name`,`fleet_${n}_capacity`,`fleet_${n}_price`,`fleet_${n}_desc`])])} />

                  {/* Photo gallery */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-black text-slate-900 text-sm">Galería de fotos — Flota</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Las primeras 4 fotos reemplazan el fondo degradado de cada tarjeta de vehículo.
                          Las fotos adicionales se muestran en una galería debajo.
                        </p>
                      </div>
                      <button
                        onClick={() => photoInputRef.current?.click()}
                        disabled={uploading}
                        className="shrink-0 flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
                      >
                        {uploading
                          ? <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                          : <span className="material-symbols-outlined text-base">add_photo_alternate</span>
                        }
                        {uploading ? 'Subiendo…' : 'Agregar foto'}
                      </button>
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) { uploadPhoto(f); e.target.value = '' } }}
                      />
                    </div>

                    {photos.length === 0 ? (
                      <div
                        onClick={() => photoInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-200 rounded-xl py-12 text-center cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-all group"
                      >
                        <span className="material-symbols-outlined text-4xl text-slate-300 group-hover:text-brand-400 block mb-2 transition-colors">add_photo_alternate</span>
                        <p className="text-sm text-slate-400 font-medium">Haz clic para subir la primera foto</p>
                        <p className="text-xs text-slate-300 mt-1">PNG, JPG, WebP · máx 5 MB</p>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                          {photos.map((photo, idx) => (
                            <div key={idx} className="group relative rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
                              {/* Index badge */}
                              <div className={`absolute top-2 left-2 z-10 text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                                idx < 4 ? 'bg-brand-500 text-white' : 'bg-slate-700 text-white'
                              }`}>
                                {idx < 4 ? `V${idx + 1}` : `+${idx - 3}`}
                              </div>
                              {/* Delete */}
                              <button
                                onClick={() => removePhoto(idx)}
                                className="absolute top-2 right-2 z-10 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                              >
                                <span className="material-symbols-outlined text-xs">close</span>
                              </button>
                              {/* Photo */}
                              <div className="h-28 overflow-hidden">
                                <img src={photo.url} alt={photo.caption || `Foto ${idx + 1}`}
                                  className="w-full h-full object-cover" />
                              </div>
                              {/* Caption */}
                              <div className="p-2">
                                <input
                                  value={photo.caption}
                                  onChange={e => updateCaption(idx, e.target.value)}
                                  placeholder="Descripción (opcional)"
                                  className="w-full text-xs bg-transparent border-b border-slate-200 focus:border-brand-400 focus:outline-none py-0.5 text-slate-700 placeholder-slate-300"
                                />
                              </div>
                            </div>
                          ))}

                          {/* Add more */}
                          <button
                            onClick={() => photoInputRef.current?.click()}
                            className="h-full min-h-[120px] border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-300 hover:border-brand-300 hover:text-brand-400 transition-all"
                          >
                            <span className="material-symbols-outlined text-2xl mb-1">add</span>
                            <span className="text-xs font-semibold">Agregar</span>
                          </button>
                        </div>

                        <div className="flex justify-end">
                          <button
                            onClick={saveCaptions}
                            disabled={saving}
                            className="flex items-center gap-1.5 text-sm font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
                          >
                            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>save</span>
                            Guardar descripciones
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              {/* ── TARIFAS ───────────────────────────────────────────────── */}
              {tab === 'tarifas' && (
                <>
                  <SectionCard title="Sección Tarifas" desc="Encabezados de la sección de precios por zona.">
                    <div className="grid grid-cols-2 gap-3">
                      <F label="Badge"><input value={fields['pricing_badge'] ?? ''} onChange={e => set('pricing_badge', e.target.value)} placeholder={CONTENT_DEFAULTS['pricing_badge']} className={ic} /></F>
                      <F label="Título"><input value={fields['pricing_title'] ?? ''} onChange={e => set('pricing_title', e.target.value)} placeholder={CONTENT_DEFAULTS['pricing_title']} className={ic} /></F>
                    </div>
                    <F label="Descripción">
                      <textarea rows={2} value={fields['pricing_desc'] ?? ''} onChange={e => set('pricing_desc', e.target.value)} placeholder={CONTENT_DEFAULTS['pricing_desc']} className={`${ic} resize-none`} />
                    </F>
                    <F label="Texto botón CTA">
                      <input value={fields['pricing_cta'] ?? ''} onChange={e => set('pricing_cta', e.target.value)} placeholder={CONTENT_DEFAULTS['pricing_cta']} className={ic} />
                    </F>
                  </SectionCard>
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 flex gap-3">
                    <span className="material-symbols-outlined text-blue-500 text-xl shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                    <p className="text-sm text-blue-700">Los precios por zona se editan en <a href="/admin/zonas" className="font-bold underline">Zonas y Tarifas</a>.</p>
                  </div>
                  <SaveBtn saving={saving} onClick={() => saveKeys(['pricing_badge','pricing_title','pricing_desc','pricing_cta'])} />
                </>
              )}

              {/* ── TESTIMONIOS ───────────────────────────────────────────── */}
              {tab === 'testimonios' && (
                <>
                  <SectionCard title="Testimonios de clientes" desc="3 reseñas visibles en el sitio.">
                    <div className="grid grid-cols-2 gap-3">
                      <F label="Badge"><input value={fields['testimonials_badge'] ?? ''} onChange={e => set('testimonials_badge', e.target.value)} placeholder={CONTENT_DEFAULTS['testimonials_badge']} className={ic} /></F>
                      <F label="Título"><input value={fields['testimonials_title'] ?? ''} onChange={e => set('testimonials_title', e.target.value)} placeholder={CONTENT_DEFAULTS['testimonials_title']} className={ic} /></F>
                    </div>
                    {[1, 2, 3].map(n => (
                      <div key={n} className="bg-slate-50 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-black text-slate-500 uppercase tracking-wide">Testimonio {n}</p>
                        <div className="grid grid-cols-3 gap-3">
                          <F label="Nombre"><input value={fields[`testimonial_${n}_name`] ?? ''} onChange={e => set(`testimonial_${n}_name`, e.target.value)} placeholder={CONTENT_DEFAULTS[`testimonial_${n}_name`]} className={ic} /></F>
                          <F label="Ciudad / Sector"><input value={fields[`testimonial_${n}_location`] ?? ''} onChange={e => set(`testimonial_${n}_location`, e.target.value)} placeholder={CONTENT_DEFAULTS[`testimonial_${n}_location`]} className={ic} /></F>
                          <F label="Iniciales (avatar)"><input value={fields[`testimonial_${n}_initials`] ?? ''} onChange={e => set(`testimonial_${n}_initials`, e.target.value)} placeholder={CONTENT_DEFAULTS[`testimonial_${n}_initials`]} maxLength={2} className={ic} /></F>
                        </div>
                        <F label="Texto del testimonio">
                          <textarea rows={3} value={fields[`testimonial_${n}_text`] ?? ''} onChange={e => set(`testimonial_${n}_text`, e.target.value)} placeholder={CONTENT_DEFAULTS[`testimonial_${n}_text`]} className={`${ic} resize-none`} />
                        </F>
                      </div>
                    ))}
                  </SectionCard>
                  <SaveBtn saving={saving} onClick={() => saveKeys(['testimonials_badge','testimonials_title',...[1,2,3].flatMap(n=>[`testimonial_${n}_name`,`testimonial_${n}_location`,`testimonial_${n}_initials`,`testimonial_${n}_text`])])} />
                </>
              )}

              {/* ── FOOTER ────────────────────────────────────────────────── */}
              {tab === 'footer' && (
                <>
                  <SectionCard title="Llamado a la acción (CTA Final)" desc="Sección naranja antes del footer.">
                    <F label="Título">
                      <input value={fields['cta_title'] ?? ''} onChange={e => set('cta_title', e.target.value)} placeholder={CONTENT_DEFAULTS['cta_title']} className={ic} />
                    </F>
                    <F label="Subtítulo">
                      <input value={fields['cta_subtitle'] ?? ''} onChange={e => set('cta_subtitle', e.target.value)} placeholder={CONTENT_DEFAULTS['cta_subtitle']} className={ic} />
                    </F>
                    <div className="grid grid-cols-2 gap-3">
                      <F label="Texto botón principal">
                        <input value={fields['cta_btn1'] ?? ''} onChange={e => set('cta_btn1', e.target.value)} placeholder={CONTENT_DEFAULTS['cta_btn1']} className={ic} />
                      </F>
                      <F label="Número WhatsApp (solo dígitos)">
                        <input value={fields['cta_whatsapp'] ?? ''} onChange={e => set('cta_whatsapp', e.target.value)} placeholder={CONTENT_DEFAULTS['cta_whatsapp']} className={ic} />
                      </F>
                    </div>
                  </SectionCard>

                  <SectionCard title="Footer" desc="Datos de contacto y redes sociales en el pie de página.">
                    <F label="Descripción de la empresa">
                      <textarea rows={2} value={fields['footer_desc'] ?? ''} onChange={e => set('footer_desc', e.target.value)} placeholder={CONTENT_DEFAULTS['footer_desc']} className={`${ic} resize-none`} />
                    </F>
                    <div className="grid grid-cols-2 gap-3">
                      <F label="Teléfono visible">
                        <input value={fields['footer_phone'] ?? ''} onChange={e => set('footer_phone', e.target.value)} placeholder={CONTENT_DEFAULTS['footer_phone']} className={ic} />
                      </F>
                      <F label="WhatsApp (solo dígitos)">
                        <input value={fields['footer_whatsapp'] ?? ''} onChange={e => set('footer_whatsapp', e.target.value)} placeholder={CONTENT_DEFAULTS['footer_whatsapp']} className={ic} />
                      </F>
                      <F label="Dirección">
                        <input value={fields['footer_address'] ?? ''} onChange={e => set('footer_address', e.target.value)} placeholder={CONTENT_DEFAULTS['footer_address']} className={ic} />
                      </F>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <F label="URL Instagram">
                        <input value={fields['footer_instagram'] ?? ''} onChange={e => set('footer_instagram', e.target.value)} placeholder="https://instagram.com/aerotaxichile" className={ic} />
                      </F>
                      <F label="URL Facebook">
                        <input value={fields['footer_facebook'] ?? ''} onChange={e => set('footer_facebook', e.target.value)} placeholder="https://facebook.com/aerotaxichile" className={ic} />
                      </F>
                    </div>
                  </SectionCard>
                  <SaveBtn saving={saving} onClick={() => saveKeys(['cta_title','cta_subtitle','cta_btn1','cta_whatsapp','footer_desc','footer_phone','footer_whatsapp','footer_address','footer_instagram','footer_facebook'])} />
                </>
              )}

            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

const ic = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition'

function F({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</label>
        {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function SectionCard({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
      <div className="mb-1">
        <h3 className="font-black text-slate-900 text-sm">{title}</h3>
        {desc && <p className="text-xs text-slate-400 mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  )
}

function SaveBtn({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return (
    <div className="flex justify-end">
      <button
        onClick={onClick}
        disabled={saving}
        className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-colors shadow-sm disabled:opacity-60"
      >
        {saving
          ? <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
          : <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>save</span>
        }
        {saving ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </div>
  )
}
