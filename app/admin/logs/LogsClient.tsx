'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import NotifBell from '@/app/components/NotifBell'
import Sidebar, { MenuButton } from '@/app/components/Sidebar'


interface LogEntry {
  id_logs: number
  accion: string
  tabla_afectada: string
  registro_id: string | null
  ip: string | null
  timestamp: string
  profiles?: { nombre_completo: string; rol: string } | null
}
interface Props { 
  logsIniciales: LogEntry[]
  currentUserId: string  // ← agregar
}


const ACCION_LABELS: Record<string,string> = {
  CREAR_PACIENTE:'Registro de paciente', EDITAR_PACIENTE:'Edición de paciente',
  BAJA_PACIENTE:'Baja de paciente', REACTIVAR_PACIENTE:'Reactivación de paciente',
  CREAR_CITA:'Cita agendada', EDITAR_CITA:'Edición de cita',
  CITA_COMPLETADA:'Cita completada', CITA_CANCELADA:'Cita cancelada', CITA_NO_ASISTIO:'Paciente no asistió',
  REGISTRAR_PAGO:'Registro de pago', COBRAR_PAGO:'Cobro registrado',
  EDITAR_PAGO:'Edición de pago', REEMBOLSAR_PAGO:'Reembolso registrado',
  CAMBIAR_ROL:'Cambio de rol', ACTIVAR_USUARIO:'Activación de usuario', DESACTIVAR_USUARIO:'Desactivación de usuario',
}
const ACCION_ICON: Record<string,string> = {
  CREAR_PACIENTE:'👤', EDITAR_PACIENTE:'✏️', BAJA_PACIENTE:'🚫', REACTIVAR_PACIENTE:'♻️',
  CREAR_CITA:'📅', EDITAR_CITA:'✏️', CITA_COMPLETADA:'✅', CITA_CANCELADA:'❌', CITA_NO_ASISTIO:'⚠️',
  REGISTRAR_PAGO:'💳', COBRAR_PAGO:'💰', EDITAR_PAGO:'✏️', REEMBOLSAR_PAGO:'↩️',
  CAMBIAR_ROL:'🔄', ACTIVAR_USUARIO:'✅', DESACTIVAR_USUARIO:'🔒',
}
const ACCION_COLOR: Record<string,string> = {
  CREAR_PACIENTE:'ld-green', EDITAR_PACIENTE:'ld-blue', BAJA_PACIENTE:'ld-amber', REACTIVAR_PACIENTE:'ld-green',
  CREAR_CITA:'ld-green', EDITAR_CITA:'ld-blue', CITA_COMPLETADA:'ld-green', CITA_CANCELADA:'ld-amber', CITA_NO_ASISTIO:'ld-amber',
  REGISTRAR_PAGO:'ld-blue', COBRAR_PAGO:'ld-green', EDITAR_PAGO:'ld-blue', REEMBOLSAR_PAGO:'ld-purple',
  CAMBIAR_ROL:'ld-purple', ACTIVAR_USUARIO:'ld-green', DESACTIVAR_USUARIO:'ld-red',
}
const TABLA_LABELS: Record<string,string> = {
  pacientes:'Pacientes', citas:'Citas', pagos:'Pagos', profiles:'Usuarios', expedientes:'Expedientes', progreso_sesiones:'Progreso'
}

export default function LogsClient({ logsIniciales, currentUserId }: Props) {
  const [busqueda, setBusqueda] = useState('')
  const [filtroTabla, setFiltroTabla] = useState('todas')

  const tablasDisponibles = useMemo(() => {
    const set = new Set(logsIniciales.map(l => l.tabla_afectada))
    return Array.from(set)
  }, [logsIniciales])

  const logsFiltrados = useMemo(() => {
    return logsIniciales
      .filter(l => filtroTabla==='todas' ? true : l.tabla_afectada===filtroTabla)
      .filter(l => {
        const texto = `${ACCION_LABELS[l.accion] ?? l.accion} ${l.profiles?.nombre_completo ?? ''}`.toLowerCase()
        return texto.includes(busqueda.toLowerCase())
      })
  }, [logsIniciales, filtroTabla, busqueda])

  // Agrupar por día para mostrar separadores
  const grupos = useMemo(() => {
    const map = new Map<string, LogEntry[]>()
    logsFiltrados.forEach(l => {
      const dia = new Date(l.timestamp).toLocaleDateString('es-MX', { weekday:'long', day:'numeric', month:'long' })
      if (!map.has(dia)) map.set(dia, [])
      map.get(dia)!.push(l)
    })
    return Array.from(map.entries())
  }, [logsFiltrados])

  return (
    <>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --bg:#060B14;--sidebar:#0A1220;--card:rgba(255,255,255,0.035);--card-border:rgba(255,255,255,0.09);
          --border:rgba(255,255,255,0.09);--surface2:rgba(255,255,255,0.07);
          --blue:#2563EB;--blue-2:#3B82F6;--cyan:#38BDF8;
          --text:#E7EDF7;--muted:#8C9BB5;
          --red:#F25555;--amber:#F5B400;--green:#34D399;--purple:#A78BFA;
        }
        body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex}

        /* MAIN */
        .main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
        .topbar{height:56px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 28px;flex-shrink:0}
        .topbar-title{font-size:14px;color:var(--muted);font-weight:500}
        .topbar-right{display:flex;align-items:center;gap:16px}
        .online-dot{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--cyan);font-weight:500}
        .dot{width:7px;height:7px;border-radius:50%;background:var(--cyan);box-shadow:0 0 8px var(--cyan)}
        .live-badge{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--cyan);font-weight:500}
        .live-dot{width:6px;height:6px;border-radius:50%;background:var(--cyan);box-shadow:0 0 6px var(--cyan)}
        .notif{width:32px;height:32px;border-radius:9px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:15px;transition:background .18s}
        .notif:hover{background:var(--surface2)}
        .content{flex:1;overflow-y:auto;padding:28px}

        .page-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:12px}
        .page-title{font-size:26px;font-weight:800;color:var(--text);letter-spacing:-0.015em}
        .page-sub{font-size:14px;color:var(--muted);margin-top:4px}
        .note-box{background:rgba(56,189,248,0.06);border:1px solid rgba(56,189,248,0.18);border-radius:12px;padding:14px 16px;margin:20px 0;font-size:13px;color:var(--muted);line-height:1.6}
        .note-box strong{color:var(--cyan)}

        /* FILTROS */
        .filters{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap}
        .search-wrap{flex:1;min-width:220px;position:relative}
        .search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:14px;color:var(--muted)}
        .search-input{width:100%;background:var(--card);border:1px solid var(--card-border);border-radius:10px;padding:10px 12px 10px 34px;font-size:14px;font-family:'Inter',sans-serif;color:var(--text);outline:none;transition:border-color .2s}
        .search-input:focus{border-color:var(--cyan)}
        .search-input::placeholder{color:var(--muted)}
        .filter-tab{background:var(--card);border:1px solid var(--card-border);border-radius:9px;padding:8px 14px;font-size:13px;font-weight:500;color:var(--muted);cursor:pointer;font-family:'Inter',sans-serif;transition:all .18s}
        .filter-tab:hover{border-color:rgba(56,189,248,0.35);color:var(--text)}
        .filter-tab.active{background:rgba(56,189,248,0.14);border-color:rgba(56,189,248,0.4);color:var(--cyan)}

        /* TIMELINE */
        .day-group{margin-bottom:20px}
        .day-title{font-size:12px;font-weight:600;color:var(--muted);text-transform:capitalize;letter-spacing:0.05em;margin-bottom:10px;padding-left:4px}
        .table-card{background:var(--card);border:1px solid var(--card-border);border-radius:16px;overflow:hidden}
        .log-row{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid var(--border);animation:fadeIn .25s ease both;transition:background .15s;gap:14px}
        .log-row:last-child{border-bottom:none}
        .log-row:hover{background:var(--surface2)}
        .log-left{display:flex;align-items:center;gap:14px;min-width:0}
        .log-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
        .ld-green{background:rgba(52,211,153,0.15)}
        .ld-blue{background:rgba(56,189,248,0.15)}
        .ld-amber{background:rgba(245,180,0,0.15)}
        .ld-red{background:rgba(242,85,85,0.15)}
        .ld-purple{background:rgba(167,139,250,0.15)}
        .log-info{min-width:0}
        .log-action{font-size:13px;font-weight:500;color:var(--text)}
        .log-meta{font-size:11px;color:var(--muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .log-right{text-align:right;flex-shrink:0}
        .log-time{font-size:12px;color:var(--text);font-weight:500}
        .log-table-badge{font-size:10px;color:var(--muted);background:var(--surface2);padding:2px 8px;border-radius:100px;margin-top:3px;display:inline-block}
        .empty-state{padding:60px 20px;text-align:center;color:var(--muted);font-size:14px}

        .chatbot-bubble{position:fixed;bottom:28px;right:28px;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--blue),var(--cyan));display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;box-shadow:0 8px 24px rgba(37,99,235,0.4);transition:transform .2s;z-index:50;text-decoration:none}
        .chatbot-bubble:hover{transform:scale(1.08)}

        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <Sidebar
                    rol="admin"
                    nombre="Administradora General"
                    subRol="Acceso Total"
                    icono="🛡"
                    items={[
                      {icon:'🏠', label:'Panel General',       href:'/admin/dashboard',        active:false},
                    {icon:'👥', label:'Usuarios y Roles',    href:'/admin/usuarios',         active:false},
                    {icon:'📋', label:'Expedientes',          href:'/admin/expedientes',      active:false},
                    {icon:'💳', label:'Finanzas',             href:'/admin/finanzas',         active:false},
                    {icon:'📊', label:'Reportes',             href:'/admin/reportes',         active:false},
                    {icon:'🕘', label:'Disponibilidad',       href:'/admin/disponibilidad',   active:false},
                    {icon:'⭐', label:'Opiniones',            href:'/admin/opiniones',        active:false},
                    {icon:'⚠️', label:'Solicitudes de Baja',  href:'/admin/solicitudes-baja', active:false},
                    {icon:'🔍', label:'Logs de Auditoría',   href:'/admin/logs',             active:true},
                    {icon:'⚙️', label:'Configuración',        href:'/admin/configuracion',    active:false},
                    ]}
                  />

      <div className="main">
        <div className="topbar">
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <MenuButton />
            <span className="topbar-title">Logs de Auditoría</span>
          </div>
          <div className="topbar-right">
            <div className="live-badge"><div className="live-dot"/>En vivo</div>
            <NotifBell userId={currentUserId} rol="admin" esAdmin />
          </div>
        </div>

        <div className="content">
          <div className="page-header">
            <div>
              <div className="page-title">Logs de auditoría</div>
              <div className="page-sub">Registro inmutable de acciones sensibles del sistema · últimos 200</div>
            </div>
          </div>

          <div className="note-box">
            🔒 Esta tabla es <strong>append-only</strong>: ningún registro puede editarse ni eliminarse, ni siquiera por un administrador. Es la fuente de verdad para auditorías de seguridad.
          </div>

          {/* FILTROS */}
          <div className="filters">
            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              <input className="search-input" placeholder="Buscar por acción o usuario..."
                value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            </div>
            <button className={`filter-tab${filtroTabla==='todas'?' active':''}`} onClick={() => setFiltroTabla('todas')}>Todas las tablas</button>
            {tablasDisponibles.map(t => (
              <button key={t} className={`filter-tab${filtroTabla===t?' active':''}`} onClick={() => setFiltroTabla(t)}>
                {TABLA_LABELS[t] ?? t}
              </button>
            ))}
          </div>

          {/* TIMELINE AGRUPADO POR DÍA */}
          {grupos.length === 0 && (
            <div className="table-card"><div className="empty-state">No hay registros que coincidan con el filtro</div></div>
          )}

          {grupos.map(([dia, entradas]) => (
            <div className="day-group" key={dia}>
              <div className="day-title">{dia}</div>
              <div className="table-card">
                {entradas.map((l, i) => {
                  const hora = new Date(l.timestamp).toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit', hour12:true })
                  return (
                    <div className="log-row" key={l.id_logs} style={{animationDelay:`${i*20}ms`}}>
                      <div className="log-left">
                        <div className={`log-icon ${ACCION_COLOR[l.accion] ?? 'ld-blue'}`}>{ACCION_ICON[l.accion] ?? '📝'}</div>
                        <div className="log-info">
                          <div className="log-action">{ACCION_LABELS[l.accion] ?? l.accion}</div>
                          <div className="log-meta">{l.profiles?.nombre_completo ?? '—'} {l.profiles?.rol ? `· ${l.profiles.rol}` : ''}</div>
                        </div>
                      </div>
                      <div className="log-right">
                        <div className="log-time">{hora}</div>
                        <div className="log-table-badge">{TABLA_LABELS[l.tabla_afectada] ?? l.tabla_afectada}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <a href="#" className="chatbot-bubble" title="Asistente RC">💬</a>
    </>
  )
}