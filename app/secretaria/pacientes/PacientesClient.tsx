'use client'

/**
 * PacientesClient.tsx
 * ─────────────────────────────────────────────────────────────
 * F2 — Registro y gestión de pacientes (Secretaria / Admin)
 *
 * UNIDAD 2 — Desarrollo Web Profesional:
 *   1. Manipulación del DOM   → filtro búsqueda, lista dinámica, modal mount/unmount
 *   2. Fetch API asíncrona    → registro, edición y baja vía /api/pacientes
 *   3. Eventos                → click, input, scroll, mouseover
 *   4. Animaciones            → fade-in cards, slide modal, hover rows, toast
 *   5. Interacción profesional→ Toast, Modal, Loader, Badge dinámico
 *
 * SEGURIDAD (Actividad 15):
 *   • Validación en cliente con regex (primera capa)
 *   • Validación en servidor con Zod (segunda capa)
 *   • RLS en Supabase (tercera capa)
 *   • Permisos verificados en Server Component padre
 */

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

// ── TIPOS ────────────────────────────────────────────────────
interface Terapeuta { id: string; nombre_completo: string }
interface Paciente {
  id_paciente: number
  nombre_completo: string
  curp: string
  telefono?: string
  fecha_nacimiento: string
  domicilio?: string
  contacto_emergencia?: string
  activo: boolean
  created_at: string
  terapeuta_id: string
  profiles?: { nombre_completo: string }
}
interface Props {
  terapeutas: Terapeuta[]
  pacientesIniciales: Paciente[]
  userNombre: string
}

// ── VALIDACIONES (primera capa — cliente) ────────────────────
const CURP_REGEX  = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/
const PHONE_REGEX = /^\d{10}$/

function validarCampos(f: Record<string, string>) {
  const errs: Record<string, string> = {}
  if (!f.nombre_completo?.trim())         errs.nombre_completo = 'El nombre es obligatorio'
  if (!f.fecha_nacimiento)                errs.fecha_nacimiento = 'La fecha de nacimiento es obligatoria'
  if (!f.curp?.trim())                    errs.curp = 'La CURP es obligatoria'
  else if (!CURP_REGEX.test(f.curp.toUpperCase())) errs.curp = 'Formato de CURP inválido (18 caracteres)'

  // Teléfono — opcional, pero si se llena debe ser 10 dígitos
  if (f.telefono && !PHONE_REGEX.test(f.telefono)) errs.telefono = 'Debe tener 10 dígitos'

  // Contacto de emergencia — si se llena el nombre, el teléfono es obligatorio y viceversa
  if (f.contacto_emergencia_nombre && !f.contacto_emergencia_telefono) {
    errs.contacto_emergencia_telefono = 'Falta el teléfono del contacto'
  }
  if (f.contacto_emergencia_telefono && !PHONE_REGEX.test(f.contacto_emergencia_telefono)) {
    errs.contacto_emergencia_telefono = 'Debe tener 10 dígitos'
  }
  if (f.contacto_emergencia_telefono && !f.contacto_emergencia_nombre) {
    errs.contacto_emergencia_nombre = 'Falta el nombre del contacto'
  }

  if (!f.terapeuta_id)                    errs.terapeuta_id = 'Debes asignar un terapeuta'
  if (!f.aviso_privacidad)               errs.aviso_privacidad = 'El paciente debe aceptar el Aviso de Privacidad'
  return errs
}

// ── COMPONENTE TOAST ─────────────────────────────────────────
function Toast({ msg, type, onClose }: { msg: string; type: 'success'|'error'; onClose: ()=>void }) {
  // Evento: timeout automático (DOM dinámico — se monta y desmonta)
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div style={{
      position:'fixed', bottom:90, right:28, zIndex:200,
      background: type==='success' ? '#162419' : '#1a0f0f',
      border: `1px solid ${type==='success' ? 'rgba(26,144,104,0.4)' : 'rgba(224,68,68,0.4)'}`,
      borderLeft: `3px solid ${type==='success' ? '#1A9068' : '#E04444'}`,
      borderRadius:12, padding:'14px 18px', minWidth:280, maxWidth:360,
      display:'flex', alignItems:'center', gap:12,
      boxShadow:'0 8px 32px rgba(0,0,0,0.4)',
      animation:'slideUp .3s ease',
    }}>
      <span style={{fontSize:18}}>{type==='success'?'✅':'❌'}</span>
      <span style={{fontSize:14, color:'#E8F5EE', flex:1}}>{msg}</span>
      {/* Evento click — cerrar toast */}
      <button onClick={onClose} style={{background:'none',border:'none',color:'rgba(232,245,238,0.4)',cursor:'pointer',fontSize:16}}>✕</button>
    </div>
  )
}

// ── LOADER ───────────────────────────────────────────────────
function Loader() {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'60px 0'}}>
      <div style={{width:32,height:32,borderRadius:'50%',border:'3px solid rgba(26,144,104,0.2)',borderTopColor:'#1A9068',animation:'spin .7s linear infinite'}}/>
    </div>
  )
}

// ── COMPONENTE PRINCIPAL ─────────────────────────────────────
export default function PacientesClient({ terapeutas, pacientesIniciales, userNombre }: Props) {

  // ── ESTADO ──────────────────────────────────────────────────
  const [pacientes, setPacientes]     = useState<Paciente[]>(pacientesIniciales)
  const [busqueda, setBusqueda]       = useState('')           // evento input dinámico
  const [filtroEstado, setFiltroEstado] = useState<'todos'|'activo'|'inactivo'>('todos')
  const [modalAbierto, setModalAbierto] = useState(false)     // DOM — mostrar/ocultar modal
  const [modoEdicion, setModoEdicion] = useState<Paciente|null>(null)
  const [loading, setLoading]         = useState(false)
  const [errores, setErrores]         = useState<Record<string,string>>({})
  const [toast, setToast]             = useState<{msg:string;type:'success'|'error'}|null>(null)
  const [confirmBaja, setConfirmBaja] = useState<Paciente|null>(null)
  const [confirmReactivar, setConfirmReactivar] = useState<Paciente|null>(null)
  const [scrolled, setScrolled]       = useState(false)       // evento scroll
  const formRef = useRef<HTMLFormElement>(null)

  // ── EVENTO SCROLL — cambiar apariencia topbar ────────────────
  useEffect(() => {
    const el = document.getElementById('main-content')
    if (!el) return
    // Evento scroll para feedback visual
    const handler = () => setScrolled(el.scrollTop > 20)
    el.addEventListener('scroll', handler)
    return () => el.removeEventListener('scroll', handler)
  }, [])

  // ── FILTRO DINÁMICO (Manipulación del DOM) ───────────────────
  // Evento input → filtra la lista en tiempo real sin petición al servidor
  const pacientesFiltrados = pacientes.filter(p => {
    const matchBusqueda = p.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) ||
                          p.curp?.toLowerCase().includes(busqueda.toLowerCase())
    const matchEstado = filtroEstado === 'todos' ? true :
                        filtroEstado === 'activo' ? p.activo : !p.activo
    return matchBusqueda && matchEstado
  })

  // ── ABRIR MODAL (crear / editar) ─────────────────────────────
  function abrirModalNuevo() {
    setModoEdicion(null)
    setErrores({})
    setModalAbierto(true)  // DOM — monta el modal en el árbol
  }
  function abrirModalEdicion(p: Paciente) {
    setModoEdicion(p)
    setErrores({})
    setModalAbierto(true)
  }
  // Cerrar modal — evento click en overlay o botón
  function cerrarModal() {
    setModalAbierto(false)
    setModoEdicion(null)
    setErrores({})
    formRef.current?.reset()
  }

  // ── GUARDAR PACIENTE (Fetch API asíncrona) ───────────────────
  /**
   * FUNCIÓN ASÍNCRONA vs SÍNCRONA:
   * Síncrona  → bloquea el hilo hasta terminar (UI congelada)
   * Asíncrona → permite que la UI siga respondiendo mientras espera la respuesta del servidor
   * Aquí usamos async/await para no bloquear el navegador durante la petición HTTP
   */
  async function guardarPaciente(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const campos: Record<string, string> = {
      nombre_completo:               fd.get('nombre_completo') as string,
      fecha_nacimiento:               fd.get('fecha_nacimiento') as string,
      curp:                            (fd.get('curp') as string)?.toUpperCase(),
      telefono:                        fd.get('telefono') as string,
      domicilio:                       fd.get('domicilio') as string,
      contacto_emergencia_nombre:     fd.get('contacto_emergencia_nombre') as string,
      contacto_emergencia_telefono:   fd.get('contacto_emergencia_telefono') as string,
      terapeuta_id:                    fd.get('terapeuta_id') as string,
      aviso_privacidad:                fd.get('aviso_privacidad') as string,
    }

    // Primera capa: validación cliente
    const errs = validarCampos(campos)
    if (Object.keys(errs).length > 0) { setErrores(errs); return }

    setLoading(true)

    // Combina nombre + teléfono del contacto de emergencia en un solo campo para la BD
    const contacto_emergencia = campos.contacto_emergencia_nombre
      ? `${campos.contacto_emergencia_nombre} - ${campos.contacto_emergencia_telefono}`
      : ''

    const payload = {
      nombre_completo:     campos.nombre_completo,
      fecha_nacimiento:    campos.fecha_nacimiento,
      curp:                campos.curp,
      telefono:            campos.telefono,
      domicilio:           campos.domicilio,
      contacto_emergencia,
      terapeuta_id:        campos.terapeuta_id,
    }

    // Fetch API asíncrona — segunda capa de validación en servidor
    const res = await fetch('/api/pacientes', {
      method:  modoEdicion ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(modoEdicion ? { ...payload, id: modoEdicion.id_paciente } : payload),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setToast({ msg: data.error ?? 'Error al guardar', type: 'error' })
      return
    }

    // Manipulación del DOM — actualizar lista sin recargar página
    if (modoEdicion) {
      setPacientes(prev => prev.map(p => p.id_paciente === modoEdicion.id_paciente ? { ...p, ...payload } : p))
      setToast({ msg: 'Paciente actualizado correctamente', type: 'success' })
    } else {
      setPacientes(prev => [data.paciente, ...prev])
      setToast({ msg: 'Paciente registrado correctamente', type: 'success' })
    }
    cerrarModal()
  }

  // ── BAJA / REACTIVACIÓN DE PACIENTE ───────────────────────────
  async function cambiarEstado(p: Paciente, nuevoEstado: boolean) {
    setLoading(true)
    const res = await fetch('/api/pacientes', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: p.id_paciente, activo: nuevoEstado }),
    })
    setLoading(false)
    setConfirmBaja(null)
    setConfirmReactivar(null)
    if (res.ok) {
      // DOM — actualiza badge sin recargar
      setPacientes(prev => prev.map(pac => pac.id_paciente === p.id_paciente ? { ...pac, activo: nuevoEstado } : pac))
      setToast({ msg: nuevoEstado ? 'Paciente reactivado correctamente' : 'Paciente dado de baja correctamente', type: 'success' })
    } else {
      setToast({ msg: nuevoEstado ? 'Error al reactivar' : 'Error al dar de baja', type: 'error' })
    }
  }

  // ── RENDER ───────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --bg:#0D1A12;--sidebar:#111D16;--card:#162419;--border:rgba(255,255,255,0.07);
          --mid:#1A9068;--light:#4FC49A;--pale:#DCF2E9;--text:#E8F5EE;--muted:rgba(232,245,238,0.45);
          --red:#E04444;--amber:#F5B400;
        }
        body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex}

        /* SIDEBAR */
        .sidebar{width:260px;min-height:100vh;background:var(--sidebar);border-right:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0}
        .sb-brand{padding:20px 20px 16px;border-bottom:1px solid var(--border)}
        .sb-logo-row{display:flex;align-items:center;gap:10px}
        .sb-logo{width:36px;height:36px;border-radius:9px;background:var(--mid);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:#fff}
        .sb-name{font-size:14px;font-weight:600;color:var(--text)}
        .sb-ver{font-size:10px;color:var(--muted)}
        .sb-role{margin:12px 12px 4px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:10px}
        .sb-role-icon{width:32px;height:32px;border-radius:8px;background:rgba(127,119,221,0.15);border:1px solid rgba(127,119,221,0.25);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
        .sb-role-name{font-size:13px;font-weight:500;color:var(--text)}
        .sb-role-sub{font-size:11px;color:#7F77DD}
        .sb-nav{flex:1;padding:8px 10px}
        .sb-nav a{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;font-size:14px;color:var(--muted);text-decoration:none;transition:all .18s;margin-bottom:2px}
        .sb-nav a:hover{background:rgba(255,255,255,0.05);color:var(--text)}
        .sb-nav a.active{background:rgba(26,144,104,0.15);color:var(--light)}
        .sb-nav-icon{font-size:16px;width:20px;text-align:center}
        .sb-bottom{padding:12px 10px;border-top:1px solid var(--border)}
        .sb-bottom a{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;font-size:14px;color:var(--muted);text-decoration:none;transition:all .18s}
        .sb-bottom a:hover{color:var(--red)}

        /* MAIN */
        .main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
        /* Transición suave del topbar al hacer scroll */
        .topbar{height:56px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 28px;flex-shrink:0;transition:background .3s}
        .topbar.scrolled{background:rgba(17,29,22,0.95);backdrop-filter:blur(10px)}
        .topbar-title{font-size:14px;color:var(--muted)}
        .topbar-right{display:flex;align-items:center;gap:16px}
        .online-dot{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--light)}
        .dot{width:7px;height:7px;border-radius:50%;background:var(--light)}
        .notif{width:32px;height:32px;border-radius:8px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:15px}
        .content{flex:1;overflow-y:auto;padding:28px}

        /* PAGE HEADER */
        .page-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;flex-wrap:wrap;gap:12px}
        .page-title{font-size:26px;font-weight:600;color:var(--text)}
        .page-sub{font-size:14px;color:var(--muted);margin-top:4px}
        .btn-nuevo{background:var(--mid);color:#fff;border:none;border-radius:10px;padding:11px 20px;font-size:14px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:7px;transition:background .2s,transform .15s}
        .btn-nuevo:hover{background:#158057;transform:translateY(-1px)}

        /* SEARCH + FILTROS */
        .filters{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap}
        .search-wrap{flex:1;min-width:220px;position:relative}
        .search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:14px;color:var(--muted)}
        .search-input{width:100%;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px 12px 10px 34px;font-size:14px;font-family:'DM Sans',sans-serif;color:var(--text);outline:none;transition:border-color .2s}
        .search-input:focus{border-color:var(--mid)}
        .search-input::placeholder{color:var(--muted)}
        .filter-tabs{display:flex;gap:6px}
        .filter-tab{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:8px 14px;font-size:13px;color:var(--muted);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .18s}
        .filter-tab:hover{border-color:rgba(26,144,104,0.4);color:var(--text)}
        .filter-tab.active{background:rgba(26,144,104,0.15);border-color:rgba(26,144,104,0.4);color:var(--light)}

        /* STATS ROW */
        .stats-row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}
        .stat-mini{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px 18px;display:flex;align-items:center;gap:12px}
        .stat-mini-icon{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0}
        .stat-mini-num{font-size:22px;font-weight:600;color:var(--text)}
        .stat-mini-lbl{font-size:11px;color:var(--muted)}

        /* TABLA */
        .table-card{background:var(--card);border:1px solid var(--border);border-radius:14px;overflow:hidden}
        .table-header-row{display:grid;grid-template-columns:2fr 1.2fr 1fr 1fr 1fr;gap:12px;padding:12px 20px;border-bottom:1px solid var(--border)}
        .th{font-size:11px;font-weight:600;color:var(--muted);letter-spacing:0.07em;text-transform:uppercase}
        /* Animación fade-in de filas al cargar */
        .patient-row{display:grid;grid-template-columns:2fr 1.2fr 1fr 1fr 1fr;gap:12px;padding:14px 20px;border-bottom:1px solid var(--border);align-items:center;transition:background .18s;animation:fadeIn .3s ease both}
        .patient-row:last-child{border-bottom:none}
        /* Evento mouseover — highlight al pasar el cursor */
        .patient-row:hover{background:rgba(255,255,255,0.03)}
        .p-avatar{width:36px;height:36px;border-radius:50%;background:rgba(26,144,104,0.25);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:var(--text);flex-shrink:0}
        .p-name{font-size:13px;font-weight:500;color:var(--text)}
        .p-curp{font-size:11px;color:var(--muted);font-family:monospace}
        .td-text{font-size:13px;color:var(--muted)}
        .badge{font-size:11px;font-weight:500;padding:3px 10px;border-radius:100px;display:inline-block}
        .b-green{background:rgba(26,144,104,0.18);color:var(--light)}
        .b-red{background:rgba(224,68,68,0.15);color:var(--red)}
        .actions{display:flex;gap:6px}
        .btn-action{background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:7px;padding:5px 10px;font-size:12px;color:var(--muted);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .18s}
        .btn-action:hover{background:rgba(26,144,104,0.15);border-color:rgba(26,144,104,0.3);color:var(--light)}
        .btn-action.danger:hover{background:rgba(224,68,68,0.12);border-color:rgba(224,68,68,0.3);color:var(--red)}
        .btn-action.success:hover{background:rgba(26,144,104,0.15);border-color:rgba(26,144,104,0.3);color:var(--light)}
        .empty-state{padding:60px 20px;text-align:center;color:var(--muted);font-size:14px}

        /* MODAL */
        /* DOM dinámico — el overlay se monta/desmonta según modalAbierto */
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .2s ease}
        .modal{background:#111D16;border:1px solid var(--border);border-radius:18px;width:100%;max-width:580px;max-height:90vh;overflow-y:auto;animation:slideUp .25s ease}
        .modal-header{padding:24px 28px 0;display:flex;align-items:center;justify-content:space-between}
        .modal-title{font-size:18px;font-weight:600;color:var(--text)}
        .modal-sub{font-size:13px;color:var(--muted);margin-top:4px}
        .modal-close{background:rgba(255,255,255,0.06);border:1px solid var(--border);border-radius:8px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--muted);font-size:16px;transition:all .18s;flex-shrink:0}
        .modal-close:hover{background:rgba(224,68,68,0.15);color:var(--red)}
        .modal-body{padding:24px 28px}
        .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .form-grid-full{grid-column:1/-1}
        .form-group{display:flex;flex-direction:column;gap:6px}
        .form-label{font-size:11px;font-weight:600;color:var(--muted);letter-spacing:0.07em;text-transform:uppercase}
        .form-input,.form-select,.form-textarea{background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:9px;padding:11px 13px;font-size:14px;font-family:'DM Sans',sans-serif;color:var(--text);outline:none;transition:border-color .2s,box-shadow .2s;width:100%}
        .form-input:focus,.form-select:focus,.form-textarea:focus{border-color:var(--mid);box-shadow:0 0 0 3px rgba(26,144,104,0.10)}
        .form-input::placeholder,.form-textarea::placeholder{color:rgba(232,245,238,0.2)}
        .form-select option{background:#111D16;color:var(--text)}
        .form-input.err,.form-select.err{border-color:rgba(224,68,68,0.5)}
        .err-msg{font-size:11px;color:var(--red)}
        .aviso-row{display:flex;align-items:flex-start;gap:10px;padding:14px;background:rgba(26,144,104,0.07);border:1px solid rgba(26,144,104,0.2);border-radius:10px;margin-top:4px}
        .aviso-check{width:18px;height:18px;accent-color:var(--mid);flex-shrink:0;margin-top:2px}
        .aviso-text{font-size:13px;color:var(--muted);line-height:1.5}
        .modal-footer{padding:0 28px 24px;display:flex;gap:10px;justify-content:flex-end}
        .btn-cancel{background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:9px;padding:11px 20px;font-size:14px;color:var(--muted);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .18s}
        .btn-cancel:hover{color:var(--text)}
        .btn-save{background:var(--mid);color:#fff;border:none;border-radius:9px;padding:11px 24px;font-size:14px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:8px;transition:background .2s}
        .btn-save:hover:not(:disabled){background:#158057}
        .btn-save:disabled{opacity:.5;cursor:not-allowed}

        /* MODAL CONFIRMAR BAJA */
        .confirm-modal{background:#1a0f0f;border:1px solid rgba(224,68,68,0.25);border-radius:16px;width:100%;max-width:380px;padding:28px;animation:slideUp .2s ease}
        .confirm-modal-success{background:#0f1d16;border-color:rgba(26,144,104,0.3)}
        .confirm-title{font-size:17px;font-weight:600;color:var(--text);margin-bottom:8px}
        .confirm-body{font-size:14px;color:var(--muted);line-height:1.6;margin-bottom:24px}
        .confirm-name{color:var(--text);font-weight:500}
        .confirm-btns{display:flex;gap:10px;justify-content:flex-end}
        .btn-danger{background:var(--red);color:#fff;border:none;border-radius:9px;padding:10px 20px;font-size:14px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;transition:background .2s}
        .btn-danger:hover{background:#c03333}
        .btn-success{background:var(--mid);color:#fff;border:none;border-radius:9px;padding:10px 20px;font-size:14px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;transition:background .2s}
        .btn-success:hover{background:#158057}

        /* CHATBOT */
        .chatbot-bubble{position:fixed;bottom:28px;right:28px;width:52px;height:52px;border-radius:50%;background:var(--mid);display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;box-shadow:0 4px 16px rgba(26,144,104,0.4);transition:transform .2s;z-index:50;text-decoration:none}
        .chatbot-bubble:hover{transform:scale(1.08)}

        /* ANIMACIONES — Unidad 2 punto 4 */
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.5} }
      `}</style>

      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="sb-brand">
          <div className="sb-logo-row">
            <div className="sb-logo">RC</div>
            <div><div className="sb-name">RehabControl</div><div className="sb-ver">v2.1</div></div>
          </div>
        </div>
        <div className="sb-role">
          <div className="sb-role-icon">📁</div>
          <div><div className="sb-role-name">Secretaria</div><div className="sb-role-sub">Acceso Operativo</div></div>
        </div>
        <nav className="sb-nav">
          {[
            {icon:'🏠', label:'Panel',          href:'/secretaria/dashboard', active:false},
            {icon:'📅', label:'Agenda General', href:'/secretaria/citas',     active:false},
            {icon:'👥', label:'Pacientes',       href:'/secretaria/pacientes', active:true},
            {icon:'💳', label:'Pagos',           href:'/secretaria/pagos',     active:false},
          ].map(n => (
            <Link key={n.label} href={n.href} className={n.active?'active':''}>
              <span className="sb-nav-icon">{n.icon}</span>{n.label}
            </Link>
          ))}
        </nav>
        <div className="sb-bottom">
          <Link href="/login"><span className="sb-nav-icon">→</span> Cerrar Sesión</Link>
        </div>
      </div>

      {/* MAIN */}
      <div className="main">
        {/* Topbar con transición suave al hacer scroll */}
        <div className={`topbar${scrolled?' scrolled':''}`}>
          <span className="topbar-title">Gestión de Pacientes</span>
          <div className="topbar-right">
            <div className="online-dot"><div className="dot"/>En línea</div>
            <div className="notif">🔔</div>
          </div>
        </div>

        <div className="content" id="main-content">
          {/* HEADER */}
          <div className="page-header">
            <div>
              <div className="page-title">Pacientes</div>
              <div className="page-sub">Registro y gestión de pacientes de la clínica</div>
            </div>
            {/* Evento click — abre modal de registro */}
            <button className="btn-nuevo" onClick={abrirModalNuevo}>
              + Nuevo paciente
            </button>
          </div>

          {/* STATS — DOM dinámico, se recalculan con el estado */}
          <div className="stats-row">
            <div className="stat-mini">
              <div className="stat-mini-icon" style={{background:'rgba(26,144,104,0.15)'}}>👥</div>
              <div><div className="stat-mini-num">{pacientes.length}</div><div className="stat-mini-lbl">Total registrados</div></div>
            </div>
            <div className="stat-mini">
              <div className="stat-mini-icon" style={{background:'rgba(79,196,154,0.15)'}}>✅</div>
              <div><div className="stat-mini-num">{pacientes.filter(p=>p.activo).length}</div><div className="stat-mini-lbl">Activos</div></div>
            </div>
            <div className="stat-mini">
              <div className="stat-mini-icon" style={{background:'rgba(224,68,68,0.12)'}}>🚫</div>
              <div><div className="stat-mini-num">{pacientes.filter(p=>!p.activo).length}</div><div className="stat-mini-lbl">Dados de baja</div></div>
            </div>
          </div>

          {/* BÚSQUEDA Y FILTROS — Evento input dinámico */}
          <div className="filters">
            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              {/* Evento onChange → filtra lista en tiempo real */}
              <input
                className="search-input"
                placeholder="Buscar por nombre o CURP..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
            </div>
            <div className="filter-tabs">
              {(['todos','activo','inactivo'] as const).map(f => (
                <button
                  key={f}
                  className={`filter-tab${filtroEstado===f?' active':''}`}
                  onClick={() => setFiltroEstado(f)}
                >
                  {f.charAt(0).toUpperCase()+f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* TABLA — Lista dinámica con animaciones */}
          <div className="table-card">
            <div className="table-header-row">
              <div className="th">Paciente</div>
              <div className="th">Terapeuta</div>
              <div className="th">Teléfono</div>
              <div className="th">Estado</div>
              <div className="th">Acciones</div>
            </div>

            {loading && <Loader />}

            {!loading && pacientesFiltrados.length === 0 && (
              <div className="empty-state">
                {busqueda ? `Sin resultados para "${busqueda}"` : 'No hay pacientes registrados aún'}
              </div>
            )}

            {/* DOM dinámico — crea elementos de lista a partir del estado */}
            {!loading && pacientesFiltrados.map((p, i) => {
              const ini = p.nombre_completo.split(' ').map((w:string)=>w[0]).slice(0,2).join('').toUpperCase()
              return (
                <div
                  className="patient-row"
                  key={p.id_paciente}
                  style={{animationDelay:`${i*40}ms`}}
                  /* Evento mouseover — el hover se maneja en CSS con :hover */
                >
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div className="p-avatar">{ini}</div>
                    <div>
                      <div className="p-name">{p.nombre_completo}</div>
                      <div className="p-curp">{p.curp}</div>
                    </div>
                  </div>
                  <div className="td-text">{(p as any).profiles?.nombre_completo ?? '—'}</div>
                  <div className="td-text">{p.telefono ?? '—'}</div>
                  <div>
                    <span className={`badge ${p.activo?'b-green':'b-red'}`}>
                      {p.activo ? 'Activo' : 'Baja'}
                    </span>
                  </div>
                  <div className="actions">
                    <button className="btn-action" onClick={() => abrirModalEdicion(p)}>Editar</button>
                    {p.activo
                      ? <button className="btn-action danger" onClick={() => setConfirmBaja(p)}>Baja</button>
                      : <button className="btn-action success" onClick={() => setConfirmReactivar(p)}>Reactivar</button>
                    }
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* MODAL REGISTRO / EDICIÓN */}
      {modalAbierto && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) cerrarModal() }}>
          <div className="modal">
            <div className="modal-header">
              <div>
                <div className="modal-title">{modoEdicion ? 'Editar paciente' : 'Registrar nuevo paciente'}</div>
                <div className="modal-sub">{modoEdicion ? 'Modifica los datos del paciente' : 'Completa todos los campos obligatorios'}</div>
              </div>
              <button className="modal-close" onClick={cerrarModal}>✕</button>
            </div>

            <form ref={formRef} onSubmit={guardarPaciente} noValidate>
              <div className="modal-body">
                <div className="form-grid">
                  {/* Nombre */}
                  <div className="form-group form-grid-full">
                    <label className="form-label">Nombre completo *</label>
                    <input name="nombre_completo" className={`form-input${errores.nombre_completo?' err':''}`}
                      placeholder="Ej. Juan García López"
                      defaultValue={modoEdicion?.nombre_completo ?? ''} />
                    {errores.nombre_completo && <span className="err-msg">{errores.nombre_completo}</span>}
                  </div>
                  {/* Fecha nacimiento */}
                  <div className="form-group">
                    <label className="form-label">Fecha de nacimiento *</label>
                    <input name="fecha_nacimiento" type="date" className={`form-input${errores.fecha_nacimiento?' err':''}`}
                      defaultValue={modoEdicion?.fecha_nacimiento ?? ''} />
                    {errores.fecha_nacimiento && <span className="err-msg">{errores.fecha_nacimiento}</span>}
                  </div>
                  {/* CURP */}
                  <div className="form-group">
                    <label className="form-label">CURP *</label>
                    <input name="curp" className={`form-input${errores.curp?' err':''}`}
                      placeholder="18 caracteres"
                      maxLength={18}
                      style={{textTransform:'uppercase'}}
                      onInput={e => { e.currentTarget.value = e.currentTarget.value.toUpperCase() }}
                      defaultValue={modoEdicion?.curp ?? ''} />
                    {errores.curp && <span className="err-msg">{errores.curp}</span>}
                  </div>
                  {/* Teléfono */}
                  <div className="form-group">
                    <label className="form-label">Teléfono</label>
                    <input name="telefono" type="tel" inputMode="numeric" pattern="\d{10}"
                      maxLength={10}
                      className={`form-input${errores.telefono?' err':''}`}
                      placeholder="10 dígitos"
                      onInput={e => { e.currentTarget.value = e.currentTarget.value.replace(/\D/g,'') }}
                      defaultValue={modoEdicion?.telefono ?? ''} />
                    {errores.telefono && <span className="err-msg">{errores.telefono}</span>}
                  </div>
                  {/* Domicilio */}
                  <div className="form-group form-grid-full">
                    <label className="form-label">Domicilio</label>
                    <input name="domicilio" className="form-input" placeholder="Calle, número, colonia, municipio"
                      defaultValue={modoEdicion?.domicilio ?? ''} />
                  </div>
                  {/* Contacto emergencia — separado en nombre y teléfono */}
                  <div className="form-group">
                    <label className="form-label">Contacto de emergencia — Nombre</label>
                    <input name="contacto_emergencia_nombre" className={`form-input${errores.contacto_emergencia_nombre?' err':''}`}
                      placeholder="Nombre completo"
                      defaultValue={modoEdicion?.contacto_emergencia?.split(' - ')[0] ?? ''} />
                    {errores.contacto_emergencia_nombre && <span className="err-msg">{errores.contacto_emergencia_nombre}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contacto de emergencia — Teléfono</label>
                    <input name="contacto_emergencia_telefono" type="tel" inputMode="numeric" pattern="\d{10}"
                      maxLength={10}
                      className={`form-input${errores.contacto_emergencia_telefono?' err':''}`}
                      placeholder="10 dígitos"
                      onInput={e => { e.currentTarget.value = e.currentTarget.value.replace(/\D/g,'') }}
                      defaultValue={modoEdicion?.contacto_emergencia?.split(' - ')[1] ?? ''} />
                    {errores.contacto_emergencia_telefono && <span className="err-msg">{errores.contacto_emergencia_telefono}</span>}
                  </div>
                  {/* Terapeuta asignado */}
                  <div className="form-group form-grid-full">
                    <label className="form-label">Terapeuta asignado *</label>
                    <select name="terapeuta_id" className={`form-select${errores.terapeuta_id?' err':''}`}
                      defaultValue={modoEdicion?.terapeuta_id ?? ''}>
                      <option value="">— Selecciona un terapeuta —</option>
                      {terapeutas.map(t => (
                        <option key={t.id} value={t.id}>{t.nombre_completo}</option>
                      ))}
                    </select>
                    {errores.terapeuta_id && <span className="err-msg">{errores.terapeuta_id}</span>}
                  </div>
                  {/* Aviso de privacidad — requerimiento de seguridad LFPDPPP */}
                  {!modoEdicion && (
                    <div className="form-group form-grid-full">
                      <div className={`aviso-row${errores.aviso_privacidad?' err':''}`} style={errores.aviso_privacidad?{borderColor:'rgba(224,68,68,0.4)'}:{}}>
                        <input type="checkbox" name="aviso_privacidad" value="si" className="aviso-check" id="aviso" />
                        <label htmlFor="aviso" className="aviso-text">
                          El paciente ha leído y acepta el <strong style={{color:''+(errores.aviso_privacidad?'var(--red)':'var(--light)')}}>Aviso de Privacidad</strong> conforme a la LFPDPPP. Se registrará su nombre, fecha, hora e IP de aceptación en los logs de auditoría.
                        </label>
                      </div>
                      {errores.aviso_privacidad && <span className="err-msg">{errores.aviso_privacidad}</span>}
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={cerrarModal}>Cancelar</button>
                <button type="submit" className="btn-save" disabled={loading}>
                  {loading && <div style={{width:14,height:14,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',animation:'spin .7s linear infinite'}}/>}
                  {modoEdicion ? 'Guardar cambios' : 'Registrar paciente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR BAJA */}
      {confirmBaja && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) setConfirmBaja(null) }}>
          <div className="confirm-modal">
            <div className="confirm-title">⚠ Confirmar baja</div>
            <p className="confirm-body">
              ¿Estás segura de que deseas dar de baja a <span className="confirm-name">{confirmBaja.nombre_completo}</span>? El paciente quedará inactivo pero sus datos se conservarán en el sistema. Podrás reactivarlo cuando quieras.
            </p>
            <div className="confirm-btns">
              <button className="btn-cancel" onClick={() => setConfirmBaja(null)}>Cancelar</button>
              <button className="btn-danger" onClick={() => cambiarEstado(confirmBaja, false)}>Dar de baja</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR REACTIVACIÓN */}
      {confirmReactivar && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) setConfirmReactivar(null) }}>
          <div className="confirm-modal confirm-modal-success">
            <div className="confirm-title">✅ Reactivar paciente</div>
            <p className="confirm-body">
              ¿Deseas reactivar a <span className="confirm-name">{confirmReactivar.nombre_completo}</span>? Volverá a aparecer como paciente activo en la clínica.
            </p>
            <div className="confirm-btns">
              <button className="btn-cancel" onClick={() => setConfirmReactivar(null)}>Cancelar</button>
              <button className="btn-success" onClick={() => cambiarEstado(confirmReactivar, true)}>Reactivar</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST — Interacción profesional con feedback visual */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <a href="#" className="chatbot-bubble" title="Asistente RC">💬</a>
    </>
  )
}
