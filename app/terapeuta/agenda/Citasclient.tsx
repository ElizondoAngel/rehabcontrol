'use client'

/**
 * CitasClient.tsx (Terapeuta)
 * ─────────────────────────────────────────────────────────────
 * F5 — Mi Agenda (Terapeuta)
 *
 * A diferencia de la versión de Secretaria, el terapeuta:
 *   • NO puede crear ni editar citas (eso es exclusivo de secretaria/admin)
 *   • NO puede cancelar citas
 *   • SÍ puede marcar una cita propia como "Completada" o "No asistió"
 *     una vez que ya pasó / se atendió — AHORA directo en la fila,
 *     sin abrir un action sheet/modal intermedio.
 *
 * Las citas que llegan por props ya vienen filtradas en el
 * servidor por terapeuta_id = auth.uid().
 */

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import Sidebar, { MenuButton } from '@/app/components/Sidebar'
import TopbarActions from '@/app/components/TopbarActions'

// ── TIPOS ────────────────────────────────────────────────────
interface Cita {
  id_cita: number
  paciente_id: number
  terapeuta_id: string
  fecha_hora: string
  duracion_min: number
  estado: 'programada'|'completada'|'cancelada'|'no_asistio'
  notas?: string
  pacientes?: { nombre_completo: string }
}
interface Props {
  citasIniciales: Cita[]
  userNombre: string
  userId: string
}

// ── HELPERS DE FECHA ──────────────────────────────────────────
function toISODate(d: Date) { return d.toISOString().split('T')[0] }
function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit', hour12:false })
}
function formatFechaLarga(d: Date) {
  return d.toLocaleDateString('es-MX', { weekday:'long', day:'numeric', month:'long' })
}

// ── TOAST ─────────────────────────────────────────────────────
function Toast({ msg, type, onClose }: { msg:string; type:'success'|'error'; onClose:()=>void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div style={{
      position:'fixed', bottom:90, right:28, zIndex:200,
      background: type==='success' ? 'rgba(52,211,153,0.10)' : 'rgba(242,85,85,0.10)',
      border: `1px solid ${type==='success' ? 'rgba(52,211,153,0.35)' : 'rgba(242,85,85,0.35)'}`,
      borderLeft: `3px solid ${type==='success' ? '#34D399' : '#F25555'}`,
      borderRadius:12, padding:'14px 18px', minWidth:280, maxWidth:380,
      display:'flex', alignItems:'center', gap:12,
      backdropFilter:'blur(16px)',
      boxShadow:'0 8px 32px rgba(0,0,0,0.5)', animation:'slideUp .3s ease',
    }}>
      <span style={{fontSize:18}}>{type==='success'?'✅':'❌'}</span>
      <span style={{fontSize:14, color:'#E7EDF7', flex:1}}>{msg}</span>
      <button onClick={onClose} style={{background:'none',border:'none',color:'rgba(231,237,247,0.4)',cursor:'pointer',fontSize:16}}>✕</button>
    </div>
  )
}

const ESTADO_LABELS: Record<string,string> = {
  programada: 'Programada', completada: 'Completada', cancelada: 'Cancelada', no_asistio: 'No asistió'
}
const ESTADO_CLASS: Record<string,string> = {
  programada: 'b-blue', completada: 'b-green', cancelada: 'b-red', no_asistio: 'b-amber'
}

// ── COMPONENTE PRINCIPAL ─────────────────────────────────────
export default function CitasClient({ citasIniciales, userNombre, userId }: Props) {
  const [citas, setCitas] = useState<Cita[]>(citasIniciales)
  const [diaSeleccionado, setDia] = useState(() => toISODate(new Date()))
  const [filtroEstado, setFiltroEstado] = useState<'activas'|'completadas'|'canceladas'|'todas'>('activas')
  const [actualizando, setActualizando] = useState<number | null>(null) // id_cita en proceso, para loading puntual
  const [toast, setToast] = useState<{msg:string;type:'success'|'error'}|null>(null)

  const citasDelDia = useMemo(() => {
    return citas
      .filter(c => toISODate(new Date(c.fecha_hora)) === diaSeleccionado)
      .filter(c => {
        if (filtroEstado === 'todas') return true
        if (filtroEstado === 'activas') return c.estado === 'programada'
        if (filtroEstado === 'completadas') return c.estado === 'completada'
        if (filtroEstado === 'canceladas') return c.estado === 'cancelada' || c.estado === 'no_asistio'
        return true
      })
      .sort((a,b) => a.fecha_hora.localeCompare(b.fecha_hora))
  }, [citas, diaSeleccionado, filtroEstado])

  function cambiarDia(delta: number) {
    const d = new Date(diaSeleccionado + 'T00:00:00')
    d.setDate(d.getDate() + delta)
    setDia(toISODate(d))
  }

  // ── CAMBIAR ESTADO directo desde la fila, sin modal ────────────
  async function cambiarEstadoCita(c: Cita, estado: 'completada'|'no_asistio') {
    setActualizando(c.id_cita)
    const res = await fetch('/api/agenda-terapeuta', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: c.id_cita, estado }),
    })
    const data = await res.json()
    setActualizando(null)

    if (res.ok) {
      setCitas(prev => prev.map(ci => ci.id_cita === c.id_cita ? { ...ci, estado } : ci))
      setToast({ msg: `Cita marcada como "${ESTADO_LABELS[estado]}"`, type: 'success' })
    } else {
      setToast({ msg: data.error ?? 'Error al actualizar la cita', type: 'error' })
    }
  }

  const fechaObj = new Date(diaSeleccionado + 'T00:00:00')
  const esHoy = diaSeleccionado === toISODate(new Date())

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --bg:#060B14;--sidebar:#0A1220;--card:#0F1B2E;--card-border:rgba(255,255,255,0.08);
          --border:rgba(255,255,255,0.08);--surface2:rgba(255,255,255,0.05);
          --mid:#2563EB;--light:#38BDF8;--text:#E7EDF7;--muted:rgba(140,155,181,0.85);
          --red:#F25555;--amber:#F5B400;--green:#34D399;
        }
        body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex}

        .main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
        .topbar{height:52px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 32px;flex-shrink:0}
        .topbar-title{font-size:13px;color:var(--muted);font-weight:500}
        .topbar-right{display:flex;align-items:center;gap:16px}
        .online-dot{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--light)}
        .dot{width:6px;height:6px;border-radius:50%;background:var(--light)}
        .notif{width:30px;height:30px;border-radius:8px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px}
        .content{flex:1;overflow-y:auto;padding:36px 40px}

        .page-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px}
        .page-title{font-size:28px;font-weight:700;color:var(--text);letter-spacing:-0.02em}
        .page-sub{font-size:13.5px;color:var(--muted);margin-top:6px}
        .readonly-pill{display:flex;align-items:center;gap:6px;background:rgba(56,189,248,0.1);border:1px solid rgba(56,189,248,0.25);border-radius:100px;padding:7px 14px;font-size:12px;font-weight:600;color:var(--light);white-space:nowrap}

        .day-nav{display:flex;align-items:center;gap:14px;margin-bottom:20px;background:var(--card);border:1px solid var(--card-border);border-radius:14px;padding:14px 20px}
        .day-arrow{background:var(--surface2);border:1px solid var(--border);border-radius:9px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;color:var(--muted);transition:all .18s;flex-shrink:0}
        .day-arrow:hover{background:rgba(56,189,248,0.15);border-color:rgba(56,189,248,0.3);color:var(--light)}
        .day-label{flex:1;text-align:center;animation:fadeIn .25s ease}
        .day-label-main{font-size:16px;font-weight:700;color:var(--text);text-transform:capitalize}
        .day-label-sub{font-size:12px;color:var(--muted);margin-top:2px}
        .day-today-badge{background:rgba(56,189,248,0.15);color:var(--light);font-size:11px;font-weight:600;padding:3px 10px;border-radius:100px;margin-left:8px}
        .day-today-btn{background:var(--surface2);border:1px solid var(--border);border-radius:9px;padding:8px 14px;font-size:12px;font-weight:500;color:var(--muted);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .18s;flex-shrink:0}
        .day-today-btn:hover{color:var(--text);border-color:rgba(56,189,248,0.3)}

        .filters{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap}
        .filter-tab{background:var(--card);border:1px solid var(--card-border);border-radius:9px;padding:8px 14px;font-size:13px;font-weight:500;color:var(--muted);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .18s}
        .filter-tab:hover{border-color:rgba(56,189,248,0.35);color:var(--text)}
        .filter-tab.active{background:rgba(56,189,248,0.14);border-color:rgba(56,189,248,0.4);color:var(--light)}

        .table-card{background:var(--card);border:1px solid var(--card-border);border-radius:16px;overflow:hidden}
        .cita-header-row{display:grid;grid-template-columns:90px 1.6fr 110px 230px;gap:14px;padding:10px 20px;border-bottom:1px solid var(--border)}
        .th{font-size:11px;font-weight:600;color:var(--muted);letter-spacing:0.07em;text-transform:uppercase}
        .cita-row{display:grid;grid-template-columns:90px 1.6fr 110px 230px;gap:14px;padding:14px 20px;border-bottom:1px solid var(--border);align-items:center;animation:fadeIn .3s ease both;transition:background .18s;min-width:0}
        .cita-row > div{min-width:0}
        .cita-row:last-child{border-bottom:none}
        .cita-row:hover{background:var(--surface2)}
        .cita-hora{font-size:15px;font-weight:700;color:var(--light)}
        .cita-hora-sub{font-size:11px;color:var(--muted);margin-top:2px}
        .cita-paciente{font-size:13.5px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .cita-notas{font-size:11px;color:var(--muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
        .badge{font-size:11px;font-weight:600;padding:4px 11px;border-radius:100px;display:inline-block;white-space:nowrap}
        .b-blue{background:rgba(56,189,248,0.15);color:var(--light)}
        .b-green{background:rgba(52,211,153,0.15);color:var(--green)}
        .b-red{background:rgba(242,85,85,0.15);color:var(--red)}
        .b-amber{background:rgba(245,180,0,0.15);color:var(--amber)}

        /* ── ACCIONES INLINE — el cambio principal ── */
        .actions-inline{display:flex;gap:6px;justify-content:flex-end}
        .btn-inline{display:flex;align-items:center;gap:6px;border-radius:8px;padding:7px 12px;font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;border:1px solid transparent;transition:all .15s;white-space:nowrap}
        .btn-inline:disabled{opacity:.5;cursor:not-allowed}
        .btn-completar{background:rgba(52,211,153,0.12);color:var(--green);border-color:rgba(52,211,153,0.25)}
        .btn-completar:hover:not(:disabled){background:rgba(52,211,153,0.22);transform:translateY(-1px)}
        .btn-no-asistio{background:rgba(245,180,0,0.1);color:var(--amber);border-color:rgba(245,180,0,0.22)}
        .btn-no-asistio:hover:not(:disabled){background:rgba(245,180,0,0.2);transform:translateY(-1px)}
        .mini-spinner{width:11px;height:11px;border-radius:50%;border:2px solid rgba(255,255,255,0.25);border-top-color:currentColor;animation:spin .7s linear infinite;flex-shrink:0}
        .estado-final{display:flex;justify-content:flex-end}

        .empty-state{padding:60px 20px;text-align:center;color:var(--muted);font-size:14px}

        .chatbot-bubble{position:fixed;bottom:28px;right:28px;width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,var(--mid),var(--light));display:flex;align-items:center;justify-content:center;font-size:20px;cursor:pointer;box-shadow:0 4px 16px rgba(37,99,235,0.35);transition:transform .2s;z-index:50;text-decoration:none}
        .chatbot-bubble:hover{transform:scale(1.08)}

        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes spin    { to{transform:rotate(360deg)} }

        @media (max-width: 900px) {
          .cita-header-row,.cita-row{grid-template-columns:70px 1fr auto}
          .th:nth-child(3),.cita-row > div:nth-child(3){display:none}
          .actions-inline{flex-direction:column}
          .btn-inline span.label{display:none}
        }
      `}</style>

      <Sidebar
        rol="terapeuta"
        nombre="Terapeuta"
        subRol="Acceso limitado"
        icono="📈"
        items={[
          {icon:'🏠', label:'Mi Panel',        href:'/terapeuta/dashboard',   active:false},
          {icon:'👥', label:'Mis Pacientes',   href:'/terapeuta/pacientes',   active:false},
          {icon:'📋', label:'Expedientes',      href:'/terapeuta/expedientes', active:false},
          {icon:'📅', label:'Mi Agenda',        href:'/terapeuta/agenda',      active:true},
          {icon:'📊', label:'Progreso',         href:'/terapeuta/progreso',    active:false},
        ]}
      />

      <div className="main">
        <div className="topbar">
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <MenuButton />
            <span className="topbar-title">Mi Agenda</span>
          </div>
          <div className="topbar-right">
            <div className="online-dot"><div className="dot"/>En línea</div>
            <TopbarActions userId={userId} rol="terapeuta" nombre={userNombre} />
          </div>
        </div>

        <div className="content">
          <div className="page-header">
            <div>
              <div className="page-title">Mi Agenda</div>
              <div className="page-sub">Marca tus sesiones directamente desde la lista — la creación y edición las gestiona Secretaria</div>
            </div>
            <div className="readonly-pill">🔒 Lectura + estado de sesión</div>
          </div>

          <div className="day-nav">
            <div className="day-arrow" onClick={() => cambiarDia(-1)}>←</div>
            <div className="day-label" key={diaSeleccionado}>
              <div className="day-label-main">
                {formatFechaLarga(fechaObj)}
                {esHoy && <span className="day-today-badge">Hoy</span>}
              </div>
              <div className="day-label-sub">{citasDelDia.length} cita{citasDelDia.length!==1?'s':''} en este filtro</div>
            </div>
            <div className="day-arrow" onClick={() => cambiarDia(1)}>→</div>
            {!esHoy && (
              <button className="day-today-btn" onClick={() => setDia(toISODate(new Date()))}>Hoy</button>
            )}
          </div>

          <div className="filters">
            {[
              {key:'activas',     label:'Programadas'},
              {key:'completadas', label:'Completadas'},
              {key:'canceladas',  label:'Canceladas / No asistió'},
              {key:'todas',       label:'Todas'},
            ].map(f => (
              <button key={f.key} className={`filter-tab${filtroEstado===f.key?' active':''}`} onClick={() => setFiltroEstado(f.key as any)}>
                {f.label}
              </button>
            ))}
          </div>

          <div className="table-card">
            <div className="cita-header-row">
              <div className="th">Hora</div>
              <div className="th">Paciente</div>
              <div className="th">Estado</div>
              <div className="th" style={{textAlign:'right'}}>Acción rápida</div>
            </div>

            {citasDelDia.length === 0 && (
              <div className="empty-state">No tienes citas programadas para este día</div>
            )}

            {citasDelDia.map((c, i) => {
              const enProceso = actualizando === c.id_cita
              return (
                <div className="cita-row" key={c.id_cita} style={{animationDelay:`${i*40}ms`}}>
                  <div>
                    <div className="cita-hora">{formatHora(c.fecha_hora)}</div>
                    <div className="cita-hora-sub">{c.duracion_min} min</div>
                  </div>
                  <div>
                    <div className="cita-paciente">{c.pacientes?.nombre_completo ?? '—'}</div>
                    {c.notas && <div className="cita-notas">{c.notas}</div>}
                  </div>
                  <div><span className={`badge ${ESTADO_CLASS[c.estado]}`}>{ESTADO_LABELS[c.estado]}</span></div>

                  {c.estado === 'programada' ? (
                    <div className="actions-inline">
                      <button
                        className="btn-inline btn-completar"
                        disabled={enProceso}
                        onClick={() => cambiarEstadoCita(c, 'completada')}
                      >
                        {enProceso ? <span className="mini-spinner" /> : '✅'}
                        <span className="label">Completada</span>
                      </button>
                      <button
                        className="btn-inline btn-no-asistio"
                        disabled={enProceso}
                        onClick={() => cambiarEstadoCita(c, 'no_asistio')}
                      >
                        {enProceso ? <span className="mini-spinner" /> : '⚠️'}
                        <span className="label">No asistió</span>
                      </button>
                    </div>
                  ) : (
                    <div className="estado-final">
                      <span style={{fontSize:12, color:'var(--muted)'}}>— Sin más acciones —</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <a href="#" className="chatbot-bubble" title="Asistente RC">💬</a>
    </>
  )
}