'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar, { MenuButton } from '@/app/components/Sidebar'
import TopbarActions from '@/app/components/TopbarActions'

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Props {
  profile: {
    nombre_completo: string
    email: string
    rol: string
    created_at: string
    activo: boolean
  } | null
  paciente: {
    id_paciente: number
    telefono?: string
    domicilio?: string
    fecha_nacimiento?: string
    curp?: string
    contacto_emergencia?: string
    created_at: string
    activo: boolean
    terapeuta?: { nombre_completo: string } | null
  } | null
  userId: string
  email: string
  stats: {
    totalCitas: number
    citasCompletadas: number
    pagosPendientes: number
    proximaCita: { fecha_hora: string; estado: string } | null
  }
  tieneBajaPendiente: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcularEdad(fechaNac?: string): string {
  if (!fechaNac) return '—'
  const hoy = new Date()
  const nac = new Date(fechaNac)
  let edad = hoy.getFullYear() - nac.getFullYear()
  const m = hoy.getMonth() - nac.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
  return `${edad} años`
}

function formatFecha(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function PerfilClient({
  profile,
  paciente,
  userId,
  email,
  stats,
  tieneBajaPendiente,
}: Props) {
  const router = useRouter()
  const [telefono, setTelefono] = useState(paciente?.telefono ?? '')
  const [domicilio, setDomicilio] = useState(paciente?.domicilio ?? '')
  const [guardando, setGuardando] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tipo: 'ok' | 'err' } | null>(null)

  const mostrarToast = (msg: string, tipo: 'ok' | 'err') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3500)
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
        mostrarToast('Datos actualizados correctamente ✓', 'ok')
        router.refresh()
      } else {
        mostrarToast('Error al guardar. Intenta de nuevo.', 'err')
      }
    } catch {
      mostrarToast('Error de conexión', 'err')
    } finally {
      setGuardando(false)
    }
  }

  const progresoCitas =
    stats.totalCitas > 0
      ? Math.round((stats.citasCompletadas / stats.totalCitas) * 100)
      : 0

  const infoRows: [string, string][] = [
    ['Nombre completo',     profile?.nombre_completo ?? '—'],
    ['Correo electrónico',  email],
    ['Fecha de nacimiento', formatFecha(paciente?.fecha_nacimiento)],
    ['Edad',                calcularEdad(paciente?.fecha_nacimiento)],
    ['CURP',                paciente?.curp ?? '—'],
    ['Terapeuta asignado',  paciente?.terapeuta?.nombre_completo ?? '—'],
    ['Fecha de registro',   formatFecha(paciente?.created_at)],
    ['Contacto emergencia', paciente?.contacto_emergencia ?? '—'],
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --bg:#060B14;--sidebar:#0A1220;--card:rgba(255,255,255,0.035);
          --card-border:rgba(255,255,255,0.09);--border:rgba(255,255,255,0.09);
          --surface2:rgba(255,255,255,0.07);
          --blue:#2563EB;--cyan:#38BDF8;
          --text:#E7EDF7;--muted:#8C9BB5;
          --red:#F25555;--amber:#F5B400;--green:#34D399;--purple:#A78BFA;
        }
        body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex}
        .main{flex:1;display:flex;flex-direction:column;overflow:hidden}
        .topbar{height:56px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 28px;flex-shrink:0}
        .topbar-title{font-size:14px;color:var(--muted);font-weight:500}
        .topbar-right{display:flex;align-items:center;gap:16px}
        .online-dot{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--cyan);font-weight:500}
        .dot{width:7px;height:7px;border-radius:50%;background:var(--cyan);box-shadow:0 0 8px var(--cyan)}
        .content{flex:1;overflow-y:auto;padding:28px}
        .page-header{margin-bottom:24px}
        .page-title{font-size:26px;font-weight:800;color:var(--text);letter-spacing:-0.015em;margin-bottom:4px}
        .page-sub{font-size:14px;color:var(--muted)}
        .aviso{background:rgba(245,180,0,0.07);border:1px solid rgba(245,180,0,0.2);border-radius:12px;padding:14px 18px;font-size:13px;color:var(--amber);margin-bottom:24px;font-weight:500}
        .grid-2{display:grid;grid-template-columns:1fr 340px;gap:20px;align-items:start}
        @media(max-width:900px){.grid-2{grid-template-columns:1fr}}
        .card{background:var(--card);border:1px solid var(--card-border);border-radius:16px;padding:24px}
        .card+.card{margin-top:16px}
        .card-title{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;font-weight:600;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid var(--border)}
        .avatar-row{display:flex;align-items:center;gap:16px;margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid var(--border)}
        .avatar{width:56px;height:56px;border-radius:14px;background:linear-gradient(135deg,var(--blue),var(--cyan));display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#fff;flex-shrink:0;box-shadow:0 0 20px rgba(56,189,248,0.25)}
        .avatar-info .name{font-size:17px;font-weight:700;color:var(--text)}
        .avatar-info .email-txt{font-size:13px;color:var(--muted);margin-top:2px}
        .badge-activo{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;padding:3px 9px;border-radius:20px;margin-top:5px}
        .badge-activo.on{background:rgba(52,211,153,0.12);color:var(--green);border:1px solid rgba(52,211,153,0.25)}
        .badge-activo.off{background:rgba(242,85,85,0.12);color:var(--red);border:1px solid rgba(242,85,85,0.25)}
        .data-table{width:100%;border-collapse:collapse}
        .data-table tr{border-bottom:1px solid rgba(255,255,255,0.04)}
        .data-table tr:last-child{border-bottom:none}
        .data-table td{padding:10px 0;vertical-align:top;font-size:13px}
        .data-table td:first-child{color:var(--muted);font-weight:500;width:42%;padding-right:12px;white-space:nowrap}
        .data-table td:last-child{color:var(--text);font-weight:500;word-break:break-word}
        .field{margin-bottom:18px}
        .field:last-of-type{margin-bottom:0}
        .field-label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;font-weight:600;margin-bottom:6px;display:block}
        .field-input{width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:11px 14px;color:var(--text);font-size:14px;font-family:'Inter',sans-serif;outline:none;transition:border .18s,box-shadow .18s}
        .field-input:focus{border-color:var(--cyan);box-shadow:0 0 0 3px rgba(56,189,248,0.12)}
        .field-input::placeholder{color:rgba(231,237,247,0.25)}
        .field-hint{font-size:11px;color:var(--muted);margin-top:4px}
        .stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}
        .stat-card{background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center}
        .stat-num{font-size:24px;font-weight:800;color:var(--text);letter-spacing:-0.02em}
        .stat-label{font-size:11px;color:var(--muted);margin-top:2px}
        .stat-card.highlight .stat-num{color:var(--cyan)}
        .stat-card.warn .stat-num{color:var(--amber)}
        .progress-section{margin-bottom:16px}
        .progress-header{display:flex;justify-content:space-between;margin-bottom:8px}
        .progress-title{font-size:12px;color:var(--muted);font-weight:500}
        .progress-pct{font-size:12px;color:var(--cyan);font-weight:600}
        .progress-bar{height:6px;background:var(--surface2);border-radius:4px;overflow:hidden}
        .progress-fill{height:100%;border-radius:4px;background:linear-gradient(90deg,var(--blue),var(--cyan));transition:width .6s ease}
        .proxima-cita{background:rgba(37,99,235,0.08);border:1px solid rgba(37,99,235,0.2);border-radius:12px;padding:14px}
        .proxima-cita-label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;font-weight:600;margin-bottom:6px}
        .proxima-cita-fecha{font-size:14px;color:var(--cyan);font-weight:600}
        .no-cita{font-size:13px;color:var(--muted);font-style:italic}
        .info-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04)}
        .info-row:last-child{border-bottom:none}
        .info-label{font-size:12px;color:var(--muted);font-weight:500}
        .info-link{font-size:12px;color:var(--cyan);text-decoration:none;font-weight:600;transition:opacity .15s}
        .info-link:hover{opacity:.7}
        .zona-peligro{background:rgba(242,85,85,0.05);border:1px solid rgba(242,85,85,0.15);border-radius:12px;padding:16px}
        .zona-peligro-title{font-size:12px;color:var(--red);font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px}
        .zona-peligro-desc{font-size:12px;color:var(--muted);margin-bottom:12px;line-height:1.5}
        .btn-baja{width:100%;background:transparent;border:1px solid rgba(242,85,85,0.35);border-radius:8px;padding:9px 16px;font-size:13px;font-weight:500;color:var(--red);cursor:pointer;font-family:'Inter',sans-serif;transition:all .18s}
        .btn-baja:hover:not(:disabled){background:rgba(242,85,85,0.1);border-color:var(--red)}
        .btn-baja:disabled{opacity:.5;cursor:not-allowed}
        .btn-guardar{background:linear-gradient(135deg,var(--blue),var(--cyan));color:#fff;border:none;border-radius:10px;padding:12px 28px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:transform .2s,box-shadow .2s,opacity .18s;margin-top:20px;box-shadow:0 4px 16px rgba(37,99,235,0.3)}
        .btn-guardar:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(56,189,248,0.4)}
        .btn-guardar:disabled{opacity:.5;cursor:not-allowed;transform:none}
        .toast{position:fixed;bottom:96px;right:28px;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:500;z-index:100;animation:fadeIn .2s ease}
        .toast-ok{background:rgba(52,211,153,0.12);color:var(--green);border:1px solid rgba(52,211,153,0.3)}
        .toast-err{background:rgba(242,85,85,0.12);color:var(--red);border:1px solid rgba(242,85,85,0.3)}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .chatbot-bubble{position:fixed;bottom:28px;right:28px;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--blue),var(--cyan));display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;box-shadow:0 8px 24px rgba(37,99,235,0.4);transition:transform .2s;z-index:50;text-decoration:none}
        .chatbot-bubble:hover{transform:scale(1.08)}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:200;backdrop-filter:blur(4px)}
        .modal-box{background:#0D1829;border:1px solid var(--card-border);border-radius:16px;padding:28px;max-width:400px;width:90%}
        .modal-title{font-size:17px;font-weight:700;color:var(--red);margin-bottom:8px}
        .modal-desc{font-size:13px;color:var(--muted);line-height:1.6;margin-bottom:20px}
        .modal-actions{display:flex;gap:10px;justify-content:flex-end}
        .btn-cancel-modal{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px 18px;font-size:13px;color:var(--muted);cursor:pointer;font-family:'Inter',sans-serif}
        .btn-confirm-baja{background:rgba(242,85,85,0.15);border:1px solid rgba(242,85,85,0.4);border-radius:8px;padding:9px 18px;font-size:13px;color:var(--red);cursor:pointer;font-family:'Inter',sans-serif;font-weight:600}
        .btn-confirm-baja:hover:not(:disabled){background:rgba(242,85,85,0.25)}
        .btn-confirm-baja:disabled{opacity:.5;cursor:not-allowed}
        .baja-ok{background:rgba(52,211,153,0.08);border:1px solid rgba(52,211,153,0.2);border-radius:10px;padding:12px 16px;font-size:12px;color:var(--green);line-height:1.5}
        .motivo-label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;font-weight:600;margin:14px 0 6px;display:block}
        .motivo-textarea{width:100%;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:8px;padding:10px 12px;color:var(--text);font-size:13px;font-family:'Inter',sans-serif;outline:none;resize:vertical;min-height:80px;transition:border .18s}
        .motivo-textarea:focus{border-color:var(--cyan);box-shadow:0 0 0 3px rgba(56,189,248,0.1)}
        .motivo-textarea::placeholder{color:rgba(231,237,247,0.2)}
        .motivo-chars{font-size:11px;color:var(--muted);text-align:right;margin-top:4px}
      `}</style>

      <Sidebar
        rol="paciente"
        nombre={profile?.nombre_completo ?? ''}
        subRol="Portal de Paciente"
        icono="👤"
        items={[
          { icon: '🏠', label: 'Mi Inicio',   href: '/paciente/dashboard', active: false },
          { icon: '📅', label: 'Mis Citas',   href: '/paciente/citas',     active: false },
          { icon:'🏋️', label:'Mis Ejercicios', href:'/paciente/ejercicios', active:false },
          { icon: '📈', label: 'Mi Progreso', href: '/paciente/progreso',  active: false },
          { icon: '💳', label: 'Mis Pagos',   href: '/paciente/pagos',     active: false },
          { icon: '⚙️', label: 'Mis Datos',   href: '/paciente/perfil',    active: true },
         
        ]}
      />

      <div className="main">
        <div className="topbar">
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <MenuButton />
            <span className="topbar-title">Mis Datos</span>
          </div>
          <div className="topbar-right">
            <div className="online-dot">
              <div className="dot" /> En línea
            </div>
            <TopbarActions userId={userId} rol="paciente" nombre={profile?.nombre_completo} />
          </div>
        </div>

        <div className="content">
          <div className="page-header">
            <div className="page-title">Mis Datos</div>
            <div className="page-sub">Consulta tu información y edita teléfono y domicilio</div>
          </div>

          <div className="aviso">
            ⚠️ Los datos en gris son de solo lectura. Contacta a la secretaria para modificarlos.
          </div>

          <div className="grid-2">
            <div>
              <div className="card">
                <div className="avatar-row">
                  <div className="avatar">
                    {profile?.nombre_completo?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                  <div className="avatar-info">
                    <div className="name">{profile?.nombre_completo ?? '—'}</div>
                    <div className="email-txt">{email}</div>
                    <span className={`badge-activo ${paciente?.activo ? 'on' : 'off'}`}>
                      {paciente?.activo ? '● Cuenta activa' : '● Inactiva'}
                    </span>
                  </div>
                </div>

                <div className="card-title">Información personal (solo lectura)</div>

                <table className="data-table">
                  <tbody>
                    {infoRows.map(([label, val]) => (
                      <tr key={label}>
                        <td>{label}</td>
                        <td>{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="card" style={{ marginTop: 16 }}>
                <div className="card-title">Datos de contacto (editables)</div>

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

                <button className="btn-guardar" onClick={guardar} disabled={guardando}>
                  {guardando ? 'Guardando...' : '💾 Guardar cambios'}
                </button>
              </div>
            </div>

            <RightColumn
              stats={stats}
              progresoCitas={progresoCitas}
              pagosPendientes={stats.pagosPendientes}
              mostrarToast={mostrarToast}
              tieneBajaPendiente={tieneBajaPendiente}
            />
          </div>
        </div>
      </div>

      {toast && (
        <div className={`toast ${toast.tipo === 'ok' ? 'toast-ok' : 'toast-err'}`}>
          {toast.msg}
        </div>
      )}

      <a href="/paciente/chat" className="chatbot-bubble" title="Asistente RC">💬</a>
    </>
  )
}

// ── Columna derecha ───────────────────────────────────────────────────────────
function RightColumn({
  stats,
  progresoCitas,
  pagosPendientes,
  mostrarToast,
  tieneBajaPendiente,
}: {
  stats: Props['stats']
  progresoCitas: number
  pagosPendientes: number
  mostrarToast: (msg: string, tipo: 'ok' | 'err') => void
  tieneBajaPendiente: boolean
}) {
  const [modalBaja, setModalBaja]           = useState(false)
  const [solicitando, setSolicitando]       = useState(false)
  const [bajaSolicitada, setBajaSolicitada] = useState(tieneBajaPendiente)
  const [motivo, setMotivo]                 = useState('')

  const solicitarBaja = async () => {
    setSolicitando(true)
    try {
      const res = await fetch('/api/paciente/solicitar-baja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: motivo.trim() || 'Sin motivo especificado' }),
      })
      if (res.ok) {
        setBajaSolicitada(true)
        setModalBaja(false)
        setMotivo('')
        mostrarToast('Solicitud de baja enviada. Te contactaremos pronto.', 'ok')
      } else {
        const { error } = await res.json().catch(() => ({ error: 'Error desconocido' }))
        mostrarToast(error ?? 'Error al enviar la solicitud', 'err')
      }
    } catch {
      mostrarToast('Error de conexión al enviar la solicitud', 'err')
    } finally {
      setSolicitando(false)
    }
  }

  return (
    <>
      <div>
        <div className="card">
          <div className="card-title">Resumen de actividad</div>
          <div className="stat-grid">
            <div className="stat-card highlight">
              <div className="stat-num">{stats.totalCitas}</div>
              <div className="stat-label">Citas totales</div>
            </div>
            <div className="stat-card highlight">
              <div className="stat-num">{stats.citasCompletadas}</div>
              <div className="stat-label">Completadas</div>
            </div>
            <div className={`stat-card ${pagosPendientes > 0 ? 'warn' : 'highlight'}`}>
              <div className="stat-num">{pagosPendientes}</div>
              <div className="stat-label">Pagos pend.</div>
            </div>
            <div className="stat-card">
              <div className="stat-num">{progresoCitas}%</div>
              <div className="stat-label">Asistencia</div>
            </div>
          </div>

          <div className="progress-section">
            <div className="progress-header">
              <span className="progress-title">Sesiones completadas</span>
              <span className="progress-pct">{progresoCitas}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progresoCitas}%` }} />
            </div>
          </div>

          <div className="proxima-cita">
            <div className="proxima-cita-label">📅 Próxima cita</div>
            {stats.proximaCita ? (
              <div className="proxima-cita-fecha">
                {new Date(stats.proximaCita.fecha_hora).toLocaleString('es-MX', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            ) : (
              <div className="no-cita">Sin citas programadas próximamente</div>
            )}
          </div>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-title">Acciones</div>
          <div className="info-row">
            <span className="info-label">📅 Mis citas</span>
            <a className="info-link" href="/paciente/citas">Ir →</a>
          </div>
          <div className="info-row">
            <span className="info-label">📈 Mi progreso / expediente</span>
            <a className="info-link" href="/paciente/progreso">Ir →</a>
          </div>
          <div className="info-row">
            <span className="info-label">💳 Mis pagos</span>
            <a className="info-link" href="/paciente/pagos">Ir →</a>
          </div>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="zona-peligro">
            <div className="zona-peligro-title">⚠️ Zona de baja</div>
            {bajaSolicitada ? (
              <div className="baja-ok">
                ✓ Tu solicitud fue enviada. El equipo de RehabControl se pondrá en contacto
                contigo antes de procesar cualquier cambio en tu cuenta.
              </div>
            ) : (
              <>
                <div className="zona-peligro-desc">
                  Si deseas darte de baja del sistema, envía una solicitud. Un administrador
                  la procesará y te contactará antes de eliminar cualquier dato.
                </div>
                <button
                  className="btn-baja"
                  onClick={() => setModalBaja(true)}
                  disabled={solicitando}
                >
                  Solicitar baja de la plataforma
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {modalBaja && (
        <div className="modal-overlay" onClick={() => setModalBaja(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">⚠️ ¿Solicitar baja?</div>
            <div className="modal-desc">
              Tu solicitud será enviada al administrador. Tus datos clínicos se conservan por
              ley hasta que el equipo médico confirme la baja.{' '}
              <strong style={{ color: 'var(--text)' }}>
                Esta acción no elimina tu cuenta inmediatamente.
              </strong>
            </div>
            <label className="motivo-label">Motivo (opcional)</label>
            <textarea
              className="motivo-textarea"
              placeholder="Ej: Ya no requiero el servicio, me cambié de ciudad..."
              value={motivo}
              onChange={e => setMotivo(e.target.value.slice(0, 500))}
              disabled={solicitando}
            />
            <div className="motivo-chars">{motivo.length}/500</div>
            <div className="modal-actions">
              <button
                className="btn-cancel-modal"
                onClick={() => setModalBaja(false)}
                disabled={solicitando}
              >
                Cancelar
              </button>
              <button
                className="btn-confirm-baja"
                onClick={solicitarBaja}
                disabled={solicitando}
              >
                {solicitando ? 'Enviando...' : 'Confirmar solicitud'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}