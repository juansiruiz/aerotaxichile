'use client'

import { useRouter } from 'next/navigation'

// ─── AdminSidebar ─────────────────────────────────────────────────────────────

type ActiveKey = 'dashboard' | 'viajes' | 'clientes' | 'conductores' | 'zonas' | 'contenido' | 'usuarios' | 'configuracion'

export function AdminSidebar({
  active,
  clearAuth,
  router,
}: {
  active: ActiveKey
  clearAuth: () => void
  router: ReturnType<typeof useRouter>
}) {
  const mainLinks = [
    { key: 'dashboard',   href: '/admin',            icon: 'dashboard',  label: 'Dashboard'       },
    { key: 'viajes',      href: '/admin/viajes',      icon: 'local_taxi', label: 'Viajes'          },
    { key: 'clientes',    href: '/admin/clientes',    icon: 'group',      label: 'Clientes'        },
    { key: 'conductores', href: '/admin/conductores', icon: 'drive_eta',  label: 'Conductores'     },
    { key: 'zonas',      href: '/admin/zonas',      icon: 'map',           label: 'Zonas y Tarifas' },
    { key: 'contenido',  href: '/admin/contenido',  icon: 'edit_document', label: 'Contenido Web'   },
  ]

  const sysLinks = [
    { key: 'usuarios',      href: '/admin/usuarios',      icon: 'manage_accounts', label: 'Usuarios'       },
    { key: 'configuracion', href: '/admin/configuracion', icon: 'settings',        label: 'Configuración'  },
  ]

  const NavLink = ({ href, icon, label, linkKey }: { href: string; icon: string; label: string; linkKey: string }) => {
    const isActive = linkKey === active
    return (
      <a
        href={href}
        className={`flex items-center gap-3 pl-5 pr-4 py-2.5 text-sm font-semibold transition-all ${
          isActive
            ? 'bg-brand-500/15 text-brand-400 border-r-2 border-brand-400'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
        }`}
      >
        <span
          className="material-symbols-outlined text-base"
          style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
        >
          {icon}
        </span>
        {label}
      </a>
    )
  }

  return (
    <aside className="w-56 bg-slate-900 flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-white text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
              local_taxi
            </span>
          </div>
          <div>
            <p className="font-black text-white text-sm leading-tight">AeroTaxi</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        <div className="space-y-0.5">
          {mainLinks.map((l) => (
            <NavLink key={l.key} href={l.href} icon={l.icon} label={l.label} linkKey={l.key} />
          ))}
        </div>

        {/* Divider */}
        <div className="mx-5 my-3 border-t border-slate-800" />
        <p className="px-5 pb-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Sistema</p>

        <div className="space-y-0.5">
          {sysLinks.map((l) => (
            <NavLink key={l.key} href={l.href} icon={l.icon} label={l.label} linkKey={l.key} />
          ))}
        </div>
      </nav>

      {/* Logout */}
      <div className="px-5 py-4 border-t border-slate-800">
        <button
          onClick={() => { clearAuth(); router.push('/') }}
          className="flex items-center gap-2 text-slate-500 hover:text-white text-sm font-medium transition-colors w-full"
        >
          <span className="material-symbols-outlined text-base">logout</span>
          Cerrar Sesión
        </button>
      </div>
    </aside>
  )
}
