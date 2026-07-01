'use client'

import Link from 'next/link'
import Sidebar, { MenuButton } from '@/app/components/Sidebar'
import TopbarActions from '@/app/components/TopbarActions'

export default function PacienteDashboardClient({
  profile, proximasCitas, ultimosPagos, progreso, contrato, userId
}: any) {

  const nombre = profile?.nombre_completo?.split(' ')[0] ?? 'Paciente'

  const sesionesUsadas  = contrato?.sesiones_usadas  ?? progreso.length
  const sesionesTotales = contrato?.sesiones_totales ?? 20
  const pct = sesionesTotales > 0
    ? Math.round((sesionesUsadas / sesionesTotales) * 100)
    : 0

  const movilidadProm = progreso.length > 0
    ? Math.round(progreso.reduce((acc: number, s: any) => acc + (s.movilidad ?? 0), 0) / progreso.length)
    : 0

  const dolorUltimo = progreso[0]?.nivel_dolor ?? 0
  const dolorTexto  = dolorUltimo === 0 ? 'Sin dolor'
                    : dolorUltimo <= 3  ? 'Leve'
                    : dolorUltimo <= 6  ? 'Moderado' : 'Alto'

  const pagosPendientes = ultimosPagos.filter((p: any) => p.estado_pago === 'pendiente').length
  const proximaCita     = proximasCitas[0]

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
          --red:#F25555;--amber:#F5B400;--green:#34D399;
        }
        body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex}
        .main{flex:1;display:flex;flex-direction:column;overflow:hidden}
        .topbar{height:56px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 28px;flex-shrink:0}
        .topbar-title{font-size:14px;color:var(--muted);font-weight:500}
        .topbar-right{display:flex;align-items:center;gap:16px}
        .online-dot{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--cyan);font-weight:500}
        .dot{width:7px;height:7px;border-radius:50%;background:var(--cyan);box-shadow:0 0 8px var(--cyan)}
        .notif{width:32px;height:32px;border-radius:9px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:15px;transition:background .18s}
        .notif:hover{background:var(--surface2)}
        .content{flex:1;overflow-y:auto;padding:28px}
        .page-title{font-size:26px;font-weight:800;color:var(--text);letter-spacing:-0.015em;margin-bottom:4px}
        .page-sub{font-size:14px;color:var(--muted);margin-bottom:28px}
        .metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:24px}
        .metric{background:var(--card);border:1px solid var(--card-border);border-radius:14px;padding:20px 22px;position:relative;overflow:hidden}
        .metric-label{font-size:12px;color:var(--muted);margin-bottom:12px;font-weight:500}
        .metric-num{font-size:32px;font-weight:700;color:var(--text);line-height:1}
        .metric-sub{font-size:12px;color:var(--muted);margin-top:6px}
        .metric-icon{position:absolute;top:18px;right:18px;width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:16px}
        .icon-green{background:rgba(52,211,153,0.12)}
        .icon-blue{background:rgba(56,189,248,0.12)}
        .icon-amber{background:rgba(245,180,0,0.12)}
        .progress-card{background:var(--card);border:1px solid var(--card-border);border-radius:14px;padding:22px;margin-bottom:24px}
        .progress-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
        .progress-title{font-size:15px;font-weight:600;color:var(--text)}
        .progress-pct{font-size:15px;font-weight:700;color:var(--cyan)}
        .progress-diag{font-size:12px;color:var(--muted);margin-bottom:14px}
        .progress-bar{height:8px;background:rgba(255,255,255,0.08);border-radius:100px;overflow:hidden;margin-bottom:16px}
        .progress-fill{height:100%;background:linear-gradient(90deg,var(--blue),var(--cyan));border-radius:100px}
        .progress-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
        .pstat{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center}
        .pstat-num{font-size:20px;font-weight:700;color:var(--text)}
        .pstat-lbl{font-size:11px;color:var(--muted);margin-top:3px}
        .bottom-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .table-card{background:var(--card);border:1px solid var(--card-border);border-radius:14px;padding:22px}
        .table-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
        .table-title{font-size:15px;font-weight:600;color:var(--text)}
        .cita-row{display:flex;align-items:center;padding:11px 0;border-bottom:1px solid var(--border)}
        .cita-row:last-child{border-bottom:none}
        .cita-icon{width:32px;height:32px;border-radius:8px;background:rgba(56,189,248,0.12);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;margin-right:12px}
        .cita-date{font-size:13px;font-weight:500;color:var(--text)}
        .cita-doc{font-size:11px;color:var(--muted)}
        .badge{font-size:11px;font-weight:600;padding:3px 10px;border-radius:100px}
        .b-green{background:rgba(52,211,153,0.15);color:var(--green)}
        .b-amber{background:rgba(245,180,0,0.15);color:var(--amber)}
        .b-gray{background:var(--surface2);color:var(--muted)}
        .pago-row{display:flex;align-items:center;justify-content:space-between;padding:11px 0;border-bottom:1px solid var(--border)}
        .pago-row:last-child{border-bottom:none}
        .pago-name{font-size:13px;font-weight:500;color:var(--text)}
        .pago-date{font-size:11px;color:var(--muted)}
        .pago-right{display:flex;align-items:center;gap:10px}
        .pago-amount{font-size:14px;font-weight:600;color:var(--text)}
        .chatbot-bubble{position:fixed;bottom:28px;right:28px;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--blue),var(--cyan));display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;box-shadow:0 8px 24px rgba(37,99,235,0.4);transition:transform .2s;z-index:50;text-decoration:none}
        .chatbot-bubble:hover{transform:scale(1.08)}
        .empty{font-size:13px;color:var(--muted);padding:12px 0}
      `}</style>

      <Sidebar
        rol="paciente"
        nombre={profile?.nombre_completo ?? ''}
        subRol="Solo su información"
        icono="👤"
        items={[
          { icon:'🏠', label:'Mi Inicio',   href:'/paciente/dashboard', active:true  },
          { icon:'📅', label:'Mis Citas',   href:'/paciente/citas',     active:false },
          { icon:'📈', label:'Mi Progreso', href:'/paciente/progreso',  active:false },
          { icon:'💳', label:'Mis Pagos',   href:'/paciente/pagos',     active:false },
          { icon:'⚙️', label:'Mis Datos',   href:'/paciente/perfil',    active:false },
        ]}
      />

      <div className="main">
        <div className="topbar">
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <MenuButton />
            <span className="topbar-title">Mi Inicio</span>
          </div>
          <div className="topbar-right">
            <div className="online-dot"><div className="dot"/> En línea</div>
            <TopbarActions userId={userId} rol="paciente" nombre={profile?.nombre_completo} />
          </div>
        </div>

        <div className="content">
          <div className="page-title">Bienvenido, {nombre}</div>
          <div className="page-sub">Solo puedes ver tu propia información — Nivel 1</div>

          <div className="metrics">
            <div className="metric">
              <div className="metric-label">Sesiones completadas</div>
              <div className="metric-num">{sesionesUsadas}</div>
              <div className="metric-sub">de {sesionesTotales} programadas</div>
              <div className="metric-icon icon-green">✅</div>
            </div>
            <div className="metric">
              <div className="metric-label">Próxima cita</div>
              <div className="metric-num" style={{fontSize:18}}>
                {proximaCita
                  ? new Date(proximaCita.fecha_hora).toLocaleString('es-MX', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })
                  : 'Sin citas'}
              </div>
              <div className="metric-sub">{proximaCita?.estado ?? '—'}</div>
              <div className="metric-icon icon-blue">🕐</div>
            </div>
            <div className="metric">
              <div className="metric-label">Saldo pendiente</div>
              <div className="metric-num">{pagosPendientes === 0 ? '✓' : pagosPendientes}</div>
              <div className="metric-sub">{pagosPendientes === 0 ? 'Todo al corriente' : 'pagos pendientes'}</div>
              <div className="metric-icon icon-amber">💳</div>
            </div>
          </div>

          <div className="progress-card">
            <div className="progress-header">
              <span className="progress-title">Mi progreso de rehabilitación</span>
              <span className="progress-pct">{pct}%</span>
            </div>
            <div className="progress-diag">
              {sesionesTotales} sesiones en total — {sesionesUsadas} completadas
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{width:`${pct}%`}}/>
            </div>
            <div className="progress-stats">
              <div className="pstat">
                <div className="pstat-num">{sesionesUsadas}/{sesionesTotales}</div>
                <div className="pstat-lbl">Sesiones</div>
              </div>
              <div className="pstat">
                <div className="pstat-num">{movilidadProm > 0 ? `${movilidadProm}%` : '—'}</div>
                <div className="pstat-lbl">Movilidad</div>
              </div>
              <div className="pstat">
                <div className="pstat-num">{dolorTexto}</div>
                <div className="pstat-lbl">Nivel esfuerzo</div>
              </div>
            </div>
          </div>

          <div className="bottom-grid">
            <div className="table-card">
              <div className="table-header">
                <span className="table-title">Mis próximas citas</span>
              </div>
              {proximasCitas.length === 0
                ? <p className="empty">No tienes citas próximas.</p>
                : proximasCitas.map((c: any) => (
                    <div className="cita-row" key={c.id_cita}>
                      <div className="cita-icon">📅</div>
                      <div style={{flex:1}}>
                        <div className="cita-date">
                          {new Date(c.fecha_hora).toLocaleString('es-MX', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </div>
                        <div className="cita-doc">Sesión de terapia · {c.duracion_min} min</div>
                      </div>
                      <span className={`badge ${
                        c.estado === 'completada' ? 'b-green' :
                        c.estado === 'programada' ? 'b-amber' : 'b-gray'
                      }`}>
                        {c.estado}
                      </span>
                    </div>
                  ))
              }
            </div>

            <div className="table-card">
              <div className="table-header">
                <span className="table-title">Mis pagos</span>
              </div>
              {ultimosPagos.length === 0
                ? <p className="empty">Sin registros de pago aún.</p>
                : ultimosPagos.map((p: any) => (
                    <div className="pago-row" key={p.id_pago}>
                      <div>
                        <div className="pago-name">
                          {p.metodo_pago
                            ? p.metodo_pago.charAt(0).toUpperCase() + p.metodo_pago.slice(1)
                            : 'Sesión de terapia'}
                        </div>
                        <div className="pago-date">
                          {new Date(p.fecha_pago).toLocaleDateString('es-MX', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </div>
                      </div>
                      <div className="pago-right">
                        <div className="pago-amount">${p.monto}</div>
                        <span className={`badge ${p.estado_pago === 'pagado' ? 'b-green' : 'b-amber'}`}>
                          {p.estado_pago}
                        </span>
                      </div>
                    </div>
                  ))
              }
            </div>
          </div>
        </div>
      </div>

      <a href="#" className="chatbot-bubble" title="Asistente RC">💬</a>
    </>
  )
}