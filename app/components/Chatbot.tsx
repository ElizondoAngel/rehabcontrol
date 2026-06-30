'use client'

import { useState, useRef, useEffect } from 'react'

interface ChatMsg {
  id: string
  role: 'user' | 'bot'
  text: string
  time: string
  fileName?: string
}
interface MsgHist { role: 'user' | 'assistant'; content: string }

interface Props {
  rol?: 'admin' | 'terapeuta' | 'paciente' | 'secretaria'
  modulo?: string
}

const SUGERENCIAS: Record<string, string[]> = {
  admin:      ['¿Cómo creo un usuario?', '¿Qué campos lleva un expediente?', 'Ver logs de auditoría', 'Causas de dolor lumbar'],
  secretaria: ['Agendar una cita', '¿Cómo registro un pago?', 'Crear nuevo paciente', 'Ver citas de hoy'],
  terapeuta:  ['Ver reporte de síntomas', 'Ejercicios para rodilla', '¿Cómo registro progreso?', 'Agendar una cita'],
  paciente:   ['Tengo un dolor que quiero reportar', '¿Cómo veo mis ejercicios?', 'Ver mis pagos', '¿Qué significa mi nivel de dolor?'],
}

const BIENVENIDA: Record<string, string> = {
  admin:      '¡Hola, Admin! 👋 Soy RehabControl AI. Puedo ayudarte con usuarios, expedientes y métricas del sistema.',
  secretaria: '¡Hola! 👋 Soy RehabControl AI. Puedo ayudarte a agendar citas, registrar pagos y gestionar pacientes.',
  terapeuta:  '¡Hola! 👋 Soy RehabControl AI. Puedo mostrarte los reportes de síntomas de tus pacientes y ayudarte a agendar citas.',
  paciente:   '¡Hola! 👋 Soy RehabControl AI. Puedo ayudarte a reportar cómo te sientes para tu terapeuta y resolver dudas generales. Para agendar una cita, contacta a la secretaria.',
}

// Acento de color distinto por rol — misma base oscura, distinta identidad
const ACENTOS: Record<string, { from: string; to: string; glow: string; chip: string }> = {
  admin:      { from: '#B45309', to: '#F59E0B', glow: 'rgba(245,158,11,0.5)', chip: '#F59E0B' },
  secretaria: { from: '#6D28D9', to: '#A78BFA', glow: 'rgba(167,139,250,0.5)', chip: '#A78BFA' },
  terapeuta:  { from: '#0D9488', to: '#2DD4BF', glow: 'rgba(45,212,191,0.5)', chip: '#2DD4BF' },
  paciente:   { from: '#2563EB', to: '#38BDF8', glow: 'rgba(56,189,248,0.5)', chip: '#38BDF8' },
}

const PUEDE_ADJUNTAR = ['admin', 'terapeuta']

function hora(iso?: string) {
  return new Date(iso ?? Date.now()).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function getMime(file: File): string {
  if (file.type) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    pdf: 'application/pdf', png: 'image/png',
    jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif: 'image/gif', webp: 'image/webp',
    txt: 'text/plain', csv: 'text/csv',
  }
  return map[ext ?? ''] ?? 'application/octet-stream'
}

export default function Chatbot({ rol = 'paciente', modulo = 'DASHBOARD' }: Props) {
  const [open,       setOpen]       = useState(false)
  const [notif,      setNotif]      = useState(true)
  const [input,      setInput]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [loadingHist, setLoadingHist] = useState(true)
  const [paused,     setPaused]     = useState(false)
  const [showSugs,   setShowSugs]   = useState(true)
  const [adjunto,    setAdjunto]    = useState<File | null>(null)
  const [adjPreview, setAdjPreview] = useState<string | null>(null)
  const [messages,   setMessages]   = useState<ChatMsg[]>([])

  const acento    = ACENTOS[rol] ?? ACENTOS.paciente
  const history   = useRef<MsgHist[]>([])
  const pendiente = useRef<string>('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef   = useRef<HTMLInputElement>(null)
  const puedeAdj  = PUEDE_ADJUNTAR.includes(rol)
  const yaCargado = useRef(false)

  // ── Cargar historial guardado al montar (se queda la info entre sesiones) ──
  useEffect(() => {
    if (yaCargado.current) return
    yaCargado.current = true
    ;(async () => {
      try {
        const res = await fetch('/api/chatbot')
        const data = await res.json()
        if (!res.ok) {
          console.error('Error cargando historial del chat:', data.error)
        }
        const historial = data.historial as { role: 'user' | 'assistant'; content: string; created_at: string }[]
        if (historial?.length) {
          history.current = historial.map(h => ({ role: h.role, content: h.content }))
          setMessages([
            { id: 'w', role: 'bot', time: hora(), text: BIENVENIDA[rol] ?? BIENVENIDA.paciente },
            ...historial.map((h, i) => ({
              id: `h${i}`,
              role: (h.role === 'user' ? 'user' : 'bot') as 'user' | 'bot',
              text: h.content,
              time: hora(h.created_at),
            })),
          ])
          setShowSugs(false)
        } else {
          setMessages([{ id: '0', role: 'bot', time: hora(), text: BIENVENIDA[rol] ?? BIENVENIDA.paciente }])
        }
      } catch {
        setMessages([{ id: '0', role: 'bot', time: hora(), text: BIENVENIDA[rol] ?? BIENVENIDA.paciente }])
      } finally {
        setLoadingHist(false)
      }
    })()
  }, [rol])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function toggle() { setOpen(p => !p); setNotif(false) }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { alert('Máximo 10MB'); return }
    setAdjunto(file)
    setAdjPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : null)
    e.target.value = ''
  }

  function pausar() {
    if (!input.trim() || loading) return
    pendiente.current = input
    setInput('')
    setPaused(true)
    setMessages(p => [...p, {
      id: Date.now().toString(), role: 'bot', time: hora(),
      text: '⏸️ Mensaje en pausa. Puedes editarlo y reanudar cuando quieras.',
    }])
  }

  function reanudar() {
    setInput(pendiente.current)
    setPaused(false)
    pendiente.current = ''
  }

  async function send(text: string) {
    if ((!text.trim() && !adjunto) || loading) return

    setInput('')
    setPaused(false)
    setShowSugs(false)

    const textoMostrar = text.trim() || `📎 ${adjunto?.name}`
    setMessages(p => [...p, {
      id: Date.now().toString(), role: 'user',
      text: textoMostrar, time: hora(),
      fileName: adjunto?.name,
    }])

    const newHist: MsgHist[] = [...history.current, { role: 'user', content: textoMostrar }]
    history.current = newHist
    setLoading(true)

    let fileData: { base64: string; mimeType: string; name: string } | null = null
    if (adjunto && puedeAdj) {
      try {
        fileData = { base64: await fileToBase64(adjunto), mimeType: getMime(adjunto), name: adjunto.name }
      } catch { console.error('Error leyendo archivo') }
    }
    setAdjunto(null)
    setAdjPreview(null)

    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newHist, modulo, file: fileData }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const reply: string = data.reply ?? 'Sin respuesta. Intenta de nuevo.'
      history.current = [...newHist, { role: 'assistant', content: reply }]
      setMessages(p => [...p, { id: (Date.now() + 1).toString(), role: 'bot', text: reply, time: hora() }])
    } catch (err) {
      console.error(err)
      setMessages(p => [...p, {
        id: (Date.now() + 1).toString(), role: 'bot', time: hora(),
        text: 'Error de conexión. Intenta de nuevo.',
      }])
    } finally {
      setLoading(false)
    }
  }

  const sugs = SUGERENCIAS[rol] ?? SUGERENCIAS.paciente

  return (
    <>
      {open && (
        <div style={{
          position: 'fixed', bottom: 90, right: 28, width: 340,
          background: '#0A1220', border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 16, display: 'flex', flexDirection: 'column',
          height: 520, zIndex: 9999, overflow: 'hidden',
          boxShadow: `0 16px 48px rgba(0,0,0,0.7)`,
        }}>

          {/* Header */}
          <div style={{
            background: '#060B14', padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
            borderBottom: '1px solid rgba(255,255,255,0.09)', flexShrink: 0,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: `linear-gradient(135deg,${acento.from},${acento.to})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>🩺</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#E7EDF7', margin: 0 }}>RehabControl AI</p>
              <p style={{ fontSize: 11, color: acento.chip, margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: paused ? '#F5B400' : acento.chip, display: 'inline-block', boxShadow: `0 0 6px ${paused ? '#F5B400' : acento.chip}` }} />
                {paused ? 'En pausa' : 'En línea'} · {rol}
              </p>
            </div>
            <button onClick={toggle} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8C9BB5', fontSize: 18 }}>✕</button>
          </div>

          {/* Aviso: no es especialista */}
          <div style={{
            padding: '6px 14px', background: 'rgba(255,255,255,0.03)',
            borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
          }}>
            <p style={{ fontSize: 10, color: '#8C9BB5', margin: 0, lineHeight: 1.4 }}>
              ⚠️ No soy un especialista. Para diagnóstico o dudas médicas serias, consulta a tu terapeuta.
            </p>
          </div>

          {/* Mensajes */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: 14,
            display: 'flex', flexDirection: 'column', gap: 10,
            scrollbarWidth: 'thin', scrollbarColor: `${acento.glow} transparent`,
          }}>
            {loadingHist && (
              <p style={{ fontSize: 11, color: '#8C9BB5', textAlign: 'center' }}>Cargando conversación…</p>
            )}
            {messages.map(m => (
              <div key={m.id} style={{
                maxWidth: '88%', display: 'flex', flexDirection: 'column', gap: 3,
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                {m.fileName && (
                  <div style={{ fontSize: 10, color: acento.chip, marginBottom: 2, textAlign: m.role === 'user' ? 'right' : 'left' }}>
                    📎 {m.fileName}
                  </div>
                )}
                <div style={{
                  padding: '8px 12px', fontSize: 13, lineHeight: 1.6,
                  whiteSpace: 'pre-wrap', borderRadius: 12,
                  borderBottomLeftRadius:  m.role === 'bot'  ? 3 : 12,
                  borderBottomRightRadius: m.role === 'user' ? 3 : 12,
                  background: m.role === 'user'
                    ? `linear-gradient(135deg,${acento.from},${acento.to})`
                    : 'rgba(255,255,255,0.06)',
                  color: '#E7EDF7',
                  border: m.role === 'bot' ? '1px solid rgba(255,255,255,0.09)' : 'none',
                }}>
                  {m.text}
                </div>
                <p style={{ fontSize: 10, color: '#8C9BB5', margin: 0, textAlign: m.role === 'user' ? 'right' : 'left' }}>
                  {m.time}
                </p>
              </div>
            ))}

            {loading && (
              <div style={{ alignSelf: 'flex-start' }}>
                <div style={{
                  display: 'flex', gap: 5, padding: '10px 14px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: 12, borderBottomLeftRadius: 3,
                }}>
                  {[0, 0.2, 0.4].map((d, i) => (
                    <span key={i} style={{
                      width: 6, height: 6, borderRadius: '50%', background: acento.chip,
                      display: 'inline-block', animation: `rcb 1.2s ${d}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Sugerencias */}
          {showSugs && (
            <div style={{ padding: '0 12px 8px', display: 'flex', flexWrap: 'wrap', gap: 6, flexShrink: 0 }}>
              {sugs.map(s => (
                <button key={s} onClick={() => send(s)} style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${acento.chip}38`,
                  borderRadius: 20, padding: '5px 11px', fontSize: 11,
                  color: acento.chip, cursor: 'pointer', fontFamily: 'Inter,sans-serif',
                }}>{s}</button>
              ))}
            </div>
          )}

          {/* Preview adjunto */}
          {adjunto && (
            <div style={{
              margin: '0 12px 6px', background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${acento.chip}40`, borderRadius: 10,
              padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
            }}>
              {adjPreview
                ? <img src={adjPreview} alt="preview" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6 }} />
                : <span style={{ fontSize: 22 }}>{adjunto.name.endsWith('.pdf') ? '📄' : '📎'}</span>
              }
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <p style={{ fontSize: 11, color: '#E7EDF7', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{adjunto.name}</p>
                <p style={{ fontSize: 10, color: '#8C9BB5', margin: 0 }}>{(adjunto.size / 1024).toFixed(1)} KB</p>
              </div>
              <button onClick={() => { setAdjunto(null); setAdjPreview(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8C9BB5', fontSize: 16 }}>✕</button>
            </div>
          )}

          {/* Input */}
          <div style={{
            padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.09)',
            display: 'flex', flexDirection: 'column', gap: 8,
            background: '#060B14', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {puedeAdj && (
                <>
                  <input ref={fileRef} type="file"
                    accept="image/*,.pdf,.txt,.csv"
                    onChange={onFileChange} style={{ display: 'none' }} />
                  <button onClick={() => fileRef.current?.click()} disabled={loading}
                    title="Adjuntar archivo"
                    style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: adjunto ? `${acento.chip}33` : 'rgba(255,255,255,0.06)',
                      border: adjunto ? `1px solid ${acento.chip}` : '1px solid rgba(255,255,255,0.09)',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      color: adjunto ? acento.chip : '#8C9BB5', fontSize: 15,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>📎</button>
                </>
              )}

              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && !paused && send(input)}
                placeholder={paused ? 'Edita y reanuda...' : adjunto ? 'Añade mensaje o envía...' : 'Escribe tu pregunta...'}
                disabled={loading}
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${paused ? 'rgba(245,180,0,0.4)' : 'rgba(255,255,255,0.09)'}`,
                  borderRadius: 20, padding: '8px 14px',
                  color: '#E7EDF7', fontSize: 13,
                  outline: 'none', fontFamily: 'Inter,sans-serif',
                }}
              />

              {rol === 'terapeuta' && !paused && (
                <button onClick={pausar} disabled={!input.trim() || loading}
                  title="Pausar y analizar antes de enviar"
                  style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(245,180,0,0.15)',
                    border: '1px solid rgba(245,180,0,0.3)',
                    cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
                    color: '#F5B400', fontSize: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>⏸</button>
              )}

              {paused && (
                <button onClick={reanudar}
                  title="Reanudar mensaje pausado"
                  style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(52,211,153,0.15)',
                    border: '1px solid rgba(52,211,153,0.3)',
                    cursor: 'pointer', color: '#34D399', fontSize: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>▶</button>
              )}

              <button onClick={() => send(input)}
                disabled={loading || (!input.trim() && !adjunto) || paused}
                style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: loading || (!input.trim() && !adjunto) || paused
                    ? `${acento.chip}40`
                    : `linear-gradient(135deg,${acento.from},${acento.to})`,
                  border: 'none',
                  cursor: loading || (!input.trim() && !adjunto) || paused ? 'not-allowed' : 'pointer',
                  color: 'white', fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>➤</button>
            </div>

            {rol === 'terapeuta' && (
              <p style={{ fontSize: 10, color: '#8C9BB5', margin: 0, textAlign: 'center' }}>
                ⏸ Pausa para revisar · ▶ Reanuda · ➤ Envía
              </p>
            )}
          </div>
        </div>
      )}

      {/* Burbuja */}
      <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 9998 }}>
        <button onClick={toggle} style={{
          width: 52, height: 52, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: `linear-gradient(135deg,${acento.from},${acento.to})`,
          color: 'white', fontSize: 22,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 24px ${acento.glow}`,
          transition: 'transform .2s, box-shadow .2s',
        }}>
          {open ? '✕' : '💬'}
        </button>
        {notif && !open && (
          <span style={{
            position: 'absolute', top: -4, right: -4, width: 18, height: 18,
            borderRadius: '50%', background: '#F25555', fontSize: 10, fontWeight: 700,
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>1</span>
        )}
      </div>

      <style>{`
        @keyframes rcb {
          0%,100% { transform: translateY(0) }
          50%      { transform: translateY(-4px) }
        }
      `}</style>
    </>
  )
}
