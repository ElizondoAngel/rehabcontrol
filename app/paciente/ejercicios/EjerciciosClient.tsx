'use client'

/**
 * EjerciciosClient.tsx (Paciente)
 * ─────────────────────────────────────────────────────────────
 * El paciente SOLO ve y practica los ejercicios que su fisioterapeuta
 * le asignó en su Expediente Clínico (seleccionados de los 6 ejercicios fijos),
 * con el conteo exacto de repeticiones meta, captura automática de posturas (.jpg)
 * y grabación de video (.webm) para revisión del terapeuta.
 */

import { useState } from 'react'
import Sidebar, { MenuButton } from '@/app/components/Sidebar'
import TopbarActions from '@/app/components/TopbarActions'
import EvaluadorBiomecanico, {
  CATALOGO_EJERCICIOS_IA,
} from '@/app/components/EvaluadorBiomecanico'
import { EjercicioAsignadoIA } from '@/lib/rutina-ia'

interface ArchivoProgreso {
  path: string
  nombre: string
  tipo: string
  tamano: number
  subido_en: string
  url?: string | null
}

interface EjercicioRealizado {
  ejercicio: string
  repeticiones?: number
  repeticiones_meta?: number
  modo_adaptado?: boolean
  repeticiones_estandar?: number
  repeticiones_adaptadas?: number
  repeticiones_incompletas?: number
  angulo_mejor_rango?: number
  precision_porcentaje?: number
  evaluado_por_ia?: boolean
}

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
  rutinaAsignada: EjercicioAsignadoIA[]
  userId: string
}

function formatFechaHora(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function nivelClass(n: number, invertido = false) {
  if (invertido) return n >= 7 ? 'nivel-bueno' : n >= 4 ? 'nivel-medio' : 'nivel-malo'
  return n <= 3 ? 'nivel-bueno' : n <= 6 ? 'nivel-medio' : 'nivel-malo'
}

function esVideo(tipo: string) {
  return tipo.startsWith('video/')
}

export default function EjerciciosClient({
  profile,
  sesiones: sesionesIniciales,
  rutinaAsignada,
  userId,
}: Props) {
  const [sesiones, setSesiones] = useState<Sesion[]>(sesionesIniciales)
  const [vistaActiva, setVistaActiva] = useState<'catalogo' | 'evaluador'>('catalogo')
  const [indiceSeleccionado, setIndiceSeleccionado] = useState<number>(0)

  const totalEjercicios = sesiones.reduce((acc, s) => acc + (s.ejercicios?.length ?? 0), 0)
  const ultimaSesion = sesiones[0] ?? null

  function iniciarEnIndice(idx: number) {
    setIndiceSeleccionado(idx)
    setVistaActiva('evaluador')
  }

  function handleSerieGuardada(nuevaSesion: Sesion) {
    setSesiones(prev => [nuevaSesion, ...prev])
    setVistaActiva('catalogo')
  }

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

        .ia-section{background:linear-gradient(180deg,rgba(15,23,42,0.85) 0%,rgba(10,18,32,0.92) 100%);border:1px solid rgba(56,189,248,0.25);border-radius:18px;padding:22px;margin-bottom:28px}
        .ia-header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;margin-bottom:18px}
        .ia-badge{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;padding:4px 10px;border-radius:100px;background:rgba(56,189,248,0.14);color:var(--cyan);border:1px solid rgba(56,189,248,0.3);margin-bottom:6px}
        .ia-title{font-size:19px;font-weight:800;color:var(--text)}
        .ia-sub{font-size:13px;color:var(--muted);margin-top:2px}

        .catalogo-grid{display:grid;grid-template-columns:repeat(auto-fill, minmax(270px, 1fr));gap:14px}
        .ej-card{background:rgba(6,11,20,0.75);border:1px solid var(--card-border);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;transition:transform .18s,border-color .18s}
        .ej-card:hover{transform:translateY(-2px);border-color:rgba(56,189,248,0.45)}
        .ej-thumb-wrap{position:relative;height:145px;background:#0F172A;overflow:hidden}
        .ej-thumb{width:100%;height:100%;object-fit:cover;display:block}
        .ej-num-badge{position:absolute;top:10px;left:10px;background:rgba(6,11,20,0.88);border:1px solid rgba(56,189,248,0.4);color:var(--cyan);font-size:11px;font-weight:800;padding:4px 10px;border-radius:8px}
        .ej-meta-badge{position:absolute;bottom:10px;right:10px;background:rgba(6,11,20,0.92);border:1px solid rgba(52,211,153,0.45);color:var(--green);font-size:11.5px;font-weight:800;padding:4px 10px;border-radius:8px}
        .ej-body{padding:14px 16px;display:flex;flex-direction:column;flex:1;gap:8px}
        .ej-name{font-size:15px;font-weight:700;color:var(--text)}
        .ej-art{font-size:11px;color:var(--cyan);font-weight:600}
        .ej-desc{font-size:12px;color:var(--muted);line-height:1.45;flex:1}
        .ej-btn{margin-top:6px;width:100%;padding:10px 14px;border-radius:10px;background:linear-gradient(135deg,var(--blue),var(--cyan));border:none;color:#fff;font-size:12.5px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:opacity .15s}
        .ej-btn:hover{opacity:0.92}

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
        .timeline-field-lbl{font-size:10.5px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:5px}
        .timeline-field-val{font-size:13px;color:var(--text);line-height:1.5;white-space:pre-wrap}

        .ejercicios-chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}
        .ejercicio-chip{font-size:12px;color:var(--text);background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:6px 12px;display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap}
        .ejercicio-chip strong{color:var(--cyan);font-weight:700}

        .timeline-galeria{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
        .archivo-thumb{position:relative;width:110px;height:96px;border-radius:10px;overflow:hidden;border:1px solid var(--border);background:var(--surface2);cursor:pointer;padding:0;flex-shrink:0}
        .thumb-media{width:100%;height:100%;object-fit:cover;display:block}
        .thumb-placeholder{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:26px}
        .thumb-overlay{position:absolute;inset:0;background:rgba(0,0,0,0.55);color:#fff;font-size:10px;font-weight:600;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s;text-align:center;padding:4px}
        .archivo-thumb:hover .thumb-overlay{opacity:1}

        .empty-card{background:var(--card);border:1px dashed var(--card-border);border-radius:16px;padding:42px 24px;text-align:center}
        .empty-icon{font-size:36px;margin-bottom:12px}
        .empty-title{font-size:15px;font-weight:600;color:var(--text);margin-bottom:6px}
        .empty-sub{font-size:13px;color:var(--muted)}

        @media (max-width:900px){ .resumen-grid{grid-template-columns:1fr} }
      `}</style>

      <Sidebar
        rol="paciente"
        nombre={profile?.nombre_completo ?? ''}
        subRol="Solo su información"
        icono="👤"
        items={[
          { icon: '🏠', label: 'Mi Inicio', href: '/paciente/dashboard', active: false },
          { icon: '📅', label: 'Mis Citas', href: '/paciente/citas', active: false },
          { icon: '🏋️', label: 'Mis Ejercicios', href: '/paciente/ejercicios', active: true },
          { icon: '📈', label: 'Mi Progreso', href: '/paciente/progreso', active: false },
          { icon: '💳', label: 'Mis Pagos', href: '/paciente/pagos', active: false },
          { icon: '⭐', label: 'Mis Opiniones', href: '/paciente/opiniones', active: false },
          { icon: '⚙️', label: 'Mis Datos', href: '/paciente/perfil', active: false },
        ]}
      />

      <div className="main">
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <MenuButton />
            <span className="topbar-title">Mis Ejercicios Asignados · Terapia Interactiva</span>
          </div>
          <div className="topbar-right">
            <div className="online-dot">
              <div className="dot" /> En línea
            </div>
            <TopbarActions userId={userId} rol="paciente" nombre={profile?.nombre_completo} />
          </div>
        </div>

        <div className="content">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 14,
              marginBottom: 20,
            }}
          >
            <div>
              <div className="page-title">Mis Ejercicios Asignados</div>
              <div className="page-sub" style={{ marginBottom: 0 }}>
                Aquí aparecen únicamente los ejercicios que tu fisioterapeuta asignó en tu expediente clínico
              </div>
            </div>

            {rutinaAsignada.length > 0 && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setVistaActiva('catalogo')}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    background:
                      vistaActiva === 'catalogo'
                        ? 'linear-gradient(135deg, var(--blue), var(--cyan))'
                        : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${vistaActiva === 'catalogo' ? 'var(--cyan)' : 'var(--border)'}`,
                    color: '#fff',
                  }}
                >
                  📋 Ver Mi Rutina Asignada
                </button>
                <button
                  type="button"
                  onClick={() => iniciarEnIndice(0)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    background:
                      vistaActiva === 'evaluador'
                        ? 'linear-gradient(135deg, var(--blue), var(--cyan))'
                        : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${vistaActiva === 'evaluador' ? 'var(--cyan)' : 'var(--border)'}`,
                    color: '#fff',
                  }}
                >
                  🎥 Iniciar Terapia Interactiva
                </button>
              </div>
            )}
          </div>

          {vistaActiva === 'evaluador' && rutinaAsignada.length > 0 ? (
            <EvaluadorBiomecanico
              rutinaAsignada={rutinaAsignada}
              indiceInicial={indiceSeleccionado}
              onVolverCatalogo={() => setVistaActiva('catalogo')}
              onSerieGuardada={handleSerieGuardada}
            />
          ) : (
            <>
              {/* SECCIÓN EXCLUSIVA: EJERCICIOS ASIGNADOS POR EL TERAPEUTA EN EL EXPEDIENTE */}
              <div className="ia-section">
                <div className="ia-header">
                  <div>
                    <div className="ia-badge">⚡ MONITOR BIOMECÁNICO EN VIVO</div>
                    <div className="ia-title">
                      Ejercicios Asignados por tu Fisioterapeuta ({rutinaAsignada.length})
                    </div>
                    <div className="ia-sub">
                      La cámara contará exactamente las repeticiones indicadas y enviará tu grabación y posturas a tu terapeuta al terminar
                    </div>
                  </div>

                  {rutinaAsignada.length > 0 && (
                    <button
                      type="button"
                      onClick={() => iniciarEnIndice(0)}
                      style={{
                        padding: '12px 20px',
                        borderRadius: 12,
                        background: 'linear-gradient(135deg, #2563EB, #38BDF8)',
                        border: 'none',
                        color: '#fff',
                        fontSize: 13.5,
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: '0 8px 24px rgba(37,99,235,0.38)',
                      }}
                    >
                      ▶ Comenzar Rutina Completa ({rutinaAsignada.length} ejercicios)
                    </button>
                  )}
                </div>

                {rutinaAsignada.length === 0 ? (
                  <div className="empty-card" style={{ padding: '32px 20px' }}>
                    <div className="empty-icon">🩺</div>
                    <div className="empty-title">
                      Tu fisioterapeuta aún no te ha asignado ejercicios en tu plan activo
                    </div>
                    <div className="empty-sub">
                      Cuando tu terapeuta actualice tu expediente clínico y seleccione tus ejercicios y repeticiones, aparecerán aquí automáticamente.
                    </div>
                  </div>
                ) : (
                  <div className="catalogo-grid">
                    {rutinaAsignada.map((asignado, idx) => {
                      const info =
                        CATALOGO_EJERCICIOS_IA.find(c => c.nombre === asignado.ejercicio) ??
                        CATALOGO_EJERCICIOS_IA[0]

                      return (
                        <div className="ej-card" key={asignado.ejercicio}>
                          <div className="ej-thumb-wrap">
                            <img
                              src={info.imagenRef}
                              alt={info.nombre}
                              className="ej-thumb"
                              onError={e => {
                                ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                              }}
                            />
                            <span className="ej-num-badge">Paso #{idx + 1}</span>
                            <span className="ej-meta-badge">
                              Meta: ×{asignado.repeticiones} repeticiones
                            </span>
                          </div>
                          <div className="ej-body">
                            <div className="ej-name">{info.nombre}</div>
                            <div className="ej-art">📐 {info.articulaciones}</div>
                            <div className="ej-desc">{info.descripcion}</div>
                            <div style={{ fontSize: 11.5, color: '#CBD5E1' }}>
                              Modalidad asignada:{' '}
                              <strong style={{ color: asignado.modo_adaptado ? '#FBBF24' : '#34D399' }}>
                                {asignado.modo_adaptado
                                  ? `🦿 Modo Adaptado por Lesión (${info.metaAdaptada})`
                                  : `⚡ Modo Estándar (${info.metaEstandar})`}
                              </strong>
                            </div>
                            <button
                              type="button"
                              className="ej-btn"
                              onClick={() => iniciarEnIndice(idx)}
                            >
                              <span>🎥 Iniciar Sesión Guiada ({asignado.repeticiones} repeticiones)</span>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* TARJETAS DE RESUMEN DE SESIONES */}
              {sesiones.length > 0 && (
                <div className="resumen-grid">
                  <div className="resumen-card">
                    <div className="resumen-lbl">Sesiones con ejercicios</div>
                    <div className="resumen-val">{sesiones.length}</div>
                    <div className="resumen-sub">registradas en tu tratamiento</div>
                  </div>
                  <div className="resumen-card">
                    <div className="resumen-lbl">Ejercicios totales</div>
                    <div className="resumen-val">{totalEjercicios}</div>
                    <div className="resumen-sub">a lo largo de tu tratamiento</div>
                  </div>
                  <div className="resumen-card">
                    <div className="resumen-lbl">Última sesión</div>
                    <div className="resumen-val">
                      {ultimaSesion ? formatFechaHora(ultimaSesion.fecha_registro).split(',')[0] : '—'}
                    </div>
                    <div className="resumen-sub">
                      {ultimaSesion
                        ? `Dolor ${ultimaSesion.nivel_dolor}/10 · Movilidad ${ultimaSesion.movilidad}/10`
                        : ''}
                    </div>
                  </div>
                </div>
              )}

              {/* HISTORIAL DE SESIONES Y RETROALIMENTACIÓN */}
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, color: '#F8FAFC' }}>
                Historial de Sesiones, Grabaciones y Notas de tu Terapeuta
              </div>

              {sesiones.length === 0 ? (
                <div className="empty-card">
                  <div className="empty-icon">🏋️</div>
                  <div className="empty-title">Aún no tienes sesiones registradas</div>
                  <div className="empty-sub">
                    Completa tu rutina asignada con la Cámara IA para guardar tu progreso.
                  </div>
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
                            <span className={`nivel-badge ${nivelClass(s.nivel_dolor)}`}>
                              🩹 Dolor: {s.nivel_dolor}/10
                            </span>
                            <span className={`nivel-badge ${nivelClass(s.movilidad, true)}`}>
                              🦵 Movilidad: {s.movilidad}/10
                            </span>
                          </div>
                        </div>

                        {s.ejercicios && s.ejercicios.length > 0 && (
                          <div className="timeline-field">
                            <div className="timeline-field-lbl">Ejercicios de esta sesión</div>
                            <div className="ejercicios-chips">
                              {s.ejercicios.map((ej, idx) => {
                                const repsTotales =
                                  ej.repeticiones ??
                                  (ej.repeticiones_estandar ?? 0) + (ej.repeticiones_adaptadas ?? 0)
                                const tieneTelemetriaIA =
                                  ej.precision_porcentaje !== undefined ||
                                  ej.angulo_mejor_rango !== undefined

                                return (
                                  <span className="ejercicio-chip" key={idx}>
                                    <span>
                                      {tieneTelemetriaIA ? '🤖 ' : ''}
                                      {ej.ejercicio}{' '}
                                      <strong>
                                        ×{repsTotales}
                                        {ej.repeticiones_meta ? `/${ej.repeticiones_meta}` : ''}
                                      </strong>
                                    </span>
                                    {tieneTelemetriaIA && (
                                      <span
                                        style={{
                                          fontSize: 11,
                                          color: '#94A3B8',
                                          borderLeft: '1px solid rgba(255,255,255,0.14)',
                                          paddingLeft: 6,
                                        }}
                                      >
                                        Est: <b style={{ color: '#34D399' }}>{ej.repeticiones_estandar ?? 0}</b> · Adap:{' '}
                                        <b style={{ color: '#38BDF8' }}>{ej.repeticiones_adaptadas ?? 0}</b> · Inc:{' '}
                                        <b style={{ color: '#F87171' }}>{ej.repeticiones_incompletas ?? 0}</b> · Rango:{' '}
                                        <b style={{ color: '#F8FAFC' }}>{ej.angulo_mejor_rango}°</b> · Precisión:{' '}
                                        <b style={{ color: '#34D399' }}>{ej.precision_porcentaje}%</b>
                                      </span>
                                    )}
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {s.observaciones && (
                          <div className="timeline-field">
                            <div className="timeline-field-lbl">Notas de tu terapeuta / Resumen de sesión</div>
                            <div className="timeline-field-val">{s.observaciones}</div>
                          </div>
                        )}

                        {s.archivos && s.archivos.length > 0 && (
                          <div className="timeline-field">
                            <div className="timeline-field-lbl">
                              Grabación y capturas de postura enviadas a tu terapeuta
                            </div>
                            <div className="timeline-galeria">
                              {s.archivos.map(a => (
                                <a
                                  key={a.path}
                                  href={a.url ?? '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="archivo-thumb"
                                >
                                  {a.url ? (
                                    esVideo(a.tipo) ? (
                                      <video src={a.url} className="thumb-media" muted />
                                    ) : (
                                      <img src={a.url} className="thumb-media" alt={a.nombre} />
                                    )
                                  ) : (
                                    <div className="thumb-placeholder">{esVideo(a.tipo) ? '🎬' : '🖼️'}</div>
                                  )}
                                  <div className="thumb-overlay">
                                    {esVideo(a.tipo) ? '▶ Ver grabación' : '🔍 Ver postura'}
                                  </div>
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
            </>
          )}
        </div>
      </div>
    </>
  )
}
