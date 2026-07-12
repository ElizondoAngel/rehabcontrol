'use client'

import Link from 'next/link'
import Sidebar, { MenuButton } from '@/app/components/Sidebar'
import TopbarActions from '@/app/components/TopbarActions'

export default function ProgresoClient({ profile, progreso, contrato, userId }: any) {

  const sesionesUsadas  = contrato?.sesiones_usadas  ?? progreso.length
  const sesionesTotales = contrato?.sesiones_totales ?? 20
  const pct = sesionesTotales > 0
    ? Math.round((sesionesUsadas / sesionesTotales) * 100)
    : 0

  const movilidadProm = progreso.length > 0
    ? Math.round(progreso.reduce((acc: number, s: any) => acc + (s.movilidad ?? 0), 0) / progreso.length)
    : 0
const dolorUltimo = progreso[progreso.length - 1]?.nivel_dolor ?? 0
  const dolorTexto  = dolorUltimo === 0 ? 'Sin dolor'
                    : dolorUltimo <= 3  ? 'Leve'
                    : dolorUltimo <= 6  ? 'Moderado' : 'Alto'
  const dolorColor  = dolorUltimo === 0 ? 'var(--green)'
                    : dolorUltimo <= 3  ? 'var(--green)'
                    : dolorUltimo <= 6  ? 'var(--amber)' : 'var(--red)'

  const ejerciciosTotales = progreso.reduce((acc: number, s: any) => acc + (s.ejercicios_completados ?? 0), 0)

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
        .content{flex:1;overflow-y:auto;padding:28px}
        .page-title{font-size:26px;font-weight:800;color:var(--text);letter-spacing:-0.015em;margin-bottom:4px}
        .page-sub{font-size:14px;color:var(--muted);margin-bottom:24px}
        .motivacion{background:rgba(56,189,248,0.06);border:1px solid rgba(56,189,248,0.15);border-radius:14px;padding:20px 24px;margin-bottom:24px;display:flex;align-items:center;gap:16px}
        .motiv-emoji{font-size:32px}
        .motiv-title{font-size:15px;font-weight:700;color:var(--cyan);margin-bottom:4px}
        .motiv-sub{font-size:13px;color:var(--muted)}
        .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px}
        .stat-card{background:var(--card);border:1px solid var(--card-border);border-radius:14px;padding:18px 20px}
        .stat-label{font-size:12px;color:var(--muted);margin-bottom:8px;font-weight:500}
        .stat-num{font-size:26px;font-weight:700}
        .progress-card{background:var(--card);border:1px solid var(--card-border);border-radius:14px;padding:22px;margin-bottom:24px}
        .progress-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
        .progress-title{font-size:15px;font-weight:600;color:var(--text)}
        .progress-pct{font-size:15px;font-weight:700;color:var(--cyan)}
        .progress-sub{font-size:12px;color:var(--muted);margin-bottom:14px}
        .progress-bar{height:10px;background:rgba(255,255,255,0.08);border-radius:100px;overflow:hidden}
        .progress-fill{height:100%;background:linear-gradient(90deg,var(--blue),var(--cyan));border-radius:100px;transition:width .6s ease}
        .sesiones-title{font-size:15px;font-weight:600;color:var(--text);margin-bottom:16px}
        .sesiones-lista{display:flex;flex-direction:column;gap:10px}
        .sesion-card{background:var(--card);border:1px solid var(--card-border);border-radius:12px;padding:16px 20px;transition:background .18s}
        .sesion-card:hover{background:var(--surface2)}
        .sesion-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
        .sesion-fecha{font-size:13px;font-weight:600;color:var(--text)}
        .sesion-num{font-size:11px;color:var(--muted)}
        .sesion-stats{display:flex;gap:20px}
        .sstat{display:flex;flex-direction:column}
        .sstat-label{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;font-weight:600}
        .sstat-val{font-size:14px;font-weight:600;color:var(--text);margin-top:2px}
        .sesion-nota{font-size:12px;color:var(--muted);margin-top:10px;padding-top:10px;border-top:1px solid var(--border)}
        .empty{text-align:center;padding:60px 0;color:var(--muted);font-size:14px}
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
          { icon:'📅', label:'Mis Citas',   href:'/paciente/citas',     active:false },
          { icon:'🏋️', label:'Mis Ejercicios', href:'/paciente/ejercicios', active:false },
          { icon:'📈', label:'Mi Progreso', href:'/paciente/progreso',  active:true  },
          { icon:'💳', label:'Mis Pagos',   href:'/paciente/pagos',     active:false },
          { icon:'⭐', label:'Mis Opiniones',   href:'/paciente/opiniones', active:false },
          { icon:'⚙️', label:'Mis Datos',   href:'/paciente/perfil',    active:false },
        ]}
      />

      <div className="main">
        <div className="topbar">
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <MenuButton />
            <span className="topbar-title">Mi Progreso</span>
          </div>
          <div className="topbar-right">
            <div className="online-dot"><div className="dot"/> En línea</div>
            <TopbarActions userId={userId} rol="paciente" nombre={profile?.nombre_completo} />
          </div>
        </div>

        <div className="content">
          <div className="page-title">Mi Progreso</div>
          <div className="page-sub">Vista motivacional de tu rehabilitación — solo lectura</div>

          {progreso.length > 0 && (
            <div className="motivacion">
              <div className="motiv-emoji">
                {pct >= 75 ? '🏆' : pct >= 50 ? '💪' : pct >= 25 ? '🌱' : '🚀'}
              </div>
              <div>
                <div className="motiv-title">
                  {pct >= 75 ? '¡Casi lo logras!'
                  : pct >= 50 ? '¡Vas a la mitad, sigue así!'
                  : pct >= 25 ? '¡Buen inicio, continúa!'
                  : '¡Estás comenzando tu recuperación!'}
                </div>
                <div className="motiv-sub">
                  Llevas {sesionesUsadas} de {sesionesTotales} sesiones — {pct}% del tratamiento
                </div>
              </div>
            </div>
          )}

          <div className="stats">
            <div className="stat-card">
              <div className="stat-label">Sesiones completadas</div>
              <div className="stat-num" style={{color:'var(--cyan)'}}>{sesionesUsadas}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Movilidad promedio</div>
              <div className="stat-num" style={{color:'var(--cyan)'}}>
                {movilidadProm > 0 ? `${movilidadProm}%` : '—'}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Nivel de esfuerzo</div>
              <div className="stat-num" style={{color: dolorColor}}>{dolorTexto}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Ejercicios completados</div>
              <div className="stat-num" style={{color:'var(--cyan)'}}>{ejerciciosTotales}</div>
            </div>
          </div>

          <div className="progress-card">
            <div className="progress-header">
              <span className="progress-title">Avance del tratamiento</span>
              <span className="progress-pct">{pct}%</span>
            </div>
            <div className="progress-sub">{sesionesUsadas} de {sesionesTotales} sesiones completadas</div>
            <div className="progress-bar">
              <div className="progress-fill" style={{width:`${pct}%`}}/>
            </div>
          </div>

          <div className="sesiones-title">Historial de sesiones</div>
          {progreso.length === 0
            ? <div className="empty">Aún no tienes sesiones registradas.</div>
            : (
              <div className="sesiones-lista">
                {[...progreso].reverse().map((s: any, i: number) => {
                  const nivelEsfuerzo = s.nivel_dolor === 0 ? 'Sin esfuerzo'
                    : s.nivel_dolor <= 3 ? 'Esfuerzo leve'
                    : s.nivel_dolor <= 6 ? 'Esfuerzo moderado'
                    : 'Esfuerzo intenso'

                  return (
                    <div className="sesion-card" key={s.id}>
                      <div className="sesion-top">
                      <span className="sesion-fecha">{new Date(s.fecha_registro).toLocaleDateString('es-MX')}</span>
                        <span className="sesion-num">Sesión #{progreso.length - i}</span>
                      </div>
                      <div className="sesion-stats">
                        <div className="sstat">
                          <span className="sstat-label">Esfuerzo</span>
                          <span className="sstat-val">{nivelEsfuerzo}</span>
                        </div>
                        <div className="sstat">
                          <span className="sstat-label">Movilidad</span>
                          <span className="sstat-val">{s.movilidad ? `${s.movilidad}%` : '—'}</span>
                        </div>
                        <div className="sstat">
                          <span className="sstat-label">Ejercicios</span>
                          <span className="sstat-val">{s.ejercicios_completados ?? 0}</span>
                        </div>
                      </div>
                     {s.observaciones && (
                    <div className="sesion-nota">📝 {s.observaciones}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          }
        </div>
      </div>

      <a href="#" className="chatbot-bubble" title="Asistente RC">💬</a>
    </>
  )
}
