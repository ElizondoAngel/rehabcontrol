'use client'

/**
 * AgendarCitaBloques.tsx
 * ─────────────────────────────────────────────────────────────
 * Widget de agenda por bloques para el paciente.
 *
 *   • Pestañas con los próximos días hábiles (Lun-Vie)
 *   • Al elegir un día, trae los bloques libres de GET
 *     /api/paciente/disponibilidad?fecha=YYYY-MM-DD
 *   • Al elegir un bloque, confirma y hace POST a
 *     /api/paciente/citas — la cita nace 'pendiente_aprobacion'
 *   • Pago: siempre "en la clínica" — no se pide nada aquí
 *
 * Tras crear la solicitud, llama a onSolicitudCreada() para que el
 * padre refresque su lista de citas (aparecerá en "Próximas" con
 * badge de pendiente).
 */

import { useState, useEffect, useCallback } from 'react'

interface Bloque { hora: string; disponible: boolean }
interface Props {
  onSolicitudCreada: () => void
}

function formatoFechaLocal(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function proximosDiasHabiles(cantidad = 5) {
  const dias: { fecha: string; label: string }[] = []
  const cursor = new Date()
  while (dias.length < cantidad) {
    const diaSemana = cursor.getDay()
    if (diaSemana >= 1 && diaSemana <= 5) {
      dias.push({
        fecha: formatoFechaLocal(cursor),
        label: cursor.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
      })
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return dias
}

export default function AgendarCitaBloques({ onSolicitudCreada }: Props) {
  const dias = proximosDiasHabiles(5)
  const [diaSel, setDiaSel] = useState(dias[0].fecha)
  const [bloques, setBloques] = useState<Bloque[]>([])
  const [duracion, setDuracion] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [seleccion, setSeleccion] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const cargar = useCallback(async (fecha: string) => {
    setLoading(true)
    setError('')
    setSeleccion(null)
    try {
      const res = await fetch(`/api/paciente/disponibilidad?fecha=${fecha}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'No se pudo cargar la disponibilidad')
        setBloques([])
        setDuracion(null)
        return
      }
      setBloques(data.bloques ?? [])
      setDuracion(data.duracion_min ?? null)
    } catch {
      setError('Error de conexión al cargar disponibilidad')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar(diaSel) }, [diaSel, cargar])

  async function confirmarSolicitud() {
    if (!seleccion) return
    setEnviando(true)
    const fechaHora = new Date(`${diaSel}T${seleccion}:00`).toISOString()
    const res = await fetch('/api/paciente/citas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha_hora: fechaHora }),
    })
    const data = await res.json()
    setEnviando(false)

    if (!res.ok) {
      setToast({ msg: data.error ?? 'No se pudo enviar la solicitud', type: 'error' })
      return
    }
    setToast({ msg: 'Solicitud enviada — queda pendiente de confirmación', type: 'success' })
    setSeleccion(null)
    cargar(diaSel)
    onSolicitudCreada()
  }

  const labelDia = dias.find(d => d.fecha === diaSel)?.label ?? ''

  return (
    <div className="agendar-card">
      <div className="agendar-header">
        <div className="agendar-title">Agendar una cita</div>
        <div className="agendar-sub">Lunes a viernes, 8:00 – 18:00 hrs</div>
      </div>

      <div className="dia-tabs">
        {dias.map(d => (
          <button
            key={d.fecha}
            className={`dia-tab${d.fecha === diaSel ? ' activo' : ''}`}
            onClick={() => setDiaSel(d.fecha)}
          >
            {d.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="agendar-estado">Cargando disponibilidad…</div>
      ) : error ? (
        <div className="agendar-estado error">{error}</div>
      ) : bloques.length === 0 ? (
        <div className="agendar-estado">Tu terapeuta no tiene horario configurado para {labelDia}.</div>
      ) : (
        <div className="bloques-grid">
          {bloques.map(b => (
            <button
              key={b.hora}
              disabled={!b.disponible}
              className={`bloque${b.disponible ? '' : ' ocupado'}${seleccion === b.hora ? ' seleccionado' : ''}`}
              onClick={() => setSeleccion(b.hora)}
            >
              <span className="bloque-hora">{b.hora}</span>
              <span className="bloque-estado">{b.disponible ? `${duracion} min` : 'Ocupado'}</span>
            </button>
          ))}
        </div>
      )}

      {seleccion && (
        <div className="confirmar-panel">
          <div className="confirmar-info">
            <div className="confirmar-hora">{seleccion} hrs · {duracion} min · {labelDia}</div>
            <div className="confirmar-pago">
              <span className="pago-icon">🏥</span> Forma de pago: en la clínica
            </div>
          </div>
          <button className="btn-solicitar" onClick={confirmarSolicitud} disabled={enviando}>
            {enviando ? 'Enviando…' : 'Solicitar cita'}
          </button>
        </div>
      )}

      {toast && (
        <div className={`agendar-toast ${toast.type}`}>
          {toast.msg}
          <button onClick={() => setToast(null)}>✕</button>
        </div>
      )}

      <style jsx>{`
        .agendar-card{background:var(--card);border:1px solid var(--card-border);border-radius:16px;padding:22px 24px;margin-bottom:28px;position:relative}
        .agendar-header{margin-bottom:16px}
        .agendar-title{font-size:16px;font-weight:700;color:var(--text)}
        .agendar-sub{font-size:12.5px;color:var(--muted);margin-top:2px}
        .dia-tabs{display:flex;gap:8px;margin-bottom:16px;overflow-x:auto}
        .dia-tab{padding:7px 16px;border-radius:100px;border:1px solid var(--border);background:transparent;color:var(--muted);font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap;transition:all .18s;font-family:'Inter',sans-serif}
        .dia-tab:hover{border-color:var(--cyan);color:var(--text)}
        .dia-tab.activo{background:rgba(56,189,248,0.12);border-color:rgba(56,189,248,0.4);color:var(--cyan)}
        .agendar-estado{padding:24px 0;text-align:center;color:var(--muted);font-size:13.5px}
        .agendar-estado.error{color:var(--red)}
        .bloques-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px}
        .bloque{border:1px solid var(--border);border-radius:10px;padding:10px 8px;background:var(--surface2);cursor:pointer;display:flex;flex-direction:column;gap:4px;align-items:center;transition:all .15s;font-family:'Inter',sans-serif}
        .bloque:hover:not(.ocupado){border-color:rgba(56,189,248,0.4);background:rgba(56,189,248,0.08)}
        .bloque.ocupado{opacity:0.4;cursor:not-allowed}
        .bloque.seleccionado{border-color:var(--cyan);background:rgba(56,189,248,0.16)}
        .bloque-hora{font-size:14px;font-weight:600;color:var(--text)}
        .bloque-estado{font-size:11px;color:var(--muted)}
        .confirmar-panel{margin-top:16px;background:var(--surface2);border-radius:12px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
        .confirmar-hora{font-size:14px;font-weight:600;color:var(--text)}
        .confirmar-pago{font-size:12.5px;color:var(--muted);margin-top:4px;display:flex;align-items:center;gap:6px}
        .btn-solicitar{background:linear-gradient(135deg,var(--blue),var(--cyan));color:#fff;border:none;border-radius:10px;padding:10px 20px;font-size:13.5px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;white-space:nowrap}
        .btn-solicitar:disabled{opacity:0.6;cursor:not-allowed}
        .agendar-toast{position:relative;margin-top:16px;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px 14px;font-size:13px;display:flex;justify-content:space-between;align-items:center}
        .agendar-toast.success{color:var(--green)}
        .agendar-toast.error{color:var(--red)}
        .agendar-toast button{background:none;border:none;color:inherit;cursor:pointer;font-size:14px}
      `}</style>
    </div>
  )
}
