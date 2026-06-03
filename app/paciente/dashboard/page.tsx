import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function PacienteDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('nombre_completo').eq('id', user.id).single()
  const nombre = profile?.nombre_completo?.split(' ')[0] ?? 'Paciente'

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
        .sb-role-icon{width:32px;height:32px;border-radius:8px;background:rgba(26,144,104,0.15);border:1px solid rgba(26,144,104,0.25);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
        .sb-role-name{font-size:13px;font-weight:500;color:var(--text)}
        .sb-role-sub{font-size:11px;color:var(--light)}
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
        .metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:24px}
        .metric{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:20px 22px;position:relative;overflow:hidden}
        .metric-label{font-size:12px;color:var(--muted);margin-bottom:12px}
        .metric-num{font-size:32px;font-weight:600;color:var(--text);line-height:1}
        .metric-sub{font-size:12px;color:var(--muted);margin-top:6px}
        .metric-icon{position:absolute;top:18px;right:18px;width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:16px}
        .icon-green{background:rgba(26,144,104,0.15)}
        .icon-blue{background:rgba(55,138,221,0.15)}
        .icon-amber{background:rgba(245,180,0,0.15)}
        /* PROGRESS CARD */
        .progress-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:22px;margin-bottom:24px}
        .progress-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
        .progress-title{font-size:15px;font-weight:500;color:var(--text)}
        .progress-pct{font-size:15px;font-weight:600;color:var(--light)}
        .progress-diag{font-size:12px;color:var(--muted);margin-bottom:14px}
        .progress-bar{height:8px;background:rgba(255,255,255,0.08);border-radius:100px;overflow:hidden;margin-bottom:16px}
        .progress-fill{height:100%;background:linear-gradient(90deg,var(--mid),var(--light));border-radius:100px}
        .progress-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
        .pstat{background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center}
        .pstat-num{font-size:20px;font-weight:600;color:var(--text)}
        .pstat-lbl{font-size:11px;color:var(--muted);margin-top:3px}
        /* BOTTOM GRID */
        .bottom-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .table-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:22px}
        .table-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
        .table-title{font-size:15px;font-weight:500;color:var(--text)}
        .cita-row{display:flex;align-items:center;padding:11px 0;border-bottom:1px solid var(--border)}
        .cita-row:last-child{border-bottom:none}
        .cita-icon{width:32px;height:32px;border-radius:8px;background:rgba(26,144,104,0.15);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;margin-right:12px}
        .cita-date{font-size:13px;font-weight:500;color:var(--text)}
        .cita-doc{font-size:11px;color:var(--muted)}
        .badge{font-size:11px;font-weight:500;padding:3px 10px;border-radius:100px}
        .b-green{background:rgba(26,144,104,0.18);color:var(--light)}
        .b-amber{background:rgba(245,180,0,0.15);color:#F5B400}
        .pago-row{display:flex;align-items:center;justify-content:space-between;padding:11px 0;border-bottom:1px solid var(--border)}
        .pago-row:last-child{border-bottom:none}
        .pago-left{}
        .pago-name{font-size:13px;font-weight:500;color:var(--text)}
        .pago-date{font-size:11px;color:var(--muted)}
        .pago-right{display:flex;align-items:center;gap:10px}
        .pago-amount{font-size:14px;font-weight:500;color:var(--text)}
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
          <div className="sb-role-icon">👤</div>
          <div><div className="sb-role-name">Paciente</div><div className="sb-role-sub">Solo su información</div></div>
        </div>
        <nav className="sb-nav">
          {[
            {icon:'🏠', label:'Mi Inicio',   active:true},
            {icon:'📅', label:'Mis Citas',   active:false},
            {icon:'📈', label:'Mi Progreso', active:false},
            {icon:'💳', label:'Mis Pagos',   active:false},
            {icon:'⚙️', label:'Mis Datos',   active:false},
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
          <span className="topbar-title">Mi Inicio</span>
          <div className="topbar-right">
            <div className="online-dot"><div className="dot"/> En línea</div>
            <div className="notif">🔔</div>
          </div>
        </div>
        <div className="content">
          <div className="page-title">Bienvenido, {nombre}</div>
          <div className="page-sub">Solo puedes ver tu propia información — Nivel 1</div>

          <div className="metrics">
            {[
              {label:'Sesiones completadas', num:'8',        sub:'de 20 programadas', icon:'✅', cls:'icon-green'},
              {label:'Próxima cita',         num:'Lun 09:00',sub:'Dra. Moreno',       icon:'🕐', cls:'icon-blue'},
              {label:'Saldo pendiente',      num:'$650',     sub:'sesión #9',         icon:'💳', cls:'icon-amber'},
            ].map(m => (
              <div className="metric" key={m.label}>
                <div className="metric-label">{m.label}</div>
                <div className="metric-num">{m.num}</div>
                <div className="metric-sub">{m.sub}</div>
                <div className={`metric-icon ${m.cls}`}>{m.icon}</div>
              </div>
            ))}
          </div>

          <div className="progress-card">
            <div className="progress-header">
              <span className="progress-title">Mi progreso de rehabilitación</span>
              <span className="progress-pct">40%</span>
            </div>
            <div className="progress-diag">Lesión de rodilla derecha — 20 sesiones</div>
            <div className="progress-bar"><div className="progress-fill" style={{width:'40%'}}/></div>
            <div className="progress-stats">
              <div className="pstat"><div className="pstat-num">8/20</div><div className="pstat-lbl">Sesiones</div></div>
              <div className="pstat"><div className="pstat-num">75%</div><div className="pstat-lbl">Movilidad</div></div>
              <div className="pstat"><div className="pstat-num">2/10</div><div className="pstat-lbl">Dolor (EVA)</div></div>
            </div>
          </div>

          <div className="bottom-grid">
            <div className="table-card">
              <div className="table-header"><span className="table-title">Mis próximas citas</span></div>
              {[
                {date:'Lun 26 May · 09:00', doc:'Dra. Valeria Moreno · Sesión #9',  st:'confirmada'},
                {date:'Mié 28 May · 09:00', doc:'Dra. Valeria Moreno · Sesión #10', st:'pendiente'},
                {date:'Vie 30 May · 09:00', doc:'Dra. Valeria Moreno · Sesión #11', st:'pendiente'},
              ].map((c,i) => (
                <div className="cita-row" key={i}>
                  <div className="cita-icon">📅</div>
                  <div style={{flex:1}}>
                    <div className="cita-date">{c.date}</div>
                    <div className="cita-doc">{c.doc}</div>
                  </div>
                  <span className={`badge ${c.st==='confirmada'?'b-green':'b-amber'}`}>{c.st}</span>
                </div>
              ))}
            </div>

            <div className="table-card">
              <div className="table-header"><span className="table-title">Mis pagos</span></div>
              {[
                {name:'Sesión #8', date:'19 May 2025', amount:'$650', st:'pagado'},
                {name:'Sesión #7', date:'15 May 2025', amount:'$650', st:'pagado'},
                {name:'Sesión #9', date:'26 May 2025', amount:'$650', st:'pendiente'},
              ].map((p,i) => (
                <div className="pago-row" key={i}>
                  <div className="pago-left">
                    <div className="pago-name">{p.name}</div>
                    <div className="pago-date">{p.date}</div>
                  </div>
                  <div className="pago-right">
                    <div className="pago-amount">{p.amount}</div>
                    <span className={`badge ${p.st==='pagado'?'b-green':'b-amber'}`}>{p.st}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <a href="#" className="chatbot-bubble" title="Asistente RC">💬</a>
    </>
  )
}