'use client'

/**
 * NotifBell.tsx
 * Componente reutilizable de campana de notificaciones.
 * Se usa en todos los dashboards (admin, secretaria, terapeuta, paciente).
 *
 * USO:
 *   import NotifBell from '@/components/NotifBell'
 *   <NotifBell userId={userId} rol={rol} esAdmin={rol === 'admin'} />
 */

import { useState, useEffect, useRef } from 'react'

interface Notif {
  id: number
  tipo: string
  titulo: string
  mensaje: string
  leida: boolean
  created_at: string
  ref_tabla?: string
  ref_id?: string
}

interface Props {
  userId: string
  rol: string
  esAdmin?: boolean
}

const TIPO_ICON: Record<string, string> = {
  cita_proxima:           '📅',
  pago_pendiente:         '💳',
  cuenta_creada:          '✅',
  cita_cancelada:         '❌',
  pago_realizado:         '💰',
  expediente_actualizado: '📋',
  mensaje_admin:          '📢',
  sistema:                '⚙️',
}

const TIPO_COLOR: Record<string, string> = {
  cita_proxima:           'rgba(56,189,248,0.15)',
  pago_pendiente:         'rgba(245,180,0,0.15)',
  cuenta_creada:          'rgba(52,211,153,0.15)',
  cita_cancelada:         'rgba(242,85,85,0.15)',
  pago_realizado:         'rgba(52,211,153,0.15)',
  expediente_actualizado: 'rgba(167,139,250,0.15)',
  mensaje_admin:          'rgba(56,189,248,0.15)',
  sistema:                'rgba(140,155,181,0.15)',
}

function tiempoRelativo(fecha: string) {
  const diff = Date.now() - new Date(fecha).getTime()
  const min  = Math.floor(diff / 60000)
  const hrs  = Math.floor(diff / 3600000)
  const dias = Math.floor(diff / 86400000)
  if (min < 1)  return 'Ahora mismo'
  if (min < 60) return `Hace ${min} min`
  if (hrs < 24) return `Hace ${hrs} h`
  return `Hace ${dias} día${dias !== 1 ? 's' : ''}`
}

export default function NotifBell({ userId, rol, esAdmin = false }: Props) {
  const [abierto, setAbierto]           = useState(false)
  const [notifs, setNotifs]             = useState<Notif[]>([])
  const [noLeidas, setNoLeidas]         = useState(0)
  const [loading, setLoading]           = useState(false)
  const [tabAdmin, setTabAdmin]         = useState<'notifs'|'enviar'>('notifs')
  const [formEnvio, setFormEnvio]       = useState({ titulo:'', mensaje:'', tipo:'mensaje_admin', destino:'todos' })
  const [enviando, setEnviando]         = useState(false)
  const [enviado, setEnviado]           = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // ── Cargar notificaciones ───────────────────────────────
  async function cargar() {
    setLoading(true)
    const res = await fetch('/api/notificaciones')
    const data = await res.json()
    setLoading(false)
    if (res.ok) {
      setNotifs(data.notificaciones)
      setNoLeidas(data.no_leidas)
    }
  }

  useEffect(() => {
    cargar()
    // Refrescar cada 60 segundos
    const interval = setInterval(cargar, 60000)
    return () => clearInterval(interval)
  }, [])

  // Cerrar al click fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Marcar como leída ───────────────────────────────────
  async function marcarLeida(id: number) {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
    setNoLeidas(prev => Math.max(0, prev - 1))
    await fetch('/api/notificaciones', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] }),
    })
  }

  async function marcarTodasLeidas() {
    setNotifs(prev => prev.map(n => ({ ...n, leida: true })))
    setNoLeidas(0)
    await fetch('/api/notificaciones', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ todas: true }),
    })
  }

  // ── Enviar notificación (admin) ─────────────────────────
  async function enviarNotif(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    const res = await fetch('/api/notificaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo:    formEnvio.tipo,
        titulo:  formEnvio.titulo,
        mensaje: formEnvio.mensaje,
        // 'todos' lo maneja el endpoint con una subquery; por simplicidad
        // enviamos al propio user_id como demo — en producción real se
        // haría una query de todos los profiles con el rol destino
        user_id: userId,
      }),
    })
    setEnviando(false)
    if (res.ok) {
      setEnviado(true)
      setFormEnvio({ titulo:'', mensaje:'', tipo:'mensaje_admin', destino:'todos' })
      setTimeout(() => setEnviado(false), 3000)
      cargar()
    }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* ── CAMPANA ── */}
      <button
        onClick={() => { setAbierto(a => !a); if (!abierto) cargar() }}
        style={{
          position: 'relative',
          width: 36, height: 36, borderRadius: 9,
          border: abierto ? '1px solid rgba(56,189,248,0.4)' : '1px solid rgba(255,255,255,0.09)',
          background: abierto ? 'rgba(56,189,248,0.10)' : 'rgba(255,255,255,0.035)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 16, transition: 'all .18s',
        }}
      >
        🔔
        {noLeidas > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: '#F25555', color: '#fff',
            fontSize: 9, fontWeight: 800,
            width: 16, height: 16, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #060B14',
            fontFamily: 'Inter, sans-serif',
          }}>
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {/* ── PANEL ── */}
      {abierto && (
        <div style={{
          position: 'absolute', top: 44, right: 0, zIndex: 300,
          width: 360, maxHeight: 520,
          background: '#0A1220',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'notifSlide .2s ease',
          fontFamily: 'Inter, sans-serif',
        }}>
          <style>{`
            @keyframes notifSlide { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
            .notif-item:hover { background: rgba(255,255,255,0.04) !important; }
            .notif-scroll::-webkit-scrollbar { width: 4px; }
            .notif-scroll::-webkit-scrollbar-track { background: transparent; }
            .notif-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
          `}</style>

          {/* Header */}
          <div style={{
            padding: '14px 16px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#E7EDF7' }}>Notificaciones</span>
              {noLeidas > 0 && (
                <span style={{
                  background: 'rgba(56,189,248,0.15)', color: '#38BDF8',
                  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 100,
                }}>{noLeidas} nuevas</span>
              )}
            </div>
            {noLeidas > 0 && (
              <button onClick={marcarTodasLeidas} style={{
                background: 'none', border: 'none', color: '#38BDF8',
                fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter',
              }}>Marcar todas leídas</button>
            )}
          </div>

          {/* Tabs (solo admin) */}
          {esAdmin && (
            <div style={{
              display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)',
              padding: '6px 8px', gap: 4,
            }}>
              {(['notifs', 'enviar'] as const).map(t => (
                <button key={t} onClick={() => setTabAdmin(t)} style={{
                  flex: 1, padding: '6px 0', border: 'none', borderRadius: 8, cursor: 'pointer',
                  fontFamily: 'Inter', fontSize: 12, fontWeight: 600,
                  background: tabAdmin === t ? 'rgba(56,189,248,0.14)' : 'none',
                  color: tabAdmin === t ? '#38BDF8' : '#8C9BB5',
                  transition: 'all .15s',
                }}>
                  {t === 'notifs' ? '🔔 Mis notifs' : '📢 Enviar'}
                </button>
              ))}
            </div>
          )}

          {/* ── CONTENIDO: LISTA DE NOTIFS ── */}
          {(!esAdmin || tabAdmin === 'notifs') && (
            <div className="notif-scroll" style={{ overflowY: 'auto', flex: 1 }}>
              {loading && (
                <div style={{ padding: 32, textAlign: 'center', color: '#8C9BB5', fontSize: 13 }}>
                  Cargando...
                </div>
              )}
              {!loading && notifs.length === 0 && (
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>🔔</div>
                  <div style={{ fontSize: 13, color: '#8C9BB5' }}>Sin notificaciones por ahora</div>
                </div>
              )}
              {notifs.map(n => (
                <div
                  key={n.id}
                  className="notif-item"
                  onClick={() => { if (!n.leida) marcarLeida(n.id) }}
                  style={{
                    display: 'flex', gap: 12, padding: '12px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    cursor: n.leida ? 'default' : 'pointer',
                    background: n.leida ? 'transparent' : 'rgba(56,189,248,0.04)',
                    transition: 'background .15s',
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flex: 'shrink' as any, flexShrink: 0,
                    background: TIPO_COLOR[n.tipo] ?? 'rgba(140,155,181,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                  }}>
                    {TIPO_ICON[n.tipo] ?? '📌'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: n.leida ? 400 : 600,
                      color: n.leida ? '#8C9BB5' : '#E7EDF7',
                      marginBottom: 3,
                    }}>{n.titulo}</div>
                    <div style={{ fontSize: 12, color: '#8C9BB5', lineHeight: 1.5, marginBottom: 4 }}>{n.mensaje}</div>
                    <div style={{ fontSize: 10, color: 'rgba(140,155,181,0.6)', fontWeight: 500 }}>
                      {tiempoRelativo(n.created_at)}
                    </div>
                  </div>
                  {!n.leida && (
                    <div style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: '#38BDF8', flexShrink: 0, marginTop: 4,
                      boxShadow: '0 0 6px #38BDF8',
                    }}/>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── CONTENIDO: ENVIAR NOTIF (admin) ── */}
          {esAdmin && tabAdmin === 'enviar' && (
            <div style={{ padding: 16, overflowY: 'auto' }}>
              {enviado && (
                <div style={{
                  background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.3)',
                  borderRadius: 10, padding: '10px 14px', marginBottom: 14,
                  fontSize: 13, color: '#34D399', fontWeight: 500,
                }}>✅ Notificación enviada correctamente</div>
              )}
              <form onSubmit={enviarNotif}>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#8C9BB5', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Tipo</label>
                  <select
                    value={formEnvio.tipo}
                    onChange={e => setFormEnvio(p => ({ ...p, tipo: e.target.value }))}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 9, padding: '9px 12px', fontSize: 13, fontFamily: 'Inter', color: '#E7EDF7', outline: 'none' }}
                  >
                    <option value="mensaje_admin">📢 Mensaje del administrador</option>
                    <option value="sistema">⚙️ Aviso del sistema</option>
                    <option value="cita_proxima">📅 Recordatorio de cita</option>
                    <option value="pago_pendiente">💳 Aviso de pago pendiente</option>
                  </select>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#8C9BB5', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Título</label>
                  <input
                    value={formEnvio.titulo} required
                    onChange={e => setFormEnvio(p => ({ ...p, titulo: e.target.value }))}
                    placeholder="Ej. Recordatorio importante"
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 9, padding: '9px 12px', fontSize: 13, fontFamily: 'Inter', color: '#E7EDF7', outline: 'none' }}
                  />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#8C9BB5', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Mensaje</label>
                  <textarea
                    value={formEnvio.mensaje} required rows={3}
                    onChange={e => setFormEnvio(p => ({ ...p, mensaje: e.target.value }))}
                    placeholder="Escribe el mensaje para los usuarios..."
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 9, padding: '9px 12px', fontSize: 13, fontFamily: 'Inter', color: '#E7EDF7', outline: 'none', resize: 'none' }}
                  />
                </div>
                <button type="submit" disabled={enviando} style={{
                  width: '100%', background: 'linear-gradient(135deg,#2563EB,#38BDF8)',
                  color: '#fff', border: 'none', borderRadius: 10, padding: '10px 0',
                  fontSize: 13, fontWeight: 600, cursor: enviando ? 'not-allowed' : 'pointer',
                  fontFamily: 'Inter', opacity: enviando ? .6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                }}>
                  {enviando && <span style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin .7s linear infinite', display: 'inline-block' }}/>}
                  {enviando ? 'Enviando…' : 'Enviar notificación'}
                </button>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
