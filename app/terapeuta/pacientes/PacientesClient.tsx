'use client'

/**
 * PacientesClient.tsx (Terapeuta)
 * ─────────────────────────────────────────────────────────────
 * F3 — Vista de "Mis Pacientes" (Terapeuta)
 *
 * A diferencia de la versión de Secretaria, esta vista es de
 * SOLO LECTURA: el terapeuta no puede crear, editar, dar de baja
 * ni reactivar pacientes — esas acciones son exclusivas de
 * Secretaria/Admin. La lista que llega por props ya viene
 * filtrada en el servidor por terapeuta_id = auth.uid().
 *
 * Se mantiene el mismo lenguaje visual y de interacción
 * (búsqueda, filtros, animaciones, estilo de tabla) para
 * consistencia con el resto del sistema.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'

// ── TIPOS ────────────────────────────────────────────────────
interface Paciente {
  id_paciente: number
  nombre_completo: string
  curp: string
  telefono?: string
  fecha_nacimiento: string
  domicilio?: string
  contacto_emergencia?: string
  activo: boolean
  created_at: string
  terapeuta_id: string
}
interface Props {
  pacientesIniciales: Paciente[]
  userNombre: string
}

function calcularEdad(fechaNacimiento?: string) {
  if (!fechaNacimiento) return null
  const hoy = new Date()
  const nacimiento = new Date(fechaNacimiento)
  let edad = hoy.getFullYear() - nacimiento.getFullYear()
  const mesDiff = hoy.getMonth() - nacimiento.getMonth()
  if (mesDiff < 0 || (mesDiff === 0 && hoy.getDate() < nacimiento.getDate())) edad--
  return edad
}

// ── COMPONENTE PRINCIPAL ─────────────────────────────────────
export default function PacientesClient({ pacientesIniciales, userNombre }: Props) {

  // ── ESTADO (solo UI — no hay mutaciones a la BD) ─────────────
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'todos'|'activo'|'inactivo'>('activo')
  const [scrolled, setScrolled] = useState(false)

  const pacientes = pacientesIniciales

  // ── EVENTO SCROLL — cambiar apariencia topbar ────────────────
  useEffect(() => {
    const el = document.getElementById('main-content')
    if (!el) return
    const handler = () => setScrolled(el.scrollTop > 20)
    el.addEventListener('scroll', handler)
    return () => el.removeEventListener('scroll', handler)
  }, [])

  // ── FILTRO DINÁMICO (en memoria — solo lectura) ──────────────
  const pacientesFiltrados = pacientes.filter(p => {
    const matchBusqueda = p.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) ||
                          (p.curp ?? '').toLowerCase().includes(busqueda.toLowerCase())
    const matchEstado = filtroEstado === 'todos' ? true :
                        filtroEstado === 'activo' ? p.activo : !p.activo
    return matchBusqueda && matchEstado
  })

  // ── RENDER ───────────────────────────────────────────────────
  return (
    <>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --bg:#060B14;--sidebar:#0A1220;--card:rgba(255,255,255,0.035);--card-border:rgba(255,255,255,0.09);
          --border:rgba(255,255,255,0.09);--surface2:rgba(255,255,255,0.07);
          --blue:#2563EB;--blue-2:#3B82F6;--cyan:#38BDF8;
          --text:#E7EDF7;--muted:#8C9BB5;
          --red:#F25555;--amber:#F5B400;--green:#34D399;
        }
        body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex}

        /* SIDEBAR */
        .sidebar{width:260px;min-height:100vh;background:var(--sidebar);border-right:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0}
        .sb-brand{padding:20px 20px 16px;border-bottom:1px solid var(--border)}
        .sb-logo-row{display:flex;align-items:center;gap:10px}
        .sb-logo{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,var(--blue),var(--cyan));display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;box-shadow:0 0 18px rgba(56,189,248,0.3)}
        .sb-name{font-size:14px;font-weight:700;color:var(--text);letter-spacing:-0.01em}
        .sb-ver{font-size:10px;color:var(--muted)}
        .sb-role{margin:12px 12px 4px;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:10px}
        .sb-role-icon{width:32px;height:32px;border-radius:9px;background:rgba(56,189,248,0.14);border:1px solid rgba(56,189,248,0.25);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
        .sb-role-name{font-size:13px;font-weight:600;color:var(--text)}
        .sb-role-sub{font-size:11px;color:var(--cyan)}
        .sb-nav{flex:1;padding:8px 10px}
        .sb-nav a{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;font-size:14px;font-weight:500;color:var(--muted);text-decoration:none;transition:all .18s;margin-bottom:2px}
        .sb-nav a:hover{background:var(--surface2);color:var(--text)}
        .sb-nav a.active{background:linear-gradient(135deg,rgba(37,99,235,0.18),rgba(56,189,248,0.12));color:var(--cyan);box-shadow:inset 0 0 0 1px rgba(56,189,248,0.2)}
        .sb-nav-icon{font-size:16px;width:20px;text-align:center}
        .sb-bottom{padding:12px 10px;border-top:1px solid var(--border)}
        .sb-bottom a{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;font-size:14px;font-weight:500;color:var(--muted);text-decoration:none;transition:color .18s}
        .sb-bottom a:hover{color:var(--red)}

        /* MAIN */
        .main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
        .topbar{height:56px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 28px;flex-shrink:0;transition:background .3s}
        .topbar.scrolled{background:rgba(10,18,32,0.92);backdrop-filter:blur(12px)}
        .topbar-title{font-size:14px;color:var(--muted);font-weight:500}
        .topbar-right{display:flex;align-items:center;gap:16px}
        .online-dot{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--cyan);font-weight:500}
        .dot{width:7px;height:7px;border-radius:50%;background:var(--cyan);box-shadow:0 0 8px var(--cyan)}
        .notif{width:32px;height:32px;border-radius:9px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:15px;transition:background .18s}
        .notif:hover{background:var(--surface2)}
        .content{flex:1;overflow-y:auto;padding:28px}

        /* PAGE HEADER */
        .page-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;flex-wrap:wrap;gap:12px}
        .page-title{font-size:26px;font-weight:800;color:var(--text);letter-spacing:-0.015em}
        .page-sub{font-size:14px;color:var(--muted);margin-top:4px}
        .readonly-pill{display:flex;align-items:center;gap:6px;background:rgba(56,189,248,0.1);border:1px solid rgba(56,189,248,0.25);border-radius:100px;padding:7px 14px;font-size:12px;font-weight:600;color:var(--cyan)}

        /* SEARCH + FILTROS */
        .filters{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap}
        .search-wrap{flex:1;min-width:220px;position:relative}
        .search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:14px;color:var(--muted)}
        .search-input{width:100%;background:var(--card);border:1px solid var(--card-border);border-radius:10px;padding:10px 12px 10px 34px;font-size:14px;font-family:'Inter',sans-serif;color:var(--text);outline:none;transition:border-color .2s}
        .search-input:focus{border-color:var(--cyan)}
        .search-input::placeholder{color:var(--muted)}
        .filter-tabs{display:flex;gap:6px}
        .filter-tab{background:var(--card);border:1px solid var(--card-border);border-radius:9px;padding:8px 14px;font-size:13px;font-weight:500;color:var(--muted);cursor:pointer;font-family:'Inter',sans-serif;transition:all .18s}
        .filter-tab:hover{border-color:rgba(56,189,248,0.35);color:var(--text)}
        .filter-tab.active{background:rgba(56,189,248,0.14);border-color:rgba(56,189,248,0.4);color:var(--cyan)}

        /* STATS ROW */
        .stats-row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}
        .stat-mini{background:var(--card);border:1px solid var(--card-border);border-radius:13px;padding:16px 18px;display:flex;align-items:center;gap:12px;transition:border-color .2s}
        .stat-mini:hover{border-color:rgba(56,189,248,0.3)}
        .stat-mini-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0}
        .stat-mini-num{font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.01em}
        .stat-mini-lbl{font-size:11px;color:var(--muted)}

        /* TABLA */
        .table-card{background:var(--card);border:1px solid var(--card-border);border-radius:16px;overflow:hidden}
        .table-header-row{display:grid;grid-template-columns:2fr 1fr 1fr 1fr 0.6fr;gap:12px;padding:12px 20px;border-bottom:1px solid var(--border)}
        .th{font-size:11px;font-weight:600;color:var(--muted);letter-spacing:0.07em;text-transform:uppercase}
        .patient-row{display:grid;grid-template-columns:2fr 1fr 1fr 1fr 0.6fr;gap:12px;padding:14px 20px;border-bottom:1px solid var(--border);align-items:center;transition:background .18s;animation:fadeIn .3s ease both;text-decoration:none;color:inherit;cursor:pointer}
        .patient-row:last-child{border-bottom:none}
        .patient-row:hover{background:var(--surface2)}
        .p-avatar{width:36px;height:36px;border-radius:50%;background:rgba(56,189,248,0.18);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--text);flex-shrink:0}
        .p-name{font-size:13px;font-weight:500;color:var(--text)}
        .p-curp{font-size:11px;color:var(--muted);font-family:monospace}
        .td-text{font-size:13px;color:var(--muted)}
        .badge{font-size:11px;font-weight:600;padding:3px 10px;border-radius:100px;display:inline-block}
        .b-green{background:rgba(52,211,153,0.15);color:var(--green)}
        .b-red{background:rgba(242,85,85,0.15);color:var(--red)}
        .chevron{color:var(--muted);font-size:14px;text-align:right}
        .empty-state{padding:60px 20px;text-align:center;color:var(--muted);font-size:14px}

        /* CHATBOT */
        .chatbot-bubble{position:fixed;bottom:28px;right:28px;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--blue),var(--cyan));display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;box-shadow:0 8px 24px rgba(37,99,235,0.4);transition:transform .2s;z-index:50;text-decoration:none}
        .chatbot-bubble:hover{transform:scale(1.08)}

        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }

        @media (max-width: 900px){
          .table-header-row, .patient-row{grid-template-columns:2fr 1fr 0.6fr}
          .th:nth-child(2), .th:nth-child(3), .patient-row > div:nth-child(2), .patient-row > div:nth-child(3){display:none}
        }
      `}</style>

      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="sb-brand">
          <div className="sb-logo-row">
            <div className="sb-logo">RC</div>
            <div><div className="sb-name">RehabControl</div><div className="sb-ver">v2.1</div></div>
          </div>
        </div>
        <div className="sb-role">
          <div className="sb-role-icon">📈</div>
          <div><div className="sb-role-name">Terapeuta</div><div className="sb-role-sub">Acceso Limitado</div></div>
        </div>
        <nav className="sb-nav">
          {[
            {icon:'🏠', label:'Mi Panel',        href:'/terapeuta/dashboard',   active:false},
            {icon:'👥', label:'Mis Pacientes',   href:'/terapeuta/pacientes',   active:true},
            {icon:'📋', label:'Expedientes',      href:'/terapeuta/expedientes', active:false},
            {icon:'📅', label:'Mi Agenda',        href:'/terapeuta/agenda',       active:false},
            {icon:'📊', label:'Progreso',         href:'/terapeuta/progreso',    active:false},
          ].map(n => (
            <Link key={n.label} href={n.href} className={n.active?'active':''}>
              <span className="sb-nav-icon">{n.icon}</span>{n.label}
            </Link>
          ))}
        </nav>
        <div className="sb-bottom">
          <Link href="/login"><span className="sb-nav-icon">→</span> Cerrar Sesión</Link>
        </div>
      </div>

      {/* MAIN */}
      <div className="main">
        <div className={`topbar${scrolled?' scrolled':''}`}>
          <span className="topbar-title">Mis Pacientes</span>
          <div className="topbar-right">
            <div className="online-dot"><div className="dot"/>En línea</div>
            <div className="notif">🔔</div>
          </div>
        </div>

        <div className="content" id="main-content">
          {/* HEADER */}
          <div className="page-header">
            <div>
              <div className="page-title">Mis Pacientes</div>
              <div className="page-sub">Solo ves los pacientes asignados a ti, {userNombre.split(' ')[0]}</div>
            </div>
            <div className="readonly-pill">🔒 Solo lectura</div>
          </div>

          {/* STATS */}
          <div className="stats-row">
            <div className="stat-mini">
              <div className="stat-mini-icon" style={{background:'rgba(56,189,248,0.15)'}}>👥</div>
              <div><div className="stat-mini-num">{pacientes.length}</div><div className="stat-mini-lbl">Total asignados</div></div>
            </div>
            <div className="stat-mini">
              <div className="stat-mini-icon" style={{background:'rgba(52,211,153,0.15)'}}>✅</div>
              <div><div className="stat-mini-num">{pacientes.filter(p=>p.activo).length}</div><div className="stat-mini-lbl">Activos</div></div>
            </div>
            <div className="stat-mini">
              <div className="stat-mini-icon" style={{background:'rgba(242,85,85,0.12)'}}>🚫</div>
              <div><div className="stat-mini-num">{pacientes.filter(p=>!p.activo).length}</div><div className="stat-mini-lbl">Inactivos</div></div>
            </div>
          </div>

          {/* BÚSQUEDA Y FILTROS */}
          <div className="filters">
            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              <input
                className="search-input"
                placeholder="Buscar por nombre o CURP..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
            </div>
            <div className="filter-tabs">
              {(['todos','activo','inactivo'] as const).map(f => (
                <button
                  key={f}
                  className={`filter-tab${filtroEstado===f?' active':''}`}
                  onClick={() => setFiltroEstado(f)}
                >
                  {f.charAt(0).toUpperCase()+f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* TABLA — solo lectura, cada fila navega al expediente */}
          <div className="table-card">
            <div className="table-header-row">
              <div className="th">Paciente</div>
              <div className="th">Teléfono</div>
              <div className="th">Edad</div>
              <div className="th">Estado</div>
              <div className="th"></div>
            </div>

            {pacientesFiltrados.length === 0 && (
              <div className="empty-state">
                {busqueda ? `Sin resultados para "${busqueda}"` : 'No tienes pacientes asignados aún'}
              </div>
            )}

            {pacientesFiltrados.map((p, i) => {
              const ini = p.nombre_completo.split(' ').map((w:string)=>w[0]).slice(0,2).join('').toUpperCase()
              const edad = calcularEdad(p.fecha_nacimiento)
              return (
                <Link
                  href={`/terapeuta/expedientes/${p.id_paciente}`}
                  className="patient-row"
                  key={p.id_paciente}
                  style={{animationDelay:`${i*40}ms`}}
                >
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div className="p-avatar">{ini}</div>
                    <div>
                      <div className="p-name">{p.nombre_completo}</div>
                      <div className="p-curp">{p.curp}</div>
                    </div>
                  </div>
                  <div className="td-text">{p.telefono ?? '—'}</div>
                  <div className="td-text">{edad !== null ? `${edad} años` : '—'}</div>
                  <div>
                    <span className={`badge ${p.activo?'b-green':'b-red'}`}>
                      {p.activo ? 'Activo' : 'Baja'}
                    </span>
                  </div>
                  <div className="chevron">→</div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      <a href="#" className="chatbot-bubble" title="Asistente RC">💬</a>
    </>
  )
}