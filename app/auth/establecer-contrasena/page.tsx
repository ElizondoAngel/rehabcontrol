'use client'

/**
 * /auth/establecer-contrasena/page.tsx
 * ─────────────────────────────────────────────────────────────
 * F9 — Pantalla donde un usuario invitado (paciente) define su
 * contraseña por primera vez, tras aceptar la invitación por correo.
 *
 * FLUJO:
 *   1. Supabase redirige aquí con un fragmento #access_token=...&type=invite
 *      (Supabase JS lo detecta y crea la sesión automáticamente al cargar)
 *   2. Mostramos un formulario simple: contraseña + confirmar contraseña
 *   3. Al enviar, supabase.auth.updateUser({ password }) establece la clave
 *   4. Redirigimos a /paciente/dashboard
 *
 * SEGURIDAD:
 *   • Si no hay sesión activa (token inválido/expirado), mostramos error
 *     y no se permite definir contraseña
 *   • Validación de longitud mínima y coincidencia de ambos campos
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function EstablecerContrasenaPage() {
  const router = useRouter()
  const [verificando, setVerificando] = useState(true)
  const [sesionValida, setSesionValida] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    // Supabase JS detecta el #access_token de la URL automáticamente
    // (detectSessionInUrl: true, configuración por defecto) y crea la sesión.
    // Solo necesitamos confirmar que efectivamente quedó una sesión activa.
    supabase.auth.getSession().then(({ data }) => {
      setSesionValida(!!data.session)
      setVerificando(false)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (password !== confirmar) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError('No se pudo establecer la contraseña. Intenta de nuevo.')
      return
    }

    router.push('/paciente/dashboard')
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --bg:#060B14;--card:rgba(255,255,255,0.04);--border:rgba(255,255,255,0.10);
          --blue:#2563EB;--blue-2:#3B82F6;--cyan:#38BDF8;
          --text:#E7EDF7;--muted:#8C9BB5;--red:#F25555;
        }
        body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;position:relative;overflow:hidden}
        .glow1{position:absolute;top:-160px;right:-100px;width:480px;height:480px;border-radius:50%;background:radial-gradient(circle,rgba(37,99,235,0.28) 0%,transparent 65%);pointer-events:none}
        .glow2{position:absolute;bottom:-140px;left:-80px;width:380px;height:380px;border-radius:50%;background:radial-gradient(circle,rgba(56,189,248,0.18) 0%,transparent 65%);pointer-events:none}
        .card{position:relative;z-index:1;width:100%;max-width:420px;background:var(--card);border:1px solid var(--border);border-radius:20px;padding:36px;backdrop-filter:blur(16px)}
        .icon{width:50px;height:50px;border-radius:14px;background:linear-gradient(135deg,var(--blue),var(--cyan));display:flex;align-items:center;justify-content:center;font-size:21px;margin-bottom:20px;box-shadow:0 10px 28px rgba(37,99,235,0.3)}
        .title{font-size:24px;font-weight:800;letter-spacing:-0.02em;margin-bottom:8px}
        .sub{font-size:14px;color:var(--muted);margin-bottom:28px;line-height:1.5}
        .form-group{margin-bottom:16px}
        .form-label{display:block;font-size:11px;font-weight:600;color:var(--muted);letter-spacing:0.07em;text-transform:uppercase;margin-bottom:8px}
        .form-input{width:100%;background:rgba(255,255,255,0.05);border:1.5px solid var(--border);border-radius:10px;padding:13px 15px;font-size:14px;font-family:'Inter',sans-serif;color:var(--text);outline:none;transition:border-color .2s}
        .form-input:focus{border-color:var(--cyan);box-shadow:0 0 0 3px rgba(56,189,248,0.12)}
        .form-error{background:rgba(242,85,85,0.10);border:1px solid rgba(242,85,85,0.35);border-radius:10px;padding:12px 14px;font-size:13px;color:#FCA5A5;margin-bottom:16px}
        .btn-submit{width:100%;background:linear-gradient(135deg,var(--blue),var(--cyan));color:#fff;border:none;border-radius:10px;padding:14px;font-size:15px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;display:flex;align-items:center;justify-content:center;gap:8px;transition:transform .2s,box-shadow .2s;box-shadow:0 8px 24px rgba(37,99,235,0.3)}
        .btn-submit:hover:not(:disabled){transform:translateY(-1px)}
        .btn-submit:disabled{opacity:.55;cursor:not-allowed}
        .spinner{width:16px;height:16px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;animation:spin .7s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        .center-msg{text-align:center;color:var(--muted);font-size:14px;padding:20px 0}
      `}</style>

      <div className="glow1" />
      <div className="glow2" />

      <div className="card">
        <div className="icon">🔑</div>

        {verificando ? (
          <div className="center-msg">Verificando invitación…</div>
        ) : !sesionValida ? (
          <>
            <div className="title">Enlace inválido o expirado</div>
            <p className="sub">
              Este enlace de invitación ya no es válido. Solicita a tu clínica que te envíe una nueva invitación.
            </p>
          </>
        ) : (
          <>
            <div className="title">Crea tu contraseña</div>
            <p className="sub">Define una contraseña para acceder a tu portal de paciente en RehabControl.</p>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nueva contraseña</label>
                <input
                  type="password" className="form-input" placeholder="Mínimo 6 caracteres"
                  value={password} onChange={e => setPassword(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirmar contraseña</label>
                <input
                  type="password" className="form-input" placeholder="Repite tu contraseña"
                  value={confirmar} onChange={e => setConfirmar(e.target.value)}
                />
              </div>

              {error && <div className="form-error">⚠ {error}</div>}

              <button type="submit" className="btn-submit" disabled={loading}>
                {loading && <span className="spinner" />}
                {loading ? 'Guardando…' : 'Guardar y continuar →'}
              </button>
            </form>
          </>
        )}
      </div>
    </>
  )
}
