'use client'

/**
 * EjerciciosClient.tsx (Paciente)
 * ─────────────────────────────────────────────────────────────
 * Espejo de solo lectura de ProgresoDetalleClient.tsx (terapeuta).
 * No hay botón de "registrar" ni de editar: el paciente solo ve
 * lo que su terapeuta ya capturó por cada cita completada.
 *
 * Fuente de datos: progreso_sesiones.ejercicios (jsonb) y
 * progreso_sesiones.archivos (jsonb) — sin tabla nueva.
 */

import Sidebar, { MenuButton } from '@/app/components/Sidebar'
import TopbarActions from '@/app/components/TopbarActions'

interface ArchivoProgreso {
  path: string
  nombre: string
  tipo: string
  tamano: number
  subido_en: string
  url?: string | null
}
interface EjercicioRealizado { ejercicio: string; repeticiones: number }
interface Sesion {
  id_progreso_sesion: number
  nivel_dolor: number
  movilidad: number
  ejercicios?: EjercicioRealizado[]
  observaciones?: string
  archivos?: ArchivoProgreso[]
  fecha_registro: string
}
interface Props {
  profile: any
  sesiones: Sesion[]
  userId: string
}

function formatFechaHora(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function nivelClass(n: number, invertido = false) {
  if (invertido) return n >= 7 ? 'nivel-bueno' : n >= 4 ? 'nivel-medio' : 'nivel-malo'
  return n <= 3 ? 'nivel-bueno' : n <= 6 ? 'nivel-medio' : 'nivel-malo'
}
function esVideo(tipo: string) { return tipo.startsWith('video/') }

export default function EjerciciosClient({ profile, sesiones, userId }: Props) {
  const totalEjercicios = sesiones.reduce((acc, s) => acc + (s.ejercicios?.length ?? 0), 0)
  const ultimaSesion = sesiones[0] ?? null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --bg:#060B14;--sidebar:#0A1220;--card:rgba(255,255,255,0.035);--card-border:rgba(255,255,255,0.09);
          --border:rgba(255,255,255,0.09);--surface2:rgba(255,255,255,0.07);
          --blue:#2563EB;--cyan:#38BDF8;--text:#E7EDF7;--muted:#8C9BB5;
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
        .page-title{font-size:26px;font-weight:800;letter-spacing:-0.015em;margin-bottom:4px}
        .page-sub{font-size:14px;color:var(--muted);margin-bottom:24px}

        .resumen-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}
        .resumen-card{background:var(--card);border:1px solid var(--card-border);border-radius:13px;padding:16px 18px}
        .resumen-lbl{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px}
        .resumen-val{font-size:22px;font-weight:800;color:var(--text)}
        .resumen-sub{font-size:11.5px;color:var(--muted);margin-top:4px}

        .timeline{position:relative;padding-left:8px}
        .timeline-item{position:relative;padding-left:28px;padding-bottom:24px}
        .timeline-item:last-child{padding-bottom:0}
        .timeline-dot{position:absolute;left:0;top:4px;width:14px;height:14px;border-radius:50%;background:var(--cyan);box-shadow:0 0 0 4px rgba(56,189,248,0.15)}
        .timeline-line{position:absolute;left:6px;top:18px;bottom:0;width:1px;background:var(--border)}
        .timeline-card{background:var(--card);border:1px solid var(--card-border);border-radius:14px;padding:18px 20px}
        .timeline-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px}
        .timeline-fecha{font-size:13px;font-weight:600;color:var(--text)}
        .timeline-badges{display:flex;gap:8px;flex-wrap:wrap}
        .nivel-badge{font-size:12px;font-weight:700;padding:4px 11px;border-radius:100px;display:inline-flex;align-items:center;gap:5px}
        .nivel-bueno{background:rgba(52,211,153,0.15);color:var(--green)}
        .nivel-medio{background:rgba(245,180,0,0.15);color:var(--amber)}
        .nivel-malo{background:rgba(242,85,85,0.15);color:var(--red)}
        .timeline-field{margin-top:10px}
        .timeline-field-lbl{font-size:10.5px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:3px}
        .timeline-field-val{font-size:13px;color:var(--text);line-height:1.5;white-space:pre-wrap}

        .ejercicios-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}
        .ejercicio-chip{font-size:12px;color:var(--text);background:var(--surface2);border:1px solid var(--border);border-radius:100px;padding:5px 12px;display:inline-flex;align-items:center;gap:4px}
        .ejercicio-chip strong{color:var(--cyan);font-weight:700}

        .timeline-galeria{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
        .archivo-thumb{position:relative;width:96px;height:96px;border-radius:10px;overflow:hidden;border:1px solid var(--border);background:var(--surface2);cursor:pointer;padding:0;flex-shrink:0}
        .thumb-media{width:100%;height:100%;object-fit:cover;display:block}
        .thumb-placeholder{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:26px}
        .thumb-overlay{position:absolute;inset:0;background:rgba(0,0,0,0.55);color:#fff;font-size:10px;font-weight:600;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s;text-align:center;padding:4px}
        .archivo-thumb:hover .thumb-overlay{opacity:1}

        .empty-card{background:var(--card);border:1px dashed var(--card-border);border-radius:16px;padding:56px 24px;text-align:center}
        .empty-icon{font-size:36px;margin-bottom:12px}
        .empty-title{font-size:15px;font-weight:600;color:var(--text);margin-bottom:6px}
        .empty-sub{font-size:13px;color:var(--muted)}

        .chatbot-bubble{position:fixed;bottom:28px;right:28px;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--blue),var(--cyan));display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;box-shadow:0 8px 24px rgba(37,99,235,0.4);transition:transform .2s;z-index:50;text-decoration:none}

        @media (max-width:900px){ .resumen-grid{grid-template-columns:1fr} }
      `}</style>

      <Sidebar
        rol="paciente"
        nombre={profile?.nombre_completo ?? ''}
        subRol="Solo su información"
        icono="👤"
        items={[
          { icon:'🏠', label:'Mi Inicio',      href:'/paciente/dashboard', active:false },
          { icon:'🏋️', label:'Mis Ejercicios', href:'/paciente/ejercicios', active:true  },
          { icon:'📅', label:'Mis Citas',      href:'/paciente/citas',     active:false },
          { icon:'📈', label:'Mi Progreso',    href:'/paciente/progreso',  active:false },
          { icon:'💳', label:'Mis Pagos',      href:'/paciente/pagos',     active:false },
          { icon:'⚙️', label:'Mis Datos',      href:'/paciente/perfil',    active:false },
        ]}
      />

      <div className="main">
        <div className="topbar">
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <MenuButton />
            <span className="topbar-title">Mis Ejercicios</span>
          </div>
          <div className="topbar-right">
            <div className="online-dot"><div className="dot"/> En línea</div>
            <TopbarActions userId={userId} rol="paciente" nombre={profile?.nombre_completo} />
          </div>
        </div>

        <div className="content">
          <div className="page-title">Mis Ejercicios</div>
          <div className="page-sub">Lo que tu terapeuta registró en cada sesión, con fotos y videos si los agregó</div>

          {sesiones.length > 0 && (
            <div className="resumen-grid">
              <div className="resumen-card">
                <div className="resumen-lbl">Sesiones con ejercicios</div>
                <div className="resumen-val">{sesiones.length}</div>
                <div className="resumen-sub">registradas por tu terapeuta</div>
              </div>
              <div className="resumen-card">
                <div className="resumen-lbl">Ejercicios totales</div>
                <div className="resumen-val">{totalEjercicios}</div>
                <div className="resumen-sub">a lo largo de tu tratamiento</div>
              </div>
              <div className="resumen-card">
                <div className="resumen-lbl">Última sesión</div>
                <div className="resumen-val">{ultimaSesion ? formatFechaHora(ultimaSesion.fecha_registro).split(',')[0] : '—'}</div>
                <div className="resumen-sub">{ultimaSesion ? `Dolor ${ultimaSesion.nivel_dolor}/10 · Movilidad ${ultimaSesion.movilidad}/10` : ''}</div>
              </div>
            </div>
          )}

          {sesiones.length === 0 ? (
            <div className="empty-card">
              <div className="empty-icon">🏋️</div>
              <div className="empty-title">Aún no tienes ejercicios registrados</div>
              <div className="empty-sub">Tu terapeuta los agrega después de cada cita completada.</div>
            </div>
          ) : (
            <div className="timeline">
              {sesiones.map((s, i) => (
                <div className="timeline-item" key={s.id_progreso_sesion}>
                  <div className="timeline-dot" />
                  {i !== sesiones.length - 1 && <div className="timeline-line" />}
                  <div className="timeline-card">
                    <div className="timeline-header">
                      <div className="timeline-fecha">{formatFechaHora(s.fecha_registro)}</div>
                      <div className="timeline-badges">
                        <span className={`nivel-badge ${nivelClass(s.nivel_dolor)}`}>🩹 Dolor: {s.nivel_dolor}/10</span>
                        <span className={`nivel-badge ${nivelClass(s.movilidad, true)}`}>🦵 Movilidad: {s.movilidad}/10</span>
                      </div>
                    </div>

                    {s.ejercicios && s.ejercicios.length > 0 && (
                      <div className="timeline-field">
                        <div className="timeline-field-lbl">Ejercicios de esta sesión</div>
                        <div className="ejercicios-chips">
                          {s.ejercicios.map((ej, idx) => (
                            <span className="ejercicio-chip" key={idx}>
                              {ej.ejercicio} <strong>×{ej.repeticiones}</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {s.observaciones && (
                      <div className="timeline-field">
                        <div className="timeline-field-lbl">Notas de tu terapeuta</div>
                        <div className="timeline-field-val">{s.observaciones}</div>
                      </div>
                    )}

                    {s.archivos && s.archivos.length > 0 && (
                      <div className="timeline-field">
                        <div className="timeline-field-lbl">Fotos / videos de la sesión</div>
                        <div className="timeline-galeria">
                          {s.archivos.map(a => (
                            <a key={a.path} href={a.url ?? '#'} target="_blank" rel="noopener noreferrer" className="archivo-thumb">
                              {a.url ? (
                                esVideo(a.tipo)
                                  ? <video src={a.url} className="thumb-media" muted />
                                  : <img src={a.url} className="thumb-media" alt={a.nombre} />
                              ) : (
                                <div className="thumb-placeholder">{esVideo(a.tipo) ? '🎬' : '🖼️'}</div>
                              )}
                              <div className="thumb-overlay">{esVideo(a.tipo) ? '▶ Ver video' : '🔍 Ver foto'}</div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <a href="#" className="chatbot-bubble" title="Asistente RC">💬</a>
    </>
  )
}