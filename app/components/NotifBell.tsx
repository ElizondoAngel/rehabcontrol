'use client'

/**
 * NotifBell.tsx
 * Campana de notificaciones reutilizable para todos los dashboards.
 *
 * Para admin: panel con tab "Enviar" que permite mandar notificaciones
 *   • Por rol: todos los pacientes, terapeutas, secretarias o todos
 *   • Individual: buscar usuario por nombre y seleccionarlo
 *
 * USO:
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
}

interface UsuarioOpt {
  id: string
  nombre_completo: string
  rol: string
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

const ROL_LABELS: Record<string, string> = {
  paciente:   '👥 Todos los pacientes',
  terapeuta:  '🩺 Todos los terapeutas',
  secretaria: '📁 Todas las secretarias',
  admin:      '🛡 Todos los admins',
  todos:      '🌐 Todos los usuarios',
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
  const [abierto, setAbierto]         = useState(false)
  const [notifs, setNotifs]           = useState<Notif[]>([])
  const [noLeidas, setNoLeidas]       = useState(0)
  const [loading, setLoading]         = useState(false)
  const [tabAdmin, setTabAdmin]       = useState<'notifs'|'enviar'>('notifs')

  // ── Estado del formulario de envío ──────────────────────────
  const [modoDestino, setModoDestino] = useState<'rol'|'individual'>('rol')
  const [destinoRol, setDestinoRol]   = useState('paciente')
  const [busqUsuario, setBusqUsuario] = useState('')
  const [usuarios, setUsuarios]       = useState<UsuarioOpt[]>([])
  const [usuarioSel, setUsuarioSel]   = useState<UsuarioOpt|null>(null)
  const [cargandoUsers, setCargandoUsers] = useState(false)
  const [formEnvio, setFormEnvio]     = useState({ tipo:'mensaje_admin', titulo:'', mensaje:'' })
  const [enviando, setEnviando]       = useState(false)
  const [resultEnvio, setResultEnvio] = useState<{ok:boolean; msg:string}|null>(null)

  const ref = useRef<HTMLDivElement>(null)

  // ── Cargar notificaciones ────────────────────────────────────
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

  // ── Buscar usuarios para destino individual ──────────────────
  useEffect(() => {
    if (modoDestino !== 'individual' || busqUsuario.length < 2) {
      setUsuarios([])
      return
    }
    const timer = setTimeout(async () => {
      setCargandoUsers(true)
      const res = await fetch(`/api/usuarios/buscar?q=${encodeURIComponent(busqUsuario)}`)
      const data = await res.json()
      setCargandoUsers(false)
      if (res.ok) setUsuarios(data.usuarios ?? [])
    }, 350)
    return () => clearTimeout(timer)
  }, [busqUsuario, modoDestino])

  // ── Marcar leída ─────────────────────────────────────────────
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

  // ── Enviar notificación ──────────────────────────────────────
  async function enviarNotif(e: React.FormEvent) {
    e.preventDefault()
    if (!formEnvio.titulo.trim() || !formEnvio.mensaje.trim()) return
    if (modoDestino === 'individual' && !usuarioSel) return

    setEnviando(true)
    setResultEnvio(null)

    const body: Record<string, string> = {
      tipo:    formEnvio.tipo,
      titulo:  formEnvio.titulo,
      mensaje: formEnvio.mensaje,
    }

    if (modoDestino === 'rol') {
      body.destino_rol = destinoRol
    } else {
      body.user_id = usuarioSel!.id
    }

    const res = await fetch('/api/notificaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    setEnviando(false)

    if (res.ok) {
      const cnt = data.enviadas ?? 1
      setResultEnvio({ ok: true, msg: `✅ Enviada a ${cnt} usuario${cnt !== 1 ? 's' : ''}` })
      setFormEnvio({ tipo: 'mensaje_admin', titulo: '', mensaje: '' })
      setBusqUsuario('')
      setUsuarioSel(null)
      setTimeout(() => setResultEnvio(null), 4000)
    } else {
      setResultEnvio({ ok: false, msg: `❌ ${data.error ?? 'Error al enviar'}` })
    }
  }

  // ── Estilos compartidos ──────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width:'100%', background:'rgba(255,255,255,0.05)',
    border:'1px solid rgba(255,255,255,0.10)', borderRadius:9,
    padding:'9px 12px', fontSize:13, fontFamily:'Inter,sans-serif',
    color:'#E7EDF7', outline:'none',
  }
  const labelStyle: React.CSSProperties = {
    display:'block', fontSize:10, fontWeight:700, color:'#8C9BB5',
    letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:6,
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* ── CAMPANA ── */}
      <button
        onClick={() => { setAbierto(a => !a); if (!abierto) cargar() }}
        style={{
          position:'relative', width:36, height:36, borderRadius:9,
          border: abierto ? '1px solid rgba(56,189,248,0.4)' : '1px solid rgba(255,255,255,0.09)',
          background: abierto ? 'rgba(56,189,248,0.10)' : 'rgba(255,255,255,0.035)',
          display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'pointer', fontSize:16, transition:'all .18s',
        }}
      >
        🔔
        {noLeidas > 0 && (
          <span style={{
            position:'absolute', top:-4, right:-4,
            background:'#F25555', color:'#fff',
            fontSize:9, fontWeight:800,
            width:16, height:16, borderRadius:'50%',
            display:'flex', alignItems:'center', justifyContent:'center',
            border:'2px solid #060B14', fontFamily:'Inter,sans-serif',
          }}>
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {/* ── PANEL ── */}
      {abierto && (
        <div style={{
          position:'absolute', top:44, right:0, zIndex:300,
          width:380, maxHeight:560,
          background:'#0A1220',
          border:'1px solid rgba(255,255,255,0.10)',
          borderRadius:16,
          boxShadow:'0 20px 60px rgba(0,0,0,0.6)',
          display:'flex', flexDirection:'column',
          overflow:'hidden',
          animation:'notifSlide .2s ease',
          fontFamily:'Inter,sans-serif',
        }}>
          <style>{`
            @keyframes notifSlide{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
            .notif-item:hover{background:rgba(255,255,255,0.04)!important}
            .notif-scroll::-webkit-scrollbar{width:4px}
            .notif-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:4px}
            .modo-btn{flex:1;padding:7px 0;border:none;border-radius:7px;cursor:pointer;font-family:Inter,sans-serif;font-size:12px;font-weight:600;transition:all .15s}
            .usuario-opt{width:100%;text-align:left;background:none;border:none;padding:9px 12px;cursor:pointer;font-family:Inter,sans-serif;font-size:13px;color:#E7EDF7;border-radius:8px;transition:background .15s;display:flex;align-items:center;gap:8px}
            .usuario-opt:hover{background:rgba(255,255,255,0.07)}
          `}</style>

          {/* Header */}
          <div style={{
            padding:'14px 16px 12px',
            borderBottom:'1px solid rgba(255,255,255,0.08)',
            display:'flex', alignItems:'center', justifyContent:'space-between',
          }}>
            <div style={{display:'flex', alignItems:'center', gap:8}}>
              <span style={{fontSize:14, fontWeight:700, color:'#E7EDF7'}}>Notificaciones</span>
              {noLeidas > 0 && (
                <span style={{background:'rgba(56,189,248,0.15)', color:'#38BDF8', fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:100}}>
                  {noLeidas} nuevas
                </span>
              )}
            </div>
            {noLeidas > 0 && tabAdmin === 'notifs' && (
              <button onClick={marcarTodasLeidas} style={{background:'none', border:'none', color:'#38BDF8', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'Inter'}}>
                Marcar todas leídas
              </button>
            )}
          </div>

          {/* Tabs — solo admin */}
          {esAdmin && (
            <div style={{display:'flex', borderBottom:'1px solid rgba(255,255,255,0.08)', padding:'6px 8px', gap:4}}>
              {(['notifs','enviar'] as const).map(t => (
                <button key={t} className="modo-btn" onClick={() => setTabAdmin(t)} style={{
                  background: tabAdmin === t ? 'rgba(56,189,248,0.14)' : 'none',
                  color: tabAdmin === t ? '#38BDF8' : '#8C9BB5',
                }}>
                  {t === 'notifs' ? '🔔 Mis notifs' : '📢 Enviar'}
                </button>
              ))}
            </div>
          )}

          {/* ── TAB: LISTA DE NOTIFS ── */}
          {(!esAdmin || tabAdmin === 'notifs') && (
            <div className="notif-scroll" style={{overflowY:'auto', flex:1}}>
              {loading && (
                <div style={{padding:32, textAlign:'center', color:'#8C9BB5', fontSize:13}}>Cargando...</div>
              )}
              {!loading && notifs.length === 0 && (
                <div style={{padding:'40px 20px', textAlign:'center'}}>
                  <div style={{fontSize:32, marginBottom:10}}>🔔</div>
                  <div style={{fontSize:13, color:'#8C9BB5'}}>Sin notificaciones por ahora</div>
                </div>
              )}
              {notifs.map(n => (
                <div
                  key={n.id}
                  className="notif-item"
                  onClick={() => { if (!n.leida) marcarLeida(n.id) }}
                  style={{
                    display:'flex', gap:12, padding:'12px 16px',
                    borderBottom:'1px solid rgba(255,255,255,0.05)',
                    cursor: n.leida ? 'default' : 'pointer',
                    background: n.leida ? 'transparent' : 'rgba(56,189,248,0.04)',
                    transition:'background .15s',
                  }}
                >
                  <div style={{
                    width:36, height:36, borderRadius:10, flexShrink:0,
                    background: TIPO_COLOR[n.tipo] ?? 'rgba(140,155,181,0.15)',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
                  }}>
                    {TIPO_ICON[n.tipo] ?? '📌'}
                  </div>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:13, fontWeight: n.leida ? 400 : 600, color: n.leida ? '#8C9BB5' : '#E7EDF7', marginBottom:3}}>
                      {n.titulo}
                    </div>
                    <div style={{fontSize:12, color:'#8C9BB5', lineHeight:1.5, marginBottom:4}}>{n.mensaje}</div>
                    <div style={{fontSize:10, color:'rgba(140,155,181,0.6)', fontWeight:500}}>{tiempoRelativo(n.created_at)}</div>
                  </div>
                  {!n.leida && (
                    <div style={{width:7, height:7, borderRadius:'50%', background:'#38BDF8', flexShrink:0, marginTop:4, boxShadow:'0 0 6px #38BDF8'}}/>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── TAB: ENVIAR NOTIFICACIÓN (solo admin) ── */}
          {esAdmin && tabAdmin === 'enviar' && (
            <div style={{overflowY:'auto', flex:1, padding:16}}>

              {resultEnvio && (
                <div style={{
                  background: resultEnvio.ok ? 'rgba(52,211,153,0.10)' : 'rgba(242,85,85,0.10)',
                  border: `1px solid ${resultEnvio.ok ? 'rgba(52,211,153,0.3)' : 'rgba(242,85,85,0.3)'}`,
                  borderRadius:10, padding:'10px 14px', marginBottom:14,
                  fontSize:13, color: resultEnvio.ok ? '#34D399' : '#F25555', fontWeight:500,
                }}>
                  {resultEnvio.msg}
                </div>
              )}

              <form onSubmit={enviarNotif}>
                {/* Tipo */}
                <div style={{marginBottom:12}}>
                  <label style={labelStyle}>Tipo de notificación</label>
                  <select value={formEnvio.tipo} onChange={e => setFormEnvio(p => ({...p, tipo: e.target.value}))} style={inputStyle}>
                    <option value="mensaje_admin">📢 Mensaje del administrador</option>
                    <option value="sistema">⚙️ Aviso del sistema</option>
                    <option value="cita_proxima">📅 Recordatorio de cita</option>
                    <option value="pago_pendiente">💳 Aviso de pago pendiente</option>
                  </select>
                </div>

                {/* Título */}
                <div style={{marginBottom:12}}>
                  <label style={labelStyle}>Título</label>
                  <input
                    value={formEnvio.titulo} required
                    onChange={e => setFormEnvio(p => ({...p, titulo: e.target.value}))}
                    placeholder="Ej. Recordatorio importante"
                    style={inputStyle}
                  />
                </div>

                {/* Mensaje */}
                <div style={{marginBottom:14}}>
                  <label style={labelStyle}>Mensaje</label>
                  <textarea
                    value={formEnvio.mensaje} required rows={3}
                    onChange={e => setFormEnvio(p => ({...p, mensaje: e.target.value}))}
                    placeholder="Escribe el mensaje..."
                    style={{...inputStyle, resize:'none'}}
                  />
                </div>

                {/* Selector de destino */}
                <div style={{marginBottom:14}}>
                  <label style={labelStyle}>Destinatario</label>

                  {/* Toggle rol / individual */}
                  <div style={{display:'flex', gap:4, marginBottom:10, background:'rgba(255,255,255,0.04)', borderRadius:9, padding:4}}>
                    {(['rol','individual'] as const).map(m => (
                      <button key={m} type="button" className="modo-btn" onClick={() => { setModoDestino(m); setBusqUsuario(''); setUsuarioSel(null) }} style={{
                        background: modoDestino === m ? 'rgba(56,189,248,0.18)' : 'none',
                        color: modoDestino === m ? '#38BDF8' : '#8C9BB5',
                      }}>
                        {m === 'rol' ? '👥 Por rol' : '👤 Individual'}
                      </button>
                    ))}
                  </div>

                  {/* Por rol */}
                  {modoDestino === 'rol' && (
                    <select value={destinoRol} onChange={e => setDestinoRol(e.target.value)} style={inputStyle}>
                      <option value="paciente">👥 Todos los pacientes</option>
                      <option value="terapeuta">🩺 Todos los terapeutas</option>
                      <option value="secretaria">📁 Todas las secretarias</option>
                      <option value="admin">🛡 Todos los admins</option>
                      <option value="todos">🌐 Todos los usuarios</option>
                    </select>
                  )}

                  {/* Individual */}
                  {modoDestino === 'individual' && (
                    <div>
                      {usuarioSel ? (
                        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(56,189,248,0.10)', border:'1px solid rgba(56,189,248,0.25)', borderRadius:9, padding:'9px 12px'}}>
                          <div>
                            <div style={{fontSize:13, fontWeight:600, color:'#E7EDF7'}}>{usuarioSel.nombre_completo}</div>
                            <div style={{fontSize:11, color:'#8C9BB5', marginTop:2}}>{ROL_LABELS[usuarioSel.rol] ?? usuarioSel.rol}</div>
                          </div>
                          <button type="button" onClick={() => { setUsuarioSel(null); setBusqUsuario('') }} style={{background:'none', border:'none', color:'#8C9BB5', cursor:'pointer', fontSize:16}}>✕</button>
                        </div>
                      ) : (
                        <div style={{position:'relative'}}>
                          <input
                            value={busqUsuario}
                            onChange={e => setBusqUsuario(e.target.value)}
                            placeholder="Buscar por nombre..."
                            style={inputStyle}
                          />
                          {cargandoUsers && (
                            <div style={{padding:'8px 12px', fontSize:12, color:'#8C9BB5'}}>Buscando...</div>
                          )}
                          {!cargandoUsers && usuarios.length > 0 && (
                            <div style={{background:'#0C1928', border:'1px solid rgba(255,255,255,0.10)', borderRadius:10, marginTop:4, overflow:'hidden'}}>
                              {usuarios.map(u => (
                                <button key={u.id} type="button" className="usuario-opt" onClick={() => { setUsuarioSel(u); setBusqUsuario(''); setUsuarios([]) }}>
                                  <div style={{width:28, height:28, borderRadius:'50%', background:'rgba(56,189,248,0.18)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#E7EDF7', flexShrink:0}}>
                                    {u.nombre_completo.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}
                                  </div>
                                  <div>
                                    <div style={{fontSize:13, color:'#E7EDF7'}}>{u.nombre_completo}</div>
                                    <div style={{fontSize:11, color:'#8C9BB5'}}>{ROL_LABELS[u.rol] ?? u.rol}</div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                          {!cargandoUsers && busqUsuario.length >= 2 && usuarios.length === 0 && (
                            <div style={{padding:'8px 12px', fontSize:12, color:'#8C9BB5'}}>Sin resultados</div>
                          )}
                          {busqUsuario.length < 2 && (
                            <div style={{fontSize:11, color:'#8C9BB5', marginTop:6}}>Escribe al menos 2 caracteres</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={enviando || (modoDestino === 'individual' && !usuarioSel)}
                  style={{
                    width:'100%', background:'linear-gradient(135deg,#2563EB,#38BDF8)',
                    color:'#fff', border:'none', borderRadius:10, padding:'10px 0',
                    fontSize:13, fontWeight:600, cursor: enviando ? 'not-allowed' : 'pointer',
                    fontFamily:'Inter', opacity: (enviando || (modoDestino==='individual' && !usuarioSel)) ? .5 : 1,
                    display:'flex', alignItems:'center', justifyContent:'center', gap:7,
                  }}
                >
                  {enviando && <span style={{width:13, height:13, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', animation:'spin .7s linear infinite', display:'inline-block'}}/>}
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
