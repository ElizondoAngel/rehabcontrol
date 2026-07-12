'use client'

/**
 * ReportesClient.tsx
 * Admin — Reporte ejecutivo de la clínica
 *
 * DISEÑO: Layout de reporte ejecutivo en scroll vertical.
 * Una narrativa coherente: contexto → operaciones → dinero.
 * Sin pestañas redundantes. Exportable como PDF con window.print().
 *
 * FIX: paciente.nombre_completo usa alias 'paciente' del join FK explícito.
 */

import { useState } from 'react'
import Link from 'next/link'
import Sidebar, { MenuButton } from '@/app/components/Sidebar'
import TopbarActions from '@/app/components/TopbarActions'


interface Resumen {
  total_pacientes?: number; pacientes_activos?: number
  total_citas?: number; citas_completadas?: number; citas_este_mes?: number
  ingresos_totales?: number; ingresos_este_mes?: number; adeudos_pendientes?: number
}
interface CitaMes { mes: string; total: number; completadas: number; canceladas: number; programadas: number }
interface TerapeutaData { terapeuta: string; total_pacientes: number; pacientes_activos: number }
interface Pago {
  id_pago: number; monto: number; estado_pago: string
  metodo_pago: string; fecha_pago: string
  paciente?: { nombre_completo: string } | null
}
interface Props {
  resumen: Resumen
  citasPorMes: CitaMes[]
  pacientesPorTerapeuta: TerapeutaData[]
  citasPorEstado: Record<string,number>
  ultimosPagos: Pago[]
  userId: string
  rol: string
  nombre?: string
}

// ── GRÁFICA BARRAS ───────────────────────────────────────────
function GraficaBarras({ data }: { data: CitaMes[] }) {
  const max = Math.max(...data.map(d => Number(d.total)), 1)
  if (data.length === 0) return (
    <div style={{height:120,display:'flex',alignItems:'center',justifyContent:'center',color:'#8C9BB5',fontSize:13}}>
      Sin datos suficientes aún
    </div>
  )
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:10,height:120}}>
      {data.map((d, i) => (
        <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
          <div style={{width:'100%',height:90,display:'flex',alignItems:'flex-end',gap:2}}>
            <div style={{flex:1,background:'#34D399',borderRadius:'3px 3px 0 0',height:`${Math.max((Number(d.completadas)/max)*100,Number(d.completadas)>0?5:0)}%`,transition:'height .5s ease'}} title={`Completadas: ${d.completadas}`}/>
            <div style={{flex:1,background:'#38BDF8',borderRadius:'3px 3px 0 0',height:`${Math.max((Number(d.programadas)/max)*100,Number(d.programadas)>0?5:0)}%`,transition:'height .5s ease'}} title={`Programadas: ${d.programadas}`}/>
            {Number(d.canceladas)>0 && <div style={{flex:1,background:'#F25555',borderRadius:'3px 3px 0 0',height:`${Math.max((Number(d.canceladas)/max)*100,5)}%`,transition:'height .5s ease'}} title={`Canceladas: ${d.canceladas}`}/>}
          </div>
          <div style={{fontSize:9,color:'#8C9BB5',whiteSpace:'nowrap'}}>{d.mes}</div>
          <div style={{fontSize:11,fontWeight:700,color:'#E7EDF7'}}>{d.total}</div>
        </div>
      ))}
    </div>
  )
}

// ── DONA ──────────────────────────────────────────────────────
function Dona({ data }: { data: Record<string,number> }) {
  const total = Object.values(data).reduce((s,v)=>s+v,0)
  if (!total) return <div style={{color:'#8C9BB5',fontSize:12,textAlign:'center',padding:'12px 0'}}>Sin citas aún</div>
  const COLORES: Record<string,string> = { completada:'#34D399', programada:'#38BDF8', cancelada:'#F25555', no_asistio:'#F5B400' }
  const LABELS: Record<string,string> = { completada:'Completadas', programada:'Programadas', cancelada:'Canceladas', no_asistio:'No asistió' }
  let acc = 0
  const r = 40, cx = 48, cy = 48, circ = 2*Math.PI*r
  const segs = Object.entries(data).map(([k,v]) => { const s={k,v,pct:v/total,start:acc}; acc+=v/total; return s })
  return (
    <div style={{display:'flex',alignItems:'center',gap:16}}>
      <svg width={96} height={96} style={{flexShrink:0}}>
        {segs.map((s,i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={COLORES[s.k]??'#8C9BB5'} strokeWidth={14}
            strokeDasharray={`${s.pct*circ} ${circ-s.pct*circ}`}
            strokeDashoffset={circ*(0.25-s.start)}/>
        ))}
        <text x={cx} y={cy-3} textAnchor="middle" style={{fontSize:14,fontWeight:800,fill:'#E7EDF7'}}>{total}</text>
        <text x={cx} y={cy+10} textAnchor="middle" style={{fontSize:8,fill:'#8C9BB5'}}>citas</text>
      </svg>
      <div style={{flex:1,display:'flex',flexDirection:'column',gap:6}}>
        {segs.map(s=>(
          <div key={s.k} style={{display:'flex',alignItems:'center',gap:7}}>
            <div style={{width:7,height:7,borderRadius:'50%',background:COLORES[s.k]??'#8C9BB5',flexShrink:0}}/>
            <div style={{fontSize:11,color:'#8C9BB5',flex:1}}>{LABELS[s.k]??s.k}</div>
            <div style={{fontSize:11,fontWeight:600,color:'#E7EDF7'}}>{s.v}</div>
            <div style={{fontSize:10,color:'#8C9BB5'}}>{(s.pct*100).toFixed(0)}%</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ReportesClient({ resumen, citasPorMes, pacientesPorTerapeuta, citasPorEstado, ultimosPagos, userId, rol, nombre }: Props) {
  const [exportando, setExportando] = useState(false)

  const tasaAsist = resumen.total_citas
    ? Math.round((Number(resumen.citas_completadas)/Number(resumen.total_citas))*100) : 0

  const hoy = new Date().toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'})
  const METODO: Record<string,string> = { efectivo:'Efectivo', transferencia:'Transferencia', tarjeta:'Tarjeta', aseguradora:'Aseguradora' }

  function exportarPDF() {
    setExportando(true)
    setTimeout(() => { window.print(); setExportando(false) }, 100)
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .sidebar { display: none !important; }
          .topbar { display: none !important; }
          .main { overflow: visible !important; }
          .content { padding: 0 !important; overflow: visible !important; }
          body { background: #fff !important; color: #111 !important; font-family: 'Inter', sans-serif !important; }
          .reporte-body { color: #111 !important; background: #fff !important; }
          .print-section { break-inside: avoid; page-break-inside: avoid; }
          .stat-card { background: #f8f9fa !important; border: 1px solid #e0e0e0 !important; color: #111 !important; }
          .stat-num { color: #1a56db !important; -webkit-text-fill-color: #1a56db !important; }
          .divider { border-color: #e0e0e0 !important; }
          .tabla-fila { border-color: #e0e0e0 !important; }
          .tabla-th { color: #555 !important; }
          .section-eyebrow { color: #555 !important; }
          .section-title-print { color: #111 !important; }
        }
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
        .online-dot{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--cyan);font-weight:500}
        .dot{width:7px;height:7px;border-radius:50%;background:var(--cyan);box-shadow:0 0 8px var(--cyan)}
        .content{flex:1;overflow-y:auto;padding:32px 40px}

        /* REPORTE */
        .reporte-body{max-width:860px;margin:0 auto}
        .reporte-header{display:flex;align-items:flex-start;justify-content:space-between;padding-bottom:24px;border-bottom:2px solid var(--border);margin-bottom:36px}
        .reporte-clinic{font-size:11px;font-weight:700;color:var(--muted);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:8px}
        .reporte-titulo{font-size:34px;font-weight:800;color:var(--text);letter-spacing:-0.025em;line-height:1}
        .reporte-fecha{font-size:13px;color:var(--muted);margin-top:8px}
        .btn-pdf{background:linear-gradient(135deg,var(--blue),var(--cyan));color:#fff;border:none;border-radius:11px;padding:12px 22px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;display:flex;align-items:center;gap:8px;transition:transform .2s,box-shadow .2s;box-shadow:0 4px 18px rgba(37,99,235,0.32);white-space:nowrap;flex-shrink:0}
        .btn-pdf:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(56,189,248,0.4)}
        .btn-pdf:disabled{opacity:.6;cursor:not-allowed}

        /* SECCIÓN */
        .seccion{margin-bottom:44px}
        .seccion-eyebrow{font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:var(--cyan);margin-bottom:8px}
        .seccion-titulo{font-size:20px;font-weight:700;color:var(--text);letter-spacing:-0.01em;margin-bottom:20px;padding-bottom:12px;border-bottom:1px solid var(--border)}
        .divider{border:none;border-top:1px solid var(--border);margin:36px 0}

        /* STATS GRID */
        .stats-grid{display:grid;gap:12px}
        .stats-grid-4{grid-template-columns:repeat(4,1fr)}
        .stats-grid-3{grid-template-columns:repeat(3,1fr)}
        .stats-grid-2{grid-template-columns:repeat(2,1fr)}
        .stat-card{background:var(--card);border:1px solid var(--card-border);border-radius:14px;padding:18px 20px;position:relative}
        .stat-eyebrow{font-size:10px;font-weight:600;color:var(--muted);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px}
        .stat-num{font-size:26px;font-weight:800;letter-spacing:-0.02em;background:linear-gradient(110deg,var(--blue-2),var(--cyan));-webkit-background-clip:text;background-clip:text;color:transparent}
        .stat-num.green{background:var(--green);-webkit-background-clip:text;background-clip:text}
        .stat-num.red{background:var(--red);-webkit-background-clip:text;background-clip:text}
        .stat-sub{font-size:11px;color:var(--muted);margin-top:5px}

        /* GRID CONTENIDO */
        .content-grid{display:grid;grid-template-columns:1.4fr 1fr;gap:16px}
        .panel{background:var(--card);border:1px solid var(--card-border);border-radius:14px;padding:20px}
        .panel-title{font-size:12px;font-weight:700;color:var(--muted);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:16px;display:flex;align-items:center;gap:10px}
        .panel-title::after{content:'';flex:1;height:1px;background:var(--border)}
        .leyenda{display:flex;gap:14px;flex-wrap:wrap;margin-top:12px}
        .leyenda-item{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--muted)}
        .leyenda-dot{width:8px;height:8px;border-radius:2px}

        /* TERAPEUTAS */
        .terapeuta-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)}
        .terapeuta-row:last-child{border-bottom:none}
        .terapeuta-ini{width:34px;height:34px;border-radius:50%;background:rgba(56,189,248,0.15);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--text);flex-shrink:0}
        .terapeuta-nombre{font-size:13px;font-weight:500;color:var(--text);flex:1}
        .terapeuta-meta{font-size:11px;color:var(--muted)}
        .bar-track{height:5px;background:var(--surface2);border-radius:100px;overflow:hidden;flex:1}
        .bar-fill{height:100%;border-radius:100px;background:linear-gradient(90deg,var(--blue),var(--cyan))}

        /* TABLA PAGOS */
        .tabla-header{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:12px;padding:10px 16px;border-bottom:1px solid var(--border)}
        .tabla-th{font-size:10px;font-weight:700;color:var(--muted);letter-spacing:0.08em;text-transform:uppercase}
        .tabla-fila{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border);transition:background .15s}
        .tabla-fila:last-child{border-bottom:none}
        .tabla-fila:hover{background:var(--surface2)}
        .tabla-nombre{font-size:13px;font-weight:500;color:var(--text)}
        .tabla-monto{font-size:13px;font-weight:700;color:var(--green)}
        .tabla-meta{font-size:12px;color:var(--muted)}

        /* TASA */
        .tasa-container{display:flex;align-items:center;gap:12px;margin-top:14px;padding-top:14px;border-top:1px solid var(--border)}
        .tasa-num{font-size:32px;font-weight:800;color:var(--green)}
        .tasa-label{font-size:12px;color:var(--muted)}

        .chatbot-bubble{position:fixed;bottom:28px;right:28px;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--blue),var(--cyan));display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;box-shadow:0 8px 24px rgba(37,99,235,0.4);transition:transform .2s;z-index:50;text-decoration:none}
        .chatbot-bubble:hover{transform:scale(1.08)}

        @media(max-width:1100px){
          .stats-grid-4{grid-template-columns:repeat(2,1fr)}
          .content-grid{grid-template-columns:1fr}
        }
      `}</style>

      {/* SIDEBAR */}
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
                    {icon:'📊', label:'Reportes',             href:'/admin/reportes',         active:true},
                    {icon:'🕘', label:'Disponibilidad',       href:'/admin/disponibilidad',   active:false},
                    {icon:'⭐', label:'Opiniones',            href:'/admin/opiniones',        active:false},
                    {icon:'⚠️', label:'Solicitudes de Baja',  href:'/admin/solicitudes-baja', active:false},
                    {icon:'🔍', label:'Logs de Auditoría',   href:'/admin/logs',             active:false},
                    {icon:'⚙️', label:'Configuración',        href:'/admin/configuracion',    active:false},
                    ]}
                  />

      {/* MAIN */}
      <div className="main">
        <div className="topbar no-print">
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <MenuButton />
            <span className="topbar-title">Reportes</span>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:16}}>
            <div className="online-dot"><div className="dot"/>En línea</div>
            <TopbarActions userId={userId} rol={rol} nombre={nombre} />
          </div>
        </div>

        <div className="content">
          <div className="reporte-body">

            {/* ENCABEZADO DEL REPORTE */}
            <div className="reporte-header print-section">
              <div>
                <div className="reporte-clinic">RehabControl · Clínica de Rehabilitación</div>
                <div className="reporte-titulo">Reporte ejecutivo</div>
                <div className="reporte-fecha">Generado el {hoy} · Datos en tiempo real</div>
              </div>
              <button className="btn-pdf no-print" onClick={exportarPDF} disabled={exportando}>
                {exportando ? '⏳ Preparando…' : '⬇ Exportar PDF'}
              </button>
            </div>

            {/* ── SECCIÓN 1: PANORAMA GENERAL ── */}
            <div className="seccion print-section">
              <div className="seccion-eyebrow">01 · Panorama general</div>
              <div className="seccion-titulo">Estado actual de la clínica</div>
              <div className={`stats-grid stats-grid-4`}>
                {[
                  {eyebrow:'Pacientes activos',   num:String(resumen.pacientes_activos??0),  sub:`de ${resumen.total_pacientes??0} registrados`, cls:''},
                  {eyebrow:'Citas completadas',   num:`${tasaAsist}%`,                        sub:`${resumen.citas_completadas??0} de ${resumen.total_citas??0} citas`, cls:'green'},
                  {eyebrow:'Ingresos del mes',    num:`$${Number(resumen.ingresos_este_mes??0).toLocaleString('es-MX',{minimumFractionDigits:0})}`, sub:'cobrado este mes', cls:''},
                  {eyebrow:'Adeudos pendientes',  num:`$${Number(resumen.adeudos_pendientes??0).toLocaleString('es-MX',{minimumFractionDigits:0})}`, sub:'por cobrar', cls: Number(resumen.adeudos_pendientes??0)>0?'red':''},
                ].map(s => (
                  <div key={s.eyebrow} className="stat-card">
                    <div className="stat-eyebrow">{s.eyebrow}</div>
                    <div className={`stat-num ${s.cls}`}>{s.num}</div>
                    <div className="stat-sub">{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            <hr className="divider"/>

            {/* ── SECCIÓN 2: OPERACIONES ── */}
            <div className="seccion print-section">
              <div className="seccion-eyebrow">02 · Operaciones clínicas</div>
              <div className="seccion-titulo">Citas y rendimiento terapéutico</div>

              <div className="content-grid">
                {/* GRÁFICA */}
                <div className="panel">
                  <div className="panel-title">Citas últimos 6 meses</div>
                  <GraficaBarras data={citasPorMes} />
                  <div className="leyenda">
                    <span className="leyenda-item"><span className="leyenda-dot" style={{background:'#34D399'}}/> Completadas</span>
                    <span className="leyenda-item"><span className="leyenda-dot" style={{background:'#38BDF8'}}/> Programadas</span>
                    <span className="leyenda-item"><span className="leyenda-dot" style={{background:'#F25555'}}/> Canceladas</span>
                  </div>
                  <div className="tasa-container">
                    <div>
                      <div className="tasa-num">{tasaAsist}%</div>
                      <div className="tasa-label">tasa de asistencia histórica</div>
                    </div>
                    <div style={{flex:1,height:6,background:'var(--surface2)',borderRadius:100,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${tasaAsist}%`,background:'linear-gradient(90deg,#2563EB,#34D399)',borderRadius:100,transition:'width .5s ease'}}/>
                    </div>
                  </div>
                </div>

                {/* DONA + TERAPEUTAS */}
                <div style={{display:'flex',flexDirection:'column',gap:16}}>
                  <div className="panel">
                    <div className="panel-title">Por estado</div>
                    <Dona data={citasPorEstado} />
                  </div>
                  <div className="panel">
                    <div className="panel-title">Por terapeuta</div>
                    {pacientesPorTerapeuta.length === 0 ? (
                      <div style={{color:'#8C9BB5',fontSize:12}}>Sin terapeutas registrados</div>
                    ) : pacientesPorTerapeuta.map((t,i) => {
                      const max = Math.max(...pacientesPorTerapeuta.map(x=>x.total_pacientes),1)
                      const ini = t.terapeuta.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()
                      return (
                        <div key={i} className="terapeuta-row">
                          <div className="terapeuta-ini">{ini}</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div className="terapeuta-nombre">{t.terapeuta}</div>
                            <div style={{display:'flex',alignItems:'center',gap:8,marginTop:4}}>
                              <div className="bar-track">
                                <div className="bar-fill" style={{width:`${(t.total_pacientes/max)*100}%`}}/>
                              </div>
                              <div className="terapeuta-meta">{t.pacientes_activos} activos</div>
                            </div>
                          </div>
                          <div style={{fontSize:20,fontWeight:800,color:'#E7EDF7'}}>{t.total_pacientes}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            <hr className="divider"/>

            {/* ── SECCIÓN 3: FINANCIERO ── */}
            <div className="seccion print-section">
              <div className="seccion-eyebrow">03 · Situación financiera</div>
              <div className="seccion-titulo">Ingresos y pagos recientes</div>

              <div className={`stats-grid stats-grid-3`} style={{marginBottom:20}}>
                {[
                  {eyebrow:'Ingresos totales históricos', num:`$${Number(resumen.ingresos_totales??0).toLocaleString('es-MX',{minimumFractionDigits:0})}`, sub:'suma de todos los cobros'},
                  {eyebrow:'Ingresos este mes',           num:`$${Number(resumen.ingresos_este_mes??0).toLocaleString('es-MX',{minimumFractionDigits:0})}`, sub:`${new Date().toLocaleDateString('es-MX',{month:'long',year:'numeric'})}`},
                  {eyebrow:'Por cobrar',                  num:`$${Number(resumen.adeudos_pendientes??0).toLocaleString('es-MX',{minimumFractionDigits:0})}`, sub:'pagos pendientes activos', cls: Number(resumen.adeudos_pendientes??0)>0?'red':''},
                ].map(s => (
                  <div key={s.eyebrow} className="stat-card">
                    <div className="stat-eyebrow">{s.eyebrow}</div>
                    <div className={`stat-num ${'cls' in s ? s.cls : ''}`}>{s.num}</div>
                    <div className="stat-sub">{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* TABLA PAGOS */}
              <div style={{background:'var(--card)',border:'1px solid var(--card-border)',borderRadius:14,overflow:'hidden'}}>
                <div style={{padding:'16px 16px 12px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span style={{fontSize:12,fontWeight:700,color:'var(--muted)',letterSpacing:'0.08em',textTransform:'uppercase'}}>Últimos cobros registrados</span>
                  <span style={{fontSize:11,color:'var(--muted)'}}>10 más recientes</span>
                </div>
                <div className="tabla-header">
                  {['Paciente','Monto','Método','Fecha'].map(h => <div key={h} className="tabla-th">{h}</div>)}
                </div>
                {ultimosPagos.length === 0 && (
                  <div style={{padding:'32px 16px',textAlign:'center',color:'var(--muted)',fontSize:13}}>Sin cobros registrados aún</div>
                )}
                {ultimosPagos.map((p,i) => (
                  <div key={p.id_pago} className="tabla-fila">
                    <div className="tabla-nombre">{p.paciente?.nombre_completo ?? '—'}</div>
                    <div className="tabla-monto">${Number(p.monto).toLocaleString('es-MX',{minimumFractionDigits:2})}</div>
                    <div className="tabla-meta">{METODO[p.metodo_pago]??p.metodo_pago}</div>
                    <div className="tabla-meta">{new Date(p.fecha_pago).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'})}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* PIE DEL REPORTE */}
            <div style={{marginTop:32,paddingTop:20,borderTop:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}} className="print-section">
              <div style={{fontSize:11,color:'var(--muted)'}}>RehabControl v2.1 · Reporte generado automáticamente</div>
              <div style={{fontSize:11,color:'var(--muted)'}}>{hoy}</div>
            </div>

          </div>
        </div>
      </div>

      <a href="#" className="chatbot-bubble no-print" title="Asistente RC">💬</a>
    </>
  )
}
