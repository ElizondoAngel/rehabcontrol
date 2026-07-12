'use client'

/**
 * CitasClient.tsx
 * ─────────────────────────────────────────────────────────────
 * F4 — Agenda de citas (Secretaria gestiona, Terapeuta consulta)
 *
 * UNIDAD 2 — Desarrollo Web Profesional:
 *   • DOM dinámico    → vista calendario por día, lista filtrable
 *   • Fetch asíncrona → crear/editar/cancelar vía /api/citas
 *   • Eventos         → click día, click cita, input fecha, select terapeuta
 *   • Animaciones     → transición entre días, fade-in citas, modal slide
 *   • Feedback visual → Toast, Modal, Loader, badges de estado
 *
 * SEGURIDAD:
 *   • Validación de horario laboral (8am-8pm) en cliente y servidor
 *   • Prevención de citas duplicadas (índice único en BD: terapeuta+fecha_hora)
 *   • RLS: secretaria/admin gestionan, terapeuta solo lee las suyas
 *   • Audit log en cada operación
 */


import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import NotifBell from '@/app/components/NotifBell'
import Sidebar, { MenuButton } from '@/app/components/Sidebar'

// ── TIPOS ────────────────────────────────────────────────────
interface Terapeuta { id: string; nombre_completo: string }
interface PacienteOpt { id_paciente: number; nombre_completo: string; terapeuta_id: string }
interface Cita {
  id_cita: number
  paciente_id: number
  terapeuta_id: string
  fecha_hora: string
  duracion_min: number
  estado: 'programada'|'completada'|'cancelada'|'no_asistio'|'pendiente_aprobacion'
  notas?: string
  pacientes?: { nombre_completo: string }
  profiles?: { nombre_completo: string }
  pagos?: { monto: number; metodo_pago: string; estado_pago: string }[]
}
interface Props {
  currentUserId: string
  terapeutas: Terapeuta[]
  pacientes: PacienteOpt[]
  citasIniciales: Cita[]
}

// ── HELPERS DE FECHA ──────────────────────────────────────────
function toISODate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dia}`
}
function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit', hour12:false })
}
function formatFechaLarga(d: Date) {
  return d.toLocaleDateString('es-MX', { weekday:'long', day:'numeric', month:'long' })
}

// ── VALIDACIÓN (primera capa) ────────────────────────────────
function validarCampos(f: Record<string,string>) {
  const errs: Record<string,string> = {}
  if (!f.paciente_id)    errs.paciente_id = 'Selecciona un paciente'
  if (!f.terapeuta_id)   errs.terapeuta_id = 'Selecciona un terapeuta'
  if (!f.fecha)          errs.fecha = 'Selecciona una fecha'
  if (!f.hora)           errs.hora = 'Selecciona una hora'
  else {
    const [h] = f.hora.split(':').map(Number)
    if (h < 8 || h >= 20) errs.hora = 'Horario de atención: 08:00 a 20:00'
  }
  if (!f.duracion_min)   errs.duracion_min = 'Selecciona la duración'
  return errs
}

// ── TOAST ─────────────────────────────────────────────────────
function Toast({ msg, type, onClose }: { msg:string; type:'success'|'error'; onClose:()=>void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div style={{
      position:'fixed', bottom:90, right:28, zIndex:200,
      background: type==='success' ? '#162419' : '#1a0f0f',
      border: `1px solid ${type==='success' ? 'rgba(26,144,104,0.4)' : 'rgba(224,68,68,0.4)'}`,
      borderLeft: `3px solid ${type==='success' ? '#1A9068' : '#E04444'}`,
      borderRadius:12, padding:'14px 18px', minWidth:280, maxWidth:380,
      display:'flex', alignItems:'center', gap:12,
      boxShadow:'0 8px 32px rgba(0,0,0,0.4)', animation:'slideUp .3s ease',
    }}>
      <span style={{fontSize:18}}>{type==='success'?'✅':'❌'}</span>
      <span style={{fontSize:14, color:'#E8F5EE', flex:1}}>{msg}</span>
      <button onClick={onClose} style={{background:'none',border:'none',color:'rgba(232,245,238,0.4)',cursor:'pointer',fontSize:16}}>✕</button>
    </div>
  )
}

function Loader() {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'60px 0'}}>
      <div style={{width:32,height:32,borderRadius:'50%',border:'3px solid rgba(26,144,104,0.2)',borderTopColor:'#1A9068',animation:'spin .7s linear infinite'}}/>
    </div>
  )
}

const ESTADO_LABELS: Record<string,string> = {
  programada: 'Programada', completada: 'Completada', cancelada: 'Cancelada', no_asistio: 'No asistió',
  pendiente_aprobacion: 'Pendiente de aprobación',
}
const ESTADO_CLASS: Record<string,string> = {
  programada: 'b-blue', completada: 'b-green', cancelada: 'b-red', no_asistio: 'b-amber',
  pendiente_aprobacion: 'b-purple',
}
const METODO_LABELS: Record<string,string> = {
  efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta', aseguradora: 'Aseguradora'
}

// ── COMPONENTE PRINCIPAL ─────────────────────────────────────
export default function CitasClient({ terapeutas, pacientes, citasIniciales , currentUserId}: Props) {
  const [citas, setCitas]           = useState<Cita[]>(citasIniciales)
  const [diaSeleccionado, setDia]   = useState(() => toISODate(new Date()))
  const [filtroTerapeuta, setFiltroTerapeuta] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'activas'|'completadas'|'canceladas'|'todas'>('activas')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoEdicion, setModoEdicion] = useState<Cita|null>(null)
  const [loading, setLoading]       = useState(false)
  const [errores, setErrores]       = useState<Record<string,string>>({})
  const [toast, setToast]           = useState<{msg:string;type:'success'|'error'}|null>(null)
  const [confirmCancelar, setConfirmCancelar] = useState<Cita|null>(null)
  const [pacientesDisponibles, setPacientesDisponibles] = useState<PacienteOpt[]>(pacientes)
  const [menuAbierto, setMenuAbierto] = useState<Cita|null>(null)
  const [registrarPago, setRegistrarPago] = useState(false)
  const [modalPagoCita, setModalPagoCita] = useState<Cita|null>(null)
  const [erroresPago, setErroresPago] = useState<Record<string,string>>({})
  const [infoPaquete, setInfoPaquete] = useState<{ tiene_contrato: boolean; paquete_nombre?: string; duracion_sesion_min?: number } | null>(null)
  const [procesandoSolicitud, setProcesandoSolicitud] = useState<number | null>(null)

  // ── SOLICITUDES PENDIENTES — visibles sin importar el día seleccionado ──
  const citasPendientes = useMemo(() => {
    return citas
      .filter(c => c.estado === 'pendiente_aprobacion')
      .sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora))
  }, [citas])

  async function resolverSolicitud(cita: Cita, accion: 'confirmar' | 'rechazar') {
    setProcesandoSolicitud(cita.id_cita)
    const res = await fetch('/api/citas/aprobar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cita_id: cita.id_cita, accion }),
    })
    const data = await res.json()
    setProcesandoSolicitud(null)

    if (!res.ok) {
      setToast({ msg: data.error ?? 'No se pudo procesar la solicitud', type: 'error' })
      return
    }

    setCitas(prev => prev.map(c => c.id_cita === cita.id_cita ? { ...c, estado: data.cita.estado } : c))
    setToast({
      msg: accion === 'confirmar' ? 'Cita confirmada — se notificó al paciente por correo' : 'Solicitud rechazada',
      type: 'success',
    })
  }



  // ── FILTRO DINÁMICO POR DÍA Y TERAPEUTA (DOM) ─────────────────
  const citasDelDia = useMemo(() => {
    return citas
      .filter(c => toISODate(new Date(c.fecha_hora)) === diaSeleccionado)
      .filter(c => filtroTerapeuta ? c.terapeuta_id === filtroTerapeuta : true)
      .filter(c => {
        if (filtroEstado === 'todas') return true
        if (filtroEstado === 'activas') return c.estado === 'programada'
        if (filtroEstado === 'completadas') return c.estado === 'completada'
        if (filtroEstado === 'canceladas') return c.estado === 'cancelada' || c.estado === 'no_asistio'
        return true
      })
      .sort((a,b) => a.fecha_hora.localeCompare(b.fecha_hora))
  }, [citas, diaSeleccionado, filtroTerapeuta, filtroEstado])

  // ── NAVEGACIÓN DE DÍAS — evento click ─────────────────────────
  function cambiarDia(delta: number) {
    const d = new Date(diaSeleccionado + 'T00:00:00')
    d.setDate(d.getDate() + delta)
    setDia(toISODate(d))
  }

  // ── ABRIR MODAL ────────────────────────────────────────────────
  function abrirModalNuevo() {
    setModoEdicion(null)
    setErrores({})
    setRegistrarPago(false)
    setInfoPaquete(null)
    setModalAbierto(true)
  }
  function abrirModalEdicion(c: Cita) {
    setModoEdicion(c)
    setErrores({})
    setRegistrarPago(false)
    setInfoPaquete(null)
    setModalAbierto(true)
  }
  function cerrarModal() {
    setModalAbierto(false)
    setModoEdicion(null)
    setErrores({})
    setRegistrarPago(false)
    setInfoPaquete(null)
  }

  // ── EVENTO: al elegir paciente, filtrar terapeuta sugerido Y
  //    autocompletar la duración según su paquete activo ──────────
  function handlePacienteChange(pacienteId: string) {
    const p = pacientes.find(x => x.id_paciente === Number(pacienteId))
    return p?.terapeuta_id ?? ''
  }

  async function consultarPaqueteDePaciente(pacienteId: string, form: HTMLFormElement) {
    setInfoPaquete(null)
    if (!pacienteId) return
    try {
      const res = await fetch(`/api/contratos/activo?paciente_id=${pacienteId}`)
      const data = await res.json()
      if (!res.ok) return
      setInfoPaquete(data)
      if (data.tiene_contrato && data.duracion_sesion_min) {
        const sel = form.elements.namedItem('duracion_min') as HTMLSelectElement
        // Autocompleta, pero no bloquea — la secretaria puede cambiarlo si hace falta.
        const opciones = ['30','45','60','90']
        const valor = String(data.duracion_sesion_min)
        if (sel && opciones.includes(valor)) sel.value = valor
      }
    } catch {
      // Si falla la consulta, simplemente no autocompleta — no bloquea el flujo.
    }
  }

  // ── GUARDAR CITA (Fetch asíncrona) ────────────────────────────
  async function guardarCita(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const campos = {
      paciente_id:   fd.get('paciente_id') as string,
      terapeuta_id:  fd.get('terapeuta_id') as string,
      fecha:         fd.get('fecha') as string,
      hora:          fd.get('hora') as string,
      duracion_min:  fd.get('duracion_min') as string,
      notas:         fd.get('notas') as string,
      registrar_pago:    fd.get('registrar_pago') as string,
      monto_pago:        fd.get('monto_pago') as string,
      metodo_pago:       fd.get('metodo_pago') as string,
      estado_pago:       fd.get('estado_pago') as string,
    }

    const errs = validarCampos(campos)
    // Validar pago si está marcado
    if (campos.registrar_pago === 'si') {
      if (!campos.monto_pago || Number(campos.monto_pago) <= 0) errs.monto_pago = 'Indica un monto válido'
      if (!campos.metodo_pago) errs.metodo_pago = 'Selecciona un método de pago'
    }
    if (Object.keys(errs).length > 0) { setErrores(errs); return }

    setLoading(true)

    const fecha_hora = new Date(`${campos.fecha}T${campos.hora}:00`).toISOString()
    const payload = {
      paciente_id:  Number(campos.paciente_id),
      terapeuta_id: campos.terapeuta_id,
      fecha_hora,
      duracion_min: Number(campos.duracion_min),
      notas:        campos.notas,
    }

    const res = await fetch('/api/citas', {
      method:  modoEdicion ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(modoEdicion ? { ...payload, id: modoEdicion.id_cita } : payload),
    })

    const data = await res.json()

    // Si se solicitó registrar pago y la cita se creó correctamente
    let pagoCreado: any = null
    if (res.ok && !modoEdicion && campos.registrar_pago === 'si') {
      const pagoRes = await fetch('/api/pagos', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          paciente_id: Number(campos.paciente_id),
          cita_id:     data.cita.id_cita,
          monto:       Number(campos.monto_pago),
          metodo_pago: campos.metodo_pago,
          estado_pago: campos.estado_pago || 'pendiente',
        }),
      })
      const pagoData = await pagoRes.json()
      if (pagoRes.ok) pagoCreado = pagoData.pago
    }

    setLoading(false)

    if (!res.ok) {
      setToast({ msg: data.error ?? 'Error al guardar', type: 'error' })
      return
    }

    if (modoEdicion) {
      setCitas(prev => prev.map(c => c.id_cita === modoEdicion.id_cita ? data.cita : c))
      setToast({ msg: 'Cita actualizada correctamente', type: 'success' })
    } else {
      const citaConPago = pagoCreado ? { ...data.cita, pagos: [pagoCreado] } : data.cita
      setCitas(prev => [...prev, citaConPago])
      setToast({ msg: 'Cita registrada correctamente', type: 'success' })
      setDia(toISODate(new Date(fecha_hora)))
    }
    cerrarModal()
  }

  // ── REGISTRAR PAGO DE UNA CITA EXISTENTE (que quedó "Sin registro") ──
  async function registrarPagoCita(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!modalPagoCita) return
    const fd = new FormData(e.currentTarget)
    const campos = {
      monto:       fd.get('monto') as string,
      metodo_pago: fd.get('metodo_pago') as string,
      estado_pago: fd.get('estado_pago') as string,
    }
    const errs: Record<string,string> = {}
    if (!campos.monto || Number(campos.monto) <= 0) errs.monto = 'Indica un monto válido'
    if (!campos.metodo_pago) errs.metodo_pago = 'Selecciona un método de pago'
    if (Object.keys(errs).length > 0) { setErroresPago(errs); return }

    setLoading(true)
    const res = await fetch('/api/pagos', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        paciente_id: modalPagoCita.paciente_id,
        cita_id:     modalPagoCita.id_cita,
        monto:       Number(campos.monto),
        metodo_pago: campos.metodo_pago,
        estado_pago: campos.estado_pago || 'pendiente',
      }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setToast({ msg: data.error ?? 'Error al registrar el pago', type: 'error' })
      return
    }

    // Vincular el pago recién creado a la cita en el estado local,
    // así deja de mostrar "— Sin registro —" sin necesidad de recargar.
    setCitas(prev => prev.map(c => c.id_cita === modalPagoCita.id_cita ? { ...c, pagos: [data.pago] } : c))
    setToast({ msg: 'Pago registrado correctamente', type: 'success' })
    setModalPagoCita(null)
    setErroresPago({})
  }

  // ── CAMBIAR ESTADO (cancelar / completar / no asistió) ─────────
  async function cambiarEstadoCita(c: Cita, estado: string) {
    setLoading(true)
    const res = await fetch('/api/citas', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: c.id_cita, estado }),
    })
    setLoading(false)
    setConfirmCancelar(null)
    setMenuAbierto(null)
    if (res.ok) {
      setCitas(prev => prev.map(ci => ci.id_cita === c.id_cita ? { ...ci, estado: estado as Cita['estado'] } : ci))
      setToast({ msg: `Cita marcada como "${ESTADO_LABELS[estado]}"`, type: 'success' })
    } else {
      setToast({ msg: 'Error al actualizar la cita', type: 'error' })
    }
  }

  // ── RENDER ────────────────────────────────────────────────────
  const fechaObj = new Date(diaSeleccionado + 'T00:00:00')
  const esHoy = diaSeleccionado === toISODate(new Date())

  return (
    <>
    <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --bg:#060B14;--sidebar:#0A1220;--card:rgba(255,255,255,0.035);--card-border:rgba(255,255,255,0.09);
          --border:rgba(255,255,255,0.09);--surface2:rgba(255,255,255,0.07);
          --blue:#2563EB;--blue-2:#3B82F6;--cyan:#38BDF8;
          --text:#E7EDF7;--muted:#8C9BB5;
          --red:#F25555;--amber:#F5B400;--green:#34D399;
        }
        body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex}

        /* MAIN */
        .main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
        .topbar{height:56px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 28px;flex-shrink:0}
        .topbar-title{font-size:14px;color:var(--muted);font-weight:500}
        .topbar-right{display:flex;align-items:center;gap:16px}
        .online-dot{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--cyan);font-weight:500}
        .dot{width:7px;height:7px;border-radius:50%;background:var(--cyan);box-shadow:0 0 8px var(--cyan)}
        .notif{width:32px;height:32px;border-radius:9px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:15px;transition:background .18s}
        .notif:hover{background:var(--surface2)}
        .content{flex:1;overflow-y:auto;padding:28px}

        .page-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;flex-wrap:wrap;gap:12px}
        .page-title{font-size:26px;font-weight:800;color:var(--text);letter-spacing:-0.015em}
        .page-sub{font-size:14px;color:var(--muted);margin-top:4px}
        .btn-nuevo{background:linear-gradient(135deg,var(--blue),var(--cyan));color:#fff;border:none;border-radius:11px;padding:11px 20px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;display:flex;align-items:center;gap:7px;transition:transform .2s,box-shadow .2s;box-shadow:0 4px 18px rgba(37,99,235,0.32)}
        .btn-nuevo:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(56,189,248,0.4)}

        /* NAVEGADOR DE DÍA */
        .day-nav{display:flex;align-items:center;gap:14px;margin-bottom:20px;background:var(--card);border:1px solid var(--card-border);border-radius:14px;padding:14px 20px}
        .day-arrow{background:var(--surface2);border:1px solid var(--border);border-radius:9px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;color:var(--muted);transition:all .18s;flex-shrink:0}
        .day-arrow:hover{background:rgba(56,189,248,0.15);border-color:rgba(56,189,248,0.3);color:var(--cyan)}
        .day-label{flex:1;text-align:center;animation:fadeIn .25s ease}
        .day-label-main{font-size:16px;font-weight:700;color:var(--text);text-transform:capitalize}
        .day-label-sub{font-size:12px;color:var(--muted);margin-top:2px}
        .day-today-badge{background:rgba(56,189,248,0.15);color:var(--cyan);font-size:11px;font-weight:600;padding:3px 10px;border-radius:100px;margin-left:8px}
        .day-today-btn{background:var(--surface2);border:1px solid var(--border);border-radius:9px;padding:8px 14px;font-size:12px;font-weight:500;color:var(--muted);cursor:pointer;font-family:'Inter',sans-serif;transition:all .18s;flex-shrink:0}
        .day-today-btn:hover{color:var(--text);border-color:rgba(56,189,248,0.3)}

        /* FILTRO TERAPEUTA */
        .filters{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap}
        .filter-tab{background:var(--card);border:1px solid var(--card-border);border-radius:9px;padding:8px 14px;font-size:13px;font-weight:500;color:var(--muted);cursor:pointer;font-family:'Inter',sans-serif;transition:all .18s}
        .filter-tab:hover{border-color:rgba(56,189,248,0.35);color:var(--text)}
        .filter-tab.active{background:rgba(56,189,248,0.14);border-color:rgba(56,189,248,0.4);color:var(--cyan)}

        /* LISTA DE CITAS */
        .table-card{background:var(--card);border:1px solid var(--card-border);border-radius:16px;overflow:hidden}
        .cita-header-row{display:grid;grid-template-columns:90px 1.8fr 1.1fr 1.2fr 1fr 50px;gap:14px;padding:10px 20px;border-bottom:1px solid var(--border)}
        .th{font-size:11px;font-weight:600;color:var(--muted);letter-spacing:0.07em;text-transform:uppercase}
        .cita-row{display:grid;grid-template-columns:90px 1.8fr 1.1fr 1.2fr 1fr 50px;gap:14px;padding:16px 20px;border-bottom:1px solid var(--border);align-items:center;animation:fadeIn .3s ease both;transition:background .18s;min-width:0}
        .cita-row > div{min-width:0;overflow:hidden}
        .cita-row:last-child{border-bottom:none}
        .cita-row:hover{background:var(--surface2)}
        .cita-hora{font-size:15px;font-weight:700;color:var(--cyan)}
        .cita-hora-sub{font-size:11px;color:var(--muted);margin-top:2px}
        .cita-paciente{font-size:13px;font-weight:500;color:var(--text)}
        .cita-notas{font-size:11px;color:var(--muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
        .cita-terapeuta{font-size:13px;color:var(--muted)}
        .cita-pago{display:flex;flex-direction:column;gap:4px}
        .pago-monto{font-size:13px;font-weight:700;color:var(--text)}
        .pago-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
        .pago-metodo{font-size:11px;color:var(--muted)}
        .pago-sin{font-size:12px;color:var(--muted);opacity:0.5;font-style:italic}
        .badge-mini{font-size:10px;font-weight:600;padding:2px 8px;border-radius:100px;display:inline-block}
        .badge{font-size:11px;font-weight:600;padding:3px 10px;border-radius:100px;display:inline-block}
        .b-blue{background:rgba(56,189,248,0.15);color:var(--cyan)}
        .b-green{background:rgba(52,211,153,0.15);color:var(--green)}
        .b-red{background:rgba(242,85,85,0.15);color:var(--red)}
        .b-amber{background:rgba(245,180,0,0.15);color:var(--amber)}
        .b-purple{background:rgba(167,139,250,0.15);color:#A78BFA}
        .actions{display:flex;justify-content:flex-end}
        .btn-menu{background:var(--surface2);border:1px solid var(--border);border-radius:8px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;color:var(--muted);transition:all .18s;font-family:'Inter',sans-serif}
        .btn-menu:hover{background:rgba(56,189,248,0.15);border-color:rgba(56,189,248,0.3);color:var(--cyan)}

        /* ACTION SHEET */
        .action-sheet{background:#0A1220;border:1px solid var(--border);border-radius:16px;width:100%;max-width:340px;animation:slideUp .2s ease;overflow:hidden}
        .action-sheet-header{padding:18px 20px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
        .action-sheet-title{font-size:15px;font-weight:700;color:var(--text)}
        .action-sheet-sub{font-size:12px;color:var(--muted);margin-top:2px}
        .action-sheet-body{padding:8px}
        .action-item{display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:none;border:none;color:var(--text);font-size:14px;font-weight:500;padding:13px 14px;border-radius:10px;cursor:pointer;font-family:'Inter',sans-serif;transition:background .15s}
        .action-item:hover{background:var(--surface2)}
        .action-icon{font-size:16px;width:22px;text-align:center;flex-shrink:0}
        .action-divider{height:1px;background:var(--border);margin:6px 8px}
        .action-danger{color:var(--red)}
        .action-danger:hover{background:rgba(242,85,85,0.10)}
        .empty-state{padding:60px 20px;text-align:center;color:var(--muted);font-size:14px}

        /* MODAL */
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .2s ease}
        .modal{background:#0A1220;border:1px solid var(--border);border-radius:20px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;animation:slideUp .25s ease}
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
        .form-input,.form-select,.form-textarea{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:11px 13px;font-size:14px;font-family:'Inter',sans-serif;color:var(--text);outline:none;transition:border-color .2s,box-shadow .2s;width:100%}
        .form-input:focus,.form-select:focus,.form-textarea:focus{border-color:var(--cyan);box-shadow:0 0 0 3px rgba(56,189,248,0.12)}
        .form-input::placeholder,.form-textarea::placeholder{color:rgba(231,237,247,0.25)}
        .form-select option{background:#0A1220;color:var(--text)}
        .form-input.err,.form-select.err{border-color:rgba(242,85,85,0.5)}
        .err-msg{font-size:11px;color:var(--red)}
        .pago-toggle{display:flex;align-items:center;gap:10px;font-size:13px;font-weight:500;color:var(--text);cursor:pointer;padding:12px 14px;background:rgba(56,189,248,0.07);border:1px solid rgba(56,189,248,0.2);border-radius:10px}
        .aviso-check{width:18px;height:18px;accent-color:var(--cyan);flex-shrink:0}
        .pago-fields{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px;padding-top:14px;border-top:1px solid var(--border);animation:fadeIn .2s ease}
        .modal-footer{padding:0 28px 24px;display:flex;gap:10px;justify-content:flex-end}
        .btn-cancel{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:11px 20px;font-size:14px;font-weight:500;color:var(--muted);cursor:pointer;font-family:'Inter',sans-serif;transition:all .18s}
        .btn-cancel:hover{color:var(--text)}
        .btn-save{background:linear-gradient(135deg,var(--blue),var(--cyan));color:#fff;border:none;border-radius:10px;padding:11px 24px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;display:flex;align-items:center;gap:8px;transition:transform .2s,box-shadow .2s;box-shadow:0 4px 16px rgba(37,99,235,0.3)}
        .btn-save:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(56,189,248,0.4)}
        .btn-save:disabled{opacity:.5;cursor:not-allowed;transform:none}

        /* MODAL CONFIRMAR */
        .confirm-modal{background:#1A0E0E;border:1px solid rgba(242,85,85,0.25);border-radius:18px;width:100%;max-width:380px;padding:28px;animation:slideUp .2s ease}
        .confirm-title{font-size:17px;font-weight:700;color:var(--text);margin-bottom:8px}
        .confirm-body{font-size:14px;color:var(--muted);line-height:1.6;margin-bottom:24px}
        .confirm-name{color:var(--text);font-weight:600}
        .confirm-btns{display:flex;gap:10px;justify-content:flex-end}
        .btn-danger{background:var(--red);color:#fff;border:none;border-radius:10px;padding:10px 20px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:opacity .2s}
        .btn-danger:hover{opacity:.85}

        /* CHATBOT */
        .chatbot-bubble{position:fixed;bottom:28px;right:28px;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--blue),var(--cyan));display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;box-shadow:0 8px 24px rgba(37,99,235,0.4);transition:transform .2s;z-index:50;text-decoration:none}
        .chatbot-bubble:hover{transform:scale(1.08)}

        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }

        @media (max-width: 900px) {
          .cita-row{grid-template-columns:70px 1fr;row-gap:6px}
          .cita-terapeuta, .actions{grid-column:2}
        }
      `}</style>

      <Sidebar
              rol="secretaria"
              nombre="Secretaria"
              subRol="Acceso Operativo"
              icono="📁"
              items={[
                { icon:'🏠', label:'Panel',          href:'/secretaria/dashboard', active:false },
                { icon:'📅', label:'Agenda General', href:'/secretaria/citas',     active:true },
                { icon:'👥', label:'Pacientes',       href:'/secretaria/pacientes', active:false },
                { icon:'💳', label:'Pagos',           href:'/secretaria/pagos',     active:false },
              ]}
      />

      {/* MAIN */}
      <div className="main">
        <div className="topbar">

          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <MenuButton />
            <span className="topbar-title">Agenda General</span>
          </div>

          <div className="topbar-right">
            <div className="online-dot"><div className="dot"/>En línea</div>
            <NotifBell userId={currentUserId} rol="secretaria" />
          </div>
        </div>

        <div className="content">
          <div className="page-header">
            <div>
              <div className="page-title">Agenda de citas</div>
              <div className="page-sub">Gestiona las citas de todos los terapeutas</div>
            </div>
            <button className="btn-nuevo" onClick={abrirModalNuevo}>+ Nueva cita</button>
          </div>

          {/* SOLICITUDES PENDIENTES — de cualquier día, no solo el seleccionado */}
          {citasPendientes.length > 0 && (
            <div style={{background:'rgba(167,139,250,0.06)',border:'1px solid rgba(167,139,250,0.25)',borderRadius:14,padding:'16px 20px',marginBottom:22}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                <span style={{fontSize:14,fontWeight:700,color:'var(--text)'}}>⏳ Solicitudes pendientes de aprobación</span>
                <span style={{fontSize:11,fontWeight:700,color:'#A78BFA',background:'rgba(167,139,250,0.15)',padding:'2px 9px',borderRadius:100}}>
                  {citasPendientes.length}
                </span>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {citasPendientes.map(c => (
                  <div key={c.id_cita} style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'var(--surface2)',borderRadius:10,padding:'10px 14px',gap:10,flexWrap:'wrap'}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{c.pacientes?.nombre_completo ?? '—'}</div>
                      <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>
                        {new Date(c.fecha_hora).toLocaleDateString('es-MX',{weekday:'short',day:'numeric',month:'short'})}, {formatHora(c.fecha_hora)} hrs
                        {' '}· {c.duracion_min} min · {c.profiles?.nombre_completo ?? 'Terapeuta'}
                      </div>
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <button
                        disabled={procesandoSolicitud === c.id_cita}
                        onClick={() => resolverSolicitud(c, 'confirmar')}
                        style={{background:'rgba(52,211,153,0.15)',border:'1px solid rgba(52,211,153,0.3)',borderRadius:8,padding:'6px 14px',fontSize:12.5,fontWeight:600,color:'var(--green)',cursor:'pointer',fontFamily:'Inter',opacity:procesandoSolicitud===c.id_cita?0.5:1}}
                      >✓ Confirmar</button>
                      <button
                        disabled={procesandoSolicitud === c.id_cita}
                        onClick={() => resolverSolicitud(c, 'rechazar')}
                        style={{background:'rgba(242,85,85,0.10)',border:'1px solid rgba(242,85,85,0.3)',borderRadius:8,padding:'6px 14px',fontSize:12.5,fontWeight:600,color:'var(--red)',cursor:'pointer',fontFamily:'Inter',opacity:procesandoSolicitud===c.id_cita?0.5:1}}
                      >✕ Rechazar</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NAVEGADOR DE DÍA — eventos click */}
          <div className="day-nav">
            <div className="day-arrow" onClick={() => cambiarDia(-1)}>←</div>
            <div className="day-label" key={diaSeleccionado}>
              <div className="day-label-main">
                {formatFechaLarga(fechaObj)}
                {esHoy && <span className="day-today-badge">Hoy</span>}
              </div>
              <div className="day-label-sub">{citasDelDia.length} cita{citasDelDia.length!==1?'s':''} en este filtro</div>
            </div>
            <div className="day-arrow" onClick={() => cambiarDia(1)}>→</div>
            {!esHoy && (
              <button className="day-today-btn" onClick={() => setDia(toISODate(new Date()))}>Hoy</button>
            )}
          </div>

          {/* FILTRO POR ESTADO */}
          <div className="filters">
            {[
              {key:'activas',     label:'Programadas'},
              {key:'completadas', label:'Completadas'},
              {key:'canceladas',  label:'Canceladas / No asistió'},
              {key:'todas',       label:'Todas'},
            ].map(f => (
              <button key={f.key} className={`filter-tab${filtroEstado===f.key?' active':''}`} onClick={() => setFiltroEstado(f.key as any)}>
                {f.label}
              </button>
            ))}
          </div>

          {/* FILTRO POR TERAPEUTA */}
          <div className="filters">
            <button className={`filter-tab${filtroTerapeuta===''?' active':''}`} onClick={() => setFiltroTerapeuta('')}>
              Todos los terapeutas
            </button>
            {terapeutas.map(t => (
              <button key={t.id} className={`filter-tab${filtroTerapeuta===t.id?' active':''}`} onClick={() => setFiltroTerapeuta(t.id)}>
                {t.nombre_completo}
              </button>
            ))}
          </div>

          {/* LISTA DE CITAS DEL DÍA */}
          <div className="table-card">
            <div className="cita-header-row">
              <div className="th">Hora</div>
              <div className="th">Paciente</div>
              <div className="th">Terapeuta</div>
              <div className="th">Pago</div>
              <div className="th">Estado</div>
              <div className="th"></div>
            </div>
            {loading && <Loader />}

            {!loading && citasDelDia.length === 0 && (
              <div className="empty-state">No hay citas programadas para este día</div>
            )}

            {!loading && citasDelDia.map((c, i) => (
              <div className="cita-row" key={c.id_cita} style={{animationDelay:`${i*40}ms`}}>
                <div>
                  <div className="cita-hora">{formatHora(c.fecha_hora)}</div>
                  <div className="cita-hora-sub">{c.duracion_min} min</div>
                </div>
                <div>
                  <div className="cita-paciente">{c.pacientes?.nombre_completo ?? '—'}</div>
                  {c.notas && <div className="cita-notas">{c.notas}</div>}
                </div>
                <div className="cita-terapeuta">{c.profiles?.nombre_completo ?? '—'}</div>
                <div className="cita-pago">
                  {c.pagos && c.pagos.length > 0 ? (
                    <>
                      <div className="pago-monto">${Number(c.pagos[0].monto).toLocaleString('es-MX',{minimumFractionDigits:2})}</div>
                      <div className="pago-meta">
                        <span className={`badge-mini ${c.pagos[0].estado_pago==='pagado'?'b-green':'b-amber'}`}>
                          {c.pagos[0].estado_pago==='pagado' ? 'Pagado' : 'Pendiente'}
                        </span>
                        <span className="pago-metodo">{METODO_LABELS[c.pagos[0].metodo_pago] ?? c.pagos[0].metodo_pago}</span>
                      </div>
                    </>
                  ) : (
                    <span className="pago-sin">— Sin registro —</span>
                  )}
                </div>
                <div><span className={`badge ${ESTADO_CLASS[c.estado]}`}>{ESTADO_LABELS[c.estado]}</span></div>
                <div className="actions">
                  {c.estado === 'programada' && (
                    <button className="btn-menu" onClick={() => setMenuAbierto(c)}>⋮</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL REGISTRO / EDICIÓN */}
      {modalAbierto && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) cerrarModal() }}>
          <div className="modal">
            <div className="modal-header">
              <div>
                <div className="modal-title">{modoEdicion ? 'Editar cita' : 'Agendar nueva cita'}</div>
                <div className="modal-sub">{modoEdicion ? 'Modifica los datos de la cita' : 'Completa todos los campos obligatorios'}</div>
              </div>
              <button className="modal-close" onClick={cerrarModal}>✕</button>
            </div>

            <form onSubmit={guardarCita} noValidate>
              <div className="modal-body">
                <div className="form-grid">
                  {/* Paciente */}
                  <div className="form-group form-grid-full">
                    <label className="form-label">Paciente *</label>
                    <select name="paciente_id" className={`form-select${errores.paciente_id?' err':''}`}
                      defaultValue={modoEdicion?.paciente_id ?? ''}
                      onChange={e => {
                        const sugerido = handlePacienteChange(e.target.value)
                        const sel = (e.target.form?.elements.namedItem('terapeuta_id') as HTMLSelectElement)
                        if (sel && sugerido) sel.value = sugerido
                        if (e.target.form) consultarPaqueteDePaciente(e.target.value, e.target.form)
                      }}>
                      <option value="">— Selecciona un paciente —</option>
                      {pacientes.map(p => (
                        <option key={p.id_paciente} value={p.id_paciente}>{p.nombre_completo}</option>
                      ))}
                    </select>
                    {errores.paciente_id && <span className="err-msg">{errores.paciente_id}</span>}
                  </div>
                  {/* Terapeuta */}
                  <div className="form-group form-grid-full">
                    <label className="form-label">Terapeuta *</label>
                    <select name="terapeuta_id" className={`form-select${errores.terapeuta_id?' err':''}`}
                      defaultValue={modoEdicion?.terapeuta_id ?? ''}>
                      <option value="">— Selecciona un terapeuta —</option>
                      {terapeutas.map(t => (
                        <option key={t.id} value={t.id}>{t.nombre_completo}</option>
                      ))}
                    </select>
                    {errores.terapeuta_id && <span className="err-msg">{errores.terapeuta_id}</span>}
                  </div>
                  {/* Fecha */}
                  <div className="form-group">
                    <label className="form-label">Fecha *</label>
                    <input name="fecha" type="date" className={`form-input${errores.fecha?' err':''}`}
                      min={toISODate(new Date())}
                      defaultValue={modoEdicion ? toISODate(new Date(modoEdicion.fecha_hora)) : diaSeleccionado} />
                    {errores.fecha && <span className="err-msg">{errores.fecha}</span>}
                  </div>
                  {/* Hora */}
                  <div className="form-group">
                    <label className="form-label">Hora * (08:00-20:00)</label>
                    <input name="hora" type="time" className={`form-input${errores.hora?' err':''}`}
                      min="08:00" max="20:00"
                      defaultValue={modoEdicion ? formatHora(modoEdicion.fecha_hora) : ''} />
                    {errores.hora && <span className="err-msg">{errores.hora}</span>}
                  </div>
                  {/* Duración */}
                  <div className="form-group form-grid-full">
                    <label className="form-label">Duración *</label>
                    <select name="duracion_min" className={`form-select${errores.duracion_min?' err':''}`}
                      defaultValue={modoEdicion?.duracion_min ?? '60'}>
                      <option value="30">30 minutos</option>
                      <option value="45">45 minutos</option>
                      <option value="60">60 minutos</option>
                      <option value="90">90 minutos</option>
                    </select>
                    {errores.duracion_min && <span className="err-msg">{errores.duracion_min}</span>}
                    {infoPaquete?.tiene_contrato && infoPaquete.duracion_sesion_min && (
                      <span style={{fontSize:11.5,color:'var(--cyan)',marginTop:4,display:'block'}}>
                        ⓘ Autocompletado según su paquete "{infoPaquete.paquete_nombre}" ({infoPaquete.duracion_sesion_min} min) — puedes cambiarlo si hace falta.
                      </span>
                    )}
                    {infoPaquete && !infoPaquete.tiene_contrato && (
                      <span style={{fontSize:11.5,color:'var(--amber)',marginTop:4,display:'block'}}>
                        ⚠ Este paciente no tiene un paquete activo — la duración se dejó por defecto.
                      </span>
                    )}
                  </div>
                  {/* Notas */}
                  <div className="form-group form-grid-full">
                    <label className="form-label">Notas (opcional)</label>
                    <textarea name="notas" className="form-textarea" rows={3}
                      placeholder="Información adicional sobre la cita..."
                      defaultValue={modoEdicion?.notas ?? ''} />
                  </div>

                  {/* Pago — solo al agendar cita nueva */}
                  {!modoEdicion && (
                    <div className="form-group form-grid-full">
                      <label className="pago-toggle">
                        <input type="checkbox" name="registrar_pago" value="si" className="aviso-check"
                          checked={registrarPago}
                          onChange={e => setRegistrarPago(e.target.checked)} />
                        <span>💳 Registrar pago de esta sesión ahora</span>
                      </label>

                      {/* DOM dinámico — los campos de pago aparecen solo si se activa el checkbox */}
                      {registrarPago && (
                        <div className="pago-fields">
                          <div className="form-group">
                            <label className="form-label">Monto *</label>
                            <input name="monto_pago" type="number" min="0" step="0.01"
                              className={`form-input${errores.monto_pago?' err':''}`}
                              placeholder="$0.00" />
                            {errores.monto_pago && <span className="err-msg">{errores.monto_pago}</span>}
                          </div>
                          <div className="form-group">
                            <label className="form-label">Método de pago *</label>
                            <select name="metodo_pago" className={`form-select${errores.metodo_pago?' err':''}`} defaultValue="">
                              <option value="">— Selecciona —</option>
                              <option value="efectivo">Efectivo</option>
                              <option value="transferencia">Transferencia</option>
                              <option value="tarjeta">Tarjeta</option>
                              <option value="aseguradora">Aseguradora</option>
                            </select>
                            {errores.metodo_pago && <span className="err-msg">{errores.metodo_pago}</span>}
                          </div>
                          <div className="form-group form-grid-full">
                            <label className="form-label">Estado del pago</label>
                            <select name="estado_pago" className="form-select" defaultValue="pagado">
                              <option value="pagado">Pagado ahora</option>
                              <option value="pendiente">Pendiente — cobrar después</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={cerrarModal}>Cancelar</button>
                <button type="submit" className="btn-save" disabled={loading}>
                  {loading && <div style={{width:14,height:14,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',animation:'spin .7s linear infinite'}}/>}
                  {modoEdicion ? 'Guardar cambios' : 'Agendar cita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ACTION SHEET — opciones de la cita */}
      {menuAbierto && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) setMenuAbierto(null) }}>
          <div className="action-sheet">
            <div className="action-sheet-header">
              <div>
                <div className="action-sheet-title">{menuAbierto.pacientes?.nombre_completo}</div>
                <div className="action-sheet-sub">{formatHora(menuAbierto.fecha_hora)} · {menuAbierto.duracion_min} min</div>
              </div>
              <button className="modal-close" onClick={() => setMenuAbierto(null)}>✕</button>
            </div>
            <div className="action-sheet-body">
              <button className="action-item" onClick={() => { abrirModalEdicion(menuAbierto); setMenuAbierto(null) }}>
                <span className="action-icon">✏️</span> Editar cita
              </button>
              {(!menuAbierto.pagos || menuAbierto.pagos.length === 0) && (
                <button className="action-item" onClick={() => { setModalPagoCita(menuAbierto); setErroresPago({}); setMenuAbierto(null) }}>
                  <span className="action-icon">💳</span> Registrar pago
                </button>
              )}
              <button className="action-item" onClick={() => cambiarEstadoCita(menuAbierto, 'completada')}>
                <span className="action-icon">✅</span> Marcar como completada
              </button>
              <button className="action-item" onClick={() => cambiarEstadoCita(menuAbierto, 'no_asistio')}>
                <span className="action-icon">⚠️</span> Marcar "No asistió"
              </button>
              <div className="action-divider" />
              <button className="action-item action-danger" onClick={() => { setConfirmCancelar(menuAbierto); setMenuAbierto(null) }}>
                <span className="action-icon">✕</span> Cancelar cita
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR CANCELACIÓN */}
      {confirmCancelar && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) setConfirmCancelar(null) }}>
          <div className="confirm-modal">
            <div className="confirm-title">⚠ Cancelar cita</div>
            <p className="confirm-body">
              ¿Deseas cancelar la cita de <span className="confirm-name">{confirmCancelar.pacientes?.nombre_completo}</span> el {formatHora(confirmCancelar.fecha_hora)}? Esta acción notificará al terapeuta.
            </p>
            <div className="confirm-btns">
              <button className="btn-cancel" onClick={() => setConfirmCancelar(null)}>Volver</button>
              <button className="btn-danger" onClick={() => cambiarEstadoCita(confirmCancelar, 'cancelada')}>Cancelar cita</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR PAGO DE UNA CITA SIN PAGO */}
      {modalPagoCita && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) { setModalPagoCita(null); setErroresPago({}) } }}>
          <div className="modal">
            <div className="modal-header">
              <div>
                <div className="modal-title">Registrar pago</div>
                <div className="modal-sub">
                  {modalPagoCita.pacientes?.nombre_completo} · {formatHora(modalPagoCita.fecha_hora)}
                </div>
              </div>
              <button className="modal-close" onClick={() => { setModalPagoCita(null); setErroresPago({}) }}>✕</button>
            </div>
            <form onSubmit={registrarPagoCita} noValidate>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Monto *</label>
                    <input name="monto" type="number" min="0" step="0.01"
                      className={`form-input${erroresPago.monto?' err':''}`} placeholder="$0.00" />
                    {erroresPago.monto && <span className="err-msg">{erroresPago.monto}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Método de pago *</label>
                    <select name="metodo_pago" className={`form-select${erroresPago.metodo_pago?' err':''}`} defaultValue="">
                      <option value="">— Selecciona —</option>
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="tarjeta">Tarjeta</option>
                      <option value="aseguradora">Aseguradora</option>
                    </select>
                    {erroresPago.metodo_pago && <span className="err-msg">{erroresPago.metodo_pago}</span>}
                  </div>
                  <div className="form-group form-grid-full">
                    <label className="form-label">Estado del pago</label>
                    <select name="estado_pago" className="form-select" defaultValue="pagado">
                      <option value="pagado">Pagado ahora</option>
                      <option value="pendiente">Pendiente — cobrar después</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => { setModalPagoCita(null); setErroresPago({}) }}>Cancelar</button>
                <button type="submit" className="btn-save" disabled={loading}>
                  {loading && <div style={{width:14,height:14,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',animation:'spin .7s linear infinite'}}/>}
                  Registrar pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

    </>
  )
}
