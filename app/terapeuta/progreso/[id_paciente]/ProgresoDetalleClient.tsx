'use client'

/**
 * ProgresoDetalleClient.tsx
 * ─────────────────────────────────────────────────────────────
 * F6 — Historial de progreso por sesión (Terapeuta)
 *
 * El historial es INSERT-ONLY: cada sesión registrada queda fija
 * para siempre, como un registro clínico histórico. No hay botón
 * de editar ni eliminar en ningún punto de esta pantalla — esto
 * incluye los archivos (fotos/video): se eligen en el formulario
 * al crear el registro y después solo pueden VERSE, nunca editarse
 * ni eliminarse.
 *
 * Solo se puede registrar progreso para una cita que:
 *   1. Sea del paciente actual y de este terapeuta
 *   2. Esté en estado "completada"
 *   3. No tenga ya un registro de progreso asociado
 * El servidor (page.tsx) ya filtra esas citas disponibles.
 */

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Sidebar, { MenuButton } from '@/app/components/Sidebar'
import TopbarActions from '@/app/components/TopbarActions'

// ── TIPOS ────────────────────────────────────────────────────
interface Paciente {
  id_paciente: number
  nombre_completo: string
  curp: string
  fecha_nacimiento: string
  activo: boolean
  terapeuta_id: string
}
interface ArchivoProgreso {
  path: string
  nombre: string
  tipo: string
  tamano: number
  subido_en: string
  url?: string | null
}
interface EjercicioRealizado {
  ejercicio: string
  repeticiones: number
}
interface Sesion {
  id_progreso_sesion: number
  cita_id: number
  paciente_id: number
  nivel_dolor: number
  movilidad: number
  ejercicios?: EjercicioRealizado[]
  observaciones?: string
  fecha_registro: string
  archivos?: ArchivoProgreso[]
}
interface CitaDisponible {
  id_cita: number
  fecha_hora: string
  duracion_min: number
}
interface Props {
  paciente: Paciente
  sesionesIniciales: Sesion[]
  citasDisponibles: CitaDisponible[]
  userNombre: string
  userId: string
}

const TIPOS_ACEPTADOS = ['image/jpeg', 'image/jpg', 'image/png', 'video/mp4', 'video/quicktime', 'video/webm']
const TAMANO_MAX = 50 * 1024 * 1024
const MAX_ARCHIVOS = 5

// ── VALIDACIÓN CLIENTE ─────────────────────────────────────────
function validarCampos(f: Record<string,string>) {
  const errs: Record<string,string> = {}
  if (!f.cita_id) errs.cita_id = 'Selecciona la sesión a la que corresponde este registro'
  if (f.nivel_dolor === '' || f.nivel_dolor == null) errs.nivel_dolor = 'Indica el nivel de dolor'
  else {
    const n = Number(f.nivel_dolor)
    if (Number.isNaN(n) || n < 0 || n > 10) errs.nivel_dolor = 'Debe ser un número entre 0 y 10'
  }
  if (f.movilidad === '' || f.movilidad == null) errs.movilidad = 'Indica el nivel de movilidad'
  else {
    const n = Number(f.movilidad)
    if (Number.isNaN(n) || n < 0 || n > 10) errs.movilidad = 'Debe ser un número entre 0 y 10'
  }
  return errs
}

function validarArchivosSeleccionados(files: File[]): string | null {
  if (files.length > MAX_ARCHIVOS) return `Máximo ${MAX_ARCHIVOS} archivos por sesión`
  for (const f of files) {
    if (!TIPOS_ACEPTADOS.includes(f.type)) return `"${f.name}" no es un tipo permitido (solo JPG, PNG, MP4, MOV, WEBM)`
    if (f.size > TAMANO_MAX) return `"${f.name}" supera el límite de 50 MB`
  }
  return null
}

function formatTamano(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function esVideo(tipo: string) {
  return tipo.startsWith('video/')
}

// ── TOAST ─────────────────────────────────────────────────────
function Toast({ msg, type, onClose }: { msg:string; type:'success'|'error'; onClose:()=>void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div style={{
      position:'fixed', bottom:90, right:28, zIndex:200,
      background: type==='success' ? 'rgba(52,211,153,0.10)' : 'rgba(242,85,85,0.10)',
      border: `1px solid ${type==='success' ? 'rgba(52,211,153,0.35)' : 'rgba(242,85,85,0.35)'}`,
      borderLeft: `3px solid ${type==='success' ? '#34D399' : '#F25555'}`,
      borderRadius:12, padding:'14px 18px', minWidth:280, maxWidth:380,
      display:'flex', alignItems:'center', gap:12,
      backdropFilter:'blur(16px)',
      boxShadow:'0 8px 32px rgba(0,0,0,0.5)', animation:'slideUp .3s ease',
    }}>
      <span style={{fontSize:18}}>{type==='success'?'✅':'❌'}</span>
      <span style={{fontSize:14, color:'#E7EDF7', flex:1}}>{msg}</span>
      <button onClick={onClose} style={{background:'none',border:'none',color:'rgba(231,237,247,0.4)',cursor:'pointer',fontSize:16}}>✕</button>
    </div>
  )
}

function formatFechaHora(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
}
function calcularEdad(fechaNacimiento?: string) {
  if (!fechaNacimiento) return null
  const hoy = new Date()
  const nacimiento = new Date(fechaNacimiento)
  let edad = hoy.getFullYear() - nacimiento.getFullYear()
  const mesDiff = hoy.getMonth() - nacimiento.getMonth()
  if (mesDiff < 0 || (mesDiff === 0 && hoy.getDate() < nacimiento.getDate())) edad--
  return edad
}
function nivelClass(n: number, invertido = false) {
  if (invertido) return n >= 7 ? 'nivel-bueno' : n >= 4 ? 'nivel-medio' : 'nivel-malo'
  return n <= 3 ? 'nivel-bueno' : n <= 6 ? 'nivel-medio' : 'nivel-malo'
}

// ── VISOR DE ARCHIVO — usado en el timeline, pide URL firmada al vuelo si hace falta ──
function ArchivoThumb({ archivo, idSesion }: { archivo: ArchivoProgreso; idSesion: number }) {
  const [url, setUrl] = useState<string | null>(archivo.url ?? null)
  const [cargando, setCargando] = useState(false)

  async function abrir() {
    if (url) { window.open(url, '_blank'); return }
    setCargando(true)
    const res = await fetch('/api/progreso-archivos-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_progreso_sesion: idSesion, path: archivo.path }),
    })
    const data = await res.json()
    setCargando(false)
    if (res.ok && data.url) { setUrl(data.url); window.open(data.url, '_blank') }
  }

  return (
    <button type="button" className="archivo-thumb" onClick={abrir} disabled={cargando}>
      {esVideo(archivo.tipo) ? (
        url ? (
          <video src={url} className="thumb-media" muted />
        ) : (
          <div className="thumb-placeholder">🎬</div>
        )
      ) : (
        url ? (
          <img src={url} className="thumb-media" alt={archivo.nombre} />
        ) : (
          <div className="thumb-placeholder">🖼️</div>
        )
      )}
      <div className="thumb-overlay">{cargando ? '...' : esVideo(archivo.tipo) ? '▶ Ver video' : '🔍 Ver foto'}</div>
    </button>
  )
}

// ── COMPONENTE PRINCIPAL ─────────────────────────────────────
export default function ProgresoDetalleClient({ paciente, sesionesIniciales, citasDisponibles, userNombre, userId }: Props) {
  const [sesiones, setSesiones] = useState<Sesion[]>(sesionesIniciales)
  const [disponibles, setDisponibles] = useState<CitaDisponible[]>(citasDisponibles)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errores, setErrores] = useState<Record<string,string>>({})
  const [toast, setToast] = useState<{msg:string;type:'success'|'error'}|null>(null)
  const [archivosSeleccionados, setArchivosSeleccionados] = useState<File[]>([])
  const [filasEjercicios, setFilasEjercicios] = useState<EjercicioRealizado[]>([{ ejercicio: '', repeticiones: 0 }])
  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const ini = paciente.nombre_completo.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()
  const edad = calcularEdad(paciente.fecha_nacimiento)

  const promedioDolor = sesiones.length > 0
    ? Math.round(sesiones.reduce((acc, s) => acc + s.nivel_dolor, 0) / sesiones.length * 10) / 10
    : null
  const promedioMovilidad = sesiones.length > 0
    ? Math.round(sesiones.reduce((acc, s) => acc + s.movilidad, 0) / sesiones.length * 10) / 10
    : null
  const ultimaSesion = sesiones[0] ?? null
  const primeraSesion = sesiones[sesiones.length - 1] ?? null

  function abrirModal() {
    setErrores({})
    setArchivosSeleccionados([])
    setFilasEjercicios([{ ejercicio: '', repeticiones: 0 }])
    setModalAbierto(true)
  }
  function cerrarModal() {
    setModalAbierto(false)
    setErrores({})
    setArchivosSeleccionados([])
    setFilasEjercicios([{ ejercicio: '', repeticiones: 0 }])
    formRef.current?.reset()
  }

  function actualizarFilaEjercicio(index: number, campo: 'ejercicio' | 'repeticiones', valor: string) {
    setFilasEjercicios(prev => prev.map((fila, i) => {
      if (i !== index) return fila
      return campo === 'repeticiones'
        ? { ...fila, repeticiones: valor === '' ? 0 : Number(valor) }
        : { ...fila, ejercicio: valor }
    }))
  }
  function agregarFilaEjercicio() {
    setFilasEjercicios(prev => [...prev, { ejercicio: '', repeticiones: 0 }])
  }
  function quitarFilaEjercicio(index: number) {
    setFilasEjercicios(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== index))
  }

  function handleSeleccionArchivos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const todos = [...archivosSeleccionados, ...files]
    const err = validarArchivosSeleccionados(todos)
    if (err) {
      setErrores(prev => ({ ...prev, archivos: err }))
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    setErrores(prev => { const { archivos, ...resto } = prev; return resto })
    setArchivosSeleccionados(todos)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function quitarArchivoSeleccionado(index: number) {
    setArchivosSeleccionados(prev => prev.filter((_, i) => i !== index))
  }

  async function registrarSesion(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const campos: Record<string,string> = {}
    fd.forEach((value, key) => { if (key !== 'archivos_input' && !key.startsWith('ejercicio_') && !key.startsWith('repeticiones_')) campos[key] = value as string })

    const errs = validarCampos(campos)

    // Validar filas de ejercicio: si el usuario escribió repeticiones pero no nombre (o viceversa), avisar
    const filasLlenas = filasEjercicios.filter(f => f.ejercicio.trim() !== '' || f.repeticiones > 0)
    for (const fila of filasLlenas) {
      if (!fila.ejercicio.trim()) { errs.ejercicios = 'Cada ejercicio con repeticiones debe tener un nombre'; break }
    }

    if (Object.keys(errs).length > 0) { setErrores(errs); return }
    setErrores({})
    setLoading(true)

    const ejerciciosLimpios = filasEjercicios
      .filter(f => f.ejercicio.trim() !== '')
      .map(f => ({ ejercicio: f.ejercicio.trim(), repeticiones: f.repeticiones }))

    const payload = new FormData()
    payload.append('cita_id', campos.cita_id)
    payload.append('paciente_id', String(paciente.id_paciente))
    payload.append('nivel_dolor', campos.nivel_dolor)
    payload.append('movilidad', campos.movilidad)
    payload.append('ejercicios', JSON.stringify(ejerciciosLimpios))
    payload.append('observaciones', campos.observaciones || '')
    for (const file of archivosSeleccionados) {
      payload.append('archivos', file)
    }

    const res = await fetch('/api/progreso-sesiones', { method: 'POST', body: payload })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setToast({ msg: data.error ?? 'Error al registrar la sesión', type: 'error' })
      return
    }

    setSesiones(prev => [data.sesion, ...prev])
    setDisponibles(prev => prev.filter(c => c.id_cita !== Number(campos.cita_id)))
    setToast({ msg: 'Sesión de progreso registrada correctamente', type: 'success' })
    cerrarModal()
  }

  return (
    <>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --bg:#060B14;--sidebar:#0A1220;--card:rgba(255,255,255,0.035);--card-border:rgba(255,255,255,0.09);
          --border:rgba(255,255,255,0.09);--surface2:rgba(255,255,255,0.07);
          --blue:#2563EB;--cyan:#38BDF8;--text:#E7EDF7;--muted:#8C9BB5;
          --red:#F25555;--amber:#F5B400;--green:#34D399;
        }
        body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex}


        .main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
        .topbar{height:56px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 28px;flex-shrink:0}
        .topbar-title{font-size:14px;color:var(--muted);font-weight:500;display:flex;align-items:center;gap:8px}
        .topbar-title a{color:var(--muted);text-decoration:none}
        .topbar-title a:hover{color:var(--cyan)}
        .topbar-right{display:flex;align-items:center;gap:16px}
        .online-dot{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--cyan);font-weight:500}
        .dot{width:7px;height:7px;border-radius:50%;background:var(--cyan);box-shadow:0 0 8px var(--cyan)}
        .notif{width:32px;height:32px;border-radius:9px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:15px}
        .content{flex:1;overflow-y:auto;padding:28px}

        .btn-back{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:9px 16px;font-size:13px;font-weight:500;color:var(--muted);cursor:pointer;font-family:'Inter',sans-serif;display:flex;align-items:center;gap:7px;transition:all .18s;margin-bottom:16px}
        .btn-back:hover{color:var(--text);border-color:rgba(56,189,248,0.35);background:rgba(56,189,248,0.08)}

        .patient-banner{background:var(--card);border:1px solid var(--card-border);border-radius:16px;padding:22px 24px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px}
        .patient-banner-left{display:flex;align-items:center;gap:16px}
        .p-avatar-lg{width:54px;height:54px;border-radius:50%;background:rgba(56,189,248,0.18);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:var(--text);flex-shrink:0}
        .p-name-lg{font-size:18px;font-weight:700;color:var(--text)}
        .p-meta-lg{font-size:12.5px;color:var(--muted);margin-top:3px;display:flex;gap:14px;flex-wrap:wrap}

        .page-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px}
        .page-title{font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.015em}
        .page-sub{font-size:13px;color:var(--muted);margin-top:4px}
        .btn-nuevo{background:linear-gradient(135deg,var(--blue),var(--cyan));color:#fff;border:none;border-radius:11px;padding:11px 20px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;display:flex;align-items:center;gap:7px;transition:transform .2s,box-shadow .2s;box-shadow:0 4px 18px rgba(37,99,235,0.32)}
        .btn-nuevo:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(56,189,248,0.4)}
        .btn-nuevo:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none}

        .resumen-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}
        .resumen-card{background:var(--card);border:1px solid var(--card-border);border-radius:13px;padding:16px 18px}
        .resumen-lbl{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px}
        .resumen-val{font-size:22px;font-weight:800;color:var(--text)}
        .resumen-sub{font-size:11.5px;color:var(--muted);margin-top:4px}
        .trend-up{color:var(--green)}
        .trend-down{color:var(--red)}

        .timeline{position:relative;padding-left:8px}
        .timeline-item{position:relative;padding-left:28px;padding-bottom:24px}
        .timeline-item:last-child{padding-bottom:0}
        .timeline-dot{position:absolute;left:0;top:4px;width:14px;height:14px;border-radius:50%;background:var(--cyan);box-shadow:0 0 0 4px rgba(56,189,248,0.15)}
        .timeline-line{position:absolute;left:6px;top:18px;bottom:0;width:1px;background:var(--border)}
        .timeline-card{background:var(--card);border:1px solid var(--card-border);border-radius:14px;padding:18px 20px}
        .timeline-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px}
        .timeline-fecha{font-size:13px;font-weight:600;color:var(--text)}
        .timeline-badges{display:flex;gap:8px;flex-wrap:wrap}
        .nivel-badge{font-size:12px;font-weight:700;padding:4px 11px;border-radius:100px;display:inline-flex;align-items:center;gap:5px}
        .nivel-bueno{background:rgba(52,211,153,0.15);color:var(--green)}
        .nivel-medio{background:rgba(245,180,0,0.15);color:var(--amber)}
        .nivel-malo{background:rgba(242,85,85,0.15);color:var(--red)}
        .timeline-field{margin-top:10px}
        .timeline-field-lbl{font-size:10.5px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:3px}
        .timeline-field-val{font-size:13px;color:var(--text);line-height:1.5;white-space:pre-wrap}

        /* ── GALERÍA EN EL TIMELINE ── */
        .timeline-galeria{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
        .archivo-thumb{position:relative;width:84px;height:84px;border-radius:10px;overflow:hidden;border:1px solid var(--border);background:var(--surface2);cursor:pointer;padding:0;flex-shrink:0}
        .archivo-thumb:disabled{opacity:.6;cursor:wait}
        .thumb-media{width:100%;height:100%;object-fit:cover;display:block}
        .thumb-placeholder{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:24px}
        .thumb-overlay{position:absolute;inset:0;background:rgba(0,0,0,0.55);color:#fff;font-size:10px;font-weight:600;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s;text-align:center;padding:4px}
        .archivo-thumb:hover .thumb-overlay{opacity:1}

        .empty-card{background:var(--card);border:1px dashed var(--card-border);border-radius:16px;padding:48px 24px;text-align:center}
        .empty-icon{font-size:36px;margin-bottom:12px}
        .empty-title{font-size:15px;font-weight:600;color:var(--text);margin-bottom:6px}
        .empty-sub{font-size:13px;color:var(--muted);margin-bottom:20px}

        .insert-only-note{display:flex;align-items:center;gap:8px;background:rgba(56,189,248,0.07);border:1px solid rgba(56,189,248,0.18);border-radius:10px;padding:10px 14px;font-size:12px;color:var(--muted);margin-bottom:20px}

        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .2s ease}
        .modal{background:#0A1220;border:1px solid var(--border);border-radius:20px;width:100%;max-width:540px;max-height:90vh;overflow-y:auto;animation:slideUp .25s ease}
        .modal-header{padding:24px 28px 0;display:flex;align-items:center;justify-content:space-between}
        .modal-title{font-size:18px;font-weight:700;color:var(--text)}
        .modal-sub{font-size:13px;color:var(--muted);margin-top:4px}
        .modal-close{background:var(--surface2);border:1px solid var(--border);border-radius:8px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--muted);font-size:16px;transition:all .18s;flex-shrink:0}
        .modal-close:hover{background:rgba(242,85,85,0.15);color:var(--red)}
        .modal-body{padding:24px 28px}
        .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .form-grid-full{grid-column:1/-1}
        .form-group{display:flex;flex-direction:column;gap:6px}
        .form-label{font-size:11px;font-weight:600;color:var(--muted);letter-spacing:0.07em;text-transform:uppercase}
        .form-input,.form-select,.form-textarea{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:11px 13px;font-size:14px;font-family:'Inter',sans-serif;color:var(--text);outline:none;transition:border-color .2s,box-shadow .2s;width:100%;resize:vertical}
        .form-input:focus,.form-select:focus,.form-textarea:focus{border-color:var(--cyan);box-shadow:0 0 0 3px rgba(56,189,248,0.12)}
        .form-input::placeholder,.form-textarea::placeholder{color:rgba(231,237,247,0.25)}
        .form-select option{background:#0A1220;color:var(--text)}
        .form-input.err,.form-select.err{border-color:rgba(242,85,85,0.5)}
        .err-msg{font-size:11px;color:var(--red)}
        .range-hint{font-size:11px;color:var(--muted);margin-top:2px}
        .modal-footer{padding:0 28px 24px;display:flex;gap:10px;justify-content:flex-end}
        .btn-cancel{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:11px 20px;font-size:14px;font-weight:500;color:var(--muted);cursor:pointer;font-family:'Inter',sans-serif;transition:all .18s}
        .btn-cancel:hover{color:var(--text)}
        .btn-save{background:linear-gradient(135deg,var(--blue),var(--cyan));color:#fff;border:none;border-radius:10px;padding:11px 24px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;display:flex;align-items:center;gap:8px;transition:transform .2s,box-shadow .2s;box-shadow:0 4px 16px rgba(37,99,235,0.3)}
        .btn-save:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(56,189,248,0.4)}
        .btn-save:disabled{opacity:.5;cursor:not-allowed;transform:none}
        .aviso-row{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;background:rgba(245,180,0,0.07);border:1px solid rgba(245,180,0,0.2);border-radius:10px;margin-top:4px}
        .aviso-text{font-size:12px;color:var(--muted);line-height:1.5}

        /* ── SELECTOR DE ARCHIVOS EN EL FORM ── */
        .archivos-upload-zone{display:flex;align-items:center;justify-content:center;gap:8px;border:1.5px dashed var(--border);border-radius:10px;padding:16px;cursor:pointer;font-size:13px;color:var(--muted);transition:all .18s;background:var(--surface2)}
        .archivos-upload-zone:hover{border-color:rgba(56,189,248,0.4);color:var(--cyan);background:rgba(56,189,248,0.06)}
        .archivos-hint{font-size:11px;color:var(--muted);margin-top:4px}
        .preview-grid{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
        .preview-item{position:relative;width:72px;height:72px;border-radius:9px;overflow:hidden;border:1px solid var(--border);background:var(--surface2)}
        .preview-media{width:100%;height:100%;object-fit:cover;display:block}
        .preview-icon{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:22px}
        .preview-remove{position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;background:rgba(0,0,0,0.7);color:#fff;border:none;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1}
        .preview-remove:hover{background:var(--red)}

        /* ── FILAS DE EJERCICIO + REPETICIONES ── */
        .ejercicios-list{display:flex;flex-direction:column;gap:8px}
        .ejercicio-row{display:grid;grid-template-columns:1fr 90px 32px;gap:8px;align-items:center}
        .ejercicio-reps{text-align:center}
        .ejercicio-quitar{background:var(--surface2);border:1px solid var(--border);border-radius:8px;width:32px;height:38px;display:flex;align-items:center;justify-content:center;color:var(--muted);cursor:pointer;font-size:13px;transition:all .15s}
        .ejercicio-quitar:hover:not(:disabled){color:var(--red);border-color:rgba(242,85,85,0.35)}
        .ejercicio-quitar:disabled{opacity:.35;cursor:not-allowed}
        .btn-agregar-ejercicio{margin-top:10px;background:none;border:1px dashed var(--border);border-radius:9px;padding:9px 14px;font-size:12.5px;font-weight:500;color:var(--cyan);cursor:pointer;font-family:'Inter',sans-serif;transition:all .15s;width:100%}
        .btn-agregar-ejercicio:hover{background:rgba(56,189,248,0.07);border-color:rgba(56,189,248,0.4)}

        /* ── CHIPS DE EJERCICIOS EN EL TIMELINE ── */
        .ejercicios-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}
        .ejercicio-chip{font-size:12px;color:var(--text);background:var(--surface2);border:1px solid var(--border);border-radius:100px;padding:5px 12px;display:inline-flex;align-items:center;gap:4px}
        .ejercicio-chip strong{color:var(--cyan);font-weight:700}

        .chatbot-bubble{position:fixed;bottom:28px;right:28px;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--blue),var(--cyan));display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;box-shadow:0 8px 24px rgba(37,99,235,0.4);transition:transform .2s;z-index:50;text-decoration:none}
        .chatbot-bubble:hover{transform:scale(1.08)}

        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }

        @media (max-width:900px){ .form-grid,.resumen-grid{grid-template-columns:1fr} }
      `}</style>

      <Sidebar
        rol="terapeuta"
        nombre="Terapeuta"
        subRol="Acceso Limitado"
        icono="📈"
        items={[
          {icon:'🏠', label:'Mi Panel',        href:'/terapeuta/dashboard',   active:false},
          {icon:'👥', label:'Mis Pacientes',   href:'/terapeuta/pacientes',   active:false},
          {icon:'📋', label:'Expedientes',      href:'/terapeuta/expedientes', active:false},
          {icon:'📅', label:'Mi Agenda',        href:'/terapeuta/agenda',      active:false},
          {icon:'📊', label:'Progreso',         href:'/terapeuta/progreso',    active:true},
        ]}
      />

      <div className="main">
        <div className="topbar">
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <MenuButton />
            <span className="topbar-title">
              <Link href="/terapeuta/progreso">Progreso</Link> / {paciente.nombre_completo}
            </span>
          </div>
          <div className="topbar-right">
            <div className="online-dot"><div className="dot"/>En línea</div>
            <TopbarActions userId={userId} rol="terapeuta" nombre={userNombre} />
          </div>
        </div>

        <div className="content">
          <button className="btn-back" onClick={() => history.back()}>← Volver</button>

          <div className="patient-banner">
            <div className="patient-banner-left">
              <div className="p-avatar-lg">{ini}</div>
              <div>
                <div className="p-name-lg">{paciente.nombre_completo}</div>
                <div className="p-meta-lg">
                  <span>{edad !== null ? `${edad} años` : 'Edad no registrada'}</span>
                  <span>CURP: {paciente.curp}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="page-header">
            <div>
              <div className="page-title">Historial de progreso</div>
              <div className="page-sub">{sesiones.length} sesión{sesiones.length !== 1 ? 'es' : ''} registrada{sesiones.length !== 1 ? 's' : ''}</div>
            </div>
            <button className="btn-nuevo" onClick={abrirModal} disabled={disponibles.length === 0}>
              + Registrar sesión
            </button>
          </div>

          {disponibles.length === 0 && (
            <div className="insert-only-note">
              ℹ️ No hay citas completadas pendientes de registrar. Marca una cita como "Completada" en tu Agenda para poder registrar su progreso aquí.
            </div>
          )}

          {sesiones.length > 0 && (
            <div className="resumen-grid">
              <div className="resumen-card">
                <div className="resumen-lbl">Promedio de dolor</div>
                <div className="resumen-val">{promedioDolor}/10</div>
                <div className="resumen-sub">a lo largo de {sesiones.length} sesiones</div>
              </div>
              <div className="resumen-card">
                <div className="resumen-lbl">Promedio de movilidad</div>
                <div className="resumen-val">{promedioMovilidad}/10</div>
                <div className="resumen-sub">a lo largo de {sesiones.length} sesiones</div>
              </div>
              <div className="resumen-card">
                <div className="resumen-lbl">Última sesión</div>
                <div className="resumen-val">{ultimaSesion ? formatFechaHora(ultimaSesion.fecha_registro).split(',')[0] : '—'}</div>
                {primeraSesion && ultimaSesion && primeraSesion.id_progreso_sesion !== ultimaSesion.id_progreso_sesion && (
                  <div className={`resumen-sub ${ultimaSesion.nivel_dolor < primeraSesion.nivel_dolor ? 'trend-up' : ultimaSesion.nivel_dolor > primeraSesion.nivel_dolor ? 'trend-down' : ''}`}>
                    {ultimaSesion.nivel_dolor < primeraSesion.nivel_dolor && '↓ Dolor ha disminuido'}
                    {ultimaSesion.nivel_dolor > primeraSesion.nivel_dolor && '↑ Dolor ha aumentado'}
                    {ultimaSesion.nivel_dolor === primeraSesion.nivel_dolor && 'Dolor sin cambios'}
                  </div>
                )}
              </div>
            </div>
          )}

          {sesiones.length === 0 ? (
            <div className="empty-card">
              <div className="empty-icon">📈</div>
              <div className="empty-title">Sin sesiones registradas</div>
              <div className="empty-sub">Registra el progreso de {paciente.nombre_completo.split(' ')[0]} después de cada sesión completada.</div>
              <button className="btn-nuevo" style={{margin:'0 auto'}} onClick={abrirModal} disabled={disponibles.length === 0}>
                + Registrar primera sesión
              </button>
            </div>
          ) : (
            <div className="timeline">
              {sesiones.map((s, i) => (
                <div className="timeline-item" key={s.id_progreso_sesion}>
                  <div className="timeline-dot" />
                  {i !== sesiones.length - 1 && <div className="timeline-line" />}
                  <div className="timeline-card">
                    <div className="timeline-header">
                      <div className="timeline-fecha">{formatFechaHora(s.fecha_registro)}</div>
                      <div className="timeline-badges">
                        <span className={`nivel-badge ${nivelClass(s.nivel_dolor)}`}>🩹 Dolor: {s.nivel_dolor}/10</span>
                        <span className={`nivel-badge ${nivelClass(s.movilidad, true)}`}>🦵 Movilidad: {s.movilidad}/10</span>
                      </div>
                    </div>
                    {s.ejercicios && s.ejercicios.length > 0 && (
                      <div className="timeline-field">
                        <div className="timeline-field-lbl">Ejercicios realizados</div>
                        <div className="ejercicios-chips">
                          {s.ejercicios.map((ej, idx) => (
                            <span className="ejercicio-chip" key={idx}>
                              {ej.ejercicio} <strong>×{ej.repeticiones}</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {s.observaciones && (
                      <div className="timeline-field">
                        <div className="timeline-field-lbl">Observaciones</div>
                        <div className="timeline-field-val">{s.observaciones}</div>
                      </div>
                    )}
                    {/* GALERÍA — fotos/videos tomados durante la sesión */}
                    {s.archivos && s.archivos.length > 0 && (
                      <div className="timeline-field">
                        <div className="timeline-field-lbl">Fotos / videos de la sesión</div>
                        <div className="timeline-galeria">
                          {s.archivos.map(a => (
                            <ArchivoThumb key={a.path} archivo={a} idSesion={s.id_progreso_sesion} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL — registrar nueva sesión (insert-only, incluye archivos) */}
      {modalAbierto && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) cerrarModal() }}>
          <div className="modal">
            <div className="modal-header">
              <div>
                <div className="modal-title">Registrar sesión de progreso</div>
                <div className="modal-sub">Este registro no podrá editarse después de guardado</div>
              </div>
              <button className="modal-close" onClick={cerrarModal}>✕</button>
            </div>

            <form ref={formRef} onSubmit={registrarSesion} noValidate>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group form-grid-full">
                    <label className="form-label">Sesión (cita completada) *</label>
                    <select name="cita_id" className={`form-select${errores.cita_id?' err':''}`} defaultValue="">
                      <option value="">— Selecciona la sesión —</option>
                      {disponibles.map(c => (
                        <option key={c.id_cita} value={c.id_cita}>
                          {formatFechaHora(c.fecha_hora)} ({c.duracion_min} min)
                        </option>
                      ))}
                    </select>
                    {errores.cita_id && <span className="err-msg">{errores.cita_id}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Nivel de dolor (0-10) *</label>
                    <input name="nivel_dolor" type="number" min={0} max={10}
                      className={`form-input${errores.nivel_dolor?' err':''}`}
                      placeholder="0 = sin dolor, 10 = máximo" />
                    <span className="range-hint">0 = sin dolor · 10 = dolor máximo</span>
                    {errores.nivel_dolor && <span className="err-msg">{errores.nivel_dolor}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Movilidad (0-10) *</label>
                    <input name="movilidad" type="number" min={0} max={10}
                      className={`form-input${errores.movilidad?' err':''}`}
                      placeholder="0 = nula, 10 = completa" />
                    <span className="range-hint">0 = nula · 10 = movilidad completa</span>
                    {errores.movilidad && <span className="err-msg">{errores.movilidad}</span>}
                  </div>

                  <div className="form-group form-grid-full">
                    <label className="form-label">Ejercicios realizados</label>
                    <div className="ejercicios-list">
                      {filasEjercicios.map((fila, i) => (
                        <div className="ejercicio-row" key={i}>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Ej. Sentadillas"
                            value={fila.ejercicio}
                            onChange={e => actualizarFilaEjercicio(i, 'ejercicio', e.target.value)}
                          />
                          <input
                            type="number"
                            min={0}
                            className="form-input ejercicio-reps"
                            placeholder="Reps"
                            value={fila.repeticiones === 0 ? '' : fila.repeticiones}
                            onChange={e => actualizarFilaEjercicio(i, 'repeticiones', e.target.value)}
                          />
                          <button
                            type="button"
                            className="ejercicio-quitar"
                            onClick={() => quitarFilaEjercicio(i)}
                            disabled={filasEjercicios.length === 1}
                            title="Quitar este ejercicio"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                    <button type="button" className="btn-agregar-ejercicio" onClick={agregarFilaEjercicio}>
                      + Agregar ejercicio
                    </button>
                    {errores.ejercicios && <span className="err-msg">{errores.ejercicios}</span>}
                  </div>

                  <div className="form-group form-grid-full">
                    <label className="form-label">Observaciones</label>
                    <textarea name="observaciones" rows={3} className="form-textarea"
                      placeholder="Notas clínicas sobre cómo respondió el paciente en esta sesión..." />
                  </div>

                  {/* ── NUEVO: Fotos o videos de la sesión ── */}
                  <div className="form-group form-grid-full">
                    <label className="form-label">Fotos o videos de la sesión (opcional)</label>
                    <label className="archivos-upload-zone">
                      <input
                        ref={fileInputRef}
                        type="file"
                        name="archivos_input"
                        accept="image/jpeg,image/png,video/mp4,video/quicktime,video/webm"
                        multiple
                        onChange={handleSeleccionArchivos}
                        style={{ display: 'none' }}
                      />
                      <span>📷</span>
                      <span>Haz clic para agregar fotos o videos</span>
                    </label>
                    <span className="archivos-hint">JPG, PNG, MP4, MOV o WEBM · máx. 50 MB cada uno · hasta {MAX_ARCHIVOS} archivos</span>
                    {errores.archivos && <span className="err-msg">{errores.archivos}</span>}

                    {archivosSeleccionados.length > 0 && (
                      <div className="preview-grid">
                        {archivosSeleccionados.map((file, i) => {
                          const url = URL.createObjectURL(file)
                          return (
                            <div className="preview-item" key={i}>
                              {file.type.startsWith('video/') ? (
                                <video src={url} className="preview-media" muted />
                              ) : (
                                <img src={url} className="preview-media" alt={file.name} />
                              )}
                              <button type="button" className="preview-remove" onClick={() => quitarArchivoSeleccionado(i)}>✕</button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="form-group form-grid-full">
                    <div className="aviso-row">
                      <span style={{fontSize:14}}>⚠️</span>
                      <span className="aviso-text">
                        Este registro (incluyendo las fotos o videos adjuntos) quedará fijo como parte del
                        historial clínico del paciente. No podrás editarlo ni eliminarlo después de guardarlo.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={cerrarModal}>Cancelar</button>
                <button type="submit" className="btn-save" disabled={loading}>
                  {loading && <div style={{width:14,height:14,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',animation:'spin .7s linear infinite'}}/>}
                  Guardar registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <a href="#" className="chatbot-bubble" title="Asistente RC">💬</a>
    </>
  )
}