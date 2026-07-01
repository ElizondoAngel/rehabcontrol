'use client'

/**
 * ProgresoIndexClient.tsx
 * ─────────────────────────────────────────────────────────────
 * Índice de "Progreso" (Terapeuta) — tarjetas con sparkline SVG
 * de tendencia (dolor/movilidad), ordenamiento por urgencia, y
 * toggle entre vista de tarjetas y vista de lista compacta.
 */

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Sidebar, { MenuButton } from '@/app/components/Sidebar'
import TopbarActions from '@/app/components/TopbarActions'

interface Paciente {
  id_paciente: number
  nombre_completo: string
  curp: string
  activo: boolean
}
interface Sesion {
  id_progreso_sesion: number
  paciente_id: number
  nivel_dolor: number | null
  movilidad: number | null
  fecha_registro: string
}
interface Props {
  pacientes: Paciente[]
  sesiones: Sesion[]
  userNombre: string
  userId: string
}

type OrdenKey = 'urgencia' | 'nombre' | 'recientes' | 'menos_sesiones'

// ── SPARKLINE SVG — sin librerías, dos líneas (dolor + movilidad) ──
function Sparkline({ dolor, movilidad }: { dolor: number[]; movilidad: number[] }) {
  const W = 120, H = 36, PAD = 3
  const n = Math.max(dolor.length, 1)

  const toPoints = (arr: number[]) => {
    if (arr.length === 0) return ''
    if (arr.length === 1) {
      const y = H - PAD - (arr[0] / 10) * (H - PAD * 2)
      return `${PAD},${y} ${W - PAD},${y}`
    }
    return arr.map((v, i) => {
      const x = PAD + (i / (arr.length - 1)) * (W - PAD * 2)
      const y = H - PAD - (v / 10) * (H - PAD * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ')
  }

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{display:'block'}}>
      <line x1={PAD} y1={H/2} x2={W-PAD} y2={H/2} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      {movilidad.length > 0 && (
        <polyline points={toPoints(movilidad)} fill="none" stroke="#34D399" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
      )}
      {dolor.length > 0 && (
        <polyline points={toPoints(dolor)} fill="none" stroke="#F25555" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  )
}

function tiempoRelativo(iso: string) {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (dias <= 0) return 'Hoy'
  if (dias === 1) return 'Ayer'
  if (dias < 7) return `Hace ${dias} días`
  if (dias < 30) return `Hace ${Math.floor(dias/7)} sem`
  return `Hace ${Math.floor(dias/30)} meses`
}

export default function ProgresoIndexClient({ pacientes, sesiones, userNombre, userId }: Props) {
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState<OrdenKey>('urgencia')
  const [vista, setVista] = useState<'grid' | 'lista'>('grid')

  const pacientesSeguro = Array.isArray(pacientes) ? pacientes : []
  const sesionesSeguro = Array.isArray(sesiones) ? sesiones : []

  // sesionesSeguro viene ordenado ASC por fecha (del server). Agrupamos por paciente.
  const sesionesPorPaciente = useMemo(() => {
    const map = new Map<number, Sesion[]>()
    for (const s of sesionesSeguro) {
      const arr = map.get(s.paciente_id) ?? []
      arr.push(s)
      map.set(s.paciente_id, arr)
    }
    return map
  }, [sesionesSeguro])

  const datosPorPaciente = useMemo(() => {
    return pacientesSeguro.map(p => {
      const historial = sesionesPorPaciente.get(p.id_paciente) ?? []
      const dolorArr = historial.map(s => s.nivel_dolor ?? 0)
      const movArr = historial.map(s => s.movilidad ?? 0)
      const ultima = historial[historial.length - 1] ?? null
      const primera = historial[0] ?? null

      // "Urgencia": dolor actual alto + tendencia empeorando pesan más
      let urgencia = 0
      if (ultima) {
        urgencia += (ultima.nivel_dolor ?? 0) * 10
        if (primera && historial.length > 1) {
          const deltaDolor = (ultima.nivel_dolor ?? 0) - (primera.nivel_dolor ?? 0)
          urgencia += deltaDolor * 5 // empeora dolor = +urgencia
        }
      } else {
        urgencia = -1 // sin registros: al final por defecto en orden de urgencia
      }

      return {
        paciente: p,
        historial,
        dolorArr,
        movArr,
        ultima,
        primera,
        urgencia,
        totalSesiones: historial.length,
      }
    })
  }, [pacientesSeguro, sesionesPorPaciente])

  const filtrados = useMemo(() => {
    let lista = datosPorPaciente.filter(d =>
      !busqueda.trim() || d.paciente.nombre_completo.toLowerCase().includes(busqueda.toLowerCase())
    )
    lista = [...lista].sort((a, b) => {
      if (orden === 'urgencia') return b.urgencia - a.urgencia
      if (orden === 'nombre') return a.paciente.nombre_completo.localeCompare(b.paciente.nombre_completo)
      if (orden === 'menos_sesiones') return a.totalSesiones - b.totalSesiones
      if (orden === 'recientes') {
        const fechaA = a.ultima?.fecha_registro ?? ''
        const fechaB = b.ultima?.fecha_registro ?? ''
        return fechaB.localeCompare(fechaA)
      }
      return 0
    })
    return lista
  }, [datosPorPaciente, busqueda, orden])

  const conRegistro = datosPorPaciente.filter(d => d.totalSesiones > 0).length
  const sinRegistro = datosPorPaciente.length - conRegistro

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

        .main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
        .topbar{height:52px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 32px;flex-shrink:0}
        .topbar-title{font-size:13px;color:var(--muted);font-weight:500}
        .topbar-right{display:flex;align-items:center;gap:16px}
        .online-dot{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--light)}
        .dot{width:6px;height:6px;border-radius:50%;background:var(--light)}
        .notif{width:30px;height:30px;border-radius:8px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px}
        .content{flex:1;overflow-y:auto;padding:36px 40px}

        .page-title{font-size:28px;font-weight:700;color:var(--text);letter-spacing:-0.02em}
        .page-sub{font-size:13.5px;color:var(--muted);margin-top:6px;margin-bottom:24px}

        .summary-bar{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:26px}
        .summary-block{border-radius:14px;padding:16px 18px}
        .summary-block.b-blue{background:rgba(37,99,235,0.14);border:1px solid rgba(37,99,235,0.25)}
        .summary-block.b-green{background:rgba(52,211,153,0.12);border:1px solid rgba(52,211,153,0.25)}
        .summary-block.b-gray{background:rgba(140,155,181,0.1);border:1px solid rgba(140,155,181,0.22)}
        .summary-num{font-size:26px;font-weight:800;letter-spacing:-0.02em}
        .summary-block.b-blue .summary-num{color:var(--light)}
        .summary-block.b-green .summary-num{color:var(--green)}
        .summary-block.b-gray .summary-num{color:var(--gray)}
        .summary-lbl{font-size:12px;color:var(--text);margin-top:4px;font-weight:500}

        .toolbar{display:flex;gap:10px;margin-bottom:22px;flex-wrap:wrap;align-items:center;justify-content:space-between}
        .toolbar-left{display:flex;gap:10px;flex-wrap:wrap;flex:1}
        .search-wrap{position:relative;min-width:200px;max-width:300px;flex:1}
        .search-icon{position:absolute;left:13px;top:50%;transform:translateY(-50%);font-size:13px;color:var(--muted)}
        .search-input{width:100%;background:var(--card);border:1px solid var(--card-border);border-radius:10px;padding:9px 12px 9px 36px;font-size:13.5px;font-family:'DM Sans',sans-serif;color:var(--text);outline:none;transition:border-color .15s}
        .search-input:focus{border-color:var(--light)}
        .search-input::placeholder{color:var(--muted)}
        .sort-select{background:var(--card);border:1px solid var(--card-border);border-radius:10px;padding:9px 14px;font-size:13px;font-family:'DM Sans',sans-serif;color:var(--text);outline:none;cursor:pointer}
        .sort-select:focus{border-color:var(--light)}
        .view-toggle{display:flex;background:var(--card);border:1px solid var(--card-border);border-radius:10px;padding:3px;flex-shrink:0}
        .view-btn{background:none;border:none;padding:7px 12px;border-radius:7px;font-size:13px;color:var(--muted);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s}
        .view-btn.active{background:rgba(56,189,248,0.16);color:var(--light)}

        .legend{display:flex;gap:16px;align-items:center;margin-bottom:18px;font-size:12px;color:var(--muted)}
        .legend-item{display:flex;align-items:center;gap:6px}
        .legend-line{width:14px;height:2px;border-radius:2px}

        /* VISTA GRID */
        .prog-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .prog-card{background:var(--card);border:1px solid var(--card-border);border-radius:16px;padding:18px 20px;text-decoration:none;color:inherit;transition:transform .18s,border-color .18s;display:flex;flex-direction:column;gap:14px}
        .prog-card:hover{transform:translateY(-3px);border-color:rgba(56,189,248,0.3)}
        .prog-card-top{display:flex;align-items:center;gap:11px}
        .p-avatar{width:40px;height:40px;border-radius:50%;background:rgba(37,99,235,0.2);display:flex;align-items:center;justify-content:center;font-size:13.5px;font-weight:700;color:var(--light);flex-shrink:0}
        .p-name{font-size:14px;font-weight:600;color:var(--text)}
        .p-meta{font-size:10.5px;color:var(--muted);font-family:monospace;margin-top:1px}
        .urgente-flag{margin-left:auto;font-size:10px;font-weight:700;background:rgba(242,85,85,0.16);color:var(--red);padding:3px 8px;border-radius:100px;text-transform:uppercase;letter-spacing:.03em;white-space:nowrap}
        .spark-row{display:flex;align-items:center;justify-content:center;background:var(--surface2);border-radius:10px;padding:4px 0}
        .prog-card-stats{display:flex;justify-content:space-between;align-items:center}
        .stat-pair{display:flex;gap:14px}
        .stat-mini-item{}
        .stat-mini-label{font-size:9.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
        .stat-mini-val{font-size:14px;font-weight:700;margin-top:2px}
        .val-dolor{color:var(--red)}
        .val-mov{color:var(--green)}
        .stat-time{font-size:11px;color:var(--muted);text-align:right}
        .no-data-card{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:20px 0;color:var(--muted);font-size:12.5px;font-style:italic}

        /* VISTA LISTA */
        .prog-list{display:flex;flex-direction:column;gap:8px}
        .prog-list-row{display:grid;grid-template-columns:2.2fr 140px 1fr 1fr auto;gap:16px;align-items:center;background:var(--card);border:1px solid var(--card-border);border-radius:12px;padding:12px 18px;text-decoration:none;color:inherit;transition:border-color .15s}
        .prog-list-row:hover{border-color:rgba(56,189,248,0.3)}
        .list-spark-wrap{display:flex;justify-content:center}
        .list-chevron{color:var(--muted);font-size:14px}

        .empty-state{padding:60px 20px;text-align:center;color:var(--muted);font-size:14px;background:var(--card);border:1px dashed var(--card-border);border-radius:14px}

        .chatbot-bubble{position:fixed;bottom:28px;right:28px;width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,var(--mid),var(--light));display:flex;align-items:center;justify-content:center;font-size:20px;cursor:pointer;box-shadow:0 4px 16px rgba(37,99,235,0.35);transition:transform .2s;z-index:50;text-decoration:none}
        .chatbot-bubble:hover{transform:scale(1.08)}

        @media (max-width:1100px){ .prog-grid{grid-template-columns:repeat(2,1fr)} }
        @media (max-width:780px){
          .prog-grid{grid-template-columns:1fr}
          .prog-list-row{grid-template-columns:1.5fr 1fr auto;gap:10px}
          .list-spark-wrap, .prog-list-row > div:nth-child(3){display:none}
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
          {icon:'📅', label:'Mi Agenda',        href:'/terapeuta/agenda',      active:false},
          {icon:'📊', label:'Progreso',         href:'/terapeuta/progreso',    active:true},
        ]}
      />

      <div className="main">
        <div className="topbar">
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <MenuButton />
            <span className="topbar-title">Progreso</span>
          </div>
          <div className="topbar-right">
            <div className="online-dot"><div className="dot"/>En línea</div>
            <TopbarActions userId={userId} rol="terapeuta" nombre={userNombre} />
          </div>
        </div>

        <div className="content">
          <div className="page-title">Progreso de pacientes</div>
          <div className="page-sub">Evolución de dolor y movilidad sesión a sesión — selecciona un paciente para ver el historial completo</div>

          <div className="summary-bar">
            <div className="summary-block b-blue">
              <div className="summary-num">{datosPorPaciente.length}</div>
              <div className="summary-lbl">Pacientes asignados</div>
            </div>
            <div className="summary-block b-green">
              <div className="summary-num">{conRegistro}</div>
              <div className="summary-lbl">Con sesiones registradas</div>
            </div>
            <div className="summary-block b-gray">
              <div className="summary-num">{sinRegistro}</div>
              <div className="summary-lbl">Sin registros aún</div>
            </div>
          </div>

          <div className="toolbar">
            <div className="toolbar-left">
              <div className="search-wrap">
                <span className="search-icon">🔍</span>
                <input
                  className="search-input"
                  placeholder="Buscar paciente..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                />
              </div>
              <select className="sort-select" value={orden} onChange={e => setOrden(e.target.value as OrdenKey)}>
                <option value="urgencia">Ordenar: peor evolución primero</option>
                <option value="nombre">Ordenar: nombre (A-Z)</option>
                <option value="recientes">Ordenar: actividad reciente</option>
                <option value="menos_sesiones">Ordenar: menos sesiones primero</option>
              </select>
            </div>
            <div className="view-toggle">
              <button className={`view-btn${vista==='grid'?' active':''}`} onClick={() => setVista('grid')}>▦ Tarjetas</button>
              <button className={`view-btn${vista==='lista'?' active':''}`} onClick={() => setVista('lista')}>☰ Lista</button>
            </div>
          </div>

          {filtrados.length > 0 && (
            <div className="legend">
              <div className="legend-item"><span className="legend-line" style={{background:'#F25555'}}/>Dolor</div>
              <div className="legend-item"><span className="legend-line" style={{background:'#34D399'}}/>Movilidad</div>
              <span style={{color:'var(--muted)', opacity:0.7}}>· tendencia a lo largo de las sesiones registradas</span>
            </div>
          )}

          {filtrados.length === 0 ? (
            <div className="empty-state">
              {busqueda ? `Sin resultados para "${busqueda}"` : 'No tienes pacientes asignados aún'}
            </div>
          ) : vista === 'grid' ? (
            <div className="prog-grid">
              {filtrados.map(d => {
                const ini = d.paciente.nombre_completo.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()
                const esUrgente = d.ultima && (d.ultima.nivel_dolor ?? 0) >= 7
                return (
                  <Link href={`/terapeuta/progreso/${d.paciente.id_paciente}`} className="prog-card" key={d.paciente.id_paciente}>
                    <div className="prog-card-top">
                      <div className="p-avatar">{ini}</div>
                      <div>
                        <div className="p-name">{d.paciente.nombre_completo}</div>
                        <div className="p-meta">{d.paciente.curp}</div>
                      </div>
                      {esUrgente && <span className="urgente-flag">Dolor alto</span>}
                    </div>

                    {d.totalSesiones > 0 ? (
                      <>
                        <div className="spark-row">
                          <Sparkline dolor={d.dolorArr} movilidad={d.movArr} />
                        </div>
                        <div className="prog-card-stats">
                          <div className="stat-pair">
                            <div className="stat-mini-item">
                              <div className="stat-mini-label">Dolor</div>
                              <div className="stat-mini-val val-dolor">{d.ultima?.nivel_dolor ?? '—'}/10</div>
                            </div>
                            <div className="stat-mini-item">
                              <div className="stat-mini-label">Movilidad</div>
                              <div className="stat-mini-val val-mov">{d.ultima?.movilidad ?? '—'}/10</div>
                            </div>
                          </div>
                          <div className="stat-time">
                            {d.totalSesiones} sesión{d.totalSesiones !== 1 ? 'es' : ''}<br/>
                            {tiempoRelativo(d.ultima!.fecha_registro)}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="no-data-card">Sin sesiones registradas aún</div>
                    )}
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="prog-list">
              {filtrados.map(d => {
                const ini = d.paciente.nombre_completo.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()
                return (
                  <Link href={`/terapeuta/progreso/${d.paciente.id_paciente}`} className="prog-list-row" key={d.paciente.id_paciente}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div className="p-avatar">{ini}</div>
                      <div>
                        <div className="p-name">{d.paciente.nombre_completo}</div>
                        <div className="p-meta">{d.paciente.curp}</div>
                      </div>
                    </div>
                    <div className="list-spark-wrap">
                      {d.totalSesiones > 0
                        ? <Sparkline dolor={d.dolorArr} movilidad={d.movArr} />
                        : <span style={{fontSize:11, color:'var(--muted)', fontStyle:'italic'}}>Sin datos</span>}
                    </div>
                    <div>
                      {d.ultima ? <span className="stat-mini-val val-dolor" style={{fontSize:13}}>Dolor {d.ultima.nivel_dolor}/10</span> : <span style={{color:'var(--muted)',fontSize:12}}>—</span>}
                    </div>
                    <div>
                      {d.ultima ? <span className="stat-mini-val val-mov" style={{fontSize:13}}>Mov. {d.ultima.movilidad}/10</span> : <span style={{color:'var(--muted)',fontSize:12}}>—</span>}
                    </div>
                    <div className="list-chevron">→</div>
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