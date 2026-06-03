'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function LoginPage() {
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email:    formData.get('email'),
        password: formData.get('password'),
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Credenciales incorrectas.')
      setLoading(false)
      return
    }

    window.location.href = `/${data.rol}/dashboard`
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600&family=DM+Serif+Display:ital@0;1&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:     #F2F8F5;
          --dark:   #163D2B;
          --mid:    #1A9068;
          --light:  #4FC49A;
          --pale:   #DCF2E9;
          --border: #C4E0D2;
          --text:   #122E20;
          --muted:  #527A66;
        }

        body {
          font-family: 'DM Sans', sans-serif;
          background: var(--bg);
          min-height: 100vh;
          overflow: hidden;
        }

        .login-wrapper {
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: 100vh;
        }

        /* ── LADO IZQUIERDO ── */
        .login-left {
          background: var(--dark);
          padding: 48px 56px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
        }
        .left-orb1 {
          position: absolute; top: -100px; right: -80px;
          width: 420px; height: 420px; border-radius: 50%;
          background: radial-gradient(circle, rgba(79,196,154,0.18) 0%, transparent 70%);
          pointer-events: none;
        }
        .left-orb2 {
          position: absolute; bottom: -80px; left: -60px;
          width: 300px; height: 300px; border-radius: 50%;
          background: radial-gradient(circle, rgba(26,144,104,0.15) 0%, transparent 70%);
          pointer-events: none;
        }

        .left-brand { display: flex; align-items: center; gap: 12px; position: relative; z-index: 1; }
        .left-logo {
          width: 42px; height: 42px; border-radius: 11px;
          background: rgba(255,255,255,0.10);
          border: 1px solid rgba(255,255,255,0.15);
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 600; color: var(--pale);
        }
        .left-brand-name  { font-size: 16px; font-weight: 600; color: rgba(255,255,255,0.90); }
        .left-brand-tag   { font-size: 10px; color: rgba(255,255,255,0.40); letter-spacing: 0.08em; text-transform: uppercase; }

        .left-body { position: relative; z-index: 1; }
        .left-title {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(34px, 3.5vw, 50px);
          line-height: 1.1; color: #fff;
          margin-bottom: 20px;
        }
        .left-title em { font-style: italic; color: var(--light); }
        .left-desc {
          font-size: 15px; color: rgba(255,255,255,0.45);
          line-height: 1.75; font-weight: 300; max-width: 380px;
          margin-bottom: 40px;
        }

        .features-list { display: flex; flex-direction: column; gap: 14px; }
        .feature-item  { display: flex; align-items: center; gap: 14px; }
        .feature-dot {
          width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.10);
          display: flex; align-items: center; justify-content: center;
          font-size: 15px;
        }
        .feature-text { font-size: 14px; color: rgba(255,255,255,0.60); }

        .left-footer {
          position: relative; z-index: 1;
          display: flex; align-items: center; gap: 8px;
          font-size: 12px; color: rgba(255,255,255,0.25);
        }
        .left-footer-dot { width: 4px; height: 4px; border-radius: 50%; background: rgba(255,255,255,0.20); }

        /* ── LADO DERECHO ── */
        .login-right {
          background: var(--bg);
          display: flex; align-items: center; justify-content: center;
          padding: 48px 56px;
          position: relative;
        }

        .back-link {
          position: absolute; top: 32px; left: 40px;
          display: flex; align-items: center; gap: 6px;
          font-size: 13px; color: var(--muted);
          text-decoration: none; transition: color .2s;
        }
        .back-link:hover { color: var(--dark); }
        .back-arrow { font-size: 16px; }

        .login-card {
          width: 100%; max-width: 400px;
        }

        .login-card-header { margin-bottom: 36px; }
        .login-card-title {
          font-family: 'DM Serif Display', serif;
          font-size: 32px; color: var(--dark);
          margin-bottom: 8px;
        }
        .login-card-sub { font-size: 14px; color: var(--muted); font-weight: 300; }

        /* Selector de rol */
        .role-selector {
          display: grid; grid-template-columns: repeat(2,1fr); gap: 8px;
          margin-bottom: 28px;
        }
        .role-btn {
          background: #fff; border: 1.5px solid var(--border);
          border-radius: 10px; padding: 10px 12px;
          cursor: pointer; transition: all .2s;
          display: flex; align-items: center; gap: 8px;
          font-family: 'DM Sans', sans-serif;
        }
        .role-btn:hover { border-color: var(--mid); background: var(--pale); }
        .role-btn.active { border-color: var(--mid); background: var(--pale); }
        .role-btn.active .role-dot { background: var(--mid); }
        .role-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--border); flex-shrink: 0; transition: background .2s;
        }
        .role-name { font-size: 13px; font-weight: 500; color: var(--dark); }
        .role-level { font-size: 10px; color: var(--muted); }

        /* Formulario */
        .form-group { margin-bottom: 16px; }
        .form-label {
          display: block;
          font-size: 11px; font-weight: 600; color: var(--muted);
          letter-spacing: 0.08em; text-transform: uppercase;
          margin-bottom: 7px;
        }
        .form-input {
          width: 100%; background: #fff; border: 1.5px solid var(--border);
          border-radius: 10px; padding: 13px 15px; font-size: 14px;
          font-family: 'DM Sans', sans-serif; color: var(--text);
          transition: border-color .2s, box-shadow .2s; outline: none;
        }
        .form-input:focus {
          border-color: var(--mid);
          box-shadow: 0 0 0 3px rgba(26,144,104,0.10);
        }
        .form-input::placeholder { color: #A8C4B8; }

        .form-error {
          background: #FEF2F2; border: 1px solid #FCA5A5;
          border-radius: 10px; padding: 12px 14px;
          font-size: 13px; color: #B91C1C;
          margin-bottom: 16px;
          display: flex; align-items: center; gap: 8px;
        }

        .form-submit {
          width: 100%; background: var(--dark); color: var(--pale);
          border: none; border-radius: 10px;
          padding: 15px; font-size: 15px; font-weight: 500;
          cursor: pointer; margin-top: 8px;
          font-family: 'DM Sans', sans-serif;
          transition: background .2s, transform .15s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .form-submit:hover:not(:disabled) { background: var(--mid); transform: translateY(-1px); }
        .form-submit:disabled { opacity: 0.55; cursor: not-allowed; }

        .form-divider {
          text-align: center; font-size: 12px; color: var(--muted);
          margin: 20px 0 16px; position: relative;
        }
        .form-divider::before, .form-divider::after {
          content: ''; position: absolute; top: 50%;
          width: calc(50% - 60px); height: 1px; background: var(--border);
        }
        .form-divider::before { left: 0; }
        .form-divider::after  { right: 0; }

        .form-footer {
          text-align: center; font-size: 12px; color: var(--muted); margin-top: 20px;
        }

        /* Spinner */
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner {
          width: 16px; height: 16px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.25);
          border-top-color: white;
          animation: spin .7s linear infinite;
        }

        /* Fade in */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .login-card { animation: fadeUp .45s ease both; }

        /* Responsive */
        @media (max-width: 768px) {
          body { overflow: auto; }
          .login-wrapper { grid-template-columns: 1fr; }
          .login-left { display: none; }
          .login-right { padding: 40px 28px; min-height: 100vh; }
          .back-link { top: 20px; left: 20px; }
        }
      `}</style>

      <div className="login-wrapper">

        {/* ── IZQUIERDA ── */}
        <div className="login-left">
          <div className="left-orb1" />
          <div className="left-orb2" />

          <div className="left-brand">
            <div className="left-logo">RC</div>
            <div>
              <div className="left-brand-name">RehabControl</div>
              <div className="left-brand-tag">Sistema Clínico</div>
            </div>
          </div>

          <div className="left-body">
            <h1 className="left-title">
              Accede a tu<br /><em>espacio clínico</em>
            </h1>
            <p className="left-desc">
              Cada usuario accede únicamente a la información que su función requiere. Seguro, centralizado y disponible desde cualquier dispositivo.
            </p>
            <div className="features-list">
              {[
                { icon: '🔐', text: 'Autenticación segura con JWT' },
                { icon: '🛡', text: 'Control de acceso por roles' },
                { icon: '📋', text: 'Expedientes clínicos cifrados' },
                { icon: '📊', text: 'Logs de auditoría completos' },
              ].map(f => (
                <div className="feature-item" key={f.text}>
                  <div className="feature-dot">{f.icon}</div>
                  <span className="feature-text">{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="left-footer">
            <span>© 2025 RehabControl</span>
            <div className="left-footer-dot" />
            <span>UTN · ITIC-802M</span>
            <div className="left-footer-dot" />
            <span>Todos los derechos reservados</span>
          </div>
        </div>

        {/* ── DERECHA ── */}
        <div className="login-right">
          <Link href="/" className="back-link">
            <span className="back-arrow">←</span> Volver al inicio
          </Link>

          <div className="login-card">
            <div className="login-card-header">
              <h2 className="login-card-title">Iniciar sesión</h2>
              <p className="login-card-sub">¿Con qué perfil ingresarás a RehabControl?</p>
            </div>

            {/* Selector visual de rol (solo orientativo, el rol lo determina Supabase) */}
            <div className="role-selector">
              {[
                { key:'admin',      label:'Administradora', level:'Nivel 4' },
                { key:'terapeuta',  label:'Terapeuta',      level:'Nivel 3' },
                { key:'secretaria', label:'Secretaria',     level:'Nivel 2' },
                { key:'paciente',   label:'Paciente',       level:'Nivel 1' },
              ].map(r => (
                <div className="role-btn" key={r.key}>
                  <div className="role-dot" />
                  <div>
                    <div className="role-name">{r.label}</div>
                    <div className="role-level">{r.level}</div>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label" htmlFor="email">Correo electrónico</label>
                <input
                  id="email" name="email" type="email" required
                  className="form-input"
                  placeholder="tu@correo.com"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="password">Contraseña</label>
                <input
                  id="password" name="password" type="password" required
                  className="form-input"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="form-error">
                  <span>⚠</span> {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="form-submit">
                {loading ? <span className="spinner" /> : null}
                {loading ? 'Iniciando sesión...' : 'Iniciar sesión →'}
              </button>
            </form>

            <div className="form-footer">
              Sistema de uso interno · Acceso solo para personal autorizado
            </div>
          </div>
        </div>

      </div>
    </>
  )
}