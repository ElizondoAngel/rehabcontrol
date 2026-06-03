import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function SecretariaDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --bg:#0D1A12;--sidebar:#111D16;--card:#162419;--border:rgba(255,255,255,0.07);
          --mid:#1A9068;--light:#4FC49A;--text:#E8F5EE;--muted:rgba(232,245,238,0.45);
        }
        body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex}
        .sidebar{width:260px;min-height:100vh;background:var(--sidebar);border-right:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0}
        .sb-brand{padding:20px 20px 16px;border-bottom:1px solid var(--border)}
        .sb-logo-row{display:flex;align-items:center;gap:10px}
        .sb-logo{width:36px;height:36px;border-radius:9px;background:var(--mid);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:#fff}
        .sb-name{font-size:14px;font-weight:600;color:var(--text)}
        .sb-ver{font-size:10px;color:var(--muted)}
        .sb-role{margin:12px 12px 4px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:10px}
        .sb-role-icon{width:32px;height:32px;border-radius:8px;background:rgba(127,119,221,0.15);border:1px solid rgba(127,119,221,0.25);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
        .sb-role-name{font-size:13px;font-weight:500;color:var(--text)}
        .sb-role-sub{font-size:11px;color:#7F77DD}
        .sb-nav{flex:1;padding:8px 10px}
        .sb-nav a{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;font-size:14px;color:var(--muted);text-decoration:none;transition:all .18s;margin-bottom:2px}
        .sb-nav a:hover{background:rgba(255,255,255,0.05);color:var(--text)}
        .sb-nav a.active{background:rgba(26,144,104,0.15);color:var(--light)}
        .sb-nav-icon{font-size:16px;width:20px;text-align:center}
        .sb-bottom{padding:12px 10px;border-top:1px solid var(--border)}
        .sb-bottom a{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;font-size:14px;color:var(--muted);text-decoration:none}
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
        .icon-purple{background:rgba(127,119,221,0.15)}
        .icon-amber{background:rgba(245,180,0,0.15)}
        .icon-green{background:rgba(26,144,104,0.15)}
        .icon-blue{background:rgba(55,138,221,0.15)}
        .table-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:22px}
        .table-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
        .table-title{font-size:15px;font-weight:500;color:var(--text)}
        .btn-new{background:var(--mid);color:#fff;border:none;border-radius:8px;padding:7px 14px;font-size:12px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif}
        .agenda-row{display:flex;align-items:center;padding:13px 0;border-bottom:1px solid var(--border)}
        .agenda-row:last-child{border-bottom:none}
        .ag-time{font-size:13px;font-weight:500;color:var(--muted);width:52px;flex-shrink:0}
        .ag-info{flex:1}
        .ag-name{font-size:13px;font-weight:500;color:var(--text)}
        .ag-doc{font-size:11px;color:var(--muted)}
        .ag-badges{display:flex;gap:6px}
        .badge{font-size:11px;font-weight:500;padding:3px 10px;border-radius:100px}
        .b-green{background:rgba(26,144,104,0.18);color:var(--light)}
        .b-amber{background:rgba(245,180,0,0.15);color:#F5B400}
        .b-red{background:rgba(224,68,68,0.15);color:#E04444}
        .b-blue{background:rgba(55,138,221,0.15);color:#378ADD}
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
          <div className="sb-role-icon">📁</div>
          <div><div className="sb-role-name">Secretaria</div><div className="sb-role-sub">Acceso Operativo</div></div>
        </div>
        <nav className="sb-nav">
          {[
            {icon:'🏠', label:'Panel',           active:true},
            {icon:'📅', label:'Agenda General',  active:false},
            {icon:'👥', label:'Pacientes',        active:false},
            {icon:'💳', label:'Pagos',            active:false},
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
              {label:'Citas hoy',             num:'5',  sub:'3 confirmadas',  icon:'📅', cls:'icon-purple'},
              {label:'Pagos pendientes',      num:'2',  sub:'por cobrar hoy', icon:'💳', cls:'icon-amber'},
              {label:'Pacientes registrados', num:'48', sub:'base total',     icon:'👥', cls:'icon-green'},
              {label:'Terapeutas activos',    num:'3',  sub:'en agenda hoy',  icon:'📈', cls:'icon-blue'},
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
              <button className="btn-new">+ Nueva cita</button>
            </div>
            {[
              {time:'08:00', name:'Roberto Fuentes', doc:'Dra. Moreno',  cita:'confirmada', pago:'Pagado'},
              {time:'09:30', name:'Claudia Vázquez', doc:'Dr. Ramírez',  cita:'confirmada', pago:'Pendiente'},
              {time:'11:00', name:'Mario Espinoza',  doc:'Dra. Moreno',  cita:'pendiente',  pago:'Pagado'},
              {time:'14:00', name:'Lucía Herrera',   doc:'Dr. Ramírez',  cita:'confirmada', pago:'Pendiente'},
              {time:'16:30', name:'Ana Pérez',       doc:'Dra. Moreno',  cita:'cancelada',  pago:'Pendiente'},
            ].map((r,i) => (
              <div className="agenda-row" key={i}>
                <div className="ag-time">{r.time}</div>
                <div className="ag-info">
                  <div className="ag-name">{r.name}</div>
                  <div className="ag-doc">{r.doc}</div>
                </div>
                <div className="ag-badges">
                  <span className={`badge ${r.cita==='confirmada'?'b-green':r.cita==='cancelada'?'b-red':'b-amber'}`}>{r.cita}</span>
                  <span className={`badge ${r.pago==='Pagado'?'b-blue':'b-amber'}`}>{r.pago}</span>
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