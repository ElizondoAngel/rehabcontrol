'use client'

/**
 * PagosClient.tsx
 * ─────────────────────────────────────────────────────────────
 * F5 — Panel de Pagos (Secretaria / Admin)
 *
 * UNIDAD 2:
 *   • DOM dinámico    → totales recalculados en tiempo real, filtros
 *   • Fetch asíncrona → cobrar pendiente, registrar pago manual
 *   • Eventos         → click, input búsqueda, filtros
 *   • Animaciones     → fade-in filas, modal slide, toast
 *   • Feedback visual → Toast, Modal, Loader, badges de estado
 *
 * SEGURIDAD:
 *   • Validación Zod en servidor
 *   • Solo admin/secretaria
 *   • Audit log en cada cobro o registro
 */

import Link from 'next/link'
import { useState, useMemo, useEffect } from 'react'
import NotifBell from '@/app/components/NotifBell'
import Sidebar, { MenuButton } from '@/app/components/Sidebar'


interface PacienteOpt { id_paciente: number; nombre_completo: string }
interface Pago {
  id_pago: number
  paciente_id: number
  cita_id?: number
  monto: number
  estado_pago: 'pendiente'|'pagado'|'reembolsado'
  metodo_pago: 'efectivo'|'transferencia'|'tarjeta'|'aseguradora'
  fecha_pago: string
  pacientes?: { nombre_completo: string }
  citas?: { fecha_hora: string }
}
interface Props {
  currentUserId: string
  pagosIniciales: Pago[]
  pacientes: PacienteOpt[]
}

const METODO_LABELS: Record<string,string> = {
  efectivo:'Efectivo', transferencia:'Transferencia', tarjeta:'Tarjeta', aseguradora:'Aseguradora'
}

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

function Loader() {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'60px 0'}}>
      <div style={{width:32,height:32,borderRadius:'50%',border:'3px solid rgba(56,189,248,0.2)',borderTopColor:'#38BDF8',animation:'spin .7s linear infinite'}}/>
    </div>
  )
}

export default function PagosClient({ pagosIniciales, pacientes, currentUserId }: Props) {
  const [pagos, setPagos]         = useState<Pago[]>(pagosIniciales)
  const [filtroEstado, setFiltroEstado] = useState<'todos'|'pendiente'|'pagado'|'reembolsado'>('todos')
  const [busqueda, setBusqueda]   = useState('')
  const [loading, setLoading]     = useState(false)
  const [toast, setToast]         = useState<{msg:string;type:'success'|'error'}|null>(null)
  const [confirmCobro, setConfirmCobro] = useState<Pago|null>(null)
  const [metodoCobro, setMetodoCobro] = useState<string>('efectivo')
  const [modalNuevo, setModalNuevo] = useState(false)
  const [modalEditar, setModalEditar] = useState<Pago|null>(null)
  const [confirmReembolso, setConfirmReembolso] = useState<Pago|null>(null)
  const [motivoReembolso, setMotivoReembolso] = useState('')
  const [errores, setErrores] = useState<Record<string,string>>({})

  const totales = useMemo(() => {
    const pagado = pagos.filter(p => p.estado_pago === 'pagado').reduce((s,p) => s + Number(p.monto), 0)
    const pendiente = pagos.filter(p => p.estado_pago === 'pendiente').reduce((s,p) => s + Number(p.monto), 0)
    const hoy = new Date().toISOString().split('T')[0]
    const ingresosHoy = pagos.filter(p => p.estado_pago==='pagado' && p.fecha_pago.startsWith(hoy)).reduce((s,p) => s + Number(p.monto), 0)
    return { pagado, pendiente, ingresosHoy, totalPendientes: pagos.filter(p=>p.estado_pago==='pendiente').length }
  }, [pagos])

  const pagosFiltrados = useMemo(() => {
    return pagos
      .filter(p => filtroEstado==='todos' ? true : p.estado_pago===filtroEstado)
      .filter(p => p.pacientes?.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()))
  }, [pagos, filtroEstado, busqueda])

  async function cobrarPago() {
    if (!confirmCobro) return
    setLoading(true)
    const res = await fetch('/api/pagos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: confirmCobro.id_pago, estado_pago: 'pagado', metodo_pago: metodoCobro }),
    })
    setLoading(false)
    if (res.ok) {
      setPagos(prev => prev.map(p => p.id_pago === confirmCobro.id_pago ? { ...p, estado_pago:'pagado', metodo_pago: metodoCobro as Pago['metodo_pago'], fecha_pago: new Date().toISOString() } : p))
      setToast({ msg: 'Pago registrado correctamente', type: 'success' })
    } else {
      setToast({ msg: 'Error al registrar el cobro', type: 'error' })
    }
    setConfirmCobro(null)
  }

  async function registrarPagoManual(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const campos = {
      paciente_id: fd.get('paciente_id') as string,
      monto:       fd.get('monto') as string,
      metodo_pago: fd.get('metodo_pago') as string,
      estado_pago: fd.get('estado_pago') as string,
    }
    const errs: Record<string,string> = {}
    if (!campos.paciente_id) errs.paciente_id = 'Selecciona un paciente'
    if (!campos.monto || Number(campos.monto) <= 0) errs.monto = 'Indica un monto válido'
    if (!campos.metodo_pago) errs.metodo_pago = 'Selecciona un método'
    if (Object.keys(errs).length > 0) { setErrores(errs); return }

    setLoading(true)
    const res = await fetch('/api/pagos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paciente_id: Number(campos.paciente_id),
        monto: Number(campos.monto),
        metodo_pago: campos.metodo_pago,
        estado_pago: campos.estado_pago,
      }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setToast({ msg: data.error ?? 'Error al registrar', type:'error' }); return }

    const paciente = pacientes.find(p => p.id_paciente === Number(campos.paciente_id))
    setPagos(prev => [{ ...data.pago, pacientes: { nombre_completo: paciente?.nombre_completo ?? '' } }, ...prev])
    setToast({ msg: 'Pago registrado correctamente', type: 'success' })
    setModalNuevo(false)
    setErrores({})
  }

  async function editarPago(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!modalEditar) return
    const fd = new FormData(e.currentTarget)
    const monto = fd.get('monto') as string
    const metodo_pago = fd.get('metodo_pago') as string

    const errs: Record<string,string> = {}
    if (!monto || Number(monto) <= 0) errs.monto = 'Indica un monto válido'
    if (!metodo_pago) errs.metodo_pago = 'Selecciona un método'
    if (Object.keys(errs).length > 0) { setErrores(errs); return }

    setLoading(true)
    const res = await fetch('/api/pagos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: modalEditar.id_pago, monto: Number(monto), metodo_pago }),
    })
    setLoading(false)
    if (res.ok) {
      setPagos(prev => prev.map(p => p.id_pago === modalEditar.id_pago ? { ...p, monto: Number(monto), metodo_pago: metodo_pago as Pago['metodo_pago'] } : p))
      setToast({ msg: 'Pago actualizado correctamente', type: 'success' })
      setModalEditar(null)
      setErrores({})
    } else {
      setToast({ msg: 'Error al actualizar el pago', type: 'error' })
    }
  }

  async function reembolsarPago() {
    if (!confirmReembolso) return
    setLoading(true)
    const res = await fetch('/api/pagos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: confirmReembolso.id_pago, estado_pago: 'reembolsado', motivo: motivoReembolso }),
    })
    setLoading(false)
    if (res.ok) {
      setPagos(prev => prev.map(p => p.id_pago === confirmReembolso.id_pago ? { ...p, estado_pago: 'reembolsado' } : p))
      setToast({ msg: 'Pago marcado como reembolsado', type: 'success' })
    } else {
      setToast({ msg: 'Error al registrar el reembolso', type: 'error' })
    }
    setConfirmReembolso(null)
    setMotivoReembolso('')
  }

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

        .main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
        .topbar{height:56px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 28px;flex-shrink:0}
        .topbar-title{font-size:14px;color:var(--muted);font-weight:500}
        .topbar-right{display:flex;align-items:center;gap:16px}
        .online-dot{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--cyan);font-weight:500}
        .dot{width:7px;height:7px;border-radius:50%;background:var(--cyan);box-shadow:0 0 8px var(--cyan)}
        .content{flex:1;overflow-y:auto;padding:28px}

        .page-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;flex-wrap:wrap;gap:12px}
        .page-title{font-size:26px;font-weight:800;color:var(--text);letter-spacing:-0.015em}
        .page-sub{font-size:14px;color:var(--muted);margin-top:4px}
        .btn-nuevo{background:linear-gradient(135deg,var(--blue),var(--cyan));color:#fff;border:none;border-radius:11px;padding:11px 20px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;display:flex;align-items:center;gap:7px;transition:transform .2s,box-shadow .2s;box-shadow:0 4px 18px rgba(37,99,235,0.32)}
        .btn-nuevo:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(56,189,248,0.4)}

        .stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px}
        .stat-card{background:var(--card);border:1px solid var(--card-border);border-radius:16px;padding:18px 20px;position:relative;overflow:hidden;transition:border-color .2s,transform .2s}
        .stat-card:hover{border-color:rgba(56,189,248,0.3);transform:translateY(-2px)}
        .stat-label{font-size:12px;color:var(--muted);margin-bottom:10px;font-weight:500}
        .stat-num{font-size:26px;font-weight:800;color:var(--text);line-height:1;transition:color .3s;letter-spacing:-0.01em}
        .stat-icon{position:absolute;top:16px;right:16px;width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px}
        .icon-green{background:rgba(52,211,153,0.15)}
        .icon-amber{background:rgba(245,180,0,0.15)}
        .icon-blue{background:rgba(56,189,248,0.15)}
        .icon-purple{background:rgba(167,139,250,0.15)}

        .filters{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap}
        .search-wrap{flex:1;min-width:220px;position:relative}
        .search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:14px;color:var(--muted)}
        .search-input{width:100%;background:var(--card);border:1px solid var(--card-border);border-radius:10px;padding:10px 12px 10px 34px;font-size:14px;font-family:'Inter',sans-serif;color:var(--text);outline:none;transition:border-color .2s}
        .search-input:focus{border-color:var(--cyan)}
        .search-input::placeholder{color:var(--muted)}
        .filter-tab{background:var(--card);border:1px solid var(--card-border);border-radius:9px;padding:8px 14px;font-size:13px;font-weight:500;color:var(--muted);cursor:pointer;font-family:'Inter',sans-serif;transition:all .18s}
        .filter-tab:hover{border-color:rgba(56,189,248,0.35);color:var(--text)}
        .filter-tab.active{background:rgba(56,189,248,0.14);border-color:rgba(56,189,248,0.4);color:var(--cyan)}

        .table-card{background:var(--card);border:1px solid var(--card-border);border-radius:16px;overflow:hidden}
        .header-row{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr 1fr 170px;gap:14px;padding:12px 20px;border-bottom:1px solid var(--border)}
        .th{font-size:11px;font-weight:600;color:var(--muted);letter-spacing:0.07em;text-transform:uppercase}
        .pago-row{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr 1fr 170px;gap:14px;padding:14px 20px;border-bottom:1px solid var(--border);align-items:center;animation:fadeIn .3s ease both;transition:background .18s;min-width:0}
        .acciones-pago{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
        .pago-row > div{min-width:0;overflow:hidden}
        .pago-row:last-child{border-bottom:none}
        .pago-row:hover{background:var(--surface2)}
        .p-avatar{width:34px;height:34px;border-radius:50%;background:rgba(56,189,248,0.18);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--text);flex-shrink:0}
        .p-name-wrap{display:flex;align-items:center;gap:10px}
        .p-name{font-size:13px;font-weight:500;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .td-text{font-size:13px;color:var(--muted)}
        .td-monto{font-size:14px;font-weight:700;color:var(--text)}
        .badge{font-size:11px;font-weight:600;padding:3px 10px;border-radius:100px;display:inline-block}
        .b-green{background:rgba(52,211,153,0.15);color:var(--green)}
        .b-amber{background:rgba(245,180,0,0.15);color:var(--amber)}
        .b-red{background:rgba(242,85,85,0.15);color:var(--red)}
        .b-purple{background:rgba(167,139,250,0.15);color:var(--purple)}
        .btn-action{background:var(--surface2);border:1px solid var(--border);border-radius:7px;padding:6px 12px;font-size:12px;font-weight:500;color:var(--muted);cursor:pointer;font-family:'Inter',sans-serif;transition:all .18s}
        .btn-action:hover{background:rgba(56,189,248,0.15);border-color:rgba(56,189,248,0.3);color:var(--cyan)}
        .empty-state{padding:60px 20px;text-align:center;color:var(--muted);font-size:14px}

        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .2s ease}
        .modal{background:#0A1220;border:1px solid var(--border);border-radius:20px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;animation:slideUp .25s ease}
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
        .form-input,.form-select{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:11px 13px;font-size:14px;font-family:'Inter',sans-serif;color:var(--text);outline:none;transition:border-color .2s,box-shadow .2s;width:100%}
        .form-input:focus,.form-select:focus{border-color:var(--cyan);box-shadow:0 0 0 3px rgba(56,189,248,0.12)}
        .form-select option{background:#0A1220;color:var(--text)}
        .form-input.err,.form-select.err{border-color:rgba(242,85,85,0.5)}
        .err-msg{font-size:11px;color:var(--red)}
        .modal-footer{padding:0 28px 24px;display:flex;gap:10px;justify-content:flex-end}
        .btn-cancel{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:11px 20px;font-size:14px;font-weight:500;color:var(--muted);cursor:pointer;font-family:'Inter',sans-serif;transition:all .18s}
        .btn-cancel:hover{color:var(--text)}
        .btn-save{background:linear-gradient(135deg,var(--blue),var(--cyan));color:#fff;border:none;border-radius:10px;padding:11px 24px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;display:flex;align-items:center;gap:8px;transition:transform .2s,box-shadow .2s;box-shadow:0 4px 16px rgba(37,99,235,0.3)}
        .btn-save:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(56,189,248,0.4)}
        .btn-save:disabled{opacity:.5;cursor:not-allowed;transform:none}

        .confirm-modal{background:#0C1B16;border:1px solid rgba(52,211,153,0.3);border-radius:18px;width:100%;max-width:380px;padding:28px;animation:slideUp .2s ease}
        .confirm-title{font-size:17px;font-weight:700;color:var(--text);margin-bottom:8px}
        .confirm-body{font-size:14px;color:var(--muted);line-height:1.6;margin-bottom:18px}
        .confirm-name{color:var(--text);font-weight:600}
        .confirm-btns{display:flex;gap:10px;justify-content:flex-end}
        .btn-danger{background:var(--red);color:#fff;border:none;border-radius:10px;padding:10px 20px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:opacity .2s;display:flex;align-items:center;gap:8px}
        .btn-danger:hover:not(:disabled){opacity:.85}
        .btn-danger:disabled{opacity:.5;cursor:not-allowed}

        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }

        @media (max-width: 900px) {
          .stats-row{grid-template-columns:repeat(2,1fr)}
          .header-row{display:none}
          .pago-row{grid-template-columns:1fr;gap:6px;text-align:left}
        }
      `}</style>

      {/* SIDEBAR */}
      <Sidebar
              rol="secretaria"
              nombre="Secretaria"
              subRol="Acceso Operativo"
              icono="📁"
              items={[
                { icon:'🏠', label:'Panel',          href:'/secretaria/dashboard', active:false },
                { icon:'📅', label:'Agenda General', href:'/secretaria/citas',     active:false },
                { icon:'👥', label:'Pacientes',       href:'/secretaria/pacientes', active:false },
                { icon:'📄', label:'Contratos',      href:'/secretaria/contratos', active:false },
                { icon:'💳', label:'Pagos',           href:'/secretaria/pagos',     active:true },
                { icon:'🕘', label:'Disponibilidad', href:'/secretaria/disponibilidad', active:false },
              ]}
        />

      {/* MAIN */}
      <div className="main">
        <div className="topbar">

          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <MenuButton />
            <span className="topbar-title">Panel de pagos</span>
          </div>

          <div className="topbar-right">
            <div className="online-dot"><div className="dot"/>En línea</div>
            <NotifBell userId={currentUserId} rol="secretaria" />
          </div>
        </div>

        <div className="content">
          <div className="page-header">
            <div>
              <div className="page-title">Panel de pagos</div>
              <div className="page-sub">Historial, cobros pendientes y registro de pagos</div>
            </div>
            <button className="btn-nuevo" onClick={() => setModalNuevo(true)}>+ Registrar pago</button>
          </div>

          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-label">Ingresos de hoy</div>
              <div className="stat-num">${totales.ingresosHoy.toLocaleString('es-MX',{minimumFractionDigits:2})}</div>
              <div className="stat-icon icon-green">💰</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total cobrado</div>
              <div className="stat-num">${totales.pagado.toLocaleString('es-MX',{minimumFractionDigits:2})}</div>
              <div className="stat-icon icon-blue">✅</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Por cobrar</div>
              <div className="stat-num" style={{color: totales.pendiente>0?'#F5B400':'#E7EDF7'}}>${totales.pendiente.toLocaleString('es-MX',{minimumFractionDigits:2})}</div>
              <div className="stat-icon icon-amber">⏳</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Pagos pendientes</div>
              <div className="stat-num">{totales.totalPendientes}</div>
              <div className="stat-icon icon-purple">📋</div>
            </div>
          </div>

          <div className="filters">
            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              <input className="search-input" placeholder="Buscar por paciente..."
                value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            </div>
            {(['todos','pendiente','pagado','reembolsado'] as const).map(f => (
              <button key={f} className={`filter-tab${filtroEstado===f?' active':''}`} onClick={() => setFiltroEstado(f)}>
                {f.charAt(0).toUpperCase()+f.slice(1)}
              </button>
            ))}
          </div>

          <div className="table-card">
            <div className="header-row">
              <div className="th">Paciente</div>
              <div className="th">Fecha</div>
              <div className="th">Monto</div>
              <div className="th">Método</div>
              <div className="th">Estado</div>
              <div className="th"></div>
            </div>

            {loading && <Loader />}

            {!loading && pagosFiltrados.length === 0 && (
              <div className="empty-state">No hay pagos que coincidan con el filtro</div>
            )}

            {!loading && pagosFiltrados.map((p, i) => {
              const ini = (p.pacientes?.nombre_completo ?? '??').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()
              return (
                <div className="pago-row" key={p.id_pago} style={{animationDelay:`${i*30}ms`}}>
                  <div className="p-name-wrap">
                    <div className="p-avatar">{ini}</div>
                    <div className="p-name">{p.pacientes?.nombre_completo ?? '—'}</div>
                  </div>
                  <div className="td-text">{new Date(p.fecha_pago).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'})}</div>
                  <div className="td-monto">${Number(p.monto).toLocaleString('es-MX',{minimumFractionDigits:2})}</div>
                  <div className="td-text">{METODO_LABELS[p.metodo_pago] ?? p.metodo_pago}</div>
                  <div>
                    <span className={`badge ${p.estado_pago==='pagado'?'b-green':p.estado_pago==='reembolsado'?'b-purple':'b-amber'}`}>
                      {p.estado_pago==='pagado'?'Pagado':p.estado_pago==='reembolsado'?'Reembolsado':'Pendiente'}
                    </span>
                  </div>
                  <div className="acciones-pago">
                    {p.estado_pago==='pendiente' && (
                      <button className="btn-action" onClick={() => { setMetodoCobro(p.metodo_pago); setConfirmCobro(p) }}>Cobrar</button>
                    )}
                    {p.estado_pago==='pagado' && (
                      <button className="btn-action" onClick={() => setConfirmReembolso(p)}>Reembolsar</button>
                    )}
                    <button className="btn-action" onClick={() => { setModalEditar(p); setErrores({}) }}>Editar</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* MODAL COBRAR */}
      {confirmCobro && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) setConfirmCobro(null) }}>
          <div className="confirm-modal">
            <div className="confirm-title">💰 Registrar cobro</div>
            <p className="confirm-body">
              Confirmar cobro de <span className="confirm-name">${Number(confirmCobro.monto).toLocaleString('es-MX',{minimumFractionDigits:2})}</span> a <span className="confirm-name">{confirmCobro.pacientes?.nombre_completo}</span>.
            </p>
            <div className="form-group" style={{marginBottom:18}}>
              <label className="form-label">Método de pago</label>
              <select className="form-select" value={metodoCobro} onChange={e => setMetodoCobro(e.target.value)}>
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="aseguradora">Aseguradora</option>
              </select>
            </div>
            <div className="confirm-btns">
              <button className="btn-cancel" onClick={() => setConfirmCobro(null)}>Cancelar</button>
              <button className="btn-save" disabled={loading} onClick={cobrarPago}>
                {loading && <div style={{width:14,height:14,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',animation:'spin .7s linear infinite'}}/>}
                Confirmar cobro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVO PAGO */}
      {modalNuevo && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) { setModalNuevo(false); setErrores({}) } }}>
          <div className="modal">
            <div className="modal-header">
              <div>
                <div className="modal-title">Registrar pago</div>
                <div className="modal-sub">Para pagos que no provienen de una cita agendada</div>
              </div>
              <button className="modal-close" onClick={() => { setModalNuevo(false); setErrores({}) }}>✕</button>
            </div>
            <form onSubmit={registrarPagoManual} noValidate>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group form-grid-full">
                    <label className="form-label">Paciente *</label>
                    <select name="paciente_id" className={`form-select${errores.paciente_id?' err':''}`} defaultValue="">
                      <option value="">— Selecciona un paciente —</option>
                      {pacientes.map(p => <option key={p.id_paciente} value={p.id_paciente}>{p.nombre_completo}</option>)}
                    </select>
                    {errores.paciente_id && <span className="err-msg">{errores.paciente_id}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Monto *</label>
                    <input name="monto" type="number" min="0" step="0.01" className={`form-input${errores.monto?' err':''}`} placeholder="$0.00" />
                    {errores.monto && <span className="err-msg">{errores.monto}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Método *</label>
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
                    <label className="form-label">Estado</label>
                    <select name="estado_pago" className="form-select" defaultValue="pagado">
                      <option value="pagado">Pagado ahora</option>
                      <option value="pendiente">Pendiente — cobrar después</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => { setModalNuevo(false); setErrores({}) }}>Cancelar</button>
                <button type="submit" className="btn-save" disabled={loading}>
                  {loading && <div style={{width:14,height:14,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',animation:'spin .7s linear infinite'}}/>}
                  Registrar pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR PAGO */}
      {modalEditar && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) { setModalEditar(null); setErrores({}) } }}>
          <div className="modal">
            <div className="modal-header">
              <div>
                <div className="modal-title">Editar pago</div>
                <div className="modal-sub">{modalEditar.pacientes?.nombre_completo}</div>
              </div>
              <button className="modal-close" onClick={() => { setModalEditar(null); setErrores({}) }}>✕</button>
            </div>
            <form onSubmit={editarPago} noValidate>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Monto *</label>
                    <input name="monto" type="number" min="0" step="0.01"
                      className={`form-input${errores.monto?' err':''}`}
                      defaultValue={modalEditar.monto} />
                    {errores.monto && <span className="err-msg">{errores.monto}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Método *</label>
                    <select name="metodo_pago" className={`form-select${errores.metodo_pago?' err':''}`} defaultValue={modalEditar.metodo_pago}>
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="tarjeta">Tarjeta</option>
                      <option value="aseguradora">Aseguradora</option>
                    </select>
                    {errores.metodo_pago && <span className="err-msg">{errores.metodo_pago}</span>}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => { setModalEditar(null); setErrores({}) }}>Cancelar</button>
                <button type="submit" className="btn-save" disabled={loading}>
                  {loading && <div style={{width:14,height:14,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',animation:'spin .7s linear infinite'}}/>}
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR REEMBOLSO */}
      {confirmReembolso && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) { setConfirmReembolso(null); setMotivoReembolso('') } }}>
          <div className="confirm-modal" style={{background:'#1A0E0E', borderColor:'rgba(242,85,85,0.25)'}}>
            <div className="confirm-title">↩ Confirmar reembolso</div>
            <p className="confirm-body">
              ¿Deseas marcar como <span className="confirm-name">reembolsado</span> el pago de <span className="confirm-name">${Number(confirmReembolso.monto).toLocaleString('es-MX',{minimumFractionDigits:2})}</span> de <span className="confirm-name">{confirmReembolso.pacientes?.nombre_completo}</span>? Esta acción queda registrada en el log de auditoría.
            </p>
            <div className="form-group" style={{marginBottom:18}}>
              <label className="form-label">Motivo (opcional)</label>
              <input className="form-input" placeholder="Ej. cancelación de sesión, error de cobro..."
                value={motivoReembolso} onChange={e => setMotivoReembolso(e.target.value)} />
            </div>
            <div className="confirm-btns">
              <button className="btn-cancel" onClick={() => { setConfirmReembolso(null); setMotivoReembolso('') }}>Cancelar</button>
              <button className="btn-danger" disabled={loading} onClick={reembolsarPago}>
                {loading && <div style={{width:14,height:14,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',animation:'spin .7s linear infinite'}}/>}
                Confirmar reembolso
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}
