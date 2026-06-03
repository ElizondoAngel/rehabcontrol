import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function TerapeutaDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('nombre_completo').eq('id', user.id).single()

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --bg:#0D1A12;--sidebar:#111D16;--card:#162419;--border:rgba(255,255,255,0.07);
          --mid:#1A9068;--light:#4FC49A;--pale:#DCF2E9;--text:#E8F5EE;--muted:rgba(232,245,238,0.45);
        }
        body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex}
        .sidebar{width:260px;min-height:100vh;background:var(--sidebar);border-right:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0}
        .sb-brand{padding:20px 20px 16px;border-bottom:1px solid var(--border)}
        .sb-logo-row{display:flex;align-items:center;gap:10px}
        .sb-logo{width:36px;height:36px;border-radius:9px;background:var(--mid);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:#fff}
        .sb-name{font-size:14px;font-weight:600;color:var(--text)}
        .sb-ver{font-size:10px;color:var(--muted)}
        .sb-role{margin:12px 12px 4px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:10px}
        .sb-role-icon{width:32px;height:32px;border-radius:8px;background:rgba(55,138,221,0.15);border:1px solid rgba(55,138,221,0.25);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
        .sb-role-name{font-size:13px;font-weight:500;color:var(--text)}
        .sb-role-sub{font-size:11px;color:#378ADD}
        .sb-nav{flex:1;padding:8px 10px}
        .sb-nav a{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;font-size:14px;color:var(--muted);text-decoration:none;transition:all .18s;margin-bottom:2px}
        .sb-nav a:hover{background:rgba(255,255,255,0.05);color:var(--text)}
        .sb-nav a.active{background:rgba(26,144,104,0.15);color:var(--light)}
        .sb-nav-icon{font-size:16px;width:20px;text-align:center}
        .sb-bottom{padding:12px 10px;border-top:1px solid var(--border)}
        .sb-bottom a{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;font-size:14px;color:var(--muted);text-decoration:none;transition:all .18s}
        .sb-bottom a:hover{color:#E04444}
        .main{flex:1;display:flex;flex-direction:column;overflow:hidden}
        .topbar{height:56px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 28px;flex-shrink:0}
        .topbar-title{font-size:14px;color:var(--muted)}
        .topbar-right{display:flex;align-items:center;gap:16px}
        .online-dot{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--light)}
        .dot{width:7px;height:7px;border-radius:50%;background:var(--light)}
        .notif{width:32px;height:32px;border-radius:8px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:15px}
        .content{flex:1;overflow-y:auto;padding:28px}
        .page-title{font-size:26px;font-weight:600;color:var(--text);margin-bottom:4px}
        .page-sub{font-size:14px;color:var(--muted);margin-bottom:28px}
        .metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px}
        .metric{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:20px 22px;position:relative;overflow:hidden}
        .metric-label{font-size:12px;color:var(--muted);margin-bottom:12px}
        .metric-num{font-size:32px;font-weight:600;color:var(--text);line-height:1}
        .metric-sub{font-size:12px;color:var(--muted);margin-top:6px}
        .metric-icon{position:absolute;top:18px;right:18px;width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:16px}
        .icon-green{background:rgba(26,144,104,0.15)}
        .icon-blue{background:rgba(55,138,221,0.15)}
        .icon-amber{background:rgba(245,180,0,0.15)}
        .icon-teal{background:rgba(79,196,154,0.15)}
        .table-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:22px}
        .table-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
        .table-title{font-size:15px;font-weight:500;color:var(--text)}
        .patient-row{display:flex;align-items:center;padding:13px 0;border-bottom:1px solid var(--border)}
        .patient-row:last-child{border-bottom:none}
        .p-avatar{width:38px;height:38px;border-radius:50%;background:rgba(26,144,104,0.25);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:var(--text);flex-shrink:0;margin-right:12px}
        .p-name{font-size:13px;font-weight:500;color:var(--text)}
        .p-diag{font-size:11px;color:var(--muted)}
        .p-progress{flex:1;margin:0 20px}
        .p-progress-label{font-size:11px;color:var(--muted);margin-bottom:5px;display:flex;justify-content:space-between}
        .progress-bar{height:5px;background:rgba(255,255,255,0.08);border-radius:100px;overflow:hidden}
        .progress-fill{height:100%;background:linear-gradient(90deg,var(--mid),var(--light));border-radius:100px}
        .p-cita{text-align:right;white-space:nowrap}
        .p-cita-label{font-size:11px;color:var(--muted)}
        .p-cita-val{font-size:12px;color:var(--light);font-weight:500}
        .chatbot-bubble{position:fixed;bottom:28px;right:28px;width:52px;height:52px;border-radius:50%;background:var(--mid);display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;box-shadow:0 4px 16px rgba(26,144,104,0.4);transition:transform .2s;z-index:50;text-decoration:none}
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
          <div className="sb-role-icon">📈</div>
          <div><div className="sb-role-name">Terapeuta</div><div className="sb-role-sub">Acceso Limitado</div></div>
        </div>
        <nav className="sb-nav">
          {[
            {icon:'🏠', label:'Mi Panel',        active:true},
            {icon:'👥', label:'Mis Pacientes',   active:false},
            {icon:'📋', label:'Expedientes',      active:false},
            {icon:'📅', label:'Mi Agenda',        active:false},
            {icon:'📊', label:'Progreso',         active:false},
          ].map(n => (
            <a key={n.label} href="#" className={n.active?'active':''}>
              <span className="sb-nav-icon">{n.icon}</span>{n.label}
            </a>
          ))}
        </nav>
        <div className="sb-bottom">
          <Link href="/login"><span className="sb-nav-icon">→</span> Cerrar Sesión</Link>
        </div>
      </div>

      <div className="main">
        <div className="topbar">
          <span className="topbar-title">Mi Panel</span>
          <div className="topbar-right">
            <div className="online-dot"><div className="dot"/> En línea</div>
            <div className="notif">🔔</div>
          </div>
        </div>
        <div className="content">
          <div className="page-title">Panel del Terapeuta</div>
          <div className="page-sub">Solo ves los pacientes asignados a ti — Nivel 2</div>

          <div className="metrics">
            {[
              {label:'Mis pacientes',     num:'4',   sub:'activos hoy',         icon:'👥', cls:'icon-green'},
              {label:'Sesiones hoy',      num:'3',   sub:'1 pendiente',          icon:'📅', cls:'icon-blue'},
              {label:'Notas pendientes',  num:'2',   sub:'de ayer',              icon:'📋', cls:'icon-amber'},
              {label:'Promedio progreso', num:'62%', sub:'de mis pacientes',     icon:'📈', cls:'icon-teal'},
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
              <span className="table-title">Mis pacientes asignados</span>
            </div>
            {[
              {ini:'RF', name:'Roberto Fuentes',  diag:'Lesión de rodilla',           sesiones:8,  total:20, cita:'Hoy 14:00'},
              {ini:'CV', name:'Claudia Vázquez',  diag:'Rehabilitación lumbar',        sesiones:5,  total:15, cita:'Mañana 09:00'},
              {ini:'ME', name:'Mario Espinoza',   diag:'Post-operatorio hombro',       sesiones:12, total:24, cita:'Jue 11:00'},
              {ini:'LH', name:'Lucía Herrera',    diag:'Fisioterapia neurológica',     sesiones:3,  total:30, cita:'Vie 16:30'},
            ].map(p => (
              <div className="patient-row" key={p.ini}>
                <div className="p-avatar">{p.ini}</div>
                <div style={{minWidth:'160px'}}>
                  <div className="p-name">{p.name}</div>
                  <div className="p-diag">{p.diag}</div>
                </div>
                <div className="p-progress">
                  <div className="p-progress-label">
                    <span>Progreso</span>
                    <span>{p.sesiones}/{p.total} sesiones</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{width:`${Math.round(p.sesiones/p.total*100)}%`}}/>
                  </div>
                </div>
                <div className="p-cita">
                  <div className="p-cita-label">Próxima cita</div>
                  <div className="p-cita-val">{p.cita}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <a href="#" className="chatbot-bubble" title="Asistente RC">💬</a>
    </>
  )
}