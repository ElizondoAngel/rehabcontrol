import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('nombre_completo,rol').eq('id', user.id).single()

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Serif+Display&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --bg:#0D1A12;--sidebar:#111D16;--card:#162419;--border:rgba(255,255,255,0.07);
          --mid:#1A9068;--light:#4FC49A;--pale:#DCF2E9;--text:#E8F5EE;--muted:rgba(232,245,238,0.45);
          --shadow:0 1px 3px rgba(0,0,0,0.3);
        }
        body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex}
        /* SIDEBAR */
        .sidebar{width:260px;min-height:100vh;background:var(--sidebar);border-right:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0}
        .sb-brand{padding:20px 20px 16px;border-bottom:1px solid var(--border)}
        .sb-logo-row{display:flex;align-items:center;gap:10px}
        .sb-logo{width:36px;height:36px;border-radius:9px;background:var(--mid);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:#fff;flex-shrink:0}
        .sb-name{font-size:14px;font-weight:600;color:var(--text)}
        .sb-ver{font-size:10px;color:var(--muted)}
        .sb-role{margin:12px 12px 4px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:10px}
        .sb-role-icon{width:32px;height:32px;border-radius:8px;background:rgba(224,68,68,0.15);border:1px solid rgba(224,68,68,0.25);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
        .sb-role-name{font-size:13px;font-weight:500;color:var(--text)}
        .sb-role-sub{font-size:11px;color:#E04444}
        .sb-nav{flex:1;padding:8px 10px}
        .sb-nav a{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;font-size:14px;color:var(--muted);text-decoration:none;transition:all .18s;margin-bottom:2px}
        .sb-nav a:hover{background:rgba(255,255,255,0.05);color:var(--text)}
        .sb-nav a.active{background:rgba(26,144,104,0.15);color:var(--light)}
        .sb-nav-icon{font-size:16px;width:20px;text-align:center}
        .sb-bottom{padding:12px 10px;border-top:1px solid var(--border)}
        .sb-bottom a{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;font-size:14px;color:var(--muted);text-decoration:none;transition:all .18s}
        .sb-bottom a:hover{color:#E04444}
        /* MAIN */
        .main{flex:1;display:flex;flex-direction:column;overflow:hidden}
        .topbar{height:56px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 28px;flex-shrink:0}
        .topbar-title{font-size:14px;color:var(--muted)}
        .topbar-right{display:flex;align-items:center;gap:16px}
        .online-dot{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--light)}
        .dot{width:7px;height:7px;border-radius:50%;background:var(--light)}
        .notif{width:32px;height:32px;border-radius:8px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:15px}
        .content{flex:1;overflow-y:auto;padding:28px}
        /* PAGE HEADER */
        .page-title{font-size:26px;font-weight:600;color:var(--text);margin-bottom:4px}
        .page-sub{font-size:14px;color:var(--muted);margin-bottom:28px}
        /* METRIC CARDS */
        .metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px}
        .metric{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:20px 22px;position:relative;overflow:hidden}
        .metric-label{font-size:12px;color:var(--muted);margin-bottom:12px}
        .metric-num{font-size:32px;font-weight:600;color:var(--text);line-height:1}
        .metric-sub{font-size:12px;color:var(--muted);margin-top:6px}
        .metric-icon{position:absolute;top:18px;right:18px;width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:16px}
        .icon-green{background:rgba(26,144,104,0.15)}
        .icon-blue{background:rgba(55,138,221,0.15)}
        .icon-amber{background:rgba(245,180,0,0.15)}
        .icon-red{background:rgba(224,68,68,0.15)}
        /* TABLES GRID */
        .tables-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .table-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:22px}
        .table-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
        .table-title{font-size:15px;font-weight:500;color:var(--text)}
        .table-action{font-size:12px;color:var(--mid);text-decoration:none;cursor:pointer}
        .live-badge{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--light)}
        .live-dot{width:6px;height:6px;border-radius:50%;background:var(--light)}
        /* USER ROWS */
        .user-row{display:flex;align-items:center;justify-content:space-between;padding:11px 0;border-bottom:1px solid var(--border)}
        .user-row:last-child{border-bottom:none}
        .user-left{display:flex;align-items:center;gap:11px}
        .u-avatar{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:var(--text);flex-shrink:0}
        .u-name{font-size:13px;font-weight:500;color:var(--text)}
        .u-role{font-size:11px;color:var(--muted)}
        .badge{font-size:11px;font-weight:500;padding:3px 10px;border-radius:100px;text-align:right}
        .badge-green{background:rgba(26,144,104,0.15);color:var(--light)}
        .badge-gray{background:rgba(255,255,255,0.06);color:var(--muted)}
        .badge-sub{font-size:10px;color:var(--muted);text-align:right;margin-top:2px}
        /* LOG ROWS */
        .log-row{display:flex;align-items:flex-start;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)}
        .log-row:last-child{border-bottom:none}
        .log-left{display:flex;align-items:flex-start;gap:10px}
        .log-dot-wrap{padding-top:4px}
        .log-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
        .ld-green{background:var(--light)}
        .ld-amber{background:#F5B400}
        .ld-blue{background:#378ADD}
        .log-action{font-size:13px;color:var(--text)}
        .log-user{font-size:11px;color:var(--muted)}
        .log-time{font-size:11px;color:var(--muted);white-space:nowrap}
        /* CHATBOT BUBBLE */
        .chatbot-bubble{position:fixed;bottom:28px;right:28px;width:52px;height:52px;border-radius:50%;background:var(--mid);display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;box-shadow:0 4px 16px rgba(26,144,104,0.4);transition:transform .2s;z-index:50;text-decoration:none}
        .chatbot-bubble:hover{transform:scale(1.08)}
        /* COLORS */
        .c1{background:rgba(26,144,104,0.25)}
        .c2{background:rgba(93,122,204,0.25)}
        .c3{background:rgba(224,68,68,0.20)}
        .c4{background:rgba(245,180,0,0.20)}
      `}</style>

      <div className="sidebar">
        <div className="sb-brand">
          <div className="sb-logo-row">
            <div className="sb-logo">RC</div>
            <div><div className="sb-name">RehabControl</div><div className="sb-ver">v2.1</div></div>
          </div>
        </div>
        <div className="sb-role">
          <div className="sb-role-icon">🛡</div>
          <div><div className="sb-role-name">Administradora General</div><div className="sb-role-sub">Acceso Total</div></div>
        </div>
        <nav className="sb-nav">
          {[
            {icon:'🏠', label:'Panel General',      active:true},
            {icon:'👥', label:'Usuarios y Roles',   active:false},
            {icon:'📋', label:'Expedientes',         active:false},
            {icon:'💳', label:'Finanzas',            active:false},
            {icon:'📊', label:'Reportes',            active:false},
            {icon:'🔍', label:'Logs de Auditoría',  active:false},
            {icon:'⚙️', label:'Configuración',       active:false},
          ].map(n => (
            <a key={n.label} href="#" className={n.active ? 'active' : ''}>
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
          <span className="topbar-title">Panel General</span>
          <div className="topbar-right">
            <div className="online-dot"><div className="dot"/> En línea</div>
            <div className="notif">🔔</div>
          </div>
        </div>
        <div className="content">
          <div className="page-title">Panel Administrativo</div>
          <div className="page-sub">Visión general del sistema — Acceso Total</div>

          <div className="metrics">
            {[
              {label:'Pacientes activos', num:'48', sub:'+3 este mes',       icon:'👥', cls:'icon-green'},
              {label:'Sesiones hoy',      num:'14', sub:'6 completadas',     icon:'📅', cls:'icon-blue'},
              {label:'Ingresos del mes',  num:'$38,400', sub:'meta: $45,000',icon:'💲', cls:'icon-amber'},
              {label:'Usuarios del sistema', num:'12', sub:'4 roles activos',icon:'🛡', cls:'icon-red'},
            ].map(m => (
              <div className="metric" key={m.label}>
                <div className="metric-label">{m.label}</div>
                <div className="metric-num">{m.num}</div>
                <div className="metric-sub">{m.sub}</div>
                <div className={`metric-icon ${m.cls}`}>{m.icon}</div>
              </div>
            ))}
          </div>

          <div className="tables-grid">
            <div className="table-card">
              <div className="table-header">
                <span className="table-title">Usuarios del sistema</span>
                <span className="table-action">Ver todos</span>
              </div>
              {[
                {ini:'DV',col:'c1',name:'Dra. Valeria Moreno', role:'Terapeuta · Nivel 2', st:'activo',   time:'hace 5 min'},
                {ini:'LA',col:'c2',name:'Lic. Ana Torres',     role:'Secretaria · Nivel 3',st:'activo',   time:'hace 2 min'},
                {ini:'DD',col:'c3',name:'Dr. Diego Ramírez',   role:'Terapeuta · Nivel 2', st:'inactivo', time:'ayer'},
                {ini:'CM',col:'c4',name:'Carlos M.',           role:'Paciente · Nivel 4',  st:'activo',   time:'hace 1 h'},
              ].map(u => (
                <div className="user-row" key={u.ini}>
                  <div className="user-left">
                    <div className={`u-avatar ${u.col}`}>{u.ini}</div>
                    <div><div className="u-name">{u.name}</div><div className="u-role">{u.role}</div></div>
                  </div>
                  <div>
                    <div className={`badge ${u.st==='activo'?'badge-green':'badge-gray'}`}>{u.st}</div>
                    <div className="badge-sub">{u.time}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="table-card">
              <div className="table-header">
                <span className="table-title">Log de auditoría</span>
                <div className="live-badge"><div className="live-dot"/>En vivo</div>
              </div>
              {[
                {dot:'ld-blue',  action:'Acceso a expediente',           user:'Dra. Valeria Moreno', time:'10:42 AM'},
                {dot:'ld-amber', action:'Registro de pago',              user:'Lic. Ana Torres',     time:'10:30 AM'},
                {dot:'ld-amber', action:'Modificación de cita',          user:'Lic. Ana Torres',     time:'09:55 AM'},
                {dot:'ld-green', action:'Login exitoso',                 user:'Dr. Diego Ramírez',   time:'09:00 AM'},
                {dot:'ld-blue',  action:'Consulta de reporte financiero',user:'Admin',               time:'08:45 AM'},
              ].map((l,i) => (
                <div className="log-row" key={i}>
                  <div className="log-left">
                    <div className="log-dot-wrap"><div className={`log-dot ${l.dot}`}/></div>
                    <div><div className="log-action">{l.action}</div><div className="log-user">{l.user}</div></div>
                  </div>
                  <div className="log-time">{l.time}</div>
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