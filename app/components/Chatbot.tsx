'use client'

import { useState, useRef, useEffect, useMemo } from 'react'

type TipoTarjeta = 'agendar_cita' | 'registrar_pago' | 'consultar_adeudo' | 'expediente_ejercicios' | 'reporte_sintomas' | 'reportes_pacientes'
type VistaTab = 'chat' | 'acciones' | 'historial'

interface ReportePacienteItem {
  id_reporte: number
  paciente_id: number
  zona_dolor: string
  tipo_dolor?: string | null
  intensidad: number
  inicio_sintomas?: string | null
  factores_agravantes?: string | null
  factores_mejora?: string | null
  sintomas_adicionales?: string | null
  resumen_ia: string
  leido_por_terapeuta?: boolean
  created_at: string
  pacientes?: { nombre_completo: string } | null
}

interface ChatMsg {
  id: string
  role: 'user' | 'bot'
  text: string
  time: string
  createdAt?: string
  fileName?: string
  histIndex?: number
  cardType?: TipoTarjeta
  reportesPorPaciente?: ReportePacienteItem[]
}
interface MsgHist { role: 'user' | 'assistant'; content: string }

interface Props {
  rol?: 'admin' | 'terapeuta' | 'paciente' | 'secretaria'
  modulo?: string
}

interface RolTheme {
  label: string
  icon: string
  badge: string
  from: string
  to: string
  glow: string
  chip: string
  border: string
  cardBg: string
  headerBg: string
}

const TEMAS_ROL: Record<string, RolTheme> = {
  admin: {
    label: 'Administrador',
    icon: '👑',
    badge: 'PANEL ADMIN',
    from: '#B45309',
    to: '#F59E0B',
    glow: 'rgba(245,158,11,0.45)',
    chip: '#FBBF24',
    border: 'rgba(245,158,11,0.35)',
    cardBg: 'rgba(245,158,11,0.07)',
    headerBg: 'linear-gradient(135deg, rgba(180,83,9,0.30) 0%, rgba(6,11,20,0.96) 100%)',
  },
  secretaria: {
    label: 'Secretaría',
    icon: '🗂️',
    badge: 'GESTIÓN OPERATIVA',
    from: '#6D28D9',
    to: '#A78BFA',
    glow: 'rgba(167,139,250,0.45)',
    chip: '#A78BFA',
    border: 'rgba(167,139,250,0.35)',
    cardBg: 'rgba(167,139,250,0.07)',
    headerBg: 'linear-gradient(135deg, rgba(109,40,217,0.32) 0%, rgba(6,11,20,0.96) 100%)',
  },
  terapeuta: {
    label: 'Fisioterapeuta',
    icon: '🩺',
    badge: 'ÁREA CLÍNICA',
    from: '#0D9488',
    to: '#2DD4BF',
    glow: 'rgba(45,212,191,0.45)',
    chip: '#2DD4BF',
    border: 'rgba(45,212,191,0.35)',
    cardBg: 'rgba(45,212,191,0.07)',
    headerBg: 'linear-gradient(135deg, rgba(13,148,136,0.32) 0%, rgba(6,11,20,0.96) 100%)',
  },
  paciente: {
    label: 'Paciente',
    icon: '💙',
    badge: 'PORTAL PACIENTE',
    from: '#2563EB',
    to: '#38BDF8',
    glow: 'rgba(56,189,248,0.45)',
    chip: '#38BDF8',
    border: 'rgba(56,189,248,0.35)',
    cardBg: 'rgba(56,189,248,0.07)',
    headerBg: 'linear-gradient(135deg, rgba(37,99,235,0.32) 0%, rgba(6,11,20,0.96) 100%)',
  },
}

const TARJETA_POR_DEFECTO: Record<string, TipoTarjeta> = {
  secretaria: 'agendar_cita',
  terapeuta: 'reportes_pacientes',
  paciente: 'reporte_sintomas',
  admin: 'agendar_cita',
}

const BIENVENIDA: Record<string, string> = {
  admin:      '¡Hola, Admin! 👑 Soy RehabControl AI.\nPregúntame sobre métricas del día, usuarios, expedientes o logs de auditoría.',
  secretaria: '¡Hola! 🗂️ Soy RehabControl AI.\nEscribe qué necesitas hacer (ej. "Agendar una cita", "Registrar un pago" o "Consultar adeudo") o abre la pestaña "📋 Tarjeta" para llenarla en un solo paso.',
  terapeuta:  '¡Hola! 🩺 Soy RehabControl AI.\nPuedes ver y descargar los reportes individuales de cada paciente, asignar ejercicios al expediente o agendar citas desde la pestaña "📋 Tarjeta".',
  paciente:   '¡Hola! 💙 Soy RehabControl AI.\nEscribe si tienes algún dolor o abre la pestaña "📋 Tarjeta" para llenar tu reporte de síntomas y enviarlo a tu terapeuta.',
}

const HORARIOS_COMUNES = ['09:00', '10:00', '11:00', '12:00', '13:00', '16:00', '17:00', '18:00']

const CATALOGO_EJERCICIOS_RAPIDOS: Record<string, string[]> = {
  Rodilla: ['Cuádriceps arco corto (3x15)', 'Prensa unilateral (3x12)', 'Sentadilla TRX (3x12)', 'Bicicleta estática (15 min)', 'Step up/down (3x10)'],
  Lumbar: ['Bird-dog (3x10 seg)', 'Puente glúteo (3x15)', 'Plancha abdominal (3x20 seg)', 'Extensiones McKenzie (3x10)', 'Estiramiento piriforme (3x30 seg)'],
  Hombro: ['Péndulos de Codman (3 min)', 'Rotación externa con banda (3x15)', 'Elevación frontal/lateral (3x12)', 'Remo con banda elástica (3x15)'],
  Cervical: ['Chin tuck / retracción cervical (3x10)', 'Flexión isométrica (3x10 seg)', 'Estiramiento de trapecio (3x30 seg)', 'Movilización activa suave (2x10)'],
  Tobillo: ['Alfabeto con tobillo (2 series)', 'Elevaciones de talón (3x15)', 'Equilibrio monopodal (3x30 seg)', 'Estiramiento de fascia plantar (3x30 seg)'],
}

const PUEDE_ADJUNTAR = ['admin', 'secretaria', 'terapeuta']
const PUEDE_PAUSAR   = ['admin', 'secretaria', 'terapeuta', 'paciente']

function limpiarMarkdown(texto: string): string {
  return texto
    .replace(/^#{1,6}\s+(.+)$/gm, '\n$1\n')
    .replace(/\*\*([\s\S]+?)\*\*/g, '$1')
    .replace(/__([\s\S]+?)__/g, '$1')
    .replace(/\*([^*\n]+?)\*/g, '$1')
    .replace(/_([^_\n]+?)_/g, '$1')
    .replace(/^[\*\-]\s+/gm, '• ')
    .replace(/^\s{2,4}[\*\-]\s+/gm, '  · ')
    .replace(/^-{3,}$/gm, '')
    .replace(/```[\w]*\n?([\s\S]*?)```/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function detectarTarjetaEnRespuesta(texto: string, rol: string): TipoTarjeta | undefined {
  const t = texto.toLowerCase()
  if ((rol === 'secretaria' || rol === 'terapeuta') && (t.includes('para agendar la cita') || (t.includes('nombre del paciente') && t.includes('fecha y hora')))) {
    return 'agendar_cita'
  }
  if (rol === 'secretaria' && (t.includes('registrar el pago') || (t.includes('monto') && t.includes('método de pago') && !t.includes('fecha y hora')))) {
    return 'registrar_pago'
  }
  if (rol === 'terapeuta' && (t.includes('asignar ejercicios') || t.includes('actualizar el expediente') || t.includes('notas del expediente'))) {
    return 'expediente_ejercicios'
  }
  if (rol === 'paciente' && (t.includes('para registrar tu reporte') || (t.includes('zona exacta del dolor') && t.includes('intensidad')))) {
    return 'reporte_sintomas'
  }
  return undefined
}

function hora(iso?: string) {
  return new Date(iso ?? Date.now()).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

function fechaCorta(iso?: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fechaHoyISO(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
}

function fechaMananaISO(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
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
  const [open,          setOpen]          = useState(false)
  const [expanded,      setExpanded]      = useState(false)
  const [vistaTab,      setVistaTab]      = useState<VistaTab>('chat')
  const [notif,         setNotif]         = useState(true)
  const [input,         setInput]         = useState('')
  const [loading,       setLoading]       = useState(false)
  const [loadingHist,   setLoadingHist]   = useState(true)
  const [paused,        setPaused]        = useState(false)
  const [adjunto,       setAdjunto]       = useState<File | null>(null)
  const [adjPreview,    setAdjPreview]    = useState<string | null>(null)
  const [messages,      setMessages]      = useState<ChatMsg[]>([])
  const [editingId,     setEditingId]     = useState<string | null>(null)
  const [editText,      setEditText]      = useState('')
  const [activeCard,    setActiveCard]    = useState<TipoTarjeta>(TARJETA_POR_DEFECTO[rol] ?? 'reporte_sintomas')
  const [reportesLista, setReportesLista] = useState<ReportePacienteItem[]>([])
  const [filtroPacRep,  setFiltroPacRep]  = useState('')
  const [busquedaHist,  setBusquedaHist]  = useState('')
  const [descargandoId, setDescargandoId] = useState<string | null>(null)
  const [limpiandoHist, setLimpiandoHist] = useState(false)

  // ── Estados del Formulario: Agendar Cita ─────────────────────────
  const [citaPaciente,   setCitaPaciente]   = useState('')
  const [citaTerapeuta,  setCitaTerapeuta]  = useState('')
  const [citaFecha,      setCitaFecha]      = useState(fechaHoyISO())
  const [citaHora,       setCitaHora]       = useState('10:00')
  const [citaDuracion,   setCitaDuracion]   = useState('60')
  const [citaNotas,      setCitaNotas]      = useState('')
  const [citaConPago,    setCitaConPago]    = useState(false)
  const [citaMonto,      setCitaMonto]      = useState('')
  const [citaMetodo,     setCitaMetodo]     = useState<'efectivo' | 'transferencia' | 'tarjeta' | 'aseguradora'>('efectivo')
  const [citaEstadoPago, setCitaEstadoPago] = useState<'pagado' | 'pendiente'>('pagado')

  // ── Estados del Formulario: Registrar Pago / Consultar Adeudo ────
  const [pagoPaciente, setPagoPaciente] = useState('')
  const [pagoMonto,    setPagoMonto]    = useState('')
  const [pagoMetodo,   setPagoMetodo]   = useState<'efectivo' | 'transferencia' | 'tarjeta' | 'aseguradora'>('efectivo')
  const [pagoEstado,   setPagoEstado]   = useState<'pagado' | 'pendiente'>('pagado')
  const [pagoConcepto, setPagoConcepto] = useState('')

  // ── Estados del Formulario: Expediente / Ejercicios (Terapeuta) ──
  const [expPaciente,     setExpPaciente]     = useState('')
  const [expTipoAcc,      setExpTipoAcc]      = useState<'ejercicios' | 'notas'>('ejercicios')
  const [expZona,         setExpZona]         = useState<'Rodilla' | 'Lumbar' | 'Hombro' | 'Cervical' | 'Tobillo'>('Rodilla')
  const [expSeleccion,    setExpSeleccion]    = useState<string[]>([])
  const [expCustomNombre, setExpCustomNombre] = useState('')
  const [expCustomReps,   setExpCustomReps]   = useState('10')
  const [expDetalle,      setExpDetalle]      = useState('')
  const [expDolor,        setExpDolor]        = useState<number>(4)
  const [expMovilidad,    setExpMovilidad]    = useState<number>(8)

  // ── Estados del Formulario: Reporte de Síntomas (Paciente) ───────
  const [sinZona,       setSinZona]       = useState('')
  const [sinTipo,       setSinTipo]       = useState('Punzante')
  const [sinIntensidad, setSinIntensidad] = useState<number>(5)
  const [sinFechaIni,   setSinFechaIni]   = useState(fechaHoyISO())
  const [sinFactores,   setSinFactores]   = useState('')
  const [sinExtra,      setSinExtra]      = useState('')

  const acento      = TEMAS_ROL[rol] ?? TEMAS_ROL.paciente
  const history     = useRef<MsgHist[]>([])
  const bottomRef   = useRef<HTMLDivElement>(null)
  const fileRef     = useRef<HTMLInputElement>(null)
  const puedeAdj    = PUEDE_ADJUNTAR.includes(rol)
  const puedePausar = PUEDE_PAUSAR.includes(rol)
  const yaCargado   = useRef(false)

  useEffect(() => {
    setActiveCard(TARJETA_POR_DEFECTO[rol] ?? 'reporte_sintomas')
  }, [rol])

  useEffect(() => {
    if (yaCargado.current) return
    yaCargado.current = true
    ;(async () => {
      try {
        const res  = await fetch('/api/chatbot')
        const data = await res.json()
        if (!res.ok) console.error('Error cargando historial del chat:', data.error)
        if (Array.isArray(data.reportesPacientes)) {
          setReportesLista(data.reportesPacientes)
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
              createdAt: h.created_at,
              histIndex: i,
              cardType: h.role === 'assistant' ? detectarTarjetaEnRespuesta(h.content, rol) : undefined,
            })),
          ])
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
    if (vistaTab === 'chat') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loading, vistaTab])

  // Agrupa los reportes de síntomas separados por cada paciente
  const reportesAgrupadosPorPaciente = useMemo(() => {
    const mapa = new Map<number, { pacienteId: number; nombre: string; reportes: ReportePacienteItem[] }>()
    for (const r of reportesLista) {
      const nombre = r.pacientes?.nombre_completo ?? `Paciente #${r.paciente_id}`
      if (!mapa.has(r.paciente_id)) {
        mapa.set(r.paciente_id, { pacienteId: r.paciente_id, nombre, reportes: [] })
      }
      mapa.get(r.paciente_id)!.reportes.push(r)
    }
    const grupos = Array.from(mapa.values())
    const q = filtroPacRep.trim().toLowerCase()
    return q ? grupos.filter(g => g.nombre.toLowerCase().includes(q)) : grupos
  }, [reportesLista, filtroPacRep])

  // Agrupa los mensajes del día en pares ordenados para el apartado de Historial
  const bloquesHistorial = useMemo(() => {
    const sinBienvenida = messages.filter(m => m.id !== 'w' && m.id !== '0')
    const pares: { id: string; time: string; pregunta: string; respuesta: string }[] = []
    for (let i = 0; i < sinBienvenida.length; i++) {
      const m = sinBienvenida[i]
      if (m.role === 'user') {
        const sig = sinBienvenida[i + 1]
        const resp = sig && sig.role === 'bot' ? limpiarMarkdown(sig.text) : 'En espera de respuesta...'
        pares.push({
          id: m.id,
          time: m.time,
          pregunta: m.text,
          respuesta: resp,
        })
        if (sig && sig.role === 'bot') i++
      }
    }
    const q = busquedaHist.trim().toLowerCase()
    const filtrados = q
      ? pares.filter(p => p.pregunta.toLowerCase().includes(q) || p.respuesta.toLowerCase().includes(q))
      : pares
    return filtrados.reverse()
  }, [messages, busquedaHist])

  function toggle() { setOpen(p => !p); setNotif(false) }

  function abrirTarjetaInteractiva(card: TipoTarjeta) {
    setActiveCard(card)
    setVistaTab('acciones')
  }

  async function limpiarHistorialHoy() {
    if (limpiandoHist) return
    setLimpiandoHist(true)
    try {
      const res = await fetch('/api/chatbot', { method: 'DELETE' })
      if (res.ok) {
        history.current = []
        setMessages([{ id: '0', role: 'bot', time: hora(), text: BIENVENIDA[rol] ?? BIENVENIDA.paciente }])
      }
    } catch (e) {
      console.error('Error al limpiar historial:', e)
    } finally {
      setLimpiandoHist(false)
    }
  }

  // Descarga el reporte individual de UN paciente en PDF con Logo y Marca de Agua
  async function descargarReporteIndividualPaciente(rep: ReportePacienteItem) {
    const nombrePac = rep.pacientes?.nombre_completo ?? `Paciente_${rep.paciente_id}`
    const idRef = `rep-pac-${rep.id_reporte}`
    if (descargandoId) return
    setDescargandoId(idRef)
    try {
      const contenido = [
        `DATOS DEL PACIENTE`,
        `Nombre del paciente: ${nombrePac}`,
        `Folio de reporte: #REP-${rep.id_reporte}`,
        `Fecha de registro: ${fechaCorta(rep.created_at)}`,
        ``,
        `EVALUACION DE SINTOMAS REPORTADOS`,
        `1) Zona de dolor o molestia: ${rep.zona_dolor}`,
        `2) Tipo de dolor: ${rep.tipo_dolor || 'No especificado'}`,
        `3) Nivel de intensidad (EVA): ${rep.intensidad}/10`,
        `4) Inicio de los sintomas: ${rep.inicio_sintomas || 'No especificado'}`,
        `5) Factores agravantes / de mejora: ${rep.factores_agravantes || rep.factores_mejora || 'No especificados'}`,
        `6) Sintomas adicionales: ${rep.sintomas_adicionales || 'Ninguno'}`,
        ``,
        `RESUMEN CLINICO PARA EL FISIOTERAPEUTA`,
        `${rep.resumen_ia}`,
      ].join('\n')

      const res = await fetch('/api/expedientes/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: `Reporte Clinico de Sintomas - ${nombrePac}`,
          contenido,
          rol,
        }),
      })
      if (!res.ok) throw new Error('Error generando PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Reporte_${nombrePac.replace(/\s+/g, '_')}_#${rep.id_reporte}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Error descargando PDF del paciente:', e)
      alert('No se pudo generar el PDF del paciente en este momento.')
    } finally {
      setDescargandoId(null)
    }
  }

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
    setPaused(true)
    setMessages(p => [...p, {
      id: Date.now().toString(), role: 'bot', time: hora(),
      text: '⏸️ Mensaje en pausa. Edítalo aquí abajo y presiona ▶ para reanudar el envío.',
    }])
  }

  function reanudar() { setPaused(false) }

  function iniciarEdicion(id: string, textoActual: string) {
    setEditingId(id)
    setEditText(textoActual)
  }

  function cancelarEdicion() {
    setEditingId(null)
    setEditText('')
  }

  function guardarEdicion(id: string, histIndex?: number) {
    if (!editText.trim() || histIndex === undefined) { cancelarEdicion(); return }
    const idxMsg = messages.findIndex(m => m.id === id)
    if (idxMsg === -1) { cancelarEdicion(); return }
    const textoEditado = editText
    setMessages(p => p.slice(0, idxMsg))
    history.current = history.current.slice(0, histIndex)
    setEditingId(null)
    setEditText('')
    send(textoEditado)
  }

  function toggleEjercicioRapido(ej: string) {
    setExpSeleccion(prev => prev.includes(ej) ? prev.filter(x => x !== ej) : [...prev, ej])
  }

  // ── Envío de Tarjetas Completas en una sola respuesta ────────────
  function enviarTarjetaCita() {
    if (!citaPaciente.trim()) { alert('Por favor escribe el nombre del paciente.'); return }
    if (rol === 'secretaria' && !citaTerapeuta.trim()) { alert('Por favor escribe el nombre del terapeuta.'); return }
    if (!citaFecha || !citaHora) { alert('Selecciona la fecha y la hora de la cita.'); return }
    if (citaConPago && (!citaMonto || Number(citaMonto) <= 0)) { alert('Ingresa un monto válido para el pago.'); return }

    const lineas = [
      `📅 Solicitud para agendar cita completa:`,
      `1) Paciente: ${citaPaciente.trim()}`,
      ...(rol === 'secretaria' ? [`2) Terapeuta: ${citaTerapeuta.trim()}`] : []),
      `${rol === 'secretaria' ? '3' : '2'}) Fecha y hora: ${citaFecha} a las ${citaHora} hrs (duración: ${citaDuracion} min)`,
      citaNotas.trim() ? `• Notas de la cita: ${citaNotas.trim()}` : '',
      citaConPago
        ? `• Pago de sesión: Sí registrar pago ahora por $${citaMonto} MXN vía ${citaMetodo} (estado: ${citaEstadoPago}).`
        : `• Pago de sesión: No registrar pago en este momento.`,
    ].filter(Boolean).join('\n')

    setVistaTab('chat')
    setCitaPaciente('')
    setCitaNotas('')
    setCitaMonto('')
    setCitaConPago(false)
    send(lineas)
  }

  function enviarTarjetaPago() {
    if (!pagoPaciente.trim()) { alert('Ingresa el nombre del paciente.'); return }
    if (!pagoMonto || Number(pagoMonto) <= 0) { alert('Ingresa un monto válido.'); return }

    const lineas = [
      `💳 Solicitud para registrar pago de paciente:`,
      `1) Nombre del paciente: ${pagoPaciente.trim()}`,
      `2) Monto: $${pagoMonto} MXN`,
      `3) Método de pago: ${pagoMetodo}`,
      `4) Estado del pago: ${pagoEstado}`,
      pagoConcepto.trim() ? `5) Notas / Concepto: ${pagoConcepto.trim()}` : '',
    ].filter(Boolean).join('\n')

    setVistaTab('chat')
    setPagoPaciente('')
    setPagoMonto('')
    setPagoConcepto('')
    send(lineas)
  }

  function enviarTarjetaAdeudo() {
    if (!pagoPaciente.trim()) { alert('Ingresa el nombre del paciente a consultar.'); return }
    const msg = `🔍 Quiero consultar los adeudos pendientes y el historial de pagos del paciente: ${pagoPaciente.trim()}`
    setVistaTab('chat')
    setPagoPaciente('')
    send(msg)
  }

  function agregarEjercicioPersonalizado() {
    const nom = expCustomNombre.trim()
    if (!nom) return
    const reps = Math.max(1, parseInt(expCustomReps, 10) || 10)
    const etiqueta = `${nom} ×${reps}`
    if (!expSeleccion.includes(etiqueta)) {
      setExpSeleccion(prev => [...prev, etiqueta])
    }
    setExpCustomNombre('')
  }

  function enviarTarjetaExpediente() {
    if (!expPaciente.trim()) { alert('Ingresa el nombre del paciente.'); return }

    if (expTipoAcc === 'ejercicios') {
      const listaPendiente = [...expSeleccion]
      if (expCustomNombre.trim()) {
        const reps = Math.max(1, parseInt(expCustomReps, 10) || 10)
        listaPendiente.push(`${expCustomNombre.trim()} ×${reps}`)
      }
      const listaEj = listaPendiente.join(', ')
      if (!listaEj) {
        alert('Selecciona o escribe al menos un ejercicio para asignar al paciente.')
        return
      }

      const lineas = [
        `🏋️ Asignar ejercicios e indicaciones en el expediente y publicar en el apartado "Mis Ejercicios" del paciente:`,
        `1) Paciente: ${expPaciente.trim()}`,
        `2) Zona / Área enfocada: ${expZona}`,
        `3) Ejercicios asignados: ${listaEj}`,
        `4) Evaluación de sesión: Nivel de dolor ${expDolor}/10 · Movilidad ${expMovilidad}/10`,
        expDetalle.trim() ? `5) Notas de tu terapeuta para el paciente y expediente: ${expDetalle.trim()}` : '',
      ].filter(Boolean).join('\n')

      setVistaTab('chat')
      setExpPaciente('')
      setExpSeleccion([])
      setExpCustomNombre('')
      setExpDetalle('')
      send(lineas)
    } else {
      if (!expDetalle.trim()) {
        alert('Escribe las observaciones clínicas o plan de tratamiento para el expediente.')
        return
      }

      const lineas = [
        `📝 Actualizar únicamente notas clínicas privadas en el expediente (sin publicar ejercicios al paciente):`,
        `1) Paciente: ${expPaciente.trim()}`,
        `2) Zona / Área enfocada: ${expZona}`,
        `3) Observaciones clínicas privadas para el expediente: ${expDetalle.trim()}`,
      ].join('\n')

      setVistaTab('chat')
      setExpPaciente('')
      setExpDetalle('')
      send(lineas)
    }
  }

  function enviarTarjetaSintomas() {
    if (!sinZona.trim()) { alert('Por favor indica en qué zona sientes el dolor o molestia.'); return }

    const lineas = [
      `🩺 Reporte completo de síntomas para mi terapeuta:`,
      `1) Zona exacta del dolor: ${sinZona.trim()}`,
      `2) Tipo de dolor: ${sinTipo}`,
      `3) Intensidad del dolor: ${sinIntensidad}/10`,
      `4) Cuándo empezó: ${sinFechaIni}`,
      `5) Qué lo mejora o empeora: ${sinFactores.trim() || 'No especificado'}`,
      `6) Síntomas adicionales: ${sinExtra.trim() || 'Ninguno'}`,
    ].join('\n')

    setVistaTab('chat')
    setSinZona('')
    setSinFactores('')
    setSinExtra('')
    send(lineas)
  }

  async function send(text: string) {
    if ((!text.trim() && !adjunto) || loading) return

    setInput('')
    setPaused(false)
    setVistaTab('chat')

    const textoMostrar = text.trim() || `📎 ${adjunto?.name}`
    const idx = history.current.length
    setMessages(p => [...p, {
      id: Date.now().toString(), role: 'user',
      text: textoMostrar, time: hora(),
      fileName: adjunto?.name,
      histIndex: idx,
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
      const data  = await res.json()
      const reply: string = data.reply ?? 'Sin respuesta. Intenta de nuevo.'
      const sugerirCard = detectarTarjetaEnRespuesta(reply, rol)
      const repsRecibidos: ReportePacienteItem[] | undefined = Array.isArray(data.reportesPacientes)
        ? data.reportesPacientes
        : undefined
      if (repsRecibidos?.length) {
        setReportesLista(repsRecibidos)
      }
      history.current = [...newHist, { role: 'assistant', content: reply }]
      setMessages(p => [...p, {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: reply,
        time: hora(),
        cardType: sugerirCard,
        reportesPorPaciente: repsRecibidos,
      }])
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

  const cardInputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(6,11,20,0.85)',
    border: `1.5px solid ${acento.border}`,
    borderRadius: 10,
    padding: '9px 12px',
    color: '#E7EDF7',
    fontSize: 12.5,
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
    boxSizing: 'border-box',
  }

  const cardLabelStyle: React.CSSProperties = {
    fontSize: 11.5,
    fontWeight: 600,
    color: '#E2E8F0',
    marginBottom: 5,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  }

  const fechaLegibleHoy = new Date().toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  return (
    <>
      {open && (
        <div style={{
          position: 'fixed',
          bottom: expanded ? 20 : 88,
          right: expanded ? 20 : 24,
          width: expanded ? 680 : 430,
          maxWidth: 'calc(100vw - 28px)',
          height: expanded ? 'calc(100vh - 44px)' : 640,
          maxHeight: 'calc(100vh - 105px)',
          background: '#0A1220',
          border: `1.5px solid ${acento.border}`,
          borderRadius: 22,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 9999,
          overflow: 'hidden',
          boxShadow: `0 24px 64px rgba(0,0,0,0.82), 0 0 32px ${acento.glow}`,
          transition: 'width 0.22s ease, height 0.22s ease, bottom 0.22s ease',
        }}>

          {/* Barra superior degradada del rol */}
          <div style={{
            height: 4,
            background: `linear-gradient(90deg, ${acento.from}, ${acento.to}, ${acento.from})`,
            flexShrink: 0,
          }} />

          {/* Header con Logo RC, Rol y botón de Expandir */}
          <div style={{
            background: acento.headerBg,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            borderBottom: `1px solid ${acento.border}`,
            flexShrink: 0,
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: `linear-gradient(135deg,${acento.from},${acento.to})`,
              border: '1.5px solid rgba(255,255,255,0.28)',
              boxShadow: `0 4px 14px ${acento.glow}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 900, fontSize: 14, lineHeight: 1,
            }}>
              <span>RC</span>
              <span style={{ fontSize: 9, marginTop: 1 }}>{acento.icon}</span>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#F8FAFC', margin: 0 }}>RehabControl AI</p>
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.05em',
                  padding: '2px 7px', borderRadius: 6,
                  background: `${acento.chip}22`,
                  border: `1px solid ${acento.border}`,
                  color: acento.chip,
                }}>
                  {acento.badge}
                </span>
              </div>
              <p style={{ fontSize: 11, color: acento.chip, margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: paused ? '#F5B400' : acento.chip,
                  display: 'inline-block',
                  boxShadow: `0 0 6px ${paused ? '#F5B400' : acento.chip}`,
                }} />
                {paused ? 'En pausa' : 'En línea'} · {acento.label} · Hoy ({fechaLegibleHoy})
              </p>
            </div>

            <button
              type="button"
              onClick={() => setExpanded(p => !p)}
              title={expanded ? 'Tamaño estándar' : 'Ampliar ventana del chatbot'}
              style={{
                height: 32, padding: '0 10px', borderRadius: 9,
                background: expanded ? `${acento.chip}25` : 'rgba(255,255,255,0.06)',
                border: `1px solid ${acento.border}`,
                cursor: 'pointer', color: expanded ? acento.chip : '#CBD5E1',
                fontSize: 11, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <span>{expanded ? '🗗' : '⛶'}</span>
              <span style={{ fontSize: 10.5 }}>{expanded ? 'Compactar' : 'Ampliar'}</span>
            </button>

            <button
              type="button"
              onClick={toggle}
              title="Cerrar asistente"
              style={{
                width: 32, height: 32, borderRadius: 9,
                background: 'rgba(255,255,255,0.06)',
                border: `1px solid ${acento.border}`,
                cursor: 'pointer', color: '#94A3B8', fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
          </div>

          {/* Barra de Navegación por Pestañas (Chat | Tarjeta | Historial del Día) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: rol === 'admin' ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
            gap: 6,
            padding: '8px 12px',
            background: '#070C17',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            flexShrink: 0,
          }}>
            {[
              { id: 'chat' as VistaTab, label: '💬 Chat Activo', show: true },
              { id: 'acciones' as VistaTab, label: '📋 Tarjeta', show: rol !== 'admin' },
              { id: 'historial' as VistaTab, label: `🗂️ Historial (${bloquesHistorial.length})`, show: true },
            ].filter(t => t.show).map(tab => {
              const activo = vistaTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setVistaTab(tab.id)}
                  style={{
                    padding: '7px 8px',
                    borderRadius: 10,
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif',
                    background: activo
                      ? `linear-gradient(135deg, ${acento.from}, ${acento.to})`
                      : 'rgba(255,255,255,0.04)',
                    border: `1.5px solid ${activo ? 'rgba(255,255,255,0.35)' : acento.border}`,
                    color: activo ? '#FFFFFF' : '#CBD5E1',
                    boxShadow: activo ? `0 3px 12px ${acento.glow}` : 'none',
                    transition: 'all 0.16s ease',
                  }}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* ════════════════════════════════════════════════════════════════
              VISTA 1: CHAT ACTIVO (Sin botones abajo, solo mensajes y tarjetas)
             ════════════════════════════════════════════════════════════════ */}
          {vistaTab === 'chat' && (
            <>
              <div style={{
                padding: '5px 14px', background: 'rgba(255,255,255,0.02)',
                borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
              }}>
                <span style={{ fontSize: 10, color: '#8C9BB5' }}>
                  ⚠️ Orientación asistida por IA · No sustituye consulta presencial.
                </span>
                <span style={{ fontSize: 9.5, color: acento.chip, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  🔄 Se limpia cada día
                </span>
              </div>

              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 15px',
                display: 'flex',
                flexDirection: 'column',
                gap: 13,
                scrollbarWidth: 'thin',
                scrollbarColor: `${acento.glow} transparent`,
              }}>
                {loadingHist && (
                  <p style={{ fontSize: 11.5, color: '#8C9BB5', textAlign: 'center' }}>Cargando conversación de hoy…</p>
                )}

                {messages.map(m => (
                  <div key={m.id} style={{
                    maxWidth: expanded ? '86%' : '92%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  }}>
                    {m.fileName && (
                      <div style={{ fontSize: 10, color: acento.chip, marginBottom: 2, textAlign: m.role === 'user' ? 'right' : 'left' }}>
                        📎 {m.fileName}
                      </div>
                    )}

                    {editingId === m.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                        <input
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && guardarEdicion(m.id, m.histIndex)}
                          autoFocus
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: `1.5px solid ${acento.chip}`,
                            borderRadius: 10, padding: '7px 11px',
                            color: '#E7EDF7', fontSize: 13, outline: 'none', fontFamily: 'Inter,sans-serif',
                          }}
                        />
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button type="button" onClick={cancelarEdicion} style={{
                            background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20,
                            padding: '4px 11px', fontSize: 10.5, color: '#8C9BB5', cursor: 'pointer',
                          }}>Cancelar</button>
                          <button type="button" onClick={() => guardarEdicion(m.id, m.histIndex)} style={{
                            background: acento.chip, border: 'none', borderRadius: 20,
                            padding: '4px 11px', fontSize: 10.5, color: '#0A1220', fontWeight: 700, cursor: 'pointer',
                          }}>Guardar y reenviar</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        padding: m.role === 'bot' ? '12px 14px' : '10px 14px',
                        fontSize: 13,
                        lineHeight: 1.65,
                        whiteSpace: 'pre-wrap',
                        borderRadius: 15,
                        borderBottomLeftRadius:  m.role === 'bot'  ? 4 : 15,
                        borderBottomRightRadius: m.role === 'user' ? 4 : 15,
                        background: m.role === 'user'
                          ? `linear-gradient(135deg,${acento.from},${acento.to})`
                          : 'rgba(15,23,42,0.92)',
                        color: '#E7EDF7',
                        border: m.role === 'bot'
                          ? `1.5px solid ${acento.border}`
                          : '1px solid rgba(255,255,255,0.2)',
                        borderLeft: m.role === 'bot' ? `4px solid ${acento.chip}` : undefined,
                        boxShadow: m.role === 'bot'
                          ? '0 6px 18px rgba(0,0,0,0.38)'
                          : `0 4px 14px ${acento.glow}`,
                      }}>
                        {m.role === 'bot' && (
                          <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            gap: 10, marginBottom: 6, paddingBottom: 5,
                            borderBottom: '1px solid rgba(255,255,255,0.07)',
                          }}>
                            <span style={{ fontSize: 10.5, fontWeight: 700, color: acento.chip }}>
                              {acento.icon} RehabControl · {acento.label}
                            </span>
                          </div>
                        )}

                        {m.role === 'bot' ? limpiarMarkdown(m.text) : m.text}

                        {/* Si la respuesta trajo reportes de pacientes, muestra cada paciente separado en su propia tarjeta con su botón de descarga */}
                        {m.role === 'bot' && m.reportesPorPaciente && m.reportesPorPaciente.length > 0 && (
                          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
                            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: acento.chip, textTransform: 'uppercase' }}>
                              📋 Reportes separados por paciente (descarga individual):
                            </p>
                            {m.reportesPorPaciente.map(rep => {
                              const nombrePac = rep.pacientes?.nombre_completo ?? `Paciente #${rep.paciente_id}`
                              const colorInt = rep.intensidad <= 3 ? '#34D399' : rep.intensidad <= 6 ? '#FBBF24' : '#F87171'
                              return (
                                <div
                                  key={rep.id_reporte}
                                  style={{
                                    background: 'rgba(6,11,20,0.85)',
                                    border: `1px solid ${acento.border}`,
                                    borderRadius: 11,
                                    padding: '10px 12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 6,
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                    <span style={{ fontSize: 12.5, fontWeight: 700, color: '#F8FAFC' }}>
                                      👤 {nombrePac}
                                    </span>
                                    <span style={{
                                      fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                                      background: `${colorInt}22`, color: colorInt, border: `1px solid ${colorInt}55`,
                                    }}>
                                      Dolor {rep.intensidad}/10
                                    </span>
                                  </div>
                                  <div style={{ fontSize: 11.5, color: '#CBD5E1' }}>
                                    <strong>Zona:</strong> {rep.zona_dolor} · <span style={{ color: '#94A3B8' }}>{fechaCorta(rep.created_at)}</span>
                                  </div>
                                  <div style={{ fontSize: 11.5, color: '#94A3B8', lineHeight: 1.45 }}>
                                    {rep.resumen_ia}
                                  </div>
                                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                    <button
                                      type="button"
                                      onClick={() => descargarReporteIndividualPaciente(rep)}
                                      disabled={descargandoId === `rep-pac-${rep.id_reporte}`}
                                      style={{
                                        flex: 1,
                                        padding: '6px 10px',
                                        borderRadius: 8,
                                        background: `linear-gradient(135deg, ${acento.from}, ${acento.to})`,
                                        border: '1px solid rgba(255,255,255,0.25)',
                                        color: '#fff',
                                        fontSize: 11,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      {descargandoId === `rep-pac-${rep.id_reporte}`
                                        ? '⏳ Generando PDF...'
                                        : `📥 Bajar Reporte de ${nombrePac.split(' ')[0]} (PDF)`}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => window.open(`/api/expedientes/pdf?id_paciente=${rep.paciente_id}`, '_blank')}
                                      style={{
                                        padding: '6px 10px',
                                        borderRadius: 8,
                                        background: 'rgba(255,255,255,0.06)',
                                        border: `1px solid ${acento.border}`,
                                        color: acento.chip,
                                        fontSize: 11,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                      }}
                                      title="Descargar Expediente Clínico de este paciente"
                                    >
                                      📋 Expediente PDF
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {m.role === 'bot' && m.cardType && (
                          <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px dashed rgba(255,255,255,0.14)' }}>
                            <button
                              type="button"
                              onClick={() => abrirTarjetaInteractiva(m.cardType!)}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: 10,
                                background: `linear-gradient(135deg, ${acento.from}, ${acento.to})`,
                                border: '1px solid rgba(255,255,255,0.28)',
                                color: '#FFFFFF',
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                              }}
                            >
                              📋 Abrir tarjeta para completar datos
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <p style={{
                      fontSize: 10, color: '#8C9BB5', margin: 0, display: 'flex', alignItems: 'center', gap: 6,
                      justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                    }}>
                      {m.role === 'user' && editingId !== m.id && m.histIndex !== undefined && !loading && (
                        <span onClick={() => iniciarEdicion(m.id, m.text)} style={{ cursor: 'pointer', color: acento.chip }}>✎ editar</span>
                      )}
                      {m.time}
                    </p>
                  </div>
                ))}

                {loading && (
                  <div style={{ alignSelf: 'flex-start' }}>
                    <div style={{
                      display: 'flex', gap: 5, padding: '10px 14px',
                      background: 'rgba(15,23,42,0.88)',
                      border: `1.5px solid ${acento.border}`,
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
            </>
          )}

          {/* ════════════════════════════════════════════════════════════════
              VISTA 2: SOLO LA TARJETA INTERACTIVA (Sin cuadrícula de botones extra)
             ════════════════════════════════════════════════════════════════ */}
          {vistaTab === 'acciones' && (
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: 15,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              scrollbarWidth: 'thin',
              scrollbarColor: `${acento.glow} transparent`,
            }}>
              {/* Selector compacto dentro de la misma tarjeta solo si el rol tiene más de una modalidad */}
              {rol === 'secretaria' && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 6,
                  background: '#060B14',
                  padding: 5,
                  borderRadius: 11,
                  border: `1px solid ${acento.border}`,
                }}>
                  {[
                    { id: 'agendar_cita' as TipoTarjeta, label: '📅 Agendar Cita' },
                    { id: 'registrar_pago' as TipoTarjeta, label: '💳 Registrar Pago' },
                    { id: 'consultar_adeudo' as TipoTarjeta, label: '🔍 Ver Adeudo' },
                  ].map(op => (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => setActiveCard(op.id)}
                      style={{
                        padding: '6px 6px',
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: activeCard === op.id ? `linear-gradient(135deg,${acento.from},${acento.to})` : 'transparent',
                        border: 'none',
                        color: activeCard === op.id ? '#fff' : '#94A3B8',
                      }}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              )}

              {rol === 'terapeuta' && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 6,
                  background: '#060B14',
                  padding: 5,
                  borderRadius: 11,
                  border: `1px solid ${acento.border}`,
                }}>
                  {[
                    { id: 'reportes_pacientes' as TipoTarjeta, label: '📋 Reportes por Paciente' },
                    { id: 'expediente_ejercicios' as TipoTarjeta, label: '🏋️ Expediente / Ejercicios' },
                    { id: 'agendar_cita' as TipoTarjeta, label: '📅 Agendar Cita' },
                  ].map(op => (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => setActiveCard(op.id)}
                      style={{
                        padding: '6px 6px',
                        borderRadius: 8,
                        fontSize: 10.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: activeCard === op.id ? `linear-gradient(135deg,${acento.from},${acento.to})` : 'transparent',
                        border: 'none',
                        color: activeCard === op.id ? '#fff' : '#94A3B8',
                      }}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              )}

              {/* TARJETA DE REPORTES SEPARADOS POR PACIENTE (Terapeuta) */}
              {activeCard === 'reportes_pacientes' && (
                <div style={{
                  background: 'linear-gradient(180deg, rgba(15,23,42,0.97) 0%, rgba(10,18,32,0.99) 100%)',
                  border: `1.5px solid ${acento.chip}`,
                  borderRadius: 16,
                  padding: 15,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#F8FAFC' }}>
                      📋 Reportes Clínicos Separados por Paciente
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: acento.chip }}>
                      Descarga el reporte o expediente individual de cada paciente con logo y marca de agua
                    </p>
                  </div>

                  <input
                    type="text"
                    placeholder="🔍 Filtrar por nombre de paciente..."
                    value={filtroPacRep}
                    onChange={e => setFiltroPacRep(e.target.value)}
                    style={cardInputStyle}
                  />

                  {reportesAgrupadosPorPaciente.length === 0 ? (
                    <div style={{
                      padding: '26px 16px',
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px dashed rgba(255,255,255,0.12)',
                      textAlign: 'center',
                      color: '#94A3B8',
                      fontSize: 12,
                    }}>
                      No hay reportes de síntomas registrados para mostrar en este filtro.
                    </div>
                  ) : (
                    reportesAgrupadosPorPaciente.map(grupo => (
                      <div
                        key={grupo.pacienteId}
                        style={{
                          background: 'rgba(6,11,20,0.85)',
                          border: `1.5px solid ${acento.border}`,
                          borderLeft: `4px solid ${acento.chip}`,
                          borderRadius: 13,
                          padding: 12,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 9,
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom: '1px solid rgba(255,255,255,0.08)',
                          paddingBottom: 7,
                        }}>
                          <div>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>
                              👤 {grupo.nombre}
                            </p>
                            <p style={{ margin: 0, fontSize: 10.5, color: '#94A3B8' }}>
                              {grupo.reportes.length} {grupo.reportes.length === 1 ? 'reporte registrado' : 'reportes registrados'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => window.open(`/api/expedientes/pdf?id_paciente=${grupo.pacienteId}`, '_blank')}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 8,
                              background: 'rgba(255,255,255,0.06)',
                              border: `1px solid ${acento.border}`,
                              color: acento.chip,
                              fontSize: 10.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            📋 Expediente PDF
                          </button>
                        </div>

                        {grupo.reportes.map(rep => {
                          const colorInt = rep.intensidad <= 3 ? '#34D399' : rep.intensidad <= 6 ? '#FBBF24' : '#F87171'
                          return (
                            <div
                              key={rep.id_reporte}
                              style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.07)',
                                borderRadius: 10,
                                padding: '9px 11px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 5,
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#E2E8F0' }}>
                                  📍 {rep.zona_dolor} {rep.tipo_dolor ? `(${rep.tipo_dolor})` : ''}
                                </span>
                                <span style={{
                                  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                                  background: `${colorInt}22`, color: colorInt,
                                }}>
                                  Dolor {rep.intensidad}/10
                                </span>
                              </div>
                              <div style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.4 }}>
                                {rep.resumen_ia}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                                <span style={{ fontSize: 10, color: '#64748B' }}>
                                  🕐 {fechaCorta(rep.created_at)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => descargarReporteIndividualPaciente(rep)}
                                  disabled={descargandoId === `rep-pac-${rep.id_reporte}`}
                                  style={{
                                    padding: '5px 11px',
                                    borderRadius: 7,
                                    background: `linear-gradient(135deg, ${acento.from}, ${acento.to})`,
                                    border: 'none',
                                    color: '#fff',
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  {descargandoId === `rep-pac-${rep.id_reporte}`
                                    ? '⏳ Generando...'
                                    : '📥 Bajar este Reporte PDF'}
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TARJETA 1: AGENDAR CITA */}
              {activeCard === 'agendar_cita' && (
                <div style={{
                  background: 'linear-gradient(180deg, rgba(15,23,42,0.97) 0%, rgba(10,18,32,0.99) 100%)',
                  border: `1.5px solid ${acento.chip}`,
                  borderRadius: 16,
                  padding: 15,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  boxShadow: `0 10px 28px rgba(0,0,0,0.55)`,
                }}>
                  <div style={{ borderBottom: `1px solid ${acento.border}`, paddingBottom: 9 }}>
                    <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#F8FAFC' }}>
                      📅 Tarjeta para Agendar Cita
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: acento.chip }}>
                      Completa los campos y se enviará todo en una sola respuesta
                    </p>
                  </div>

                  <div>
                    <label style={cardLabelStyle}>👤 Nombre del paciente *</label>
                    <input
                      type="text"
                      placeholder="Ej. Juan Pérez García"
                      value={citaPaciente}
                      onChange={e => setCitaPaciente(e.target.value)}
                      style={cardInputStyle}
                    />
                  </div>

                  {rol === 'secretaria' && (
                    <div>
                      <label style={cardLabelStyle}>🩺 Nombre del terapeuta *</label>
                      <input
                        type="text"
                        placeholder="Ej. Dra. Laura Gómez"
                        value={citaTerapeuta}
                        onChange={e => setCitaTerapeuta(e.target.value)}
                        style={cardInputStyle}
                      />
                    </div>
                  )}

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                      <label style={{ ...cardLabelStyle, marginBottom: 0 }}>📆 Fecha de la cita (Calendario) *</label>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button type="button" onClick={() => setCitaFecha(fechaHoyISO())} style={{
                          fontSize: 10.5, padding: '3px 9px', borderRadius: 7, cursor: 'pointer',
                          background: citaFecha === fechaHoyISO() ? acento.chip : 'rgba(255,255,255,0.06)',
                          color: citaFecha === fechaHoyISO() ? '#060B14' : '#CBD5E1',
                          border: `1px solid ${acento.border}`, fontWeight: 700,
                        }}>Hoy</button>
                        <button type="button" onClick={() => setCitaFecha(fechaMananaISO())} style={{
                          fontSize: 10.5, padding: '3px 9px', borderRadius: 7, cursor: 'pointer',
                          background: citaFecha === fechaMananaISO() ? acento.chip : 'rgba(255,255,255,0.06)',
                          color: citaFecha === fechaMananaISO() ? '#060B14' : '#CBD5E1',
                          border: `1px solid ${acento.border}`, fontWeight: 700,
                        }}>Mañana</button>
                      </div>
                    </div>
                    <input
                      type="date"
                      value={citaFecha}
                      min={fechaHoyISO()}
                      onChange={e => setCitaFecha(e.target.value)}
                      style={{ ...cardInputStyle, colorScheme: 'dark', cursor: 'pointer' }}
                    />
                  </div>

                  <div>
                    <label style={cardLabelStyle}>⏰ Hora de la sesión *</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 8 }}>
                      {HORARIOS_COMUNES.map(h => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setCitaHora(h)}
                          style={{
                            padding: '6px 4px', borderRadius: 8, fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                            background: citaHora === h ? `linear-gradient(135deg,${acento.from},${acento.to})` : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${citaHora === h ? '#fff' : acento.border}`,
                            color: citaHora === h ? '#fff' : '#CBD5E1',
                          }}
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="time"
                        value={citaHora}
                        onChange={e => setCitaHora(e.target.value)}
                        style={{ ...cardInputStyle, flex: 1, colorScheme: 'dark' }}
                      />
                      <select
                        value={citaDuracion}
                        onChange={e => setCitaDuracion(e.target.value)}
                        style={{ ...cardInputStyle, width: 115 }}
                      >
                        <option value="30">30 min</option>
                        <option value="45">45 min</option>
                        <option value="60">60 min</option>
                        <option value="90">90 min</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={cardLabelStyle}>📝 Notas o motivo (opcional)</label>
                    <input
                      type="text"
                      placeholder="Ej. Valoración inicial / Rehabilitación"
                      value={citaNotas}
                      onChange={e => setCitaNotas(e.target.value)}
                      style={cardInputStyle}
                    />
                  </div>

                  <div style={{
                    padding: '10px 12px', borderRadius: 11,
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${acento.border}`,
                  }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: '#F1F5F9', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={citaConPago}
                        onChange={e => setCitaConPago(e.target.checked)}
                        style={{ accentColor: acento.chip, width: 16, height: 16 }}
                      />
                      💳 Registrar pago de esta sesión ahora
                    </label>

                    {citaConPago && (
                      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 9 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <label style={cardLabelStyle}>Monto ($ MXN)</label>
                            <input
                              type="number"
                              placeholder="Ej. 600"
                              value={citaMonto}
                              onChange={e => setCitaMonto(e.target.value)}
                              style={cardInputStyle}
                            />
                          </div>
                          <div style={{ width: 125 }}>
                            <label style={cardLabelStyle}>Estado</label>
                            <select
                              value={citaEstadoPago}
                              onChange={e => setCitaEstadoPago(e.target.value as 'pagado' | 'pendiente')}
                              style={cardInputStyle}
                            >
                              <option value="pagado">Pagado</option>
                              <option value="pendiente">Pendiente</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label style={cardLabelStyle}>Método de pago</label>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                            {(['efectivo', 'transferencia', 'tarjeta', 'aseguradora'] as const).map(met => (
                              <button
                                key={met}
                                type="button"
                                onClick={() => setCitaMetodo(met)}
                                style={{
                                  padding: '6px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                                  textTransform: 'capitalize', cursor: 'pointer',
                                  background: citaMetodo === met ? `${acento.chip}28` : 'rgba(255,255,255,0.04)',
                                  border: `1px solid ${citaMetodo === met ? acento.chip : 'rgba(255,255,255,0.12)'}`,
                                  color: citaMetodo === met ? acento.chip : '#CBD5E1',
                                }}
                              >
                                {met}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={enviarTarjetaCita}
                    disabled={loading}
                    style={{
                      width: '100%', padding: '11px 14px', borderRadius: 11,
                      background: `linear-gradient(135deg, ${acento.from}, ${acento.to})`,
                      border: '1px solid rgba(255,255,255,0.3)',
                      color: '#FFFFFF', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                      boxShadow: `0 4px 16px ${acento.glow}`,
                    }}
                  >
                    ✅ Enviar todo y Agendar Cita
                  </button>
                </div>
              )}

              {/* TARJETA 2: REGISTRAR PAGO */}
              {activeCard === 'registrar_pago' && (
                <div style={{
                  background: 'linear-gradient(180deg, rgba(15,23,42,0.97) 0%, rgba(10,18,32,0.99) 100%)',
                  border: `1.5px solid ${acento.chip}`,
                  borderRadius: 16, padding: 15,
                  display: 'flex', flexDirection: 'column', gap: 12,
                }}>
                  <div style={{ borderBottom: `1px solid ${acento.border}`, paddingBottom: 9 }}>
                    <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#F8FAFC' }}>
                      💳 Tarjeta de Registro de Pago
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: acento.chip }}>
                      Registra o cobra un pago de paciente en una sola respuesta
                    </p>
                  </div>

                  <div>
                    <label style={cardLabelStyle}>👤 Nombre del paciente *</label>
                    <input
                      type="text"
                      placeholder="Ej. María López"
                      value={pagoPaciente}
                      onChange={e => setPagoPaciente(e.target.value)}
                      style={cardInputStyle}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label style={cardLabelStyle}>💰 Monto ($ MXN) *</label>
                      <input
                        type="number"
                        placeholder="Ej. 550"
                        value={pagoMonto}
                        onChange={e => setPagoMonto(e.target.value)}
                        style={cardInputStyle}
                      />
                    </div>
                    <div style={{ width: 135 }}>
                      <label style={cardLabelStyle}>📌 Estado</label>
                      <select
                        value={pagoEstado}
                        onChange={e => setPagoEstado(e.target.value as 'pagado' | 'pendiente')}
                        style={cardInputStyle}
                      >
                        <option value="pagado">Pagado hoy</option>
                        <option value="pendiente">Pendiente</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={cardLabelStyle}>🏦 Método de pago *</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                      {(['efectivo', 'transferencia', 'tarjeta', 'aseguradora'] as const).map(met => (
                        <button
                          key={met}
                          type="button"
                          onClick={() => setPagoMetodo(met)}
                          style={{
                            padding: '7px 8px', borderRadius: 8, fontSize: 11.5, fontWeight: 600,
                            textTransform: 'capitalize', cursor: 'pointer',
                            background: pagoMetodo === met ? `linear-gradient(135deg,${acento.from},${acento.to})` : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${pagoMetodo === met ? '#fff' : acento.border}`,
                            color: pagoMetodo === met ? '#fff' : '#CBD5E1',
                          }}
                        >
                          {met}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={cardLabelStyle}>📝 Concepto o nota (opcional)</label>
                    <input
                      type="text"
                      placeholder="Ej. Sesión de fisioterapia"
                      value={pagoConcepto}
                      onChange={e => setPagoConcepto(e.target.value)}
                      style={cardInputStyle}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={enviarTarjetaPago}
                    disabled={loading}
                    style={{
                      width: '100%', padding: '11px 14px', borderRadius: 11,
                      background: `linear-gradient(135deg, ${acento.from}, ${acento.to})`,
                      border: '1px solid rgba(255,255,255,0.3)',
                      color: '#FFFFFF', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    ✅ Enviar y Registrar Pago
                  </button>
                </div>
              )}

              {/* TARJETA 3: CONSULTAR ADEUDO */}
              {activeCard === 'consultar_adeudo' && (
                <div style={{
                  background: 'linear-gradient(180deg, rgba(15,23,42,0.97) 0%, rgba(10,18,32,0.99) 100%)',
                  border: `1.5px solid ${acento.chip}`,
                  borderRadius: 16, padding: 15,
                  display: 'flex', flexDirection: 'column', gap: 12,
                }}>
                  <div style={{ borderBottom: `1px solid ${acento.border}`, paddingBottom: 9 }}>
                    <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#F8FAFC' }}>
                      🔍 Consultar Adeudos de Paciente
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: acento.chip }}>
                      Revisa pagos pendientes e historial por nombre
                    </p>
                  </div>

                  <div>
                    <label style={cardLabelStyle}>👤 Nombre del paciente *</label>
                    <input
                      type="text"
                      placeholder="Escribe el nombre o apellido del paciente"
                      value={pagoPaciente}
                      onChange={e => setPagoPaciente(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && enviarTarjetaAdeudo()}
                      style={cardInputStyle}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={enviarTarjetaAdeudo}
                    disabled={loading}
                    style={{
                      width: '100%', padding: '11px 14px', borderRadius: 11,
                      background: `linear-gradient(135deg, ${acento.from}, ${acento.to})`,
                      border: '1px solid rgba(255,255,255,0.3)',
                      color: '#FFFFFF', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    🔍 Consultar Adeudos Ahora
                  </button>
                </div>
              )}

              {/* TARJETA 4: EXPEDIENTE Y EJERCICIOS */}
              {activeCard === 'expediente_ejercicios' && (
                <div style={{
                  background: 'linear-gradient(180deg, rgba(15,23,42,0.97) 0%, rgba(10,18,32,0.99) 100%)',
                  border: `1.5px solid ${acento.chip}`,
                  borderRadius: 16, padding: 15,
                  display: 'flex', flexDirection: 'column', gap: 12,
                }}>
                  <div style={{ borderBottom: `1px solid ${acento.border}`, paddingBottom: 9 }}>
                    <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#F8FAFC' }}>
                      🏋️ Tarjeta Clínica: Ejercicios y Expediente
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: acento.chip }}>
                      Asigna rutina o actualiza notas del expediente clínico
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setExpTipoAcc('ejercicios')}
                      style={{
                        padding: '7px 8px', borderRadius: 8, fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                        background: expTipoAcc === 'ejercicios' ? `linear-gradient(135deg,${acento.from},${acento.to})` : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${expTipoAcc === 'ejercicios' ? '#fff' : acento.border}`,
                        color: expTipoAcc === 'ejercicios' ? '#fff' : '#CBD5E1',
                      }}
                    >
                      🏋️ Asignar Ejercicios
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpTipoAcc('notas')}
                      style={{
                        padding: '7px 8px', borderRadius: 8, fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                        background: expTipoAcc === 'notas' ? `linear-gradient(135deg,${acento.from},${acento.to})` : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${expTipoAcc === 'notas' ? '#fff' : acento.border}`,
                        color: expTipoAcc === 'notas' ? '#fff' : '#CBD5E1',
                      }}
                    >
                      📝 Notas en Expediente
                    </button>
                  </div>

                  {/* Aviso visual de privacidad / visibilidad por rol */}
                  <div style={{
                    padding: '7px 10px',
                    borderRadius: 9,
                    fontSize: 11,
                    fontWeight: 600,
                    background: expTipoAcc === 'ejercicios' ? 'rgba(16,185,129,0.12)' : 'rgba(59,130,246,0.12)',
                    border: `1px solid ${expTipoAcc === 'ejercicios' ? 'rgba(16,185,129,0.35)' : 'rgba(59,130,246,0.35)'}`,
                    color: expTipoAcc === 'ejercicios' ? '#6EE7B7' : '#93C5FD',
                  }}>
                    {expTipoAcc === 'ejercicios'
                      ? '👁️ Se guarda en el Expediente y se publica en "Mis Ejercicios" del Paciente'
                      : '🔒 Nota Clínica Privada: Solo visible en Expediente (Terapeuta / Admin)'}
                  </div>

                  <div>
                    <label style={cardLabelStyle}>👤 Nombre del paciente *</label>
                    <input
                      type="text"
                      placeholder="Ej. Carlos Hernández"
                      value={expPaciente}
                      onChange={e => setExpPaciente(e.target.value)}
                      style={cardInputStyle}
                    />
                  </div>

                  <div>
                    <label style={cardLabelStyle}>🦴 Zona anatómica</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(['Rodilla', 'Lumbar', 'Hombro', 'Cervical', 'Tobillo'] as const).map(z => (
                        <button
                          key={z}
                          type="button"
                          onClick={() => setExpZona(z)}
                          style={{
                            padding: '5px 11px', borderRadius: 16, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                            background: expZona === z ? `${acento.chip}30` : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${expZona === z ? acento.chip : 'rgba(255,255,255,0.12)'}`,
                            color: expZona === z ? acento.chip : '#CBD5E1',
                          }}
                        >
                          {z}
                        </button>
                      ))}
                    </div>
                  </div>

                  {expTipoAcc === 'ejercicios' && (
                    <>
                      <div>
                        <label style={cardLabelStyle}>➕ Agregar ejercicio personalizado + repeticiones</label>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input
                            type="text"
                            placeholder="Ej. lagartijas, sentadillas..."
                            value={expCustomNombre}
                            onChange={e => setExpCustomNombre(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), agregarEjercicioPersonalizado())}
                            style={{ ...cardInputStyle, flex: 1 }}
                          />
                          <input
                            type="number"
                            min={1}
                            max={200}
                            placeholder="Reps"
                            value={expCustomReps}
                            onChange={e => setExpCustomReps(e.target.value)}
                            style={{ ...cardInputStyle, width: 70, textAlign: 'center' }}
                            title="Repeticiones"
                          />
                          <button
                            type="button"
                            onClick={agregarEjercicioPersonalizado}
                            style={{
                              padding: '0 12px', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                              background: `${acento.chip}28`, border: `1px solid ${acento.chip}`, color: '#fff',
                            }}
                          >
                            + Añadir
                          </button>
                        </div>
                      </div>

                      {expSeleccion.length > 0 && (
                        <div>
                          <label style={cardLabelStyle}>✅ Ejercicios listos para asignar ({expSeleccion.length})</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {expSeleccion.map(item => (
                              <span
                                key={item}
                                onClick={() => toggleEjercicioRapido(item)}
                                style={{
                                  padding: '4px 10px', borderRadius: 14, fontSize: 11, fontWeight: 600,
                                  background: `${acento.chip}25`, border: `1px solid ${acento.chip}`,
                                  color: '#F8FAFC', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
                                }}
                                title="Clic para quitar"
                              >
                                {item} <strong style={{ color: '#FCA5A5' }}>×</strong>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <label style={cardLabelStyle}>⚡ O elige del catálogo rápido ({expZona})</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {(CATALOGO_EJERCICIOS_RAPIDOS[expZona] ?? []).map(ej => {
                            const sel = expSeleccion.includes(ej)
                            return (
                              <button
                                key={ej}
                                type="button"
                                onClick={() => toggleEjercicioRapido(ej)}
                                style={{
                                  padding: '7px 11px', borderRadius: 9, fontSize: 11.5, textAlign: 'left',
                                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  background: sel ? `${acento.chip}24` : 'rgba(255,255,255,0.03)',
                                  border: `1px solid ${sel ? acento.chip : 'rgba(255,255,255,0.09)'}`,
                                  color: sel ? '#F8FAFC' : '#CBD5E1',
                                }}
                              >
                                <span>{ej}</span>
                                <span>{sel ? '✅' : '＋'}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                          <label style={cardLabelStyle}>💊 Dolor sesión: {expDolor}/10</label>
                          <input
                            type="range"
                            min={0}
                            max={10}
                            value={expDolor}
                            onChange={e => setExpDolor(Number(e.target.value))}
                            style={{ width: '100%', accentColor: '#F87171', cursor: 'pointer' }}
                          />
                        </div>
                        <div>
                          <label style={cardLabelStyle}>🦿 Movilidad: {expMovilidad}/10</label>
                          <input
                            type="range"
                            min={0}
                            max={10}
                            value={expMovilidad}
                            onChange={e => setExpMovilidad(Number(e.target.value))}
                            style={{ width: '100%', accentColor: '#34D399', cursor: 'pointer' }}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <label style={cardLabelStyle}>
                      {expTipoAcc === 'ejercicios' ? '📋 Indicaciones adicionales / Frecuencia' : '📋 Observaciones clínicas / Plan de tratamiento *'}
                    </label>
                    <textarea
                      rows={3}
                      placeholder={expTipoAcc === 'ejercicios' ? 'Ej. Realizar 2 veces al día sin dolor...' : 'Ej. Paciente presenta mejoría en rango de movimiento...'}
                      value={expDetalle}
                      onChange={e => setExpDetalle(e.target.value)}
                      style={{ ...cardInputStyle, resize: 'vertical' }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={enviarTarjetaExpediente}
                    disabled={loading}
                    style={{
                      width: '100%', padding: '11px 14px', borderRadius: 11,
                      background: `linear-gradient(135deg, ${acento.from}, ${acento.to})`,
                      border: '1px solid rgba(255,255,255,0.3)',
                      color: '#FFFFFF', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    {expTipoAcc === 'ejercicios'
                      ? '✅ Asignar al Paciente y Guardar en Expediente'
                      : '🔒 Guardar Nota Privada en Expediente'}
                  </button>
                </div>
              )}

              {/* TARJETA 5: REPORTE DE SÍNTOMAS (Paciente) */}
              {activeCard === 'reporte_sintomas' && (
                <div style={{
                  background: 'linear-gradient(180deg, rgba(15,23,42,0.97) 0%, rgba(10,18,32,0.99) 100%)',
                  border: `1.5px solid ${acento.chip}`,
                  borderRadius: 16, padding: 15,
                  display: 'flex', flexDirection: 'column', gap: 12,
                }}>
                  <div style={{ borderBottom: `1px solid ${acento.border}`, paddingBottom: 9 }}>
                    <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#F8FAFC' }}>
                      🩺 Tarjeta de Reporte de Síntomas
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: acento.chip }}>
                      Envía todos tus síntomas en un solo paso a tu terapeuta
                    </p>
                  </div>

                  <div>
                    <label style={cardLabelStyle}>📍 1. Zona exacta del dolor *</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 7 }}>
                      {['Rodilla derecha', 'Rodilla izquierda', 'Espalda baja / Lumbar', 'Hombro', 'Cuello / Cervical', 'Tobillo'].map(z => (
                        <button
                          key={z}
                          type="button"
                          onClick={() => setSinZona(z)}
                          style={{
                            padding: '4px 10px', borderRadius: 14, fontSize: 10.5, fontWeight: 600, cursor: 'pointer',
                            background: sinZona === z ? `${acento.chip}30` : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${sinZona === z ? acento.chip : 'rgba(255,255,255,0.12)'}`,
                            color: sinZona === z ? acento.chip : '#CBD5E1',
                          }}
                        >
                          {z}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="O escribe la zona exacta aquí..."
                      value={sinZona}
                      onChange={e => setSinZona(e.target.value)}
                      style={cardInputStyle}
                    />
                  </div>

                  <div>
                    <label style={cardLabelStyle}>⚡ 2. Tipo de dolor</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                      {['Punzante', 'Ardor', 'Presión', 'Rigidez', 'Calambre', 'Hormigueo'].map(td => (
                        <button
                          key={td}
                          type="button"
                          onClick={() => setSinTipo(td)}
                          style={{
                            padding: '6px 6px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                            background: sinTipo === td ? `linear-gradient(135deg,${acento.from},${acento.to})` : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${sinTipo === td ? '#fff' : acento.border}`,
                            color: sinTipo === td ? '#fff' : '#CBD5E1',
                          }}
                        >
                          {td}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={cardLabelStyle}>
                      🔥 3. Intensidad del dolor: <span style={{ color: acento.chip }}>{sinIntensidad}/10</span>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 4 }}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => {
                        const activo = sinIntensidad === n
                        const colorNivel = n <= 3 ? '#34D399' : n <= 6 ? '#FBBF24' : '#F87171'
                        return (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setSinIntensidad(n)}
                            style={{
                              padding: '6px 0', borderRadius: 7, fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                              background: activo ? colorNivel : 'rgba(255,255,255,0.05)',
                              border: `1px solid ${activo ? '#fff' : 'rgba(255,255,255,0.12)'}`,
                              color: activo ? '#060B14' : colorNivel,
                            }}
                          >
                            {n}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <label style={cardLabelStyle}>📅 4. ¿Cuándo empezó el dolor? (Calendario)</label>
                    <input
                      type="date"
                      value={sinFechaIni}
                      max={fechaHoyISO()}
                      onChange={e => setSinFechaIni(e.target.value)}
                      style={{ ...cardInputStyle, colorScheme: 'dark', cursor: 'pointer' }}
                    />
                  </div>

                  <div>
                    <label style={cardLabelStyle}>🔄 5. ¿Qué lo empeora o mejora?</label>
                    <input
                      type="text"
                      placeholder="Ej. Empeora al caminar, mejora con reposo"
                      value={sinFactores}
                      onChange={e => setSinFactores(e.target.value)}
                      style={cardInputStyle}
                    />
                  </div>

                  <div>
                    <label style={cardLabelStyle}>📝 6. Otros síntomas (opcional)</label>
                    <input
                      type="text"
                      placeholder="Ej. Inflamación leve"
                      value={sinExtra}
                      onChange={e => setSinExtra(e.target.value)}
                      style={cardInputStyle}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={enviarTarjetaSintomas}
                    disabled={loading}
                    style={{
                      width: '100%', padding: '11px 14px', borderRadius: 11,
                      background: `linear-gradient(135deg, ${acento.from}, ${acento.to})`,
                      border: '1px solid rgba(255,255,255,0.3)',
                      color: '#FFFFFF', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    ✅ Enviar Reporte Completo al Terapeuta
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              VISTA 3: APARTADO DE HISTORIAL DEL DÍA (Ordenado, sin descarga masiva)
             ════════════════════════════════════════════════════════════════ */}
          {vistaTab === 'historial' && (
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: 15,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              scrollbarWidth: 'thin',
              scrollbarColor: `${acento.glow} transparent`,
            }}>
              <div style={{
                padding: '12px 14px',
                borderRadius: 14,
                background: acento.cardBg,
                border: `1.5px solid ${acento.border}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>
                      🗂️ Historial de Consultas de Hoy ({fechaLegibleHoy})
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 10.5, color: '#94A3B8' }}>
                      Se limpia automáticamente cada día.
                    </p>
                  </div>
                  {bloquesHistorial.length > 0 && (
                    <button
                      type="button"
                      onClick={limpiarHistorialHoy}
                      disabled={limpiandoHist}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 8,
                        background: 'rgba(242,85,85,0.14)',
                        border: '1px solid rgba(242,85,85,0.4)',
                        color: '#F87171',
                        fontSize: 10.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {limpiandoHist ? 'Borrando...' : '🗑️ Limpiar hoy'}
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="🔍 Buscar en el historial de hoy..."
                  value={busquedaHist}
                  onChange={e => setBusquedaHist(e.target.value)}
                  style={{ ...cardInputStyle, padding: '7px 11px', fontSize: 11.5 }}
                />
              </div>

              {bloquesHistorial.length === 0 ? (
                <div style={{
                  padding: '36px 20px',
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px dashed rgba(255,255,255,0.1)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🕒</div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#CBD5E1', margin: '0 0 4px' }}>
                    Sin registros en el historial de hoy
                  </p>
                  <p style={{ fontSize: 11, color: '#8C9BB5', margin: 0 }}>
                    Tus conversaciones de hoy aparecerán ordenadas aquí.
                  </p>
                </div>
              ) : (
                bloquesHistorial.map((item, idx) => (
                  <div
                    key={item.id}
                    style={{
                      background: 'rgba(15,23,42,0.88)',
                      border: `1.5px solid ${acento.border}`,
                      borderLeft: `4px solid ${acento.chip}`,
                      borderRadius: 13,
                      padding: '11px 13px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 7,
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid rgba(255,255,255,0.07)',
                      paddingBottom: 5,
                    }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: acento.chip }}>
                        #{bloquesHistorial.length - idx} · Hoy a las {item.time}
                      </span>
                    </div>

                    <div style={{
                      fontSize: 11.5,
                      color: '#F8FAFC',
                      background: 'rgba(255,255,255,0.04)',
                      padding: '6px 9px',
                      borderRadius: 8,
                      whiteSpace: 'pre-wrap',
                    }}>
                      <strong style={{ color: acento.chip }}>Tú: </strong>
                      {item.pregunta}
                    </div>

                    <div style={{
                      fontSize: 12,
                      color: '#CBD5E1',
                      lineHeight: 1.55,
                      whiteSpace: 'pre-wrap',
                      padding: '2px 4px',
                    }}>
                      {item.respuesta}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Preview adjunto */}
          {adjunto && (
            <div style={{
              margin: '0 12px 6px', background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${acento.border}`, borderRadius: 10,
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
              <button type="button" onClick={() => { setAdjunto(null); setAdjPreview(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8C9BB5', fontSize: 16 }}>✕</button>
            </div>
          )}

          {/* Barra de escritura inferior limpia (sin la fila de botones extra arriba) */}
          <div style={{
            padding: '10px 13px', borderTop: `1px solid ${acento.border}`,
            display: 'flex', flexDirection: 'column', gap: 6,
            background: '#060B14', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
              {puedeAdj && (
                <>
                  <input ref={fileRef} type="file"
                    id="chatbot-file-input"
                    name="chatbot-file-input"
                    accept="image/*,.pdf,.txt,.csv"
                    onChange={onFileChange} style={{ display: 'none' }} />
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={loading}
                    title="Adjuntar archivo"
                    style={{
                      width: 35, height: 35, borderRadius: 10, flexShrink: 0,
                      background: adjunto ? `${acento.chip}33` : 'rgba(255,255,255,0.05)',
                      border: `1.5px solid ${adjunto ? acento.chip : acento.border}`,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      color: adjunto ? acento.chip : '#CBD5E1', fontSize: 15,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>📎</button>
                </>
              )}

              <input
                id="chatbot-message-input"
                name="chatbot-message-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && !paused && send(input)}
                placeholder={paused ? 'Edita y reanuda...' : adjunto ? 'Añade mensaje o envía...' : 'Escribe tu mensaje o abre 📋 Tarjeta...'}
                disabled={loading}
                autoComplete="off"
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.05)',
                  border: `1.5px solid ${paused ? 'rgba(245,180,0,0.55)' : acento.border}`,
                  borderRadius: 12, padding: '9px 13px',
                  color: '#E7EDF7', fontSize: 13,
                  outline: 'none', fontFamily: 'Inter,sans-serif',
                }}
              />

              {puedePausar && !paused && (
                <button type="button" onClick={pausar} disabled={!input.trim() || loading}
                  title="Pausar y analizar antes de enviar"
                  style={{
                    width: 35, height: 35, borderRadius: 10, flexShrink: 0,
                    background: 'rgba(245,180,0,0.14)',
                    border: '1.5px solid rgba(245,180,0,0.35)',
                    cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
                    color: '#F5B400', fontSize: 13,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>⏸</button>
              )}

              {paused && (
                <button type="button" onClick={reanudar}
                  title="Reanudar mensaje pausado"
                  style={{
                    width: 35, height: 35, borderRadius: 10, flexShrink: 0,
                    background: 'rgba(52,211,153,0.15)',
                    border: '1.5px solid rgba(52,211,153,0.4)',
                    cursor: 'pointer', color: '#34D399', fontSize: 13,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>▶</button>
              )}

              <button type="button" onClick={() => send(input)}
                disabled={loading || (!input.trim() && !adjunto) || paused}
                style={{
                  width: 38, height: 35, borderRadius: 10, flexShrink: 0,
                  background: loading || (!input.trim() && !adjunto) || paused
                    ? `${acento.chip}35`
                    : `linear-gradient(135deg,${acento.from},${acento.to})`,
                  border: `1.5px solid ${acento.border}`,
                  cursor: loading || (!input.trim() && !adjunto) || paused ? 'not-allowed' : 'pointer',
                  color: 'white', fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>➤</button>
            </div>
          </div>
        </div>
      )}

      {/* Botón flotante con borde y badge del rol */}
      <div style={{ position: 'fixed', bottom: 26, right: 26, zIndex: 9998 }}>
        <button type="button" onClick={toggle} style={{
          width: 56, height: 56, borderRadius: 16,
          border: `2px solid ${acento.chip}`,
          cursor: 'pointer',
          background: `linear-gradient(135deg,${acento.from},${acento.to})`,
          color: 'white', fontSize: 23,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 6px 26px ${acento.glow}`,
          transition: 'transform .2s, box-shadow .2s',
        }}>
          {open ? '✕' : acento.icon}
        </button>
        {notif && !open && (
          <span style={{
            position: 'absolute', top: -5, right: -5, width: 19, height: 19,
            borderRadius: '50%', background: '#F25555', fontSize: 10, fontWeight: 700,
            border: '2px solid #0A1220',
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
