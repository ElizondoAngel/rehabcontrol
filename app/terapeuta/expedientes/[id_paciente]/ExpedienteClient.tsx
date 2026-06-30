'use client'

/**
 * ExpedienteClient.tsx
 * ─────────────────────────────────────────────────────────────
 * F3 — Expediente clínico (Terapeuta)
 *
 * 1 expediente por paciente. Si no existe, el formulario está
 * vacío y al guardar se hace POST (crear). Si ya existe, llega
 * precargado con sus datos y al guardar se hace PUT (editar).
 *
 * Sección de ARCHIVOS CLÍNICOS (radiografías, recetas, estudios):
 *   • Solo disponible una vez que el expediente ya existe
 *     (necesita id_expediente para asociar el archivo)
 *   • Sube directo a Supabase Storage vía /api/expedientes-archivos
 *   • Se muestra al final del formulario de edición, y también
 *     en la vista de lectura como su propia tarjeta
 *
 * Capas de seguridad:
 *   1. Validación en cliente (campos obligatorios antes de enviar)
 *   2. Validación en servidor con Zod (en /api/expedientes)
 *   3. RLS en Supabase + verificación de terapeuta_id en la API
 *   4. Archivos: tipo y tamaño validados en cliente Y servidor
 */

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// ── TIPOS ────────────────────────────────────────────────────
interface Paciente {
  id_paciente: number
  nombre_completo: string
  curp: string
  fecha_nacimiento: string
  telefono?: string
  activo: boolean
  terapeuta_id: string
}
interface ArchivoClinico {
  path: string
  nombre: string
  tipo: string
  tamano: number
  subido_en: string
  url?: string | null
}
interface Expediente {
  id_expediente: number
  paciente_id: number
  terapeuta_id: string
  diagnostico: string
  antecedentes?: string
  plan_tratamiento?: string
  fecha_apertura: string
  updated_at?: string
  motivo_consulta: string
  fecha_inicio_problema?: string
  nivel_dolor_inicial?: number
  limitaciones_fisicas?: string
  diagnostico_funcional?: string
  rango_movimiento?: string
  fuerza_muscular?: string
  postura_movilidad?: string
  observaciones_clinicas?: string
  objetivos_terapeuticos?: string
  tipo_terapias?: string
  frecuencia_sesiones?: string
  indicaciones?: string
  estado: 'activo' | 'cerrado' | 'en_revision'
  archivos?: ArchivoClinico[]
}
interface Props {
  paciente: Paciente
  expedienteInicial: Expediente | null
  terapeutaId: string
  userNombre: string
}

// ── VALIDACIÓN CLIENTE (primera capa) ─────────────────────────
function validarCampos(f: Record<string, string>) {
  const errs: Record<string, string> = {}
  if (!f.diagnostico?.trim())      errs.diagnostico = 'El diagnóstico es obligatorio'
  if (!f.motivo_consulta?.trim())  errs.motivo_consulta = 'El motivo de consulta es obligatorio'
  if (f.nivel_dolor_inicial) {
    const n = Number(f.nivel_dolor_inicial)
    if (Number.isNaN(n) || n < 0 || n > 10) errs.nivel_dolor_inicial = 'Debe ser un número entre 0 y 10'
  }
  return errs
}

const TIPOS_ACEPTADOS = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
const TAMANO_MAX = 10 * 1024 * 1024

function validarArchivo(file: File): string | null {
  if (!TIPOS_ACEPTADOS.includes(file.type)) return 'Solo se aceptan PDF, JPG o PNG'
  if (file.size > TAMANO_MAX) return 'El archivo no debe superar 10 MB'
  return null
}

function formatTamano(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function iconoArchivo(tipo: string) {
  if (tipo === 'application/pdf') return '📄'
  return '🖼️'
}

// ── COMPONENTE TOAST ─────────────────────────────────────────
function Toast({ msg, type, onClose }: { msg: string; type: 'success'|'error'; onClose: ()=>void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div style={{
      position:'fixed', bottom:90, right:28, zIndex:200,
      background: type==='success' ? 'rgba(52,211,153,0.10)' : 'rgba(242,85,85,0.10)',
      border: `1px solid ${type==='success' ? 'rgba(52,211,153,0.35)' : 'rgba(242,85,85,0.35)'}`,
      borderLeft: `3px solid ${type==='success' ? '#34D399' : '#F25555'}`,
      borderRadius:12, padding:'14px 18px', minWidth:280, maxWidth:360,
      display:'flex', alignItems:'center', gap:12,
      backdropFilter:'blur(16px)',
      boxShadow:'0 8px 32px rgba(0,0,0,0.5)',
      animation:'slideUp .3s ease',
    }}>
      <span style={{fontSize:18}}>{type==='success'?'✅':'❌'}</span>
      <span style={{fontSize:14, color:'#E7EDF7', flex:1}}>{msg}</span>
      <button onClick={onClose} style={{background:'none',border:'none',color:'rgba(231,237,247,0.4)',cursor:'pointer',fontSize:16}}>✕</button>
    </div>
  )
}

const ESTADOS = [
  { value: 'activo',      label: 'Activo' },
  { value: 'en_revision', label: 'En revisión' },
  { value: 'cerrado',     label: 'Cerrado' },
] as const

function calcularEdad(fechaNacimiento?: string) {
  if (!fechaNacimiento) return null
  const hoy = new Date()
  const nacimiento = new Date(fechaNacimiento)
  let edad = hoy.getFullYear() - nacimiento.getFullYear()
  const mesDiff = hoy.getMonth() - nacimiento.getMonth()
  if (mesDiff < 0 || (mesDiff === 0 && hoy.getDate() < nacimiento.getDate())) edad--
  return edad
}

// ── SECCIÓN DE ARCHIVOS CLÍNICOS — reutilizada en lectura y formulario ──
function SeccionArchivos({
  expediente,
  archivos,
  setArchivos,
  setToast,
}: {
  expediente: Expediente
  archivos: ArchivoClinico[]
  setArchivos: (a: ArchivoClinico[]) => void
  setToast: (t: {msg:string; type:'success'|'error'}|null) => void
}) {
  const [subiendo, setSubiendo] = useState(false)
  const [eliminando, setEliminando] = useState<string | null>(null)
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSeleccion(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setErrorArchivo(null)

    const errLocal = validarArchivo(file)
    if (errLocal) { setErrorArchivo(errLocal); if (inputRef.current) inputRef.current.value = ''; return }

    setSubiendo(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('id_expediente', String(expediente.id_expediente))
    fd.append('paciente_id', String(expediente.paciente_id))

    const res = await fetch('/api/expedientes-archivos', { method: 'POST', body: fd })
    const data = await res.json()
    setSubiendo(false)
    if (inputRef.current) inputRef.current.value = ''

    if (!res.ok) {
      setErrorArchivo(data.error ?? 'Error al subir el archivo')
      return
    }
    setArchivos(data.archivos)
    setToast({ msg: 'Archivo subido correctamente', type: 'success' })
  }

  async function handleVer(archivo: ArchivoClinico) {
    if (archivo.url) { window.open(archivo.url, '_blank'); return }
    const res = await fetch('/api/expedientes-archivos-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_expediente: expediente.id_expediente, path: archivo.path }),
    })
    const data = await res.json()
    if (res.ok && data.url) window.open(data.url, '_blank')
    else setToast({ msg: 'No se pudo abrir el archivo', type: 'error' })
  }

  async function handleEliminar(archivo: ArchivoClinico) {
    setEliminando(archivo.path)
    const res = await fetch('/api/expedientes-archivos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_expediente: expediente.id_expediente, path: archivo.path }),
    })
    const data = await res.json()
    setEliminando(null)
    if (!res.ok) { setToast({ msg: data.error ?? 'Error al eliminar', type: 'error' }); return }
    setArchivos(data.archivos)
    setToast({ msg: 'Archivo eliminado', type: 'success' })
  }

  return (
    <div className="info-card full archivos-card">
      <div className="info-card-title"><span className="dot dot-cyan"/>📎 Estudios y documentos clínicos</div>
      <div className="archivos-sub">Radiografías, recetas o estudios que ayuden a entender la situación del paciente — PDF, JPG o PNG, máx. 10 MB</div>

      <label className="upload-zone">
        <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleSeleccion} disabled={subiendo} style={{display:'none'}} />
        {subiendo ? (
          <span className="upload-spinner" />
        ) : (
          <>
            <span style={{fontSize:18}}>📤</span>
            <span>Haz clic para subir un archivo</span>
          </>
        )}
      </label>
      {errorArchivo && <span className="err-msg" style={{marginTop:6, display:'block'}}>{errorArchivo}</span>}

      {archivos.length > 0 && (
        <div className="archivos-list">
          {archivos.map(a => (
            <div className="archivo-row" key={a.path}>
              <span className="archivo-icon">{iconoArchivo(a.tipo)}</span>
              <div className="archivo-info">
                <div className="archivo-nombre">{a.nombre}</div>
                <div className="archivo-meta">{formatTamano(a.tamano)} · {new Date(a.subido_en).toLocaleDateString('es-MX', { day:'numeric', month:'short', year:'numeric' })}</div>
              </div>
              <button type="button" className="archivo-btn" onClick={() => handleVer(a)}>Ver</button>
              <button
                type="button"
                className="archivo-btn danger"
                disabled={eliminando === a.path}
                onClick={() => handleEliminar(a)}
              >
                {eliminando === a.path ? '...' : 'Eliminar'}
              </button>
            </div>
          ))}
        </div>
      )}
      {archivos.length === 0 && !subiendo && (
        <div className="archivos-empty">Sin documentos adjuntos todavía</div>
      )}
    </div>
  )
}

// ── COMPONENTE PRINCIPAL ─────────────────────────────────────
export default function ExpedienteClient({ paciente, expedienteInicial, terapeutaId, userNombre }: Props) {
  const router = useRouter()
  const [expediente, setExpediente] = useState<Expediente | null>(expedienteInicial)
  const [editando, setEditando] = useState(!expedienteInicial)
  const [loading, setLoading] = useState(false)
  const [errores, setErrores] = useState<Record<string,string>>({})
  const [toast, setToast] = useState<{msg:string;type:'success'|'error'}|null>(null)
  const [archivos, setArchivos] = useState<ArchivoClinico[]>(expedienteInicial?.archivos ?? [])
  const [descargandoPdf, setDescargandoPdf] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const esNuevo = !expediente

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const campos: Record<string, string> = {}
    fd.forEach((value, key) => { campos[key] = value as string })

    const errs = validarCampos(campos)
    if (Object.keys(errs).length > 0) { setErrores(errs); return }
    setErrores({})
    setLoading(true)

    const payload = {
      paciente_id: paciente.id_paciente,
      diagnostico: campos.diagnostico,
      antecedentes: campos.antecedentes || null,
      plan_tratamiento: campos.plan_tratamiento || null,
      motivo_consulta: campos.motivo_consulta,
      fecha_inicio_problema: campos.fecha_inicio_problema || null,
      nivel_dolor_inicial: campos.nivel_dolor_inicial ? Number(campos.nivel_dolor_inicial) : null,
      limitaciones_fisicas: campos.limitaciones_fisicas || null,
      diagnostico_funcional: campos.diagnostico_funcional || null,
      rango_movimiento: campos.rango_movimiento || null,
      fuerza_muscular: campos.fuerza_muscular || null,
      postura_movilidad: campos.postura_movilidad || null,
      observaciones_clinicas: campos.observaciones_clinicas || null,
      objetivos_terapeuticos: campos.objetivos_terapeuticos || null,
      tipo_terapias: campos.tipo_terapias || null,
      frecuencia_sesiones: campos.frecuencia_sesiones || null,
      indicaciones: campos.indicaciones || null,
      estado: campos.estado || 'activo',
    }

    const res = await fetch('/api/expedientes', {
      method: esNuevo ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(esNuevo ? payload : { ...payload, id_expediente: expediente!.id_expediente }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setToast({ msg: data.error ?? 'Error al guardar el expediente', type: 'error' })
      return
    }

    setExpediente(data.expediente)
    setArchivos(data.expediente.archivos ?? [])
    setEditando(false)
    setToast({ msg: esNuevo ? 'Expediente creado correctamente' : 'Expediente actualizado correctamente', type: 'success' })
  }

  const ini = paciente.nombre_completo.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()
  const edad = calcularEdad(paciente.fecha_nacimiento)

  async function descargarPdf() {
    setDescargandoPdf(true)
    try {
      const res = await fetch(`/api/expedientes/pdf?id_paciente=${paciente.id_paciente}`)
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setToast({ msg: data?.error ?? 'No se pudo generar el PDF', type: 'error' })
        return
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `expediente_${paciente.nombre_completo.replace(/\s+/g, '_')}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      setToast({ msg: 'Error de conexión al generar el PDF', type: 'error' })
    } finally {
      setDescargandoPdf(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --bg:#060B14;--sidebar:#0A1220;--card:#0F1B2E;--card-border:rgba(255,255,255,0.08);
          --border:rgba(255,255,255,0.08);--surface2:rgba(255,255,255,0.05);
          --mid:#2563EB;--light:#38BDF8;--text:#E7EDF7;--muted:rgba(140,155,181,0.85);
          --red:#F25555;--amber:#F5B400;--green:#34D399;
        }
        body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex}

        .sidebar{width:248px;min-height:100vh;background:var(--sidebar);border-right:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0}
        .sb-brand{padding:22px 20px 16px;border-bottom:1px solid var(--border)}
        .sb-logo-row{display:flex;align-items:center;gap:10px}
        .sb-logo{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,var(--mid),var(--light));display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:700;color:#fff}
        .sb-name{font-size:13.5px;font-weight:600;color:var(--text)}
        .sb-ver{font-size:10px;color:var(--muted)}
        .sb-role{margin:14px 14px 6px;padding:11px 13px;display:flex;align-items:center;gap:10px}
        .sb-role-icon{width:28px;height:28px;border-radius:7px;background:rgba(56,189,248,0.12);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0}
        .sb-role-name{font-size:12.5px;font-weight:600;color:var(--text)}
        .sb-role-sub{font-size:10.5px;color:var(--light)}
        .sb-nav{flex:1;padding:6px 12px;margin-top:6px}
        .sb-nav a{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:9px;font-size:13.5px;color:var(--muted);text-decoration:none;transition:all .15s;margin-bottom:1px;font-weight:500}
        .sb-nav a:hover{background:rgba(255,255,255,0.04);color:var(--text)}
        .sb-nav a.active{background:rgba(37,99,235,0.14);color:var(--light)}
        .sb-nav-icon{font-size:15px;width:18px;text-align:center}
        .sb-bottom{padding:12px 12px;border-top:1px solid var(--border)}
        .sb-bottom a{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:9px;font-size:13.5px;color:var(--muted);text-decoration:none;transition:all .15s}
        .sb-bottom a:hover{color:var(--red)}

        .main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
        .topbar{height:52px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 32px;flex-shrink:0}
        .topbar-title{font-size:13px;color:var(--muted);font-weight:500;display:flex;align-items:center;gap:8px}
        .topbar-title a{color:var(--muted);text-decoration:none}
        .topbar-title a:hover{color:var(--light)}
        .topbar-right{display:flex;align-items:center;gap:16px}
        .online-dot{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--light)}
        .dot{width:6px;height:6px;border-radius:50%;background:var(--light)}
        .notif{width:30px;height:30px;border-radius:8px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px}
        .content{flex:1;overflow-y:auto;padding:36px 40px}

        .btn-back{background:none;border:none;color:var(--muted);cursor:pointer;font-family:inherit;font-size:13px;font-weight:500;display:flex;align-items:center;gap:6px;margin-bottom:20px;padding:0;transition:color .15s}
        .btn-back:hover{color:var(--light)}

        .patient-banner{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:28px;flex-wrap:wrap;padding-bottom:20px;border-bottom:1px solid var(--border)}
        .patient-banner-left{display:flex;align-items:center;gap:14px}
        .p-avatar-lg{width:48px;height:48px;border-radius:50%;background:rgba(37,99,235,0.2);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:var(--light);flex-shrink:0}
        .p-name-lg{font-size:19px;font-weight:700;color:var(--text);letter-spacing:-0.01em}
        .p-meta-lg{font-size:12.5px;color:var(--muted);margin-top:3px;display:flex;gap:12px;flex-wrap:wrap}
        .estado-pill{font-size:11.5px;font-weight:600;padding:5px 13px;border-radius:100px;white-space:nowrap}
        .pill-activo{background:rgba(52,211,153,0.14);color:var(--green)}
        .pill-cerrado{background:rgba(255,255,255,0.07);color:var(--muted)}
        .pill-en_revision{background:rgba(245,180,0,0.14);color:var(--amber)}

        .page-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px}
        .page-title{font-size:22px;font-weight:700;color:var(--text);letter-spacing:-0.015em}
        .page-sub{font-size:13px;color:var(--muted);margin-top:5px}
        .btn-edit{background:linear-gradient(135deg,var(--mid),var(--light));color:#fff;border:none;border-radius:11px;padding:11px 20px;font-size:13.5px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:7px;transition:transform .2s,box-shadow .2s;box-shadow:0 4px 16px rgba(37,99,235,0.3)}
        .btn-edit:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(56,189,248,0.38)}
        .header-actions{display:flex;gap:10px;flex-wrap:wrap}
        .btn-pdf{background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:11px;padding:11px 20px;font-size:13.5px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:7px;transition:all .18s}
        .btn-pdf:hover:not(:disabled){border-color:rgba(56,189,248,0.4);color:var(--light);background:rgba(56,189,248,0.06)}
        .btn-pdf:disabled{opacity:.5;cursor:not-allowed}

        .featured-card{background:var(--card);border:1px solid var(--card-border);border-radius:18px;padding:24px 26px;margin-bottom:16px;position:relative;overflow:hidden}
        .featured-card::before{content:'';position:absolute;top:0;left:0;width:3px;height:100%;background:linear-gradient(180deg,var(--mid),var(--light))}
        .featured-grid{display:grid;grid-template-columns:1fr 1fr;gap:22px}
        .featured-label{font-size:11px;font-weight:700;color:var(--light);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;display:flex;align-items:center;gap:6px}
        .featured-text{font-size:14.5px;color:var(--text);line-height:1.6}
        .featured-text.empty{color:var(--muted);font-style:italic}

        .section-row{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-bottom:14px}
        .info-card{background:var(--card);border:1px solid var(--card-border);border-radius:16px;padding:20px 22px}
        .info-card.full{grid-column:1/-1}
        .info-card-title{font-size:12.5px;font-weight:600;color:var(--text);margin-bottom:14px;display:flex;align-items:center;gap:8px}
        .info-card-title .dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
        .dot-amber{background:var(--amber)}
        .dot-cyan{background:var(--light)}
        .dot-green{background:var(--green)}
        .info-card-body{font-size:13.5px;color:var(--text);line-height:1.65;white-space:pre-wrap}
        .info-card-body.empty{color:var(--muted);font-style:italic;font-size:13px}

        .stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
        .stat-box{background:var(--surface2);border-radius:10px;padding:12px 14px}
        .stat-box-label{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px}
        .stat-box-val{font-size:14px;font-weight:600;color:var(--text)}
        .dolor-badge{display:inline-flex;align-items:center;gap:5px;font-size:13px;font-weight:700;padding:2px 10px;border-radius:100px;background:rgba(242,85,85,0.14);color:var(--red)}

        /* ── SECCIÓN ARCHIVOS ── */
        .archivos-card{margin-top:0}
        .archivos-sub{font-size:12.5px;color:var(--muted);margin-bottom:16px;margin-top:-8px}
        .upload-zone{display:flex;align-items:center;justify-content:center;gap:10px;border:1.5px dashed var(--border);border-radius:12px;padding:20px;cursor:pointer;font-size:13.5px;color:var(--muted);transition:all .18s;background:var(--surface2)}
        .upload-zone:hover{border-color:rgba(56,189,248,0.4);color:var(--light);background:rgba(56,189,248,0.06)}
        .upload-spinner{width:18px;height:18px;border-radius:50%;border:2px solid rgba(56,189,248,0.25);border-top-color:var(--light);animation:spin .7s linear infinite}
        .archivos-list{display:flex;flex-direction:column;gap:8px;margin-top:14px}
        .archivo-row{display:flex;align-items:center;gap:12px;background:var(--surface2);border-radius:10px;padding:10px 14px}
        .archivo-icon{font-size:20px;flex-shrink:0}
        .archivo-info{flex:1;min-width:0}
        .archivo-nombre{font-size:13px;font-weight:500;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .archivo-meta{font-size:11px;color:var(--muted);margin-top:2px}
        .archivo-btn{background:none;border:1px solid var(--border);border-radius:7px;padding:6px 12px;font-size:12px;font-weight:500;color:var(--muted);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s;white-space:nowrap}
        .archivo-btn:hover{color:var(--light);border-color:rgba(56,189,248,0.35)}
        .archivo-btn.danger:hover{color:var(--red);border-color:rgba(242,85,85,0.35)}
        .archivo-btn:disabled{opacity:.5;cursor:not-allowed}
        .archivos-empty{font-size:12.5px;color:var(--muted);font-style:italic;margin-top:12px;text-align:center}

        /* FORM */
        .form-card{background:var(--card);border:1px solid var(--card-border);border-radius:18px;padding:26px 28px}
        .form-section{margin-bottom:28px}
        .form-section:last-child{margin-bottom:0}
        .form-section-title{font-size:12.5px;font-weight:700;color:var(--light);text-transform:uppercase;letter-spacing:.05em;margin-bottom:16px;display:flex;align-items:center;gap:8px;padding-bottom:10px;border-bottom:1px solid var(--border)}
        .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .form-grid-full{grid-column:1/-1}
        .form-group{display:flex;flex-direction:column;gap:7px}
        .form-label{font-size:11px;font-weight:600;color:var(--muted);letter-spacing:.04em;text-transform:uppercase}
        .form-input,.form-select,.form-textarea{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:11px 13px;font-size:14px;font-family:'DM Sans',sans-serif;color:var(--text);outline:none;transition:border-color .2s,box-shadow .2s;width:100%;resize:vertical}
        .form-input:focus,.form-select:focus,.form-textarea:focus{border-color:var(--light);box-shadow:0 0 0 3px rgba(56,189,248,0.1)}
        .form-input::placeholder,.form-textarea::placeholder{color:rgba(231,237,247,0.22)}
        .form-select option{background:#0A1220;color:var(--text)}
        .form-input.err,.form-textarea.err{border-color:rgba(242,85,85,0.5)}
        .err-msg{font-size:11px;color:var(--red)}
        .form-footer{display:flex;gap:10px;justify-content:flex-end;margin-top:28px;padding-top:22px;border-top:1px solid var(--border)}
        .btn-cancel{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:11px 20px;font-size:13.5px;font-weight:500;color:var(--muted);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .18s}
        .btn-cancel:hover{color:var(--text)}
        .btn-save{background:linear-gradient(135deg,var(--mid),var(--light));color:#fff;border:none;border-radius:10px;padding:11px 24px;font-size:13.5px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:8px;transition:transform .2s,box-shadow .2s;box-shadow:0 4px 14px rgba(37,99,235,0.28)}
        .btn-save:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 18px rgba(56,189,248,0.38)}
        .btn-save:disabled{opacity:.5;cursor:not-allowed;transform:none}

        .pendiente-card{background:rgba(245,180,0,0.06);border:1px dashed rgba(245,180,0,0.3);border-radius:14px;padding:18px 20px;font-size:12.5px;color:var(--muted);text-align:center;margin-top:8px}

        .empty-card{background:var(--card);border:1px dashed var(--card-border);border-radius:18px;padding:52px 24px;text-align:center}
        .empty-icon{font-size:34px;margin-bottom:14px}
        .empty-title{font-size:15px;font-weight:600;color:var(--text);margin-bottom:6px}
        .empty-sub{font-size:13px;color:var(--muted);margin-bottom:22px}

        .chatbot-bubble{position:fixed;bottom:28px;right:28px;width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,var(--mid),var(--light));display:flex;align-items:center;justify-content:center;font-size:20px;cursor:pointer;box-shadow:0 4px 16px rgba(37,99,235,0.35);transition:transform .2s;z-index:50;text-decoration:none}
        .chatbot-bubble:hover{transform:scale(1.08)}

        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }

        @media (max-width:900px){ .form-grid,.featured-grid,.section-row,.stat-grid{grid-template-columns:1fr} }
      `}</style>

      <div className="sidebar">
        <div className="sb-brand">
          <div className="sb-logo-row">
            <div className="sb-logo">RC</div>
            <div><div className="sb-name">RehabControl</div><div className="sb-ver">v2.1</div></div>
          </div>
        </div>
        <div className="sb-role">
          <div className="sb-role-icon">📈</div>
          <div><div className="sb-role-name">Terapeuta</div><div className="sb-role-sub">Acceso limitado</div></div>
        </div>
        <nav className="sb-nav">
          {[
            {icon:'🏠', label:'Mi Panel',        href:'/terapeuta/dashboard',   active:false},
            {icon:'👥', label:'Mis Pacientes',   href:'/terapeuta/pacientes',   active:false},
            {icon:'📋', label:'Expedientes',      href:'/terapeuta/expedientes', active:true},
            {icon:'📅', label:'Mi Agenda',        href:'/terapeuta/agenda',      active:false},
            {icon:'📊', label:'Progreso',         href:'/terapeuta/progreso',    active:false},
          ].map(n => (
            <Link key={n.label} href={n.href} className={n.active?'active':''}>
              <span className="sb-nav-icon">{n.icon}</span>{n.label}
            </Link>
          ))}
        </nav>
        <div className="sb-bottom">
          <Link href="/login"><span className="sb-nav-icon">→</span> Cerrar sesión</Link>
        </div>
      </div>

      <div className="main">
        <div className="topbar">
          <span className="topbar-title">
            <Link href="/terapeuta/pacientes">Mis Pacientes</Link> / {paciente.nombre_completo}
          </span>
          <div className="topbar-right">
            <div className="online-dot"><div className="dot"/>En línea</div>
            <div className="notif">🔔</div>
          </div>
        </div>

        <div className="content">
          <button className="btn-back" onClick={() => router.back()}>← Volver</button>

          <div className="patient-banner">
            <div className="patient-banner-left">
              <div className="p-avatar-lg">{ini}</div>
              <div>
                <div className="p-name-lg">{paciente.nombre_completo}</div>
                <div className="p-meta-lg">
                  <span>{edad !== null ? `${edad} años` : 'Edad no registrada'}</span>
                  <span>CURP: {paciente.curp}</span>
                  <span>{paciente.telefono ?? 'Sin teléfono'}</span>
                </div>
              </div>
            </div>
            {expediente && (
              <span className={`estado-pill pill-${expediente.estado}`}>
                {ESTADOS.find(e => e.value === expediente.estado)?.label ?? expediente.estado}
              </span>
            )}
          </div>

          <div className="page-header">
            <div>
              <div className="page-title">Expediente clínico</div>
              <div className="page-sub">
                {expediente
                  ? `Última actualización: ${new Date(expediente.updated_at ?? expediente.fecha_apertura).toLocaleDateString('es-MX', { day:'numeric', month:'long', year:'numeric' })}`
                  : 'Este paciente aún no tiene un expediente clínico'}
              </div>
            </div>
            {expediente && (
              <div className="header-actions">
                <button className="btn-pdf" onClick={descargarPdf} disabled={descargandoPdf}>
                  {descargandoPdf
                    ? <div style={{width:14,height:14,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.25)',borderTopColor:'var(--light)',animation:'spin .7s linear infinite'}}/>
                    : '📄'}
                  Obtener expediente
                </button>
                {!editando && (
                  <button className="btn-edit" onClick={() => setEditando(true)}>✏️ Editar expediente</button>
                )}
              </div>
            )}
          </div>

          {!expediente && !editando && (
            <div className="empty-card">
              <div className="empty-icon">📋</div>
              <div className="empty-title">Sin expediente clínico</div>
              <div className="empty-sub">Crea el expediente para comenzar el seguimiento de {paciente.nombre_completo.split(' ')[0]}.</div>
              <button className="btn-edit" style={{margin:'0 auto'}} onClick={() => setEditando(true)}>+ Crear expediente</button>
            </div>
          )}

          {/* ═══ VISTA LECTURA — jerarquía clara ═══ */}
          {expediente && !editando && (
            <>
              <div className="featured-card">
                <div className="featured-grid">
                  <div>
                    <div className="featured-label">🩺 Motivo de consulta</div>
                    <div className="featured-text">{expediente.motivo_consulta}</div>
                  </div>
                  <div>
                    <div className="featured-label">📌 Diagnóstico</div>
                    <div className="featured-text">{expediente.diagnostico}</div>
                  </div>
                </div>
              </div>

              <div className="info-card full" style={{marginBottom:14}}>
                <div className="info-card-title"><span className="dot dot-amber"/>Evaluación física inicial</div>
                <div className="stat-grid" style={{marginBottom: (expediente.rango_movimiento || expediente.fuerza_muscular || expediente.postura_movilidad || expediente.limitaciones_fisicas) ? 14 : 0}}>
                  <div className="stat-box">
                    <div className="stat-box-label">Inicio del problema</div>
                    <div className="stat-box-val">
                      {expediente.fecha_inicio_problema ? new Date(expediente.fecha_inicio_problema).toLocaleDateString('es-MX') : '—'}
                    </div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-box-label">Dolor inicial</div>
                    <div className="stat-box-val">
                      {expediente.nivel_dolor_inicial != null ? <span className="dolor-badge">{expediente.nivel_dolor_inicial}/10</span> : '—'}
                    </div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-box-label">Diagnóstico funcional</div>
                    <div className="stat-box-val" style={{fontSize:12.5}}>{expediente.diagnostico_funcional || '—'}</div>
                  </div>
                </div>
                {(expediente.rango_movimiento || expediente.fuerza_muscular || expediente.postura_movilidad || expediente.limitaciones_fisicas) && (
                  <div className="section-row" style={{gridTemplateColumns:'repeat(2,1fr)', marginBottom:0}}>
                    {expediente.rango_movimiento && <div><div className="stat-box-label" style={{marginBottom:3}}>Rango de movimiento</div><div className="info-card-body" style={{fontSize:13}}>{expediente.rango_movimiento}</div></div>}
                    {expediente.fuerza_muscular && <div><div className="stat-box-label" style={{marginBottom:3}}>Fuerza muscular</div><div className="info-card-body" style={{fontSize:13}}>{expediente.fuerza_muscular}</div></div>}
                    {expediente.postura_movilidad && <div><div className="stat-box-label" style={{marginBottom:3}}>Postura y movilidad</div><div className="info-card-body" style={{fontSize:13}}>{expediente.postura_movilidad}</div></div>}
                    {expediente.limitaciones_fisicas && <div><div className="stat-box-label" style={{marginBottom:3}}>Limitaciones físicas</div><div className="info-card-body" style={{fontSize:13}}>{expediente.limitaciones_fisicas}</div></div>}
                  </div>
                )}
              </div>

              <div className="section-row">
                <div className="info-card">
                  <div className="info-card-title"><span className="dot dot-cyan"/>Objetivos terapéuticos</div>
                  <div className={`info-card-body${!expediente.objetivos_terapeuticos ? ' empty' : ''}`}>
                    {expediente.objetivos_terapeuticos || 'Sin objetivos registrados'}
                  </div>
                </div>
                <div className="info-card">
                  <div className="info-card-title"><span className="dot dot-cyan"/>Plan de tratamiento</div>
                  <div className={`info-card-body${!expediente.plan_tratamiento ? ' empty' : ''}`}>
                    {expediente.plan_tratamiento || 'Sin plan registrado'}
                  </div>
                </div>
              </div>

              <div className="info-card full" style={{marginBottom:14}}>
                <div className="info-card-title"><span className="dot dot-cyan"/>Plan de sesiones</div>
                <div className="stat-grid">
                  <div className="stat-box">
                    <div className="stat-box-label">Tipo de terapias</div>
                    <div className="stat-box-val" style={{fontSize:13}}>{expediente.tipo_terapias || '—'}</div>
                  </div>
                  <div className="stat-box" style={{gridColumn: expediente.indicaciones ? 'auto' : 'span 2'}}>
                    <div className="stat-box-label">Frecuencia</div>
                    <div className="stat-box-val" style={{fontSize:13}}>{expediente.frecuencia_sesiones || '—'}</div>
                  </div>
                  {expediente.indicaciones && (
                    <div className="stat-box">
                      <div className="stat-box-label">Indicaciones</div>
                      <div className="stat-box-val" style={{fontSize:12.5, fontWeight:400}}>{expediente.indicaciones}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="section-row" style={{marginBottom:14}}>
                <div className="info-card">
                  <div className="info-card-title"><span className="dot dot-green"/>Antecedentes</div>
                  <div className={`info-card-body${!expediente.antecedentes ? ' empty' : ''}`}>
                    {expediente.antecedentes || 'Sin antecedentes registrados'}
                  </div>
                </div>
                <div className="info-card">
                  <div className="info-card-title"><span className="dot dot-green"/>Observaciones clínicas</div>
                  <div className={`info-card-body${!expediente.observaciones_clinicas ? ' empty' : ''}`}>
                    {expediente.observaciones_clinicas || 'Sin observaciones registradas'}
                  </div>
                </div>
              </div>

              {/* ARCHIVOS — al final, también en vista de lectura */}
              <SeccionArchivos
                expediente={expediente}
                archivos={archivos}
                setArchivos={setArchivos}
                setToast={setToast}
              />
            </>
          )}

          {/* FORMULARIO (crear o editar) */}
          {editando && (
            <form ref={formRef} onSubmit={guardar} noValidate>
              <div className="form-card">

                <div className="form-section">
                  <div className="form-section-title">🩺 Evaluación inicial</div>
                  <div className="form-grid">
                    <div className="form-group form-grid-full">
                      <label className="form-label">Motivo de consulta *</label>
                      <textarea name="motivo_consulta" rows={2} className={`form-textarea${errores.motivo_consulta?' err':''}`}
                        placeholder="¿Por qué acude el paciente a terapia?"
                        defaultValue={expediente?.motivo_consulta ?? ''} />
                      {errores.motivo_consulta && <span className="err-msg">{errores.motivo_consulta}</span>}
                    </div>
                    <div className="form-group form-grid-full">
                      <label className="form-label">Diagnóstico *</label>
                      <textarea name="diagnostico" rows={2} className={`form-textarea${errores.diagnostico?' err':''}`}
                        placeholder="Diagnóstico médico/clínico"
                        defaultValue={expediente?.diagnostico ?? ''} />
                      {errores.diagnostico && <span className="err-msg">{errores.diagnostico}</span>}
                    </div>
                    <div className="form-group form-grid-full">
                      <label className="form-label">Antecedentes</label>
                      <textarea name="antecedentes" rows={3} className="form-textarea"
                        placeholder="Cirugías previas, enfermedades crónicas, lesiones anteriores..."
                        defaultValue={expediente?.antecedentes ?? ''} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Fecha de inicio del problema</label>
                      <input name="fecha_inicio_problema" type="date" className="form-input"
                        defaultValue={expediente?.fecha_inicio_problema?.slice(0,10) ?? ''} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Nivel de dolor inicial (0-10)</label>
                      <input name="nivel_dolor_inicial" type="number" min={0} max={10}
                        className={`form-input${errores.nivel_dolor_inicial?' err':''}`}
                        placeholder="0 = sin dolor, 10 = máximo"
                        defaultValue={expediente?.nivel_dolor_inicial ?? ''} />
                      {errores.nivel_dolor_inicial && <span className="err-msg">{errores.nivel_dolor_inicial}</span>}
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <div className="form-section-title">📊 Evaluación física</div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Limitaciones físicas</label>
                      <input name="limitaciones_fisicas" className="form-input"
                        placeholder="Ej. dificultad para flexionar rodilla"
                        defaultValue={expediente?.limitaciones_fisicas ?? ''} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Diagnóstico funcional</label>
                      <input name="diagnostico_funcional" className="form-input"
                        placeholder="Capacidad funcional actual"
                        defaultValue={expediente?.diagnostico_funcional ?? ''} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Rango de movimiento</label>
                      <input name="rango_movimiento" className="form-input"
                        placeholder="Ej. flexión 90°, extensión completa"
                        defaultValue={expediente?.rango_movimiento ?? ''} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Fuerza muscular</label>
                      <input name="fuerza_muscular" className="form-input"
                        placeholder="Ej. escala 4/5"
                        defaultValue={expediente?.fuerza_muscular ?? ''} />
                    </div>
                    <div className="form-group form-grid-full">
                      <label className="form-label">Postura y movilidad</label>
                      <input name="postura_movilidad" className="form-input"
                        placeholder="Observaciones de postura general y movilidad"
                        defaultValue={expediente?.postura_movilidad ?? ''} />
                    </div>
                    <div className="form-group form-grid-full">
                      <label className="form-label">Observaciones clínicas</label>
                      <textarea name="observaciones_clinicas" rows={3} className="form-textarea"
                        placeholder="Notas clínicas adicionales"
                        defaultValue={expediente?.observaciones_clinicas ?? ''} />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <div className="form-section-title">🎯 Plan de tratamiento</div>
                  <div className="form-grid">
                    <div className="form-group form-grid-full">
                      <label className="form-label">Objetivos terapéuticos</label>
                      <textarea name="objetivos_terapeuticos" rows={2} className="form-textarea"
                        placeholder="Metas a corto y largo plazo"
                        defaultValue={expediente?.objetivos_terapeuticos ?? ''} />
                    </div>
                    <div className="form-group form-grid-full">
                      <label className="form-label">Plan de tratamiento</label>
                      <textarea name="plan_tratamiento" rows={3} className="form-textarea"
                        placeholder="Descripción del plan a seguir"
                        defaultValue={expediente?.plan_tratamiento ?? ''} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tipo de terapias</label>
                      <input name="tipo_terapias" className="form-input"
                        placeholder="Ej. fisioterapia, electroterapia"
                        defaultValue={expediente?.tipo_terapias ?? ''} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Frecuencia de sesiones</label>
                      <input name="frecuencia_sesiones" className="form-input"
                        placeholder="Ej. 2 veces por semana"
                        defaultValue={expediente?.frecuencia_sesiones ?? ''} />
                    </div>
                    <div className="form-group form-grid-full">
                      <label className="form-label">Indicaciones</label>
                      <textarea name="indicaciones" rows={2} className="form-textarea"
                        placeholder="Indicaciones para el paciente entre sesiones"
                        defaultValue={expediente?.indicaciones ?? ''} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Estado del expediente</label>
                      <select name="estado" className="form-select" defaultValue={expediente?.estado ?? 'activo'}>
                        {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* ARCHIVOS — al final del formulario, como pediste */}
                <div className="form-section">
                  <div className="form-section-title">📎 Estudios y documentos clínicos</div>
                  {expediente ? (
                    <SeccionArchivos
                      expediente={expediente}
                      archivos={archivos}
                      setArchivos={setArchivos}
                      setToast={setToast}
                    />
                  ) : (
                    <div className="pendiente-card">
                      Podrás adjuntar radiografías, recetas o estudios una vez que guardes el expediente por primera vez.
                    </div>
                  )}
                </div>

                <div className="form-footer">
                  {expediente && (
                    <button type="button" className="btn-cancel" onClick={() => { setEditando(false); setErrores({}) }}>
                      Cancelar
                    </button>
                  )}
                  <button type="submit" className="btn-save" disabled={loading}>
                    {loading && <div style={{width:14,height:14,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',animation:'spin .7s linear infinite'}}/>}
                    {esNuevo ? 'Crear expediente' : 'Guardar cambios'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <a href="#" className="chatbot-bubble" title="Asistente RC">💬</a>
    </>
  )
}