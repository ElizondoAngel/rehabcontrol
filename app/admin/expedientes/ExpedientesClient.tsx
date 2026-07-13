'use client'

/**
 * ExpedientesClient.tsx
 * Admin — Expedientes clínicos completos
 * Vista de lista + detalle con pestañas
 */

import Link from 'next/link'
import { useState, useMemo, useEffect } from 'react'
import Sidebar, { MenuButton } from '@/app/components/Sidebar'
import TopbarActions from '@/app/components/TopbarActions'

// ── TIPOS ────────────────────────────────────────────────────
interface Cita { id_cita: number; estado: string }
interface Pago { id_pago: number; estado_pago: string; monto: number }
interface Expediente {
  id_expediente: number
  diagnostico: string
  estado: string
  fecha_apertura: string
  motivo_consulta?: string
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
  antecedentes?: string
  plan_tratamiento?: string
}
interface Paciente {
  id_paciente: number
  nombre_completo: string
  fecha_nacimiento: string
  telefono?: string
  activo: boolean
  created_at: string
  sexo?: string
  alergias?: string
  medicamentos_actuales?: string
  enfermedades_previas?: string
  cirugias_previas?: string
  lesiones_previas?: string
  contacto_emergencia?: string
  domicilio?: string
  profiles?: { nombre_completo: string } | null
  expedientes?: Expediente[]
  citas?: Cita[]
  pagos?: Pago[]
}
interface Props {
  pacientesIniciales: Paciente[]
  currentUserRol: string
  userId: string
  nombre?: string
}

// ── TOAST ────────────────────────────────────────────────────
function Toast({ msg, type, onClose }: { msg: string; type: 'success'|'error'; onClose: ()=>void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div style={{
      position:'fixed', bottom:90, right:28, zIndex:200,
      background: type==='success' ? 'rgba(52,211,153,0.10)' : 'rgba(242,85,85,0.10)',
      border: `1px solid ${type==='success' ? 'rgba(52,211,153,0.35)' : 'rgba(242,85,85,0.35)'}`,
      borderLeft: `3px solid ${type==='success' ? '#34D399' : '#F25555'}`,
      borderRadius:12, padding:'14px 18px', minWidth:280, maxWidth:380,
      display:'flex', alignItems:'center', gap:12,
      backdropFilter:'blur(16px)', boxShadow:'0 8px 32px rgba(0,0,0,0.5)', animation:'slideUp .3s ease',
    }}>
      <span style={{fontSize:18}}>{type==='success'?'✅':'❌'}</span>
      <span style={{fontSize:14, color:'#E7EDF7', flex:1}}>{msg}</span>
      <button onClick={onClose} style={{background:'none',border:'none',color:'rgba(231,237,247,0.4)',cursor:'pointer',fontSize:16}}>✕</button>
    </div>
  )
}

// ── UTILIDADES ───────────────────────────────────────────────
function calcEdad(fechaNac: string) {
  const hoy = new Date(); const nac = new Date(fechaNac)
  let edad = hoy.getFullYear() - nac.getFullYear()
  if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth()===nac.getMonth() && hoy.getDate()<nac.getDate())) edad--
  return edad
}

const ESTADO_BADGE: Record<string,string> = { activo:'b-green', alta:'b-blue', suspendido:'b-amber' }
const ESTADO_LABEL: Record<string,string> = { activo:'Activo', alta:'De alta', suspendido:'Suspendido' }

// ── COMPONENTE PRINCIPAL ─────────────────────────────────────
export default function ExpedientesClient({ pacientesIniciales, currentUserRol, userId, nombre }: Props) {
  const [pacientes, setPacientes] = useState<Paciente[]>(pacientesIniciales)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<Paciente|null>(null)
  const [tabActiva, setTabActiva] = useState('general')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{msg:string;type:'success'|'error'}|null>(null)
  const [editando, setEditando] = useState(false)
  const [formData, setFormData] = useState<Partial<Expediente>>({})

  const pacientesFiltrados = useMemo(() => {
    return pacientes.filter(p => {
      const exp = p.expedientes?.[0]
      const estado = exp?.estado ?? 'sin_expediente'
      const matchEstado = filtroEstado==='todos' ? true : filtroEstado==='sin_expediente' ? !exp : estado===filtroEstado
      const matchBusqueda = p.nombre_completo.toLowerCase().includes(busqueda.toLowerCase())
      return matchEstado && matchBusqueda
    })
  }, [pacientes, busqueda, filtroEstado])

  // ── ABRIR DETALLE ────────────────────────────────────────
  async function abrirExpediente(p: Paciente) {
    setLoading(true)
    // Recargar datos frescos del paciente seleccionado
    const res = await fetch(`/api/admin/expedientes?paciente_id=${p.id_paciente}`)
    const data = await res.json()
    setLoading(false)
    setPacienteSeleccionado(data.paciente ?? p)
    setTabActiva('general')
    setEditando(false)
  }

  // ── GUARDAR EXPEDIENTE ───────────────────────────────────
  async function guardarExpediente(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!pacienteSeleccionado) return
    const fd = new FormData(e.currentTarget)
    const body: Record<string,unknown> = { paciente_id: pacienteSeleccionado.id_paciente }
    fd.forEach((v, k) => { body[k] = v || null })

    setLoading(true)
    const exp = pacienteSeleccionado.expedientes?.[0]
    const res = await fetch('/api/admin/expedientes', {
      method: exp ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, id_expediente: exp?.id_expediente }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) { setToast({ msg: data.error ?? 'Error al guardar', type:'error' }); return }

    // Actualizar estado local
    setPacientes(prev => prev.map(p => p.id_paciente===pacienteSeleccionado.id_paciente
      ? { ...p, expedientes: [data.expediente] } : p
    ))
    setPacienteSeleccionado(prev => prev ? { ...prev, expedientes: [data.expediente] } : prev)
    setToast({ msg: exp ? 'Expediente actualizado' : 'Expediente creado correctamente', type:'success' })
    setEditando(false)
  }

  const exp = pacienteSeleccionado?.expedientes?.[0]
  const totalCitas = pacienteSeleccionado?.citas?.length ?? 0
  const citasCompletadas = pacienteSeleccionado?.citas?.filter(c => c.estado==='completada').length ?? 0
  const totalPagado = pacienteSeleccionado?.pagos?.filter(p => p.estado_pago==='pagado').reduce((s,p)=>s+Number(p.monto),0) ?? 0
  const adeudos = pacienteSeleccionado?.pagos?.filter(p => p.estado_pago==='pendiente').reduce((s,p)=>s+Number(p.monto),0) ?? 0

  return (
    <>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --bg:#060B14;--sidebar:#0A1220;--card:rgba(255,255,255,0.035);--card-border:rgba(255,255,255,0.09);
          --border:rgba(255,255,255,0.09);--surface2:rgba(255,255,255,0.07);
          --blue:#2563EB;--blue-2:#3B82F6;--cyan:#38BDF8;
          --text:#E7EDF7;--muted:#8C9BB5;
          --red:#F25555;--amber:#F5B400;--green:#34D399;--purple:#A78BFA;
        }
        body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex}

        /* MAIN */
        .main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
        .topbar{height:56px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 28px;flex-shrink:0}
        .topbar-title{font-size:14px;color:var(--muted);font-weight:500}
        .online-dot{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--cyan);font-weight:500}
        .dot{width:7px;height:7px;border-radius:50%;background:var(--cyan);box-shadow:0 0 8px var(--cyan)}
        .content{flex:1;overflow-y:auto;padding:28px}
        .page-title{font-size:26px;font-weight:800;color:var(--text);letter-spacing:-0.015em}
        .page-sub{font-size:14px;color:var(--muted);margin-top:4px;margin-bottom:24px}

        /* LAYOUT DOS COLUMNAS */
        .exp-layout{display:grid;grid-template-columns:340px 1fr;gap:16px;height:calc(100vh - 160px)}
        .lista-panel{background:var(--card);border:1px solid var(--card-border);border-radius:16px;display:flex;flex-direction:column;overflow:hidden}
        .lista-header{padding:16px;border-bottom:1px solid var(--border)}
        .search-wrap{position:relative}
        .search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:14px;color:var(--muted)}
        .search-input{width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px 12px 10px 34px;font-size:13px;font-family:'Inter',sans-serif;color:var(--text);outline:none;transition:border-color .2s}
        .search-input:focus{border-color:var(--cyan)}
        .search-input::placeholder{color:var(--muted)}
        .filtros-estado{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}
        .ftab{background:var(--surface2);border:1px solid var(--border);border-radius:7px;padding:5px 10px;font-size:11px;font-weight:500;color:var(--muted);cursor:pointer;font-family:'Inter',sans-serif;transition:all .15s}
        .ftab.active{background:rgba(56,189,248,0.14);border-color:rgba(56,189,248,0.4);color:var(--cyan)}
        .lista-scroll{flex:1;overflow-y:auto}
        .pac-item{display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .15s}
        .pac-item:hover{background:var(--surface2)}
        .pac-item.selected{background:linear-gradient(135deg,rgba(37,99,235,0.12),rgba(56,189,248,0.08));border-right:2px solid var(--cyan)}
        .pac-avatar{width:38px;height:38px;border-radius:50%;background:rgba(56,189,248,0.18);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--text);flex-shrink:0}
        .pac-name{font-size:13px;font-weight:500;color:var(--text)}
        .pac-meta{font-size:11px;color:var(--muted);margin-top:2px}
        .empty-lista{padding:40px 20px;text-align:center;color:var(--muted);font-size:13px}

        /* PANEL DETALLE */
        .detalle-panel{background:var(--card);border:1px solid var(--card-border);border-radius:16px;display:flex;flex-direction:column;overflow:hidden}
        .detalle-vacio{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:12px;color:var(--muted)}
        .detalle-vacio-icon{font-size:48px;opacity:.3}

        /* HEADER PACIENTE */
        .pac-header{padding:20px 24px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
        .pac-header-left{display:flex;align-items:center;gap:14px}
        .pac-header-avatar{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,rgba(37,99,235,0.3),rgba(56,189,248,0.2));display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:var(--text);flex-shrink:0}
        .pac-header-name{font-size:18px;font-weight:700;color:var(--text);letter-spacing:-0.01em}
        .pac-header-meta{font-size:13px;color:var(--muted);margin-top:3px}
        .pac-header-right{display:flex;gap:8px;align-items:center;flex-wrap:wrap}

        /* MÉTRICAS RÁPIDAS */
        .metricas-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:16px 24px;border-bottom:1px solid var(--border)}
        .metrica-mini{background:var(--surface2);border-radius:12px;padding:12px 14px;text-align:center}
        .metrica-mini-num{font-size:22px;font-weight:800;background:linear-gradient(110deg,var(--blue-2),var(--cyan));-webkit-background-clip:text;background-clip:text;color:transparent}
        .metrica-mini-label{font-size:10px;color:var(--muted);margin-top:3px;font-weight:500}

        /* TABS */
        .tabs-row{display:flex;gap:4px;padding:12px 24px 0;border-bottom:1px solid var(--border)}
        .tab-btn{padding:8px 14px;border-radius:8px 8px 0 0;font-size:13px;font-weight:500;color:var(--muted);cursor:pointer;border:none;background:none;font-family:'Inter',sans-serif;transition:all .18s;border-bottom:2px solid transparent;margin-bottom:-1px}
        .tab-btn:hover{color:var(--text)}
        .tab-btn.active{color:var(--cyan);border-bottom-color:var(--cyan)}
        .tab-content{flex:1;overflow-y:auto;padding:20px 24px}

        /* SECCIONES */
        .seccion{margin-bottom:24px}
        .seccion-title{font-size:12px;font-weight:700;color:var(--muted);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:12px;display:flex;align-items:center;gap:8px}
        .seccion-title::after{content:'';flex:1;height:1px;background:var(--border)}
        .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .info-item{background:var(--surface2);border-radius:10px;padding:12px 14px}
        .info-label{font-size:10px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px}
        .info-value{font-size:13px;color:var(--text);font-weight:500;line-height:1.4}
        .info-value.empty{color:var(--muted);font-style:italic;font-weight:400}
        .info-item.full{grid-column:1/-1}

        /* FORMULARIO EDICIÓN */
        .form-group{margin-bottom:14px}
        .form-label{display:block;font-size:11px;font-weight:600;color:var(--muted);letter-spacing:0.07em;text-transform:uppercase;margin-bottom:7px}
        .form-input,.form-select,.form-textarea{width:100%;background:var(--surface2);border:1.5px solid var(--border);border-radius:10px;padding:11px 13px;font-size:14px;font-family:'Inter',sans-serif;color:var(--text);outline:none;transition:border-color .2s}
        .form-input:focus,.form-select:focus,.form-textarea:focus{border-color:var(--cyan);box-shadow:0 0 0 3px rgba(56,189,248,0.10)}
        .form-textarea{resize:vertical;min-height:80px;line-height:1.5}
        .form-input::placeholder,.form-textarea::placeholder{color:rgba(231,237,247,0.25)}
        .form-select option{background:#0A1220;color:var(--text)}
        .form-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}

        /* HISTORIAL SESIONES */
        .sesion-item{background:var(--surface2);border-radius:12px;padding:14px 16px;margin-bottom:10px;border-left:3px solid var(--cyan)}
        .sesion-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
        .sesion-fecha{font-size:13px;font-weight:600;color:var(--text)}
        .sesion-dolor{font-size:11px;color:var(--muted);background:rgba(242,85,85,0.12);padding:3px 8px;border-radius:6px}
        .sesion-obs{font-size:13px;color:var(--muted);line-height:1.5}

        /* BADGES */
        .badge{font-size:11px;font-weight:600;padding:3px 10px;border-radius:100px;display:inline-block}
        .b-green{background:rgba(52,211,153,0.15);color:var(--green)}
        .b-blue{background:rgba(56,189,248,0.15);color:var(--cyan)}
        .b-amber{background:rgba(245,180,0,0.15);color:var(--amber)}
        .b-red{background:rgba(242,85,85,0.15);color:var(--red)}
        .b-gray{background:rgba(255,255,255,0.06);color:var(--muted)}

        /* BOTONES */
        .btn-edit{background:var(--surface2);border:1px solid var(--border);border-radius:9px;padding:8px 16px;font-size:13px;font-weight:500;color:var(--muted);cursor:pointer;font-family:'Inter',sans-serif;transition:all .18s}
        .btn-edit:hover{color:var(--text);border-color:var(--cyan)}
        .btn-save{background:linear-gradient(135deg,var(--blue),var(--cyan));color:#fff;border:none;border-radius:9px;padding:9px 18px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;display:flex;align-items:center;gap:7px;transition:transform .2s;box-shadow:0 4px 14px rgba(37,99,235,0.3)}
        .btn-save:hover:not(:disabled){transform:translateY(-1px)}
        .btn-save:disabled{opacity:.5;cursor:not-allowed}
        .btn-cancel{background:var(--surface2);border:1px solid var(--border);border-radius:9px;padding:9px 16px;font-size:13px;font-weight:500;color:var(--muted);cursor:pointer;font-family:'Inter',sans-serif;transition:all .18s}
        .btn-nuevo-exp{background:linear-gradient(135deg,var(--blue),var(--cyan));color:#fff;border:none;border-radius:9px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;box-shadow:0 4px 14px rgba(37,99,235,0.3)}
        .form-actions{display:flex;gap:10px;justify-content:flex-end;padding-top:8px;border-top:1px solid var(--border);margin-top:16px}

        .spinner{width:14px;height:14px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;animation:spin .7s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}

        @media (max-width:900px){
          .content{padding:18px 16px}
          .page-title{font-size:22px}
          /* En móvil, lista y detalle se apilan en vez de ir lado a lado */
          .exp-layout{grid-template-columns:1fr; height:auto}
          .lista-panel{max-height:340px}
          .detalle-panel{min-height:400px}
          .metricas-row{grid-template-columns:repeat(2,1fr)}
          .tabs-row{overflow-x:auto; flex-wrap:nowrap}
          .tab-btn{white-space:nowrap}
          .info-grid{grid-template-columns:1fr}
          .form-grid-2{grid-template-columns:1fr}
        }
      `}</style>

      {/* SIDEBAR */}
      <Sidebar
        rol="admin"
        nombre="Administradora General"
        subRol="Acceso Total"
        icono="🛡"
        items={[
          {icon:'🏠', label:'Panel General',       href:'/admin/dashboard',        active:false},
          {icon:'👥', label:'Usuarios y Roles',    href:'/admin/usuarios',         active:false},
          {icon:'📋', label:'Expedientes',          href:'/admin/expedientes',      active:true},
          {icon:'💳', label:'Finanzas',             href:'/admin/finanzas',         active:false},
          {icon:'📊', label:'Reportes',             href:'/admin/reportes',         active:false},
          {icon:'🕘', label:'Disponibilidad',       href:'/admin/disponibilidad',   active:false},
          {icon:'⭐', label:'Opiniones',            href:'/admin/opiniones',        active:false},
          {icon:'⚠️', label:'Solicitudes de Baja',  href:'/admin/solicitudes-baja', active:false},
          {icon:'🔍', label:'Logs de Auditoría',   href:'/admin/logs',             active:false},
          {icon:'⚙️', label:'Configuración',        href:'/admin/configuracion',    active:false},
            ]}
        />

      {/* MAIN */}
      <div className="main">
        <div className="topbar">
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <MenuButton />
            <span className="topbar-title">Expedientes</span>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:16}}>
            <div className="online-dot"><div className="dot"/>En línea</div>
            <TopbarActions userId={userId} rol={currentUserRol} nombre={nombre} />
          </div>
        </div>
        <div className="content">
          <div className="page-title">Expedientes clínicos</div>
          <div className="page-sub">Historial completo de tratamiento y evolución de cada paciente</div>

          <div className="exp-layout">
            {/* LISTA */}
            <div className="lista-panel">
              <div className="lista-header">
                <div className="search-wrap">
                  <span className="search-icon">🔍</span>
                  <input className="search-input" placeholder="Buscar paciente..."
                    value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                </div>
                <div className="filtros-estado">
                  {[
                    {k:'todos', l:'Todos'},
                    {k:'activo', l:'Activo'},
                    {k:'alta', l:'De alta'},
                    {k:'suspendido', l:'Suspendido'},
                    {k:'sin_expediente', l:'Sin expediente'},
                  ].map(f => (
                    <button key={f.k} className={`ftab${filtroEstado===f.k?' active':''}`} onClick={() => setFiltroEstado(f.k)}>{f.l}</button>
                  ))}
                </div>
              </div>
              <div className="lista-scroll">
                {pacientesFiltrados.length === 0 && <div className="empty-lista">No hay pacientes que coincidan</div>}
                {pacientesFiltrados.map(p => {
                  const ini = p.nombre_completo.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()
                  const exp = p.expedientes?.[0]
                  const edad = p.fecha_nacimiento ? calcEdad(p.fecha_nacimiento) : '—'
                  return (
                    <div key={p.id_paciente}
                      className={`pac-item${pacienteSeleccionado?.id_paciente===p.id_paciente?' selected':''}`}
                      onClick={() => abrirExpediente(p)}
                    >
                      <div className="pac-avatar">{ini}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div className="pac-name">{p.nombre_completo}</div>
                        <div className="pac-meta">{edad} años · {exp ? <span className={`badge ${ESTADO_BADGE[exp.estado]}`}>{ESTADO_LABEL[exp.estado]}</span> : <span className="badge b-gray">Sin expediente</span>}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* DETALLE */}
            <div className="detalle-panel">
              {!pacienteSeleccionado ? (
                <div className="detalle-vacio">
                  <div className="detalle-vacio-icon">📋</div>
                  <div style={{fontSize:14}}>Selecciona un paciente para ver su expediente</div>
                </div>
              ) : (
                <>
                  {/* HEADER */}
                  <div className="pac-header">
                    <div className="pac-header-left">
                      <div className="pac-header-avatar">
                        {pacienteSeleccionado.nombre_completo.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}
                      </div>
                      <div>
                        <div className="pac-header-name">{pacienteSeleccionado.nombre_completo}</div>
                        <div className="pac-header-meta">
                          {pacienteSeleccionado.fecha_nacimiento ? calcEdad(pacienteSeleccionado.fecha_nacimiento) : '—'} años
                          {pacienteSeleccionado.telefono ? ` · ${pacienteSeleccionado.telefono}` : ''}
                          {exp && ` · Exp. #${exp.id_expediente}`}
                        </div>
                      </div>
                    </div>
                    <div className="pac-header-right">
                      {exp && <span className={`badge ${ESTADO_BADGE[exp.estado]}`}>{ESTADO_LABEL[exp.estado]}</span>}
                      {!editando && (
                        <button className="btn-edit" onClick={() => setEditando(true)}>
                          {exp ? '✏️ Editar' : '+ Crear expediente'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* MÉTRICAS */}
                  <div className="metricas-row">
                    <div className="metrica-mini">
                      <div className="metrica-mini-num">{totalCitas}</div>
                      <div className="metrica-mini-label">Citas totales</div>
                    </div>
                    <div className="metrica-mini">
                      <div className="metrica-mini-num">{citasCompletadas}</div>
                      <div className="metrica-mini-label">Completadas</div>
                    </div>
                    <div className="metrica-mini">
                      <div className="metrica-mini-num">${totalPagado.toLocaleString('es-MX',{minimumFractionDigits:0})}</div>
                      <div className="metrica-mini-label">Total pagado</div>
                    </div>
                    <div className="metrica-mini">
                      <div className="metrica-mini-num" style={{color: adeudos>0?'var(--red)':undefined}}>${adeudos.toLocaleString('es-MX',{minimumFractionDigits:0})}</div>
                      <div className="metrica-mini-label">Adeudo</div>
                    </div>
                  </div>

                  {/* TABS */}
                  <div className="tabs-row">
                    {[
                      {k:'general', l:'General'},
                      {k:'evaluacion', l:'Evaluación'},
                      {k:'tratamiento', l:'Tratamiento'},
                      {k:'sesiones', l:'Sesiones'},
                      {k:'pagos', l:'Pagos'},
                    ].map(t => (
                      <button key={t.k} className={`tab-btn${tabActiva===t.k?' active':''}`} onClick={() => setTabActiva(t.k)}>{t.l}</button>
                    ))}
                  </div>

                  {/* CONTENIDO TABS */}
                  <div className="tab-content">
                    {editando ? (
                      /* ── FORMULARIO EDICIÓN ── */
                      <form onSubmit={guardarExpediente}>
                        {tabActiva==='general' && (
                          <>
                            <div className="seccion-title">Datos del expediente</div>
                            <div className="form-grid-2">
                              <div className="form-group">
                                <label className="form-label">Estado del paciente</label>
                                <select name="estado" className="form-select" defaultValue={exp?.estado ?? 'activo'}>
                                  <option value="activo">Activo</option>
                                  <option value="alta">De alta</option>
                                  <option value="suspendido">Suspendido</option>
                                </select>
                              </div>
                              <div className="form-group">
                                <label className="form-label">Fecha inicio del problema</label>
                                <input name="fecha_inicio_problema" type="date" className="form-input" defaultValue={exp?.fecha_inicio_problema ?? ''} />
                              </div>
                            </div>
                            <div className="form-group">
                              <label className="form-label">Motivo de consulta</label>
                              <textarea name="motivo_consulta" className="form-textarea" placeholder="Razón principal de atención..." defaultValue={exp?.motivo_consulta ?? ''} />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Nivel de dolor inicial (0-10)</label>
                              <input name="nivel_dolor_inicial" type="number" min="0" max="10" className="form-input" defaultValue={exp?.nivel_dolor_inicial ?? ''} />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Limitaciones físicas actuales</label>
                              <textarea name="limitaciones_fisicas" className="form-textarea" placeholder="Describe las limitaciones..." defaultValue={exp?.limitaciones_fisicas ?? ''} />
                            </div>
                          </>
                        )}
                        {tabActiva==='evaluacion' && (
                          <>
                            <div className="seccion-title">Evaluación física inicial</div>
                            <div className="form-group">
                              <label className="form-label">Diagnóstico</label>
                              <textarea name="diagnostico" className="form-textarea" placeholder="Diagnóstico principal..." defaultValue={exp?.diagnostico ?? ''} required />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Diagnóstico funcional</label>
                              <textarea name="diagnostico_funcional" className="form-textarea" defaultValue={exp?.diagnostico_funcional ?? ''} />
                            </div>
                            <div className="form-grid-2">
                              <div className="form-group">
                                <label className="form-label">Rango de movimiento</label>
                                <textarea name="rango_movimiento" className="form-textarea" style={{minHeight:60}} defaultValue={exp?.rango_movimiento ?? ''} />
                              </div>
                              <div className="form-group">
                                <label className="form-label">Fuerza muscular</label>
                                <textarea name="fuerza_muscular" className="form-textarea" style={{minHeight:60}} defaultValue={exp?.fuerza_muscular ?? ''} />
                              </div>
                            </div>
                            <div className="form-group">
                              <label className="form-label">Postura y movilidad</label>
                              <textarea name="postura_movilidad" className="form-textarea" defaultValue={exp?.postura_movilidad ?? ''} />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Antecedentes médicos</label>
                              <textarea name="antecedentes" className="form-textarea" placeholder="Enfermedades previas, cirugías, alergias, medicamentos..." defaultValue={exp?.antecedentes ?? ''} />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Observaciones clínicas</label>
                              <textarea name="observaciones_clinicas" className="form-textarea" defaultValue={exp?.observaciones_clinicas ?? ''} />
                            </div>
                          </>
                        )}
                        {tabActiva==='tratamiento' && (
                          <>
                            <div className="seccion-title">Plan de tratamiento</div>
                            <div className="form-group">
                              <label className="form-label">Objetivos terapéuticos</label>
                              <textarea name="objetivos_terapeuticos" className="form-textarea" defaultValue={exp?.objetivos_terapeuticos ?? ''} />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Tipo de terapias</label>
                              <textarea name="tipo_terapias" className="form-textarea" placeholder="Ej. Electroterapia, ultrasonido, ejercicio terapéutico..." defaultValue={exp?.tipo_terapias ?? ''} />
                            </div>
                            <div className="form-grid-2">
                              <div className="form-group">
                                <label className="form-label">Frecuencia de sesiones</label>
                                <input name="frecuencia_sesiones" className="form-input" placeholder="Ej. 3 veces por semana" defaultValue={exp?.frecuencia_sesiones ?? ''} />
                              </div>
                            </div>
                            <div className="form-group">
                              <label className="form-label">Plan de tratamiento / Indicaciones</label>
                              <textarea name="plan_tratamiento" className="form-textarea" defaultValue={exp?.plan_tratamiento ?? ''} />
                            </div>
                          </>
                        )}
                        <div className="form-actions">
                          <button type="button" className="btn-cancel" onClick={() => setEditando(false)}>Cancelar</button>
                          <button type="submit" className="btn-save" disabled={loading}>
                            {loading && <span className="spinner"/>}
                            Guardar cambios
                          </button>
                        </div>
                      </form>
                    ) : (
                      /* ── VISTA LECTURA ── */
                      <>
                        {tabActiva==='general' && (
                          <>
                            <div className="seccion">
                              <div className="seccion-title">Datos del paciente</div>
                              <div className="info-grid">
                                <div className="info-item">
                                  <div className="info-label">Nombre completo</div>
                                  <div className="info-value">{pacienteSeleccionado.nombre_completo}</div>
                                </div>
                                <div className="info-item">
                                  <div className="info-label">Edad</div>
                                  <div className="info-value">{pacienteSeleccionado.fecha_nacimiento ? `${calcEdad(pacienteSeleccionado.fecha_nacimiento)} años` : '—'}</div>
                                </div>
                                <div className="info-item">
                                  <div className="info-label">Teléfono</div>
                                  <div className={`info-value${!pacienteSeleccionado.telefono?' empty':''}`}>{pacienteSeleccionado.telefono ?? 'No registrado'}</div>
                                </div>
                                <div className="info-item">
                                  <div className="info-label">Contacto de emergencia</div>
                                  <div className={`info-value${!pacienteSeleccionado.contacto_emergencia?' empty':''}`}>{pacienteSeleccionado.contacto_emergencia ?? 'No registrado'}</div>
                                </div>
                                <div className="info-item full">
                                  <div className="info-label">Domicilio</div>
                                  <div className={`info-value${!pacienteSeleccionado.domicilio?' empty':''}`}>{pacienteSeleccionado.domicilio ?? 'No registrado'}</div>
                                </div>
                              </div>
                            </div>
                            {exp && (
                              <div className="seccion">
                                <div className="seccion-title">Motivo de consulta</div>
                                <div className="info-grid">
                                  <div className="info-item full">
                                    <div className="info-label">Motivo principal</div>
                                    <div className={`info-value${!exp.motivo_consulta?' empty':''}`}>{exp.motivo_consulta ?? 'No registrado'}</div>
                                  </div>
                                  <div className="info-item">
                                    <div className="info-label">Fecha inicio del problema</div>
                                    <div className={`info-value${!exp.fecha_inicio_problema?' empty':''}`}>{exp.fecha_inicio_problema ? new Date(exp.fecha_inicio_problema).toLocaleDateString('es-MX') : 'No registrado'}</div>
                                  </div>
                                  <div className="info-item">
                                    <div className="info-label">Nivel de dolor inicial</div>
                                    <div className={`info-value${exp.nivel_dolor_inicial==null?' empty':''}`}>{exp.nivel_dolor_inicial != null ? `${exp.nivel_dolor_inicial}/10` : 'No registrado'}</div>
                                  </div>
                                  <div className="info-item full">
                                    <div className="info-label">Limitaciones físicas</div>
                                    <div className={`info-value${!exp.limitaciones_fisicas?' empty':''}`}>{exp.limitaciones_fisicas ?? 'No registrado'}</div>
                                  </div>
                                </div>
                              </div>
                            )}
                            {!exp && (
                              <div style={{textAlign:'center',padding:'40px 20px',color:'var(--muted)'}}>
                                <div style={{fontSize:32,marginBottom:12}}>📋</div>
                                <div style={{fontSize:14,marginBottom:16}}>Este paciente aún no tiene expediente clínico</div>
                                <button className="btn-nuevo-exp" onClick={() => setEditando(true)}>+ Crear expediente</button>
                              </div>
                            )}
                          </>
                        )}

                        {tabActiva==='evaluacion' && (
                          <div className="seccion">
                            <div className="seccion-title">Evaluación física inicial</div>
                            {!exp ? <div style={{color:'var(--muted)',fontSize:13}}>Sin expediente registrado</div> : (
                              <div className="info-grid">
                                <div className="info-item full">
                                  <div className="info-label">Diagnóstico</div>
                                  <div className={`info-value${!exp.diagnostico?' empty':''}`}>{exp.diagnostico ?? 'No registrado'}</div>
                                </div>
                                <div className="info-item full">
                                  <div className="info-label">Diagnóstico funcional</div>
                                  <div className={`info-value${!exp.diagnostico_funcional?' empty':''}`}>{exp.diagnostico_funcional ?? 'No registrado'}</div>
                                </div>
                                <div className="info-item">
                                  <div className="info-label">Rango de movimiento</div>
                                  <div className={`info-value${!exp.rango_movimiento?' empty':''}`}>{exp.rango_movimiento ?? 'No registrado'}</div>
                                </div>
                                <div className="info-item">
                                  <div className="info-label">Fuerza muscular</div>
                                  <div className={`info-value${!exp.fuerza_muscular?' empty':''}`}>{exp.fuerza_muscular ?? 'No registrado'}</div>
                                </div>
                                <div className="info-item full">
                                  <div className="info-label">Antecedentes médicos</div>
                                  <div className={`info-value${!exp.antecedentes?' empty':''}`}>{exp.antecedentes ?? 'No registrado'}</div>
                                </div>
                                <div className="info-item full">
                                  <div className="info-label">Observaciones clínicas</div>
                                  <div className={`info-value${!exp.observaciones_clinicas?' empty':''}`}>{exp.observaciones_clinicas ?? 'No registrado'}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {tabActiva==='tratamiento' && (
                          <div className="seccion">
                            <div className="seccion-title">Plan de tratamiento</div>
                            {!exp ? <div style={{color:'var(--muted)',fontSize:13}}>Sin expediente registrado</div> : (
                              <div className="info-grid">
                                <div className="info-item full">
                                  <div className="info-label">Objetivos terapéuticos</div>
                                  <div className={`info-value${!exp.objetivos_terapeuticos?' empty':''}`}>{exp.objetivos_terapeuticos ?? 'No registrado'}</div>
                                </div>
                                <div className="info-item full">
                                  <div className="info-label">Tipo de terapias</div>
                                  <div className={`info-value${!exp.tipo_terapias?' empty':''}`}>{exp.tipo_terapias ?? 'No registrado'}</div>
                                </div>
                                <div className="info-item">
                                  <div className="info-label">Frecuencia de sesiones</div>
                                  <div className={`info-value${!exp.frecuencia_sesiones?' empty':''}`}>{exp.frecuencia_sesiones ?? 'No registrado'}</div>
                                </div>
                                <div className="info-item full">
                                  <div className="info-label">Plan / Indicaciones</div>
                                  <div className={`info-value${!exp.plan_tratamiento?' empty':''}`}>{exp.plan_tratamiento ?? 'No registrado'}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {tabActiva==='sesiones' && (
                          <div className="seccion">
                            <div className="seccion-title">Historial de sesiones</div>
                            {(pacienteSeleccionado.citas ?? []).length === 0 ? (
                              <div style={{color:'var(--muted)',fontSize:13}}>No hay sesiones registradas</div>
                            ) : (
                              (pacienteSeleccionado.citas ?? []).map((c: any) => (
                                <div key={c.id_cita} className="sesion-item">
                                  <div className="sesion-header">
                                    <div className="sesion-fecha">
                                      {c.fecha_hora ? new Date(c.fecha_hora).toLocaleDateString('es-MX', {weekday:'long',day:'numeric',month:'long',year:'numeric'}) : '—'}
                                    </div>
                                    <span className={`badge ${c.estado==='completada'?'b-green':c.estado==='cancelada'?'b-red':'b-amber'}`}>{c.estado}</span>
                                  </div>
                                  {c.progreso_sesiones?.[0] && (
                                    <div style={{display:'flex',gap:16,marginBottom:6}}>
                                      <span style={{fontSize:11,color:'var(--muted)'}}>Dolor: <strong style={{color:'var(--text)'}}>{c.progreso_sesiones[0].nivel_dolor}/10</strong></span>
                                      <span style={{fontSize:11,color:'var(--muted)'}}>Movilidad: <strong style={{color:'var(--text)'}}>{c.progreso_sesiones[0].movilidad}/10</strong></span>
                                    </div>
                                  )}
                                  {c.notas && <div className="sesion-obs">{c.notas}</div>}
                                </div>
                              ))
                            )}
                          </div>
                        )}

                        {tabActiva==='pagos' && (
                          <div className="seccion">
                            <div className="seccion-title">Historial de pagos</div>
                            {(pacienteSeleccionado.pagos ?? []).length === 0 ? (
                              <div style={{color:'var(--muted)',fontSize:13}}>No hay pagos registrados</div>
                            ) : (
                              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                                {(pacienteSeleccionado.pagos ?? []).map((p: any) => (
                                  <div key={p.id_pago} style={{background:'var(--surface2)',borderRadius:10,padding:'12px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                                    <div>
                                      <div style={{fontSize:13,fontWeight:500,color:'var(--text)'}}>
                                        ${Number(p.monto).toLocaleString('es-MX',{minimumFractionDigits:2})}
                                      </div>
                                      <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>
                                        {p.metodo_pago} · {new Date(p.fecha_pago).toLocaleDateString('es-MX')}
                                      </div>
                                    </div>
                                    <span className={`badge ${p.estado_pago==='pagado'?'b-green':p.estado_pago==='reembolsado'?'b-amber':'b-red'}`}>
                                      {p.estado_pago==='pagado'?'Pagado':p.estado_pago==='reembolsado'?'Reembolsado':'Pendiente'}
                                    </span>
                                  </div>
                                ))}
                                <div style={{marginTop:8,padding:'12px 14px',background:'rgba(56,189,248,0.06)',borderRadius:10,border:'1px solid rgba(56,189,248,0.15)',display:'flex',justifyContent:'space-between'}}>
                                  <span style={{fontSize:13,color:'var(--muted)'}}>Total pagado</span>
                                  <span style={{fontSize:14,fontWeight:700,color:'var(--green)'}}>${totalPagado.toLocaleString('es-MX',{minimumFractionDigits:2})}</span>
                                </div>
                                {adeudos > 0 && (
                                  <div style={{padding:'12px 14px',background:'rgba(242,85,85,0.06)',borderRadius:10,border:'1px solid rgba(242,85,85,0.15)',display:'flex',justifyContent:'space-between'}}>
                                    <span style={{fontSize:13,color:'var(--muted)'}}>Adeudo pendiente</span>
                                    <span style={{fontSize:14,fontWeight:700,color:'var(--red)'}}>${adeudos.toLocaleString('es-MX',{minimumFractionDigits:2})}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}