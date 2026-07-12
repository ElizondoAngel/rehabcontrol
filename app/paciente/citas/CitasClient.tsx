'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar, { MenuButton } from '@/app/components/Sidebar'
import TopbarActions from '@/app/components/TopbarActions'
import AgendarCitaBloques from './AgendarCitaBloques'

function relativoODia(fecha: Date, dia: number, mes: string) {
  const hoy = new Date(); hoy.setHours(0,0,0,0)
  const d = new Date(fecha); d.setHours(0,0,0,0)
  const diffDias = Math.round((d.getTime() - hoy.getTime()) / 86400000)
  if (diffDias === 0) return 'Hoy'
  if (diffDias === 1) return 'Mañana'
  if (diffDias > 1 && diffDias <= 7) return `En ${diffDias} días`
  return `${dia} ${mes}`
}

export default function CitasClient({ profile, citas, userId }: any) {
  const router = useRouter()
  const [filtro, setFiltro] = useState('todas')

  const citasFiltradas = filtro === 'todas'
    ? citas
    : citas.filter((c: any) => c.estado === filtro)

  const ahora = new Date()

  const { proximas, historial } = useMemo(() => {
    const prox: any[] = []
    const hist: any[] = []
    citasFiltradas.forEach((c: any) => {
      const fecha = new Date(c.fecha_hora)
      if (fecha >= ahora && (c.estado === 'programada' || c.estado === 'pendiente_aprobacion')) prox.push(c)
      else hist.push(c)
    })
    prox.sort((a: any, b: any) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime())
    hist.sort((a: any, b: any) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime())
    return { proximas: prox, historial: hist }
  }, [citasFiltradas])

  const ESTADO_LABEL: Record<string, string> = {
    programada: 'programada',
    pendiente_aprobacion: 'pendiente de confirmación',
    completada: 'completada',
    cancelada: 'cancelada',
  }
  const ESTADO_BADGE: Record<string, string> = {
    programada: 'b-amber',
    pendiente_aprobacion: 'b-pending',
    completada: 'b-green',
    cancelada: 'b-gray',
  }

  function renderCita(c: any, esProxima: boolean) {
    const fecha = new Date(c.fecha_hora)
    const dia   = fecha.getDate()
    const mes   = fecha.toLocaleString('es-MX', { month: 'short' })
    const hora  = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    const relativo = esProxima ? relativoODia(fecha, dia, mes) : null

    return (
      <div className={`cita-card${esProxima ? ' destacada' : ''}`} key={c.id_cita}>
        <div className={`cita-fecha-box${esProxima ? ' cyan' : ''}`}>
          <div className="cita-dia">{dia}</div>
          <div className="cita-mes">{mes}</div>
        </div>
        <div className="cita-info">
          <div className="cita-hora-row">
            <span className="cita-hora">{hora} hrs</span>
            {relativo && <span className="cita-relativo">{relativo}</span>}
          </div>
          <div className="cita-detalle">
            Sesión de terapia física · {c.duracion_min} min
          </div>
          {c.estado === 'pendiente_aprobacion' && (
            <div className="cita-nota-pendiente">⏳ Esperando confirmación de la clínica</div>
          )}
          {c.notas && <div className="cita-nota">📝 {c.notas}</div>}
        </div>
        <span className={`badge ${ESTADO_BADGE[c.estado] ?? 'b-gray'}`}>
          {ESTADO_LABEL[c.estado] ?? c.estado}
        </span>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --bg:#060B14;--sidebar:#0A1220;--card:rgba(255,255,255,0.035);--card-border:rgba(255,255,255,0.09);
          --border:rgba(255,255,255,0.09);--surface2:rgba(255,255,255,0.07);
          --blue:#2563EB;--cyan:#38BDF8;
          --text:#E7EDF7;--muted:#8C9BB5;
          --red:#F25555;--amber:#F5B400;--green:#34D399;--purple:#A78BFA;
        }
        body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex}
        .main{flex:1;display:flex;flex-direction:column;overflow:hidden}
        .topbar{height:56px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 28px;flex-shrink:0}
        .topbar-title{font-size:14px;color:var(--muted);font-weight:500}
        .topbar-right{display:flex;align-items:center;gap:16px}
        .online-dot{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--cyan);font-weight:500}
        .dot{width:7px;height:7px;border-radius:50%;background:var(--cyan);box-shadow:0 0 8px var(--cyan)}
        .content{flex:1;overflow-y:auto;padding:28px 32px 40px}
        .page-title{font-size:26px;font-weight:800;color:var(--text);letter-spacing:-0.015em;margin-bottom:4px}
        .page-sub{font-size:14px;color:var(--muted);margin-bottom:24px}

        .filtros{display:flex;gap:8px;margin-bottom:26px;flex-wrap:wrap}
        .filtro-btn{padding:7px 16px;border-radius:100px;border:1px solid var(--border);background:transparent;color:var(--muted);font-size:13px;font-weight:500;cursor:pointer;transition:all .18s;font-family:'Inter',sans-serif}
        .filtro-btn:hover{border-color:var(--cyan);color:var(--text)}
        .filtro-btn.activo{background:rgba(56,189,248,0.12);border-color:rgba(56,189,248,0.4);color:var(--cyan)}

        .seccion{margin-bottom:32px}
        .seccion-header{display:flex;align-items:center;gap:10px;margin-bottom:14px}
        .seccion-titulo{font-size:15px;font-weight:700;color:var(--text)}
        .seccion-count{font-size:11px;font-weight:700;color:var(--cyan);background:rgba(56,189,248,0.12);padding:2px 9px;border-radius:100px}
        .seccion-header.hist .seccion-count{color:var(--muted);background:var(--surface2)}
        .seccion-linea{flex:1;height:1px;background:var(--border)}

        .citas-lista{display:flex;flex-direction:column;gap:12px}

        .cita-card{background:var(--card);border:1px solid var(--card-border);border-radius:14px;padding:16px 20px;display:flex;align-items:center;gap:16px;transition:background .18s,border-color .18s}
        .cita-card:hover{background:var(--surface2)}
        .cita-card.destacada{border-color:rgba(56,189,248,0.22)}

        .cita-fecha-box{width:52px;height:52px;border-radius:12px;background:var(--surface2);display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0}
        .cita-fecha-box.cyan{background:rgba(56,189,248,0.14);border:1px solid rgba(56,189,248,0.25)}
        .cita-dia{font-size:20px;font-weight:700;color:var(--text);line-height:1}
        .cita-fecha-box.cyan .cita-dia{color:var(--cyan)}
        .cita-mes{font-size:10px;color:var(--muted);text-transform:uppercase}

        .cita-info{flex:1;min-width:0}
        .cita-hora-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
        .cita-hora{font-size:15px;font-weight:600;color:var(--text)}
        .cita-relativo{font-size:11px;font-weight:700;color:var(--cyan);background:rgba(56,189,248,0.12);padding:2px 9px;border-radius:100px}
        .cita-detalle{font-size:12px;color:var(--muted);margin-top:3px}
        .cita-nota-pendiente{font-size:11.5px;color:var(--amber);margin-top:5px}
        .cita-nota{font-size:12px;color:var(--muted);margin-top:6px;padding-top:6px;border-top:1px solid var(--border)}

        .badge{font-size:11px;font-weight:600;padding:4px 12px;border-radius:100px;flex-shrink:0}
        .b-green{background:rgba(52,211,153,0.15);color:var(--green)}
        .b-amber{background:rgba(245,180,0,0.15);color:var(--amber)}
        .b-pending{background:rgba(167,139,250,0.15);color:var(--purple)}
        .b-gray{background:var(--surface2);color:var(--muted)}

        .empty{text-align:center;padding:40px 0;color:var(--muted);font-size:13px;background:var(--card);border:1px dashed var(--card-border);border-radius:14px}
        .empty-global{padding:60px 0;font-size:14px}

        .chatbot-bubble{position:fixed;bottom:28px;right:28px;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--blue),var(--cyan));display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;box-shadow:0 8px 24px rgba(37,99,235,0.4);transition:transform .2s;z-index:50;text-decoration:none}
        .chatbot-bubble:hover{transform:scale(1.08)}
      `}</style>

      <Sidebar
        rol="paciente"
        nombre={profile?.nombre_completo ?? ''}
        subRol="Solo su información"
        icono="👤"
        items={[
          { icon:'🏠', label:'Mi Inicio',   href:'/paciente/dashboard', active:false },
          { icon:'📅', label:'Mis Citas',   href:'/paciente/citas',     active:true  },
          { icon:'🏋️', label:'Mis Ejercicios', href:'/paciente/ejercicios', active:false },
          { icon:'📈', label:'Mi Progreso', href:'/paciente/progreso',  active:false },
          { icon:'💳', label:'Mis Pagos',   href:'/paciente/pagos',     active:false },
          { icon:'⭐', label:'Mis Opiniones',   href:'/paciente/opiniones', active:false },
          { icon:'⚙️', label:'Mis Datos',   href:'/paciente/perfil',    active:false },
        ]}
      />

      <div className="main">
        <div className="topbar">
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <MenuButton />
            <span className="topbar-title">Mis Citas</span>
          </div>
          <div className="topbar-right">
            <div className="online-dot"><div className="dot"/> En línea</div>
            <TopbarActions userId={userId} rol="paciente" nombre={profile?.nombre_completo} />
          </div>
        </div>

        <div className="content">
          <div className="page-title">Mis Citas</div>
          <div className="page-sub">Agenda una nueva cita o revisa tu historial</div>

          <AgendarCitaBloques onSolicitudCreada={() => router.refresh()} />

          <div className="filtros">
            {['todas','programada','pendiente_aprobacion','completada','cancelada'].map(f => (
              <button
                key={f}
                className={`filtro-btn ${filtro === f ? 'activo' : ''}`}
                onClick={() => setFiltro(f)}
              >
                {f === 'todas' ? 'Todas' : ESTADO_LABEL[f] ?? f}
              </button>
            ))}
          </div>

          {citasFiltradas.length === 0 ? (
            <div className="empty empty-global">
              No tienes citas {filtro !== 'todas' ? `con ese estado` : 'registradas'}.
            </div>
          ) : (
            <>
              <div className="seccion">
                <div className="seccion-header">
                  <span className="seccion-titulo">📅 Próximas citas</span>
                  <span className="seccion-count">{proximas.length}</span>
                  <span className="seccion-linea" />
                </div>
                {proximas.length === 0 ? (
                  <div className="empty">No tienes próximas citas.</div>
                ) : (
                  <div className="citas-lista">
                    {proximas.map((c: any) => renderCita(c, true))}
                  </div>
                )}
              </div>

              <div className="seccion">
                <div className="seccion-header hist">
                  <span className="seccion-titulo">🕘 Historial</span>
                  <span className="seccion-count">{historial.length}</span>
                  <span className="seccion-linea" />
                </div>
                {historial.length === 0 ? (
                  <div className="empty">Aún no tienes citas en tu historial.</div>
                ) : (
                  <div className="citas-lista">
                    {historial.map((c: any) => renderCita(c, false))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <a href="#" className="chatbot-bubble" title="Asistente RC">💬</a>
    </>
  )
}
