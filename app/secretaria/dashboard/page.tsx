import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function SecretariaDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hoy = new Date().toISOString().split('T')[0]
  const inicioHoy = `${hoy}T00:00:00`
  const finHoy    = `${hoy}T23:59:59`

  // ── Citas de hoy con paciente, terapeuta y pago relacionado ────
  const { data: citasHoy } = await supabase
    .from('citas')
    .select(`*, pacientes(nombre_completo), profiles!citas_terapeuta_id_fkey(nombre_completo), pagos(monto, estado_pago, metodo_pago)`)
    .gte('fecha_hora', inicioHoy)
    .lte('fecha_hora', finHoy)
    .order('fecha_hora', { ascending: true })

  // ── Conteo de pacientes activos ────────────────────────────────
  const { count: pacientesActivos } = await supabase
    .from('pacientes')
    .select('*', { count: 'exact', head: true })
    .eq('activo', true)

  // ── Terapeutas activos ──────────────────────────────────────────
  const { count: terapeutasActivos } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('rol', 'terapeuta')
    .eq('activo', true)

  // ── Pagos pendientes (global) ───────────────────────────────────
  const { data: pagosPendientes } = await supabase
    .from('pagos')
    .select('monto')
    .eq('estado_pago', 'pendiente')

  const citas = citasHoy ?? []
  const citasConfirmadas = citas.filter(c => c.estado === 'programada' || c.estado === 'completada').length
  const totalPagosPendientes = pagosPendientes?.length ?? 0
  const terapeutasEnAgendaHoy = new Set(citas.map(c => c.terapeuta_id)).size

  const ESTADO_LABELS: Record<string,string> = { programada:'Programada', completada:'Completada', cancelada:'Cancelada', no_asistio:'No asistió' }
  const ESTADO_CLASS:  Record<string,string> = { programada:'b-blue', completada:'b-green', cancelada:'b-red', no_asistio:'b-amber' }
  const METODO_LABELS: Record<string,string> = { efectivo:'Efectivo', transferencia:'Transferencia', tarjeta:'Tarjeta', aseguradora:'Aseguradora' }

  return (
    <>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --bg:#060B14;--sidebar:#0A1220;--card:rgba(255,255,255,0.035);--card-border:rgba(255,255,255,0.09);
          --border:rgba(255,255,255,0.09);--surface2:rgba(255,255,255,0.07);
          --blue:#2563EB;--blue-2:#3B82F6;--cyan:#38BDF8;
          --text:#E7EDF7;--muted:#8C9BB5;
          --red:#F25555;--amber:#F5B400;--green:#34D399;
        }
        body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex}

        .sidebar{width:260px;min-height:100vh;background:var(--sidebar);border-right:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0}
        .sb-brand{padding:20px 20px 16px;border-bottom:1px solid var(--border)}
        .sb-logo-row{display:flex;align-items:center;gap:10px}
        .sb-logo{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,var(--blue),var(--cyan));display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;box-shadow:0 0 18px rgba(56,189,248,0.3)}
        .sb-name{font-size:14px;font-weight:700;color:var(--text);letter-spacing:-0.01em}
        .sb-ver{font-size:10px;color:var(--muted)}
        .sb-role{margin:12px 12px 4px;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:10px}
        .sb-role-icon{width:32px;height:32px;border-radius:9px;background:rgba(56,189,248,0.14);border:1px solid rgba(56,189,248,0.25);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
        .sb-role-name{font-size:13px;font-weight:600;color:var(--text)}
        .sb-role-sub{font-size:11px;color:var(--cyan)}
        .sb-nav{flex:1;padding:8px 10px}
        .sb-nav a{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;font-size:14px;font-weight:500;color:var(--muted);text-decoration:none;transition:all .18s;margin-bottom:2px}
        .sb-nav a:hover{background:var(--surface2);color:var(--text)}
        .sb-nav a.active{background:linear-gradient(135deg,rgba(37,99,235,0.18),rgba(56,189,248,0.12));color:var(--cyan);box-shadow:inset 0 0 0 1px rgba(56,189,248,0.2)}
        .sb-nav-icon{font-size:16px;width:20px;text-align:center}
        .sb-bottom{padding:12px 10px;border-top:1px solid var(--border)}
        .sb-bottom a{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;font-size:14px;font-weight:500;color:var(--muted);text-decoration:none;transition:color .18s}
        .sb-bottom a:hover{color:var(--red)}

        .main{flex:1;display:flex;flex-direction:column;overflow:hidden}
        .topbar{height:56px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 28px;flex-shrink:0}
        .topbar-title{font-size:14px;color:var(--muted);font-weight:500}
        .topbar-right{display:flex;align-items:center;gap:16px}
        .online-dot{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--cyan);font-weight:500}
        .dot{width:7px;height:7px;border-radius:50%;background:var(--cyan);box-shadow:0 0 8px var(--cyan)}
        .notif{width:32px;height:32px;border-radius:9px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:15px;transition:background .18s}
        .notif:hover{background:var(--surface2)}
        .content{flex:1;overflow-y:auto;padding:28px}
        .page-title{font-size:26px;font-weight:800;color:var(--text);margin-bottom:4px;letter-spacing:-0.015em}
        .page-sub{font-size:14px;color:var(--muted);margin-bottom:28px}

        .metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px}
        .metric{background:var(--card);border:1px solid var(--card-border);border-radius:16px;padding:20px 22px;position:relative;overflow:hidden;transition:border-color .2s,transform .2s}
        .metric:hover{border-color:rgba(56,189,248,0.3);transform:translateY(-2px)}
        .metric-label{font-size:12px;color:var(--muted);margin-bottom:12px;font-weight:500}
        .metric-num{font-size:30px;font-weight:800;letter-spacing:-0.02em;line-height:1;background:linear-gradient(110deg,var(--blue-2),var(--cyan));-webkit-background-clip:text;background-clip:text;color:transparent}
        .metric-sub{font-size:12px;color:var(--muted);margin-top:6px}
        .metric-icon{position:absolute;top:18px;right:18px;width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px}
        .icon-purple{background:rgba(167,139,250,0.15)}
        .icon-amber{background:rgba(245,180,0,0.15)}
        .icon-green{background:rgba(52,211,153,0.15)}
        .icon-blue{background:rgba(56,189,248,0.15)}

        .table-card{background:var(--card);border:1px solid var(--card-border);border-radius:16px;padding:22px}
        .table-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
        .table-title{font-size:15px;font-weight:600;color:var(--text)}
        .btn-new{background:linear-gradient(135deg,var(--blue),var(--cyan));color:#fff;border:none;border-radius:9px;padding:8px 16px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;box-shadow:0 4px 16px rgba(37,99,235,0.3);transition:transform .2s,box-shadow .2s}
        .btn-new:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(56,189,248,0.4)}
        .agenda-row{display:flex;align-items:center;padding:13px 0;border-bottom:1px solid var(--border)}
        .agenda-row:last-child{border-bottom:none}
        .ag-time{font-size:13px;font-weight:600;color:var(--cyan);width:52px;flex-shrink:0}
        .ag-info{flex:1}
        .ag-name{font-size:13px;font-weight:500;color:var(--text)}
        .ag-doc{font-size:11px;color:var(--muted)}
        .ag-badges{display:flex;gap:6px}
        .badge{font-size:11px;font-weight:600;padding:3px 10px;border-radius:100px}
        .b-green{background:rgba(52,211,153,0.15);color:var(--green)}
        .b-amber{background:rgba(245,180,0,0.15);color:var(--amber)}
        .b-red{background:rgba(242,85,85,0.15);color:var(--red)}
        .b-blue{background:rgba(56,189,248,0.15);color:var(--cyan)}
        .chatbot-bubble{position:fixed;bottom:28px;right:28px;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--blue),var(--cyan));display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;box-shadow:0 8px 24px rgba(37,99,235,0.4);transition:transform .2s;z-index:50;text-decoration:none}
        .chatbot-bubble:hover{transform:scale(1.08)}
      `}</style>

      <div className="sidebar">
        <div className="sb-brand">
          <div className="sb-logo-row">
            <div className="sb-logo">RC</div>
            <div><div className="sb-name">RehabControl</div><div className="sb-ver">v2.1</div></div>
          </div>
        </div>
        <div className="sb-role">
          <div className="sb-role-icon">📁</div>
          <div><div className="sb-role-name">Secretaria</div><div className="sb-role-sub">Acceso Operativo</div></div>
        </div>
        <nav className="sb-nav">
          {[
            {icon:'🏠', label:'Panel',           href:'/secretaria/dashboard', active:true},
            {icon:'📅', label:'Agenda General',  href:'/secretaria/citas',     active:false},
            {icon:'👥', label:'Pacientes',        href:'/secretaria/pacientes', active:false},
            {icon:'💳', label:'Pagos',            href:'/secretaria/pagos',     active:false},
          ].map(n => (
            <Link key={n.label} href={n.href} className={n.active?'active':''}>
              <span className="sb-nav-icon">{n.icon}</span>{n.label}
            </Link>
          ))}
        </nav>
        <div className="sb-bottom">
          <Link href="/login"><span className="sb-nav-icon">→</span> Cerrar Sesión</Link>
        </div>
      </div>

      <div className="main">
        <div className="topbar">
          <span className="topbar-title">Panel</span>
          <div className="topbar-right">
            <div className="online-dot"><div className="dot"/> En línea</div>
            <div className="notif">🔔</div>
          </div>
        </div>
        <div className="content">
          <div className="page-title">Panel de Secretaría</div>
          <div className="page-sub">Citas, pacientes y pagos — sin acceso a expedientes clínicos</div>

          <div className="metrics">
            {[
              {label:'Citas hoy',             num:String(citas.length),  sub:`${citasConfirmadas} confirmadas`,        icon:'📅', cls:'icon-purple'},
              {label:'Pagos pendientes',      num:String(totalPagosPendientes),  sub:'por cobrar',                     icon:'💳', cls:'icon-amber'},
              {label:'Pacientes activos',     num:String(pacientesActivos ?? 0), sub:'base actual',                    icon:'👥', cls:'icon-green'},
              {label:'Terapeutas activos',    num:String(terapeutasActivos ?? 0), sub:`${terapeutasEnAgendaHoy} en agenda hoy`, icon:'📈', cls:'icon-blue'},
            ].map(m => (
              <div className="metric" key={m.label}>
                <div className="metric-label">{m.label}</div>
                <div className="metric-num">{m.num}</div>
                <div className="metric-sub">{m.sub}</div>
                <div className={`metric-icon ${m.cls}`}>{m.icon}</div>
              </div>
            ))}
          </div>

          <div className="table-card">
            <div className="table-header">
              <span className="table-title">Agenda de hoy</span>
              <Link href="/secretaria/citas" className="btn-new" style={{textDecoration:'none',display:'inline-block'}}>+ Nueva cita</Link>
            </div>
            {citas.length === 0 && (
              <div style={{padding:'40px 0', textAlign:'center', color:'var(--muted)', fontSize:14}}>
                No hay citas programadas para hoy
              </div>
            )}
            {citas.map((c:any) => {
              const hora = new Date(c.fecha_hora).toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit', hour12:false })
              const pago = c.pagos?.[0]
              return (
                <div className="agenda-row" key={c.id_cita}>
                  <div className="ag-time">{hora}</div>
                  <div className="ag-info">
                    <div className="ag-name">{c.pacientes?.nombre_completo ?? '—'}</div>
                    <div className="ag-doc">{c.profiles?.nombre_completo ?? '—'}</div>
                  </div>
                  <div className="ag-badges">
                    <span className={`badge ${ESTADO_CLASS[c.estado]}`}>{ESTADO_LABELS[c.estado]}</span>
                    {pago ? (
                      <span className={`badge ${pago.estado_pago==='pagado'?'b-blue':'b-amber'}`}>
                        {pago.estado_pago==='pagado' ? `Pagado · ${METODO_LABELS[pago.metodo_pago]}` : 'Pendiente'}
                      </span>
                    ) : (
                      <span className="badge b-amber" style={{opacity:0.5}}>Sin pago</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <a href="#" className="chatbot-bubble" title="Asistente RC">💬</a>
    </>
  )
}