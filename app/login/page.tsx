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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:       #060B14;
          --bg-2:     #0A1220;
          --surface:  rgba(255,255,255,0.04);
          --surface2: rgba(255,255,255,0.07);
          --border:   rgba(255,255,255,0.10);
          --blue:     #2563EB;
          --blue-2:   #3B82F6;
          --cyan:     #38BDF8;
          --white:    #FFFFFF;
          --text:     #E7EDF7;
          --muted:    #8C9BB5;
          --light-bg: #F4F8FF;
          --light-card: #FFFFFF;
          --light-border: #E1E9F7;
          --light-text: #0B1A33;
          --light-muted: #5C6F8E;
        }

        body {
          font-family: 'Inter', sans-serif;
          background: var(--light-bg);
          min-height: 100vh;
          overflow: hidden;
        }

        .login-wrapper {
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          min-height: 100vh;
        }

        /* ── LADO IZQUIERDO — dark tech panel ── */
        .login-left {
          background: var(--bg);
          padding: 52px 60px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
        }
        .left-grid-bg {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(56,189,248,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56,189,248,0.06) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse 80% 70% at 30% 30%, black 0%, transparent 80%);
          pointer-events: none;
        }
        .left-glow1 {
          position: absolute; top: -160px; right: -100px;
          width: 480px; height: 480px; border-radius: 50%;
          background: radial-gradient(circle, rgba(37,99,235,0.32) 0%, transparent 65%);
          pointer-events: none; filter: blur(10px);
        }
        .left-glow2 {
          position: absolute; bottom: -140px; left: -80px;
          width: 380px; height: 380px; border-radius: 50%;
          background: radial-gradient(circle, rgba(56,189,248,0.20) 0%, transparent 65%);
          pointer-events: none; filter: blur(10px);
        }

        .left-brand { display: flex; align-items: center; gap: 12px; position: relative; z-index: 1; }
        .left-logo {
          width: 42px; height: 42px; border-radius: 12px;
          background: linear-gradient(135deg, var(--blue), var(--cyan));
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 800; color: #fff;
          box-shadow: 0 0 24px rgba(56,189,248,0.35);
        }
        .left-brand-name  { font-size: 16px; font-weight: 700; color: #fff; letter-spacing: -0.01em; }
        .left-brand-tag   { font-size: 10px; color: var(--cyan); letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; }

        .left-body { position: relative; z-index: 1; }
        .left-badge {
          display: inline-flex; align-items: center; gap: 9px;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 100px; padding: 7px 16px 7px 13px;
          font-size: 12px; font-weight: 500; color: var(--cyan);
          margin-bottom: 24px;
        }
        .left-badge-dot {
          width: 6px; height: 6px; border-radius: 50%; background: var(--cyan); flex-shrink: 0;
          box-shadow: 0 0 8px var(--cyan);
          animation: pulse-dot 2s ease infinite;
        }
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:.4} }
        .left-title {
          font-weight: 800;
          font-size: clamp(32px, 4vw, 46px);
          line-height: 1.08; letter-spacing: -0.02em; color: #fff;
          margin-bottom: 20px;
        }
        .left-title .grad {
          background: linear-gradient(110deg, var(--blue-2) 10%, var(--cyan) 70%);
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }
        .left-desc {
          font-size: 15px; color: var(--muted);
          line-height: 1.75; font-weight: 400; max-width: 380px;
          margin-bottom: 40px;
        }

        .features-list { display: flex; flex-direction: column; gap: 12px; }
        .feature-item  {
          display: flex; align-items: center; gap: 14px;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 14px; padding: 13px 16px;
          transition: background .2s, border-color .2s;
        }
        .feature-item:hover { background: var(--surface2); border-color: rgba(56,189,248,0.3); }
        .feature-dot {
          width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
          background: linear-gradient(135deg, rgba(37,99,235,0.25), rgba(56,189,248,0.25));
          border: 1px solid rgba(56,189,248,0.25);
          display: flex; align-items: center; justify-content: center;
          font-size: 15px;
        }
        .feature-text { font-size: 13.5px; color: var(--text); font-weight: 500; }

        .left-footer {
          position: relative; z-index: 1;
          display: flex; align-items: center; gap: 9px;
          font-size: 12px; color: var(--muted);
        }
        .left-footer-dot { width: 4px; height: 4px; border-radius: 50%; background: rgba(140,155,181,0.4); }

        /* ── LADO DERECHO ── */
        .login-right {
          background: var(--light-bg);
          display: flex; align-items: center; justify-content: center;
          padding: 48px 56px;
          position: relative;
        }

        .back-link {
          position: absolute; top: 34px; left: 44px;
          display: flex; align-items: center; gap: 7px;
          font-size: 13px; font-weight: 500; color: var(--light-muted);
          text-decoration: none; transition: color .2s, gap .2s;
        }
        .back-link:hover { color: var(--blue); }
        .back-arrow { font-size: 15px; }

        .login-card {
          width: 100%; max-width: 410px;
        }

        .login-card-header { margin-bottom: 34px; }
        .login-card-icon {
          width: 50px; height: 50px; border-radius: 14px;
          background: linear-gradient(135deg, var(--blue), var(--cyan));
          display: flex; align-items: center; justify-content: center;
          font-size: 21px; margin-bottom: 22px;
          box-shadow: 0 10px 28px rgba(37,99,235,0.28);
        }
        .login-card-title {
          font-weight: 800;
          font-size: 30px; color: var(--light-text);
          margin-bottom: 8px; letter-spacing: -0.02em;
        }
        .login-card-sub { font-size: 14px; color: var(--light-muted); font-weight: 400; }

        /* Formulario */
        .form-card-box {
          background: var(--light-card);
          border: 1px solid var(--light-border);
          border-radius: 20px;
          padding: 32px;
          box-shadow: 0 20px 60px rgba(37,99,235,0.08);
        }
        .form-group { margin-bottom: 18px; }
        .form-label {
          display: block;
          font-size: 11px; font-weight: 600; color: var(--light-muted);
          letter-spacing: 0.07em; text-transform: uppercase;
          margin-bottom: 8px;
        }
        .input-wrap { position: relative; }
        .input-icon {
          position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
          font-size: 15px; color: var(--light-muted); pointer-events: none;
        }
        .form-input {
          width: 100%; background: var(--light-bg); border: 1.5px solid var(--light-border);
          border-radius: 12px; padding: 13px 15px 13px 42px; font-size: 14px;
          font-family: 'Inter', sans-serif; color: var(--light-text);
          transition: border-color .2s, box-shadow .2s; outline: none;
        }
        .form-input:focus {
          border-color: var(--blue);
          box-shadow: 0 0 0 4px rgba(37,99,235,0.10);
        }
        .form-input::placeholder { color: #A6B6CE; }

        .form-error {
          background: #FEF2F2; border: 1px solid #FCA5A5;
          border-radius: 12px; padding: 12px 14px;
          font-size: 13px; color: #B91C1C; font-weight: 500;
          margin-bottom: 18px;
          display: flex; align-items: center; gap: 8px;
        }

        .form-submit {
          width: 100%;
          background: linear-gradient(135deg, var(--blue), var(--cyan));
          color: #fff;
          border: none; border-radius: 12px;
          padding: 15px; font-size: 15px; font-weight: 600;
          cursor: pointer; margin-top: 6px;
          font-family: 'Inter', sans-serif;
          transition: transform .2s, box-shadow .2s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 10px 28px rgba(37,99,235,0.3);
        }
        .form-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 14px 36px rgba(56,189,248,0.4); }
        .form-submit:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

        .form-footer {
          text-align: center; font-size: 12px; color: var(--light-muted); margin-top: 26px;
        }

        /* Spinner */
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner {
          width: 16px; height: 16px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          animation: spin .7s linear infinite;
        }

        /* Fade in */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .login-card { animation: fadeUp .5s ease both; }

        /* Responsive */
        @media (max-width: 860px) {
          body { overflow: auto; }
          .login-wrapper { grid-template-columns: 1fr; }
          .login-left { display: none; }
          .login-right { padding: 40px 24px; min-height: 100vh; }
          .back-link { top: 20px; left: 20px; }
        }
      `}</style>

      <div className="login-wrapper">

        {/* ── IZQUIERDA ── */}
        <div className="login-left">
          <div className="left-grid-bg" />
          <div className="left-glow1" />
          <div className="left-glow2" />

          <div className="left-brand">
            <div className="left-logo">RC</div>
            <div>
              <div className="left-brand-name">RehabControl</div>
              <div className="left-brand-tag">Sistema Clínico</div>
            </div>
          </div>

          <div className="left-body">
            <div className="left-badge">
              <span className="left-badge-dot" />
              Acceso cifrado de extremo a extremo
            </div>
            <h1 className="left-title">
              Accede a tu<br /><span className="grad">espacio clínico</span>
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
              <div className="login-card-icon">🔒</div>
              <h2 className="login-card-title">Iniciar sesión</h2>
              <p className="login-card-sub">Ingresa tus credenciales para acceder a tu panel</p>
            </div>

            <div className="form-card-box">
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label" htmlFor="email">Correo electrónico</label>
                  <div className="input-wrap">
                    <span className="input-icon">✉️</span>
                    <input
                      id="email" name="email" type="email" required
                      className="form-input"
                      placeholder="tu@correo.com"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="password">Contraseña</label>
                  <div className="input-wrap">
                    <span className="input-icon">🔑</span>
                    <input
                      id="password" name="password" type="password" required
                      className="form-input"
                      placeholder="••••••••"
                    />
                  </div>
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
            </div>

            <div className="form-footer">
              Sistema de uso interno · Acceso solo para personal autorizado
            </div>
          </div>
        </div>

      </div>
    </>
  )
}