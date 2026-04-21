'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import type { ApiResponse } from '@aerotaxi/shared'
import {
  MapPin, Home, Briefcase, Star, Plus, Trash2,
  Pencil, Check, X, ArrowLeft, AlertTriangle,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Address {
  id: string
  label: string
  address: string
  comunaDetected: string | null
  zoneId: string | null
  isDefault: boolean
  createdAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function LabelIcon({ label }: { label: string }) {
  if (label === 'Casa')    return <Home size={18} className="text-brand-500" />
  if (label === 'Trabajo') return <Briefcase size={18} className="text-brand-500" />
  return <MapPin size={18} className="text-brand-500" />
}

const LABEL_OPTIONS = ['Casa', 'Trabajo', 'Aeropuerto', 'Otro']

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MisDireccionesPage() {
  const { user, token, _hasHydrated } = useAuthStore()
  const router = useRouter()

  const [addresses,     setAddresses]     = useState<Address[]>([])
  const [loading,       setLoading]       = useState(true)

  // Add form
  const [showAdd,       setShowAdd]       = useState(false)
  const [addLabel,      setAddLabel]      = useState('Casa')
  const [addAddress,    setAddAddress]    = useState('')
  const [addDefault,    setAddDefault]    = useState(false)
  const [addLoading,    setAddLoading]    = useState(false)
  const [addError,      setAddError]      = useState('')

  // Inline edit
  const [editingId,     setEditingId]     = useState<string | null>(null)
  const [editLabel,     setEditLabel]     = useState('')
  const [editAddress,   setEditAddress]   = useState('')
  const [editLoading,   setEditLoading]   = useState(false)
  const [editError,     setEditError]     = useState('')

  // Delete confirm
  const [deletingId,    setDeletingId]    = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // ── Load ─────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await api.get<ApiResponse<Address[]>>('/addresses', token)
      setAddresses(res.data ?? [])
    } catch { /* silencioso */ }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => {
    if (!_hasHydrated) return
    if (!user || !token) { router.push('/auth/login'); return }
    if (user.role !== 'client') { router.push('/dashboard'); return }
    load()
  }, [_hasHydrated, user, token, load, router])

  // ── Add ──────────────────────────────────────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addAddress.trim()) { setAddError('Ingresa una dirección'); return }
    setAddLoading(true)
    setAddError('')
    try {
      await api.post<ApiResponse<Address>>('/addresses', {
        label: addLabel,
        address: addAddress.trim(),
        isDefault: addDefault,
      }, token!)
      setAddAddress('')
      setAddLabel('Casa')
      setAddDefault(false)
      setShowAdd(false)
      await load()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setAddLoading(false)
    }
  }

  // ── Set default ──────────────────────────────────────────────────────────
  const handleSetDefault = async (id: string) => {
    try {
      await api.patch<ApiResponse<Address>>(`/addresses/${id}`, { isDefault: true }, token!)
      await load()
    } catch { /* silencioso */ }
  }

  // ── Open inline edit ─────────────────────────────────────────────────────
  const openEdit = (a: Address) => {
    setEditingId(a.id)
    setEditLabel(a.label)
    setEditAddress(a.address)
    setEditError('')
    setDeletingId(null)
  }

  const handleSaveEdit = async (id: string) => {
    if (!editAddress.trim()) { setEditError('La dirección no puede estar vacía'); return }
    setEditLoading(true)
    setEditError('')
    try {
      await api.patch<ApiResponse<Address>>(`/addresses/${id}`, {
        label: editLabel,
        address: editAddress.trim(),
      }, token!)
      setEditingId(null)
      await load()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Error al actualizar')
    } finally {
      setEditLoading(false)
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeleteLoading(true)
    try {
      await api.delete<ApiResponse<{ deleted: boolean }>>(`/addresses/${id}`, token!)
      setDeletingId(null)
      await load()
    } catch { /* silencioso */ }
    finally { setDeleteLoading(false) }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-black text-slate-900">Mis direcciones</h1>
            <p className="text-xs text-slate-400">Gestiona tus ubicaciones guardadas</p>
          </div>
          <button
            onClick={() => { setShowAdd((v) => !v); setAddError(''); setEditingId(null); setDeletingId(null) }}
            className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            {showAdd ? <X size={15} /> : <Plus size={15} />}
            {showAdd ? 'Cerrar' : 'Agregar'}
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-4">

        {/* ── Add form ─────────────────────────────────────────────────────── */}
        {showAdd && (
          <form
            onSubmit={handleAdd}
            className="bg-white rounded-2xl border-2 border-brand-300 shadow-md p-5 space-y-4"
          >
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Plus size={15} className="text-brand-500" />
              Nueva dirección
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Etiqueta</label>
                <select
                  value={addLabel}
                  onChange={(e) => setAddLabel(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none bg-white"
                >
                  {LABEL_OPTIONS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer pb-1">
                  <input
                    type="checkbox"
                    checked={addDefault}
                    onChange={(e) => setAddDefault(e.target.checked)}
                    className="w-4 h-4 accent-brand-500"
                  />
                  <span className="text-sm text-slate-600 font-medium">Predeterminada</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Dirección completa</label>
              <div className="relative">
                <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={addAddress}
                  onChange={(e) => setAddAddress(e.target.value)}
                  placeholder="Ej: Av. Las Condes 1234, Las Condes"
                  className="w-full pl-8 pr-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>

            {addError && (
              <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-xl px-3 py-2">{addError}</p>
            )}

            <button
              type="submit"
              disabled={addLoading || !addAddress.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              <Check size={15} />
              {addLoading ? 'Guardando…' : 'Guardar dirección'}
            </button>
          </form>
        )}

        {/* ── Address list ─────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : addresses.length === 0 ? (
          <EmptyAddresses onAdd={() => setShowAdd(true)} />
        ) : (
          addresses.map((a) => (
            <AddressCard
              key={a.id}
              address={a}
              isEditing={editingId === a.id}
              isDeleting={deletingId === a.id}
              editLabel={editLabel}       setEditLabel={setEditLabel}
              editAddress={editAddress}   setEditAddress={setEditAddress}
              editLoading={editLoading}   editError={editError}
              deleteLoading={deleteLoading}
              onOpenEdit={() => openEdit(a)}
              onCancelEdit={() => setEditingId(null)}
              onSaveEdit={() => handleSaveEdit(a.id)}
              onSetDefault={() => handleSetDefault(a.id)}
              onRequestDelete={() => { setDeletingId(a.id); setEditingId(null) }}
              onConfirmDelete={() => handleDelete(a.id)}
              onDismissDelete={() => setDeletingId(null)}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ─── Address card ─────────────────────────────────────────────────────────────

interface AddressCardProps {
  address: Address
  isEditing: boolean
  isDeleting: boolean
  editLabel: string
  setEditLabel: (v: string) => void
  editAddress: string
  setEditAddress: (v: string) => void
  editLoading: boolean
  editError: string
  deleteLoading: boolean
  onOpenEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onSetDefault: () => void
  onRequestDelete: () => void
  onConfirmDelete: () => void
  onDismissDelete: () => void
}

function AddressCard({
  address: a,
  isEditing, isDeleting,
  editLabel, setEditLabel, editAddress, setEditAddress,
  editLoading, editError, deleteLoading,
  onOpenEdit, onCancelEdit, onSaveEdit,
  onSetDefault, onRequestDelete, onConfirmDelete, onDismissDelete,
}: AddressCardProps) {
  return (
    <div className={`bg-white rounded-2xl border overflow-hidden shadow-sm transition-shadow hover:shadow-md ${
      a.isDefault ? 'border-brand-300' : 'border-slate-200'
    }`}>
      {/* Top accent line for default */}
      {a.isDefault && <div className="h-1 bg-brand-500" />}

      {/* Card header */}
      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
        <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
          <LabelIcon label={a.label} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-slate-900">{a.label}</p>
            {a.isDefault && (
              <span className="flex items-center gap-1 text-[10px] bg-brand-100 text-brand-700 font-bold px-2 py-0.5 rounded-full">
                <Star size={9} className="fill-brand-500 text-brand-500" />
                Predeterminada
              </span>
            )}
            {a.comunaDetected && (
              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-medium">
                {a.comunaDetected}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">{a.address}</p>
        </div>
      </div>

      {/* ── Action buttons (normal state) ────────────────────────────────── */}
      {!isEditing && !isDeleting && (
        <div className="border-t border-slate-100 px-4 py-2.5 flex items-center gap-2">
          {!a.isDefault && (
            <button
              onClick={onSetDefault}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
            >
              <Star size={13} />
              Predeterminada
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onOpenEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Pencil size={13} />
            Editar
          </button>
          <button
            onClick={onRequestDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={13} />
            Eliminar
          </button>
        </div>
      )}

      {/* ── Inline edit panel ────────────────────────────────────────────── */}
      {isEditing && (
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-4 space-y-3">
          <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Pencil size={12} className="text-brand-500" />
            Editar dirección
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Etiqueta</label>
            <select
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none bg-white"
            >
              {LABEL_OPTIONS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Dirección</label>
            <input
              type="text"
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
              className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none bg-white"
            />
          </div>

          {editError && (
            <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">{editError}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={onSaveEdit}
              disabled={editLoading}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              <Check size={14} />
              {editLoading ? 'Guardando…' : 'Guardar cambios'}
            </button>
            <button
              onClick={onCancelEdit}
              className="px-4 py-2.5 bg-white border-2 border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ──────────────────────────────────────────── */}
      {isDeleting && (
        <div className="border-t border-red-200 bg-red-50 px-4 py-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-800">¿Eliminar esta dirección?</p>
              <p className="text-xs text-red-600 mt-0.5">Esta acción no se puede deshacer.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onConfirmDelete}
              disabled={deleteLoading}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              <Trash2 size={14} />
              {deleteLoading ? 'Eliminando…' : 'Sí, eliminar'}
            </button>
            <button
              onClick={onDismissDelete}
              className="px-4 py-2.5 bg-white border-2 border-red-200 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-100 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyAddresses({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
        <MapPin size={28} className="text-slate-400" />
      </div>
      <p className="text-base font-bold text-slate-700 mb-1">Sin direcciones guardadas</p>
      <p className="text-sm text-slate-400 mb-6">Guarda tus ubicaciones frecuentes para reservar más rápido</p>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm"
      >
        <Plus size={16} />
        Agregar primera dirección
      </button>
    </div>
  )
}
