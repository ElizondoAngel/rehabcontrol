'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function PerfilClient({ profile, paciente, userId }: any) {

  const [telefono, setTelefono]   = useState(paciente?.telefono  ?? '')
  const [domicilio, setDomicilio] = useState(paciente?.domicilio ?? '')
  const [guardando, setGuardando] = useState(false)
  const [toast, setToast]         = useState<{msg: string, tipo: 'ok'|'err'} | null>(null)

  const mostrarToast = (msg: string, tipo: 'ok'|'err') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3000)
  }

  const guardar = async () => {
    if (!/^\d{10}$/.test(telefono)) {
      mostrarToast('El teléfono debe tener exactamente 10 dígitos', 'err')
      return
    }
    if (domicilio.trim().length < 5) {
      mostrarToast('El domicilio es demasiado corto', 'err')
      return
    }

    setGuardando(true)
    try {
      const res = await fetch('/api/paciente/perfil', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono, domicilio }),
      })
      if (res.ok) {
        mostrarToast('Datos actualizados correctamente', 'ok')
      } else {
        mostrarToast('Error al guardar. Intenta de nuevo.', 'err')
      }
    } catch {
      mostrarToast('Error de conexión', 'err')
    } finally {
      setGuardando(false)
    }
  }

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
        .aviso{background:rgba(245,180,0,0.07);border:1px solid rgba(245,180,0,0.2);border-radius:12px;padding:14px 18px;font-size:13px;color:var(--amber);margin-bottom:24px;font-weight:500}
        .form-card{background:var(--card);border:1px solid var(--card-border);border-radius:16px;padding:28px;max-width:560px}
        .form-section{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;font-weight:600;margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid var(--border)}
        .field{margin-bottom:20px}
        .field-label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;font-weight:600;margin-bottom:6px;display:block}
        .field-input{width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:11px 14px;color:var(--text);font-size:14px;font-family:'Inter',sans-serif;outline:none;transition:border .18s,box-shadow .18s}
        .field-input:focus{border-color:var(--cyan);box-shadow:0 0 0 3px rgba(56,189,248,0.12)}
        .field-input:disabled{opacity:.4;cursor:not-allowed}
        .field-input::placeholder{color:rgba(231,237,247,0.25)}
        .field-readonly{width:100%;background:transparent;border:1px solid rgba(255,255,255,0.05);border-radius:10px;padding:11px 14px;color:var(--muted);font-size:14px;font-family:'Inter',sans-serif}
        .field-hint{font-size:11px;color:var(--muted);margin-top:4px}
        .btn-guardar{background:linear-gradient(135deg,var(--blue),var(--cyan));color:#fff;border:none;border-radius:10px;padding:12px 28px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:transform .2s,box-shadow .2s,opacity .18s;margin-top:8px;box-shadow:0 4px 16px rgba(37,99,235,0.3)}
        .btn-guardar:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(56,189,248,0.4)}
        .btn-guardar:disabled{opacity:.5;cursor:not-allowed;transform:none}
        .toast{position:fixed;bottom:96px;right:28px;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:500;z-index:100;animation:fadeIn .2s ease}
        .toast-ok{background:rgba(52,211,153,0.12);color:var(--green);border:1px solid rgba(52,211,153,0.3)}
        .toast-err{background:rgba(242,85,85,0.12);color:var(--red);border:1px solid rgba(242,85,85,0.3)}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
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
            { icon:'📅', label:'Mis Citas',   href:'/paciente/citas',     active:false },
            { icon:'📈', label:'Mi Progreso', href:'/paciente/progreso',  active:false },
            { icon:'💳', label:'Mis Pagos',   href:'/paciente/pagos',     active:false },
            { icon:'⚙️', label:'Mis Datos',   href:'/paciente/perfil',    active:true  },
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
          <span className="topbar-title">Mis Datos</span>
          <div className="topbar-right">
            <div className="online-dot"><div className="dot"/> En línea</div>
          </div>
        </div>

        <div className="content">
          <div className="page-title">Mis Datos</div>
          <div className="page-sub">Solo puedes editar tu teléfono y domicilio</div>

          <div className="aviso">
            ⚠️ Los datos marcados en gris son de solo lectura. Contacta a la secretaria para modificarlos.
          </div>

          <div className="form-card">
            <div className="form-section">Información personal</div>

            <div className="field">
              <label className="field-label">Nombre completo</label>
              <input className="field-readonly" value={profile?.nombre_completo ?? ''} readOnly />
            </div>

            <div className="field">
              <label className="field-label">Correo electrónico</label>
              <input className="field-readonly" value={paciente?.correo ?? ''} readOnly />
            </div>

            <div className="form-section" style={{marginTop: 8}}>Datos de contacto editables</div>

            <div className="field">
              <label className="field-label">Teléfono</label>
              <input
                className="field-input"
                value={telefono}
                onChange={e => setTelefono(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10 dígitos"
                maxLength={10}
              />
              <div className="field-hint">{telefono.length}/10 dígitos</div>
            </div>

            <div className="field">
              <label className="field-label">Domicilio</label>
              <input
                className="field-input"
                value={domicilio}
                onChange={e => setDomicilio(e.target.value)}
                placeholder="Calle, número, colonia"
                maxLength={200}
              />
            </div>

            <button
              className="btn-guardar"
              onClick={guardar}
              disabled={guardando}
            >
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div className={`toast ${toast.tipo === 'ok' ? 'toast-ok' : 'toast-err'}`}>
          {toast.msg}
        </div>
      )}

      <a href="#" className="chatbot-bubble" title="Asistente RC">💬</a>
    </>
  )
}
