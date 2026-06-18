'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function CitasClient({ profile, citas }: any) {

  const [filtro, setFiltro] = useState('todas')

  const citasFiltradas = filtro === 'todas'
    ? citas
    : citas.filter((c: any) => c.estado === filtro)

  const hoy = new Date().toISOString().split('T')[0]

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
        .content{flex:1;overflow-y:auto;padding:28px}
        .page-title{font-size:26px;font-weight:800;color:var(--text);letter-spacing:-0.015em;margin-bottom:4px}
        .page-sub{font-size:14px;color:var(--muted);margin-bottom:24px}
        .filtros{display:flex;gap:8px;margin-bottom:24px}
        .filtro-btn{padding:7px 16px;border-radius:100px;border:1px solid var(--border);background:transparent;color:var(--muted);font-size:13px;font-weight:500;cursor:pointer;transition:all .18s;font-family:'Inter',sans-serif}
        .filtro-btn:hover{border-color:var(--cyan);color:var(--text)}
        .filtro-btn.activo{background:rgba(56,189,248,0.12);border-color:rgba(56,189,248,0.4);color:var(--cyan)}
        .citas-lista{display:flex;flex-direction:column;gap:12px}
        .cita-card{background:var(--card);border:1px solid var(--card-border);border-radius:14px;padding:18px 22px;display:flex;align-items:center;gap:16px;transition:background .18s}
        .cita-card:hover{background:var(--surface2)}
        .cita-fecha-box{width:52px;height:52px;border-radius:12px;background:rgba(56,189,248,0.12);display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0}
        .cita-dia{font-size:20px;font-weight:700;color:var(--cyan);line-height:1}
        .cita-mes{font-size:10px;color:var(--muted);text-transform:uppercase}
        .cita-info{flex:1}
        .cita-hora{font-size:15px;font-weight:600;color:var(--text)}
        .cita-detalle{font-size:12px;color:var(--muted);margin-top:3px}
        .cita-tag{font-size:11px;padding:2px 8px;border-radius:4px;background:rgba(56,189,248,0.12);color:var(--cyan);margin-top:6px;display:inline-block;font-weight:500}
        .badge{font-size:11px;font-weight:600;padding:4px 12px;border-radius:100px}
        .b-green{background:rgba(52,211,153,0.15);color:var(--green)}
        .b-amber{background:rgba(245,180,0,0.15);color:var(--amber)}
        .b-gray{background:var(--surface2);color:var(--muted)}
        .empty{text-align:center;padding:60px 0;color:var(--muted);font-size:14px}
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
          <div className="sb-role-icon">👤</div>
          <div>
            <div className="sb-role-name">{profile?.nombre_completo}</div>
            <div className="sb-role-sub">Solo su información</div>
          </div>
        </div>
        <nav className="sb-nav">
          {[
            { icon:'🏠', label:'Mi Inicio',   href:'/paciente/dashboard', active:false },
            { icon:'📅', label:'Mis Citas',   href:'/paciente/citas',     active:true  },
            { icon:'📈', label:'Mi Progreso', href:'/paciente/progreso',  active:false },
            { icon:'💳', label:'Mis Pagos',   href:'/paciente/pagos',     active:false },
            { icon:'⚙️', label:'Mis Datos',   href:'/paciente/perfil',    active:false },
          ].map(n => (
            <a key={n.label} href={n.href} className={n.active ? 'active' : ''}>
              <span className="sb-nav-icon">{n.icon}</span>{n.label}
            </a>
          ))}
        </nav>
        <div className="sb-bottom">
          <Link href="/login">
            <span className="sb-nav-icon">→</span> Cerrar Sesión
          </Link>
        </div>
      </div>

      <div className="main">
        <div className="topbar">
          <span className="topbar-title">Mis Citas</span>
          <div className="topbar-right">
            <div className="online-dot"><div className="dot"/> En línea</div>
          </div>
        </div>

        <div className="content">
          <div className="page-title">Mis Citas</div>
          <div className="page-sub">Solo lectura — no puedes crear ni cancelar citas desde aquí</div>

          <div className="filtros">
            {['todas','confirmada','pendiente','cancelada'].map(f => (
              <button
                key={f}
                className={`filtro-btn ${filtro === f ? 'activo' : ''}`}
                onClick={() => setFiltro(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div className="citas-lista">
            {citasFiltradas.length === 0
              ? <div className="empty">No tienes citas {filtro !== 'todas' ? `con estado "${filtro}"` : 'registradas'}.</div>
              : citasFiltradas.map((c: any) => {
                  const fecha = new Date(c.fecha + 'T00:00:00')
                  const dia   = fecha.getDate()
                  const mes   = fecha.toLocaleString('es-MX', { month: 'short' })
                  const esFutura = c.fecha >= hoy

                  return (
                    <div className="cita-card" key={c.id}>
                      <div className="cita-fecha-box">
                        <div className="cita-dia">{dia}</div>
                        <div className="cita-mes">{mes}</div>
                      </div>
                      <div className="cita-info">
                        <div className="cita-hora">{c.hora} hrs</div>
                        <div className="cita-detalle">Sesión de terapia física</div>
                        {esFutura && <span className="cita-tag">Próxima</span>}
                      </div>
                      <span className={`badge ${
                        c.estado === 'confirmada' ? 'b-green' :
                        c.estado === 'pendiente'  ? 'b-amber' : 'b-gray'
                      }`}>
                        {c.estado}
                      </span>
                    </div>
                  )
                })
            }
          </div>
        </div>
      </div>

      <a href="#" className="chatbot-bubble" title="Asistente RC">💬</a>
    </>
  )
}
