'use client'

/**
 * ExpedientesIndexClient.tsx
 * ─────────────────────────────────────────────────────────────
 * Índice de "Expedientes" (Terapeuta) — tarjetas tipo "carpeta
 * clínica": pestaña de color por estado, cuerpo con info del
 * paciente, pie con metadata de actividad. Pensado para que se
 * SIENTA distinto a una lista de personas (Mis Pacientes).
 */

import { useState } from 'react'
import Link from 'next/link'

interface Paciente {
  id_paciente: number
  nombre_completo: string
  curp: string
  telefono?: string
  activo: boolean
}
interface Expediente {
  id_expediente: number
  paciente_id: number
  estado: 'activo' | 'cerrado' | 'en_revision'
  updated_at?: string
  fecha_apertura: string
}
interface Props {
  pacientes: Paciente[]
  expedientes: Expediente[]
  userNombre: string
}

const ESTADO_INFO: Record<string, { label: string; tabClass: string; badgeClass: string }> = {
  activo:      { label: 'Activo',      tabClass: 'tab-green', badgeClass: 'badge-green' },
  en_revision: { label: 'En revisión', tabClass: 'tab-amber', badgeClass: 'badge-amber' },
  cerrado:     { label: 'Cerrado',     tabClass: 'tab-gray',  badgeClass: 'badge-gray'  },
}

function tiempoRelativo(iso: string) {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (dias <= 0) return 'Hoy'
  if (dias === 1) return 'Ayer'
  if (dias < 7) return `Hace ${dias} días`
  if (dias < 30) return `Hace ${Math.floor(dias/7)} sem`
  return `Hace ${Math.floor(dias/30)} meses`
}

export default function ExpedientesIndexClient({ pacientes, expedientes, userNombre }: Props) {
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<'todos'|'activo'|'en_revision'|'cerrado'|'sin_crear'>('todos')

  const expedientePorPaciente = new Map(expedientes.map(e => [e.paciente_id, e]))

  const conExpediente = pacientes.filter(p => expedientePorPaciente.has(p.id_paciente)).length
  const sinExpediente = pacientes.length - conExpediente
  const activos = expedientes.filter(e => e.estado === 'activo').length
  const enRevision = expedientes.filter(e => e.estado === 'en_revision').length

  const filtrados = pacientes.filter(p => {
    const exp = expedientePorPaciente.get(p.id_paciente)
    if (filtro === 'sin_crear' && exp) return false
    if (filtro !== 'todos' && filtro !== 'sin_crear' && exp?.estado !== filtro) return false
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      return p.nombre_completo.toLowerCase().includes(q) || (p.curp ?? '').toLowerCase().includes(q)
    }
    return true
  })

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --bg:#060B14;--sidebar:#0A1220;--card:#0F1B2E;--card-border:rgba(255,255,255,0.08);
          --border:rgba(255,255,255,0.08);--surface2:rgba(255,255,255,0.05);
          --mid:#2563EB;--light:#38BDF8;--text:#E7EDF7;--muted:rgba(140,155,181,0.85);
          --red:#F25555;--amber:#F5B400;--green:#34D399;--gray:#8C9BB5;
        }
        body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex}

        .sidebar{width:248px;min-height:100vh;background:var(--sidebar);border-right:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0}
        .sb-brand{padding:22px 20px 16px;border-bottom:1px solid var(--border)}
        .sb-logo-row{display:flex;align-items:center;gap:10px}
        .sb-logo{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,var(--mid),var(--light));display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:700;color:#fff}
        .sb-name{font-size:13.5px;font-weight:600;color:var(--text)}
        .sb-ver{font-size:10px;color:var(--muted)}
        .sb-role{margin:14px 14px 6px;padding:11px 13px;display:flex;align-items:center;gap:10px}
        .sb-role-icon{width:28px;height:28px;border-radius:7px;background:rgba(56,189,248,0.12);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0}
        .sb-role-name{font-size:12.5px;font-weight:600;color:var(--text)}
        .sb-role-sub{font-size:10.5px;color:var(--light)}
        .sb-nav{flex:1;padding:6px 12px;margin-top:6px}
        .sb-nav a{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:9px;font-size:13.5px;color:var(--muted);text-decoration:none;transition:all .15s;margin-bottom:1px;font-weight:500}
        .sb-nav a:hover{background:rgba(255,255,255,0.04);color:var(--text)}
        .sb-nav a.active{background:rgba(37,99,235,0.14);color:var(--light)}
        .sb-nav-icon{font-size:15px;width:18px;text-align:center}
        .sb-bottom{padding:12px 12px;border-top:1px solid var(--border)}
        .sb-bottom a{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:9px;font-size:13.5px;color:var(--muted);text-decoration:none;transition:all .15s}
        .sb-bottom a:hover{color:var(--red)}

        .main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
        .topbar{height:52px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:flex-end;padding:0 32px;flex-shrink:0}
        .topbar-right{display:flex;align-items:center;gap:16px}
        .online-dot{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--light)}
        .dot{width:6px;height:6px;border-radius:50%;background:var(--light)}
        .notif{width:30px;height:30px;border-radius:8px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px}
        .content{flex:1;overflow-y:auto;padding:36px 40px}

        .page-title{font-size:28px;font-weight:700;color:var(--text);letter-spacing:-0.02em}
        .page-sub{font-size:13.5px;color:var(--muted);margin-top:6px;margin-bottom:24px}

        /* BARRA DE RESUMEN — bloques de color sólido, no cards sutiles */
        .summary-bar{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:28px}
        .summary-block{border-radius:14px;padding:16px 18px;position:relative;overflow:hidden}
        .summary-block.b-blue{background:rgba(37,99,235,0.14);border:1px solid rgba(37,99,235,0.25)}
        .summary-block.b-green{background:rgba(52,211,153,0.12);border:1px solid rgba(52,211,153,0.25)}
        .summary-block.b-amber{background:rgba(245,180,0,0.12);border:1px solid rgba(245,180,0,0.25)}
        .summary-block.b-gray{background:rgba(140,155,181,0.1);border:1px solid rgba(140,155,181,0.22)}
        .summary-num{font-size:26px;font-weight:800;letter-spacing:-0.02em}
        .summary-block.b-blue .summary-num{color:var(--light)}
        .summary-block.b-green .summary-num{color:var(--green)}
        .summary-block.b-amber .summary-num{color:var(--amber)}
        .summary-block.b-gray .summary-num{color:var(--gray)}
        .summary-lbl{font-size:12px;color:var(--text);margin-top:4px;font-weight:500}

        .toolbar{display:flex;gap:10px;margin-bottom:24px;flex-wrap:wrap;align-items:center}
        .search-wrap{position:relative;flex:1;min-width:200px;max-width:320px}
        .search-icon{position:absolute;left:13px;top:50%;transform:translateY(-50%);font-size:13px;color:var(--muted)}
        .search-input{width:100%;background:var(--card);border:1px solid var(--card-border);border-radius:10px;padding:9px 12px 9px 36px;font-size:13.5px;font-family:'DM Sans',sans-serif;color:var(--text);outline:none;transition:border-color .15s}
        .search-input:focus{border-color:var(--light)}
        .search-input::placeholder{color:var(--muted)}
        .filter-pills{display:flex;gap:6px;flex-wrap:wrap}
        .filter-pill{background:var(--card);border:1px solid var(--card-border);border-radius:100px;padding:7px 14px;font-size:12.5px;font-weight:500;color:var(--muted);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s;display:flex;align-items:center;gap:6px}
        .filter-pill:hover{color:var(--text)}
        .filter-pill.active{background:rgba(56,189,248,0.16);border-color:rgba(56,189,248,0.4);color:var(--light)}
        .pill-dot{width:6px;height:6px;border-radius:50%}

        /* TARJETAS TIPO CARPETA */
        .folder-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .folder-card{position:relative;text-decoration:none;color:inherit;border-radius:14px;overflow:hidden;background:var(--card);border:1px solid var(--card-border);transition:transform .18s,border-color .18s}
        .folder-card:hover{transform:translateY(-3px);border-color:rgba(56,189,248,0.3)}
        .folder-tab{height:6px;width:100%}
        .tab-green{background:var(--green)}
        .tab-amber{background:var(--amber)}
        .tab-gray{background:var(--gray)}
        .tab-dashed{background:repeating-linear-gradient(90deg,var(--muted) 0 8px,transparent 8px 14px)}
        .folder-body{padding:18px 20px 16px}
        .folder-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:14px}
        .p-avatar{width:46px;height:46px;border-radius:12px;background:rgba(37,99,235,0.18);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:var(--light);flex-shrink:0}
        .badge{font-size:10.5px;font-weight:700;padding:4px 10px;border-radius:100px;white-space:nowrap;text-transform:uppercase;letter-spacing:.03em}
        .badge-green{background:rgba(52,211,153,0.16);color:var(--green)}
        .badge-amber{background:rgba(245,180,0,0.16);color:var(--amber)}
        .badge-gray{background:rgba(140,155,181,0.16);color:var(--gray)}
        .badge-dashed{background:none;border:1px dashed var(--border);color:var(--muted)}
        .p-name{font-size:14.5px;font-weight:700;color:var(--text);letter-spacing:-0.005em}
        .p-curp{font-size:11px;color:var(--muted);font-family:monospace;margin-top:3px}
        .folder-footer{border-top:1px solid var(--border);padding:11px 20px;display:flex;align-items:center;justify-content:space-between;background:var(--surface2)}
        .folder-footer-label{font-size:11px;color:var(--muted);display:flex;align-items:center;gap:6px}
        .folder-footer-action{font-size:11.5px;font-weight:600;color:var(--light)}

        .empty-state{padding:60px 20px;text-align:center;color:var(--muted);font-size:14px;background:var(--card);border:1px dashed var(--card-border);border-radius:14px}

        .chatbot-bubble{position:fixed;bottom:28px;right:28px;width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,var(--mid),var(--light));display:flex;align-items:center;justify-content:center;font-size:20px;cursor:pointer;box-shadow:0 4px 16px rgba(37,99,235,0.35);transition:transform .2s;z-index:50;text-decoration:none}
        .chatbot-bubble:hover{transform:scale(1.08)}

        @media (max-width:1000px){ .folder-grid{grid-template-columns:repeat(2,1fr)} .summary-bar{grid-template-columns:repeat(2,1fr)} }
        @media (max-width:640px){ .folder-grid{grid-template-columns:1fr} }
      `}</style>

      <div className="sidebar">
        <div className="sb-brand">
          <div className="sb-logo-row">
            <div className="sb-logo">RC</div>
            <div><div className="sb-name">RehabControl</div><div className="sb-ver">v2.1</div></div>
          </div>
        </div>
        <div className="sb-role">
          <div className="sb-role-icon">📈</div>
          <div><div className="sb-role-name">Terapeuta</div><div className="sb-role-sub">Acceso limitado</div></div>
        </div>
        <nav className="sb-nav">
          {[
            {icon:'🏠', label:'Mi Panel',        href:'/terapeuta/dashboard',   active:false},
            {icon:'👥', label:'Mis Pacientes',   href:'/terapeuta/pacientes',   active:false},
            {icon:'📋', label:'Expedientes',      href:'/terapeuta/expedientes', active:true},
            {icon:'📅', label:'Mi Agenda',        href:'/terapeuta/agenda',      active:false},
            {icon:'📊', label:'Progreso',         href:'/terapeuta/progreso',    active:false},
          ].map(n => (
            <Link key={n.label} href={n.href} className={n.active?'active':''}>
              <span className="sb-nav-icon">{n.icon}</span>{n.label}
            </Link>
          ))}
        </nav>
        <div className="sb-bottom">
          <Link href="/login"><span className="sb-nav-icon">→</span> Cerrar sesión</Link>
        </div>
      </div>

      <div className="main">
        <div className="topbar">
          <div className="topbar-right">
            <div className="online-dot"><div className="dot"/>En línea</div>
            <div className="notif">🔔</div>
          </div>
        </div>

        <div className="content">
          <div className="page-title">Expedientes clínicos</div>
          <div className="page-sub">El archivero de tus pacientes — abre una carpeta para ver, crear o editar su historial</div>

          {/* RESUMEN — bloques de color sólido, no cards neutras */}
          <div className="summary-bar">
            <div className="summary-block b-blue">
              <div className="summary-num">{pacientes.length}</div>
              <div className="summary-lbl">Pacientes asignados</div>
            </div>
            <div className="summary-block b-green">
              <div className="summary-num">{activos}</div>
              <div className="summary-lbl">Expedientes activos</div>
            </div>
            <div className="summary-block b-amber">
              <div className="summary-num">{enRevision}</div>
              <div className="summary-lbl">En revisión</div>
            </div>
            <div className="summary-block b-gray">
              <div className="summary-num">{sinExpediente}</div>
              <div className="summary-lbl">Sin expediente</div>
            </div>
          </div>

          <div className="toolbar">
            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              <input
                className="search-input"
                placeholder="Buscar por nombre o CURP..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
            </div>
            <div className="filter-pills">
              <button className={`filter-pill${filtro==='todos'?' active':''}`} onClick={() => setFiltro('todos')}>Todos</button>
              <button className={`filter-pill${filtro==='activo'?' active':''}`} onClick={() => setFiltro('activo')}><span className="pill-dot" style={{background:'var(--green)'}}/>Activos</button>
              <button className={`filter-pill${filtro==='en_revision'?' active':''}`} onClick={() => setFiltro('en_revision')}><span className="pill-dot" style={{background:'var(--amber)'}}/>En revisión</button>
              <button className={`filter-pill${filtro==='cerrado'?' active':''}`} onClick={() => setFiltro('cerrado')}><span className="pill-dot" style={{background:'var(--gray)'}}/>Cerrados</button>
              <button className={`filter-pill${filtro==='sin_crear'?' active':''}`} onClick={() => setFiltro('sin_crear')}>Sin crear</button>
            </div>
          </div>

          {filtrados.length === 0 ? (
            <div className="empty-state">
              {busqueda ? `Sin resultados para "${busqueda}"` : 'No hay pacientes en este filtro'}
            </div>
          ) : (
            <div className="folder-grid">
              {filtrados.map(p => {
                const exp = expedientePorPaciente.get(p.id_paciente)
                const ini = p.nombre_completo.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()
                const info = exp ? ESTADO_INFO[exp.estado] : null

                return (
                  <Link href={`/terapeuta/expedientes/${p.id_paciente}`} className="folder-card" key={p.id_paciente}>
                    <div className={`folder-tab ${info ? info.tabClass : 'tab-dashed'}`} />
                    <div className="folder-body">
                      <div className="folder-top">
                        <div className="p-avatar">{ini}</div>
                        <span className={`badge ${info ? info.badgeClass : 'badge-dashed'}`}>
                          {info ? info.label : 'Sin crear'}
                        </span>
                      </div>
                      <div className="p-name">{p.nombre_completo}</div>
                      <div className="p-curp">{p.curp}</div>
                    </div>
                    <div className="folder-footer">
                      <span className="folder-footer-label">
                        🕐 {exp ? tiempoRelativo(exp.updated_at ?? exp.fecha_apertura) : 'Sin actividad'}
                      </span>
                      <span className="folder-footer-action">{exp ? 'Abrir →' : 'Crear +'}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <a href="#" className="chatbot-bubble" title="Asistente RC">💬</a>
    </>
  )
}