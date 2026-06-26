'use client'

/**
 * components/Sidebar.tsx
 * Sidebar responsive con menú hamburguesa.
 *
 * Comportamiento:
 *  - Desktop (≥900px): sidebar fijo siempre visible, sin botón hamburguesa
 *  - Móvil/tablet (<900px): sidebar oculto, botón ☰ en topbar lo abre con overlay
 *
 * USO:
 *   import Sidebar, { MenuButton } from '@/app/components/Sidebar'
 *
 *   // En el layout (wrapping div con display:flex):
 *   <Sidebar rol="secretaria" nombre="Secretaria" subRol="Acceso Operativo" icono="📁"
 *     items={[{ icon:'🏠', label:'Panel', href:'/secretaria/dashboard', active:true }]}
 *   />
 *
 *   // En el topbar (solo visible en móvil):
 *   <MenuButton />
 */

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

interface NavItem {
  icon: string
  label: string
  href: string
  active?: boolean
}

interface Props {
  rol: string
  nombre: string
  subRol: string
  icono: string
  items: NavItem[]
  logoutHref?: string
}

export function useMenuToggle() {
  return () => window.dispatchEvent(new CustomEvent('sidebar-toggle'))
}

export default function Sidebar({ rol, nombre, subRol, icono, items, logoutHref = '/login' }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Cerrar al hacer click fuera en móvil
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setMobileOpen(false)
      }
    }
    if (mobileOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [mobileOpen])

  // Escuchar el botón hamburguesa del topbar
  useEffect(() => {
    function handler() { setMobileOpen(a => !a) }
    window.addEventListener('sidebar-toggle', handler)
    return () => window.removeEventListener('sidebar-toggle', handler)
  }, [])

  // Cerrar al navegar en móvil
  function handleNavClick() { setMobileOpen(false) }

  const navContent = (
    <>
      <div className="sb-brand">
        <div className="sb-logo-row">
          <div className="sb-logo">RC</div>
          <div>
            <div className="sb-name">RehabControl</div>
            <div className="sb-ver">v2.1</div>
          </div>
        </div>
      </div>
      <div className="sb-role">
        <div className="sb-role-icon">{icono}</div>
        <div>
          <div className="sb-role-name">{nombre}</div>
          <div className="sb-role-sub">{subRol}</div>
        </div>
      </div>
      <nav className="sb-nav">
        {items.map(n => (
          <Link key={n.label} href={n.href} className={n.active ? 'active' : ''} onClick={handleNavClick}>
            <span className="sb-nav-icon">{n.icon}</span>{n.label}
          </Link>
        ))}
      </nav>
      <div className="sb-bottom">
        <Link href={logoutHref} onClick={handleNavClick}>
          <span className="sb-nav-icon">→</span> Cerrar Sesión
        </Link>
      </div>
    </>
  )

  return (
    <>
      <style>{`
        /* ── DESKTOP: sidebar estático siempre visible ── */
        .sidebar-static {
          width: 260px;
          min-height: 100vh;
          background: var(--sidebar, #0A1220);
          border-right: 1px solid var(--border, rgba(255,255,255,0.09));
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }

        /* ── MÓVIL: overlay + drawer ── */
        .sidebar-overlay {
          display: none;
          position: fixed; inset: 0; z-index: 98;
          background: rgba(0,0,0,0.65);
          backdrop-filter: blur(2px);
          animation: overlayFade .2s ease;
        }
        .sidebar-overlay.visible { display: block; }

        .sidebar-drawer {
          position: fixed; top: 0; left: 0; bottom: 0;
          width: 260px; z-index: 99;
          background: var(--sidebar, #0A1220);
          border-right: 1px solid var(--border, rgba(255,255,255,0.09));
          display: none;
          flex-direction: column;
          transform: translateX(-100%);
          transition: transform .25s cubic-bezier(.4,0,.2,1);
        }
        .sidebar-drawer.open {
          transform: translateX(0);
        }

        /* En móvil, ocultar el estático y mostrar el drawer */
        @media (max-width: 899px) {
          .sidebar-static { display: none !important; }
          .sidebar-drawer { display: flex; }
        }

        @keyframes overlayFade { from{opacity:0} to{opacity:1} }

        /* ── ESTILOS INTERNOS DEL SIDEBAR ── */
        .sb-brand{padding:20px 20px 16px;border-bottom:1px solid var(--border,rgba(255,255,255,0.09))}
        .sb-logo-row{display:flex;align-items:center;gap:10px}
        .sb-logo{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,var(--blue,#2563EB),var(--cyan,#38BDF8));display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;box-shadow:0 0 18px rgba(56,189,248,0.3);flex-shrink:0}
        .sb-name{font-size:14px;font-weight:700;color:var(--text,#E7EDF7);letter-spacing:-0.01em}
        .sb-ver{font-size:10px;color:var(--muted,#8C9BB5)}
        .sb-role{margin:12px 12px 4px;background:var(--card,rgba(255,255,255,0.035));border:1px solid var(--border,rgba(255,255,255,0.09));border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:10px}
        .sb-role-icon{width:32px;height:32px;border-radius:9px;background:rgba(167,139,250,0.15);border:1px solid rgba(167,139,250,0.28);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
        .sb-role-name{font-size:13px;font-weight:600;color:var(--text,#E7EDF7)}
        .sb-role-sub{font-size:11px;color:var(--purple,#A78BFA)}
        .sb-nav{flex:1;padding:8px 10px;overflow-y:auto}
        .sb-nav a{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;font-size:14px;font-weight:500;color:var(--muted,#8C9BB5);text-decoration:none;transition:all .18s;margin-bottom:2px}
        .sb-nav a:hover{background:var(--surface2,rgba(255,255,255,0.07));color:var(--text,#E7EDF7)}
        .sb-nav a.active{background:linear-gradient(135deg,rgba(37,99,235,0.18),rgba(56,189,248,0.12));color:var(--cyan,#38BDF8);box-shadow:inset 0 0 0 1px rgba(56,189,248,0.2)}
        .sb-nav-icon{font-size:16px;width:20px;text-align:center;flex-shrink:0}
        .sb-bottom{padding:12px 10px;border-top:1px solid var(--border,rgba(255,255,255,0.09))}
        .sb-bottom a{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;font-size:14px;font-weight:500;color:var(--muted,#8C9BB5);text-decoration:none;transition:all .18s}
        .sb-bottom a:hover{color:var(--red,#F25555)}
      `}</style>

      {/* DESKTOP — sidebar estático, siempre visible */}
      <div className="sidebar-static">{navContent}</div>

      {/* MÓVIL — overlay + drawer */}
      <div className={`sidebar-overlay${mobileOpen ? ' visible' : ''}`} onClick={() => setMobileOpen(false)} />
      <div ref={sidebarRef} className={`sidebar-drawer${mobileOpen ? ' open' : ''}`}>
        {navContent}
      </div>
    </>
  )
}

/**
 * MenuButton — botón ☰ para el topbar.
 * Solo visible en móvil/tablet (<900px).
 */
export function MenuButton() {
  const toggle = useMenuToggle()
  return (
    <>
      <style>{`
        .menu-btn {
          display: none;
          width: 36px; height: 36px; border-radius: 9px;
          border: 1px solid rgba(255,255,255,0.09);
          background: rgba(255,255,255,0.035);
          align-items: center; justify-content: center;
          cursor: pointer; font-size: 18px;
          color: var(--muted, #8C9BB5);
          transition: all .18s; flex-shrink: 0;
        }
        .menu-btn:hover {
          background: rgba(255,255,255,0.07);
          color: var(--text, #E7EDF7);
        }
        @media (max-width: 899px) {
          .menu-btn { display: flex; }
        }
      `}</style>
      <button className="menu-btn" onClick={toggle} title="Menú">☰</button>
    </>
  )
}
