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

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'

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

export default function PagosClient({ pagosIniciales, pacientes }: Props) {
  const [pagos, setPagos]         = useState<Pago[]>(pagosIniciales)
  const [filtroEstado, setFiltroEstado] = useState<'todos'|'pendiente'|'pagado'|'reembolsado'>('todos')
  const [busqueda, setBusqueda]   = useState('')
  const [loading, setLoading]     = useState(false)
  const [toast, setToast]         = useState<{msg:string;type:'success'|'error'}|null>(null)
  const [confirmCobro, setConfirmCobro] = useState<Pago|null>(null)
  const [metodoCobro, setMetodoCobro] = useState<string>('efectivo')
  const [modalNuevo, setModalNuevo] = useState(false)
  const [errores, setErrores] = useState<Record<string,string>>({})

  // ── TOTALES DINÁMICOS — recalculados con cada cambio de estado ─
  const totales = useMemo(() => {
    const pagado = pagos.filter(p => p.estado_pago === 'pagado').reduce((s,p) => s + Number(p.monto), 0)
    const pendiente = pagos.filter(p => p.estado_pago === 'pendiente').reduce((s,p) => s + Number(p.monto), 0)
    const hoy = new Date().toISOString().split('T')[0]
    const ingresosHoy = pagos.filter(p => p.estado_pago==='pagado' && p.fecha_pago.startsWith(hoy)).reduce((s,p) => s + Number(p.monto), 0)
    return { pagado, pendiente, ingresosHoy, totalPendientes: pagos.filter(p=>p.estado_pago==='pendiente').length }
  }, [pagos])

  // ── FILTRO DINÁMICO ───────────────────────────────────────────
  const pagosFiltrados = useMemo(() => {
    return pagos
      .filter(p => filtroEstado==='todos' ? true : p.estado_pago===filtroEstado)
      .filter(p => p.pacientes?.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()))
  }, [pagos, filtroEstado, busqueda])

  // ── COBRAR PAGO PENDIENTE ─────────────────────────────────────
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

  // ── REGISTRAR PAGO MANUAL (sin cita) ──────────────────────────
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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --bg:#0D1A12;--sidebar:#111D16;--card:#162419;--border:rgba(255,255,255,0.07);
          --mid:#1A9068;--light:#4FC49A;--pale:#DCF2E9;--text:#E8F5EE;--muted:rgba(232,245,238,0.45);
          --red:#E04444;--amber:#F5B400;--blue:#378ADD;
        }
        body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex}

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
        .sb-bottom a{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;font-size:14px;color:var(--muted);text-decoration:none}
        .sb-bottom a:hover{color:var(--red)}

        .main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
        .topbar{height:56px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 28px;flex-shrink:0}
        .topbar-title{font-size:14px;color:var(--muted)}
        .topbar-right{display:flex;align-items:center;gap:16px}
        .online-dot{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--light)}
        .dot{width:7px;height:7px;border-radius:50%;background:var(--light)}
        .notif{width:32px;height:32px;border-radius:8px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:15px}
        .content{flex:1;overflow-y:auto;padding:28px}

        .page-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;flex-wrap:wrap;gap:12px}
        .page-title{font-size:26px;font-weight:600;color:var(--text)}
        .page-sub{font-size:14px;color:var(--muted);margin-top:4px}
        .btn-nuevo{background:var(--mid);color:#fff;border:none;border-radius:10px;padding:11px 20px;font-size:14px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:7px;transition:background .2s,transform .15s}
        .btn-nuevo:hover{background:#158057;transform:translateY(-1px)}

        /* TOTALES */
        .stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px}
        .stat-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px 20px;position:relative;overflow:hidden}
        .stat-label{font-size:12px;color:var(--muted);margin-bottom:10px}
        .stat-num{font-size:26px;font-weight:600;color:var(--text);line-height:1;transition:color .3s}
        .stat-icon{position:absolute;top:16px;right:16px;width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:16px}
        .icon-green{background:rgba(26,144,104,0.15)}
        .icon-amber{background:rgba(245,180,0,0.15)}
        .icon-blue{background:rgba(55,138,221,0.15)}
        .icon-purple{background:rgba(127,119,221,0.15)}

        /* FILTROS */
        .filters{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap}
        .search-wrap{flex:1;min-width:220px;position:relative}
        .search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:14px;color:var(--muted)}
        .search-input{width:100%;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px 12px 10px 34px;font-size:14px;font-family:'DM Sans',sans-serif;color:var(--text);outline:none;transition:border-color .2s}
        .search-input:focus{border-color:var(--mid)}
        .search-input::placeholder{color:var(--muted)}
        .filter-tab{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:8px 14px;font-size:13px;color:var(--muted);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .18s}
        .filter-tab:hover{border-color:rgba(26,144,104,0.4);color:var(--text)}
        .filter-tab.active{background:rgba(26,144,104,0.15);border-color:rgba(26,144,104,0.4);color:var(--light)}

        /* TABLA */
        .table-card{background:var(--card);border:1px solid var(--border);border-radius:14px;overflow:hidden}
        .header-row{display:grid;grid-template-columns:1.8fr 1fr 1fr 1fr 1fr 110px;gap:14px;padding:12px 20px;border-bottom:1px solid var(--border)}
        .th{font-size:11px;font-weight:600;color:var(--muted);letter-spacing:0.07em;text-transform:uppercase}
        .pago-row{display:grid;grid-template-columns:1.8fr 1fr 1fr 1fr 1fr 110px;gap:14px;padding:14px 20px;border-bottom:1px solid var(--border);align-items:center;animation:fadeIn .3s ease both;transition:background .18s;min-width:0}
        .pago-row > div{min-width:0;overflow:hidden}
        .pago-row:last-child{border-bottom:none}
        .pago-row:hover{background:rgba(255,255,255,0.03)}
        .p-avatar{width:34px;height:34px;border-radius:50%;background:rgba(26,144,104,0.25);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:var(--text);flex-shrink:0}
        .p-name-wrap{display:flex;align-items:center;gap:10px}
        .p-name{font-size:13px;font-weight:500;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .td-text{font-size:13px;color:var(--muted)}
        .td-monto{font-size:14px;font-weight:600;color:var(--text)}
        .badge{font-size:11px;font-weight:500;padding:3px 10px;border-radius:100px;display:inline-block}
        .b-green{background:rgba(26,144,104,0.18);color:var(--light)}
        .b-amber{background:rgba(245,180,0,0.15);color:var(--amber)}
        .b-blue{background:rgba(224,68,68,0.15);color:var(--red)}
        .b-red{background:rgba(224,68,68,0.15);color:var(--red)}
        .btn-action{background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:7px;padding:6px 12px;font-size:12px;color:var(--muted);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .18s}
        .btn-action:hover{background:rgba(26,144,104,0.15);border-color:rgba(26,144,104,0.3);color:var(--light)}
        .empty-state{padding:60px 20px;text-align:center;color:var(--muted);font-size:14px}

        /* MODAL */
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .2s ease}
        .modal{background:#111D16;border:1px solid var(--border);border-radius:18px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;animation:slideUp .25s ease}
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
        .form-input,.form-select{background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:9px;padding:11px 13px;font-size:14px;font-family:'DM Sans',sans-serif;color:var(--text);outline:none;transition:border-color .2s,box-shadow .2s;width:100%}
        .form-input:focus,.form-select:focus{border-color:var(--mid);box-shadow:0 0 0 3px rgba(26,144,104,0.10)}
        .form-select option{background:#111D16;color:var(--text)}
        .form-input.err,.form-select.err{border-color:rgba(224,68,68,0.5)}
        .err-msg{font-size:11px;color:var(--red)}
        .modal-footer{padding:0 28px 24px;display:flex;gap:10px;justify-content:flex-end}
        .btn-cancel{background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:9px;padding:11px 20px;font-size:14px;color:var(--muted);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .18s}
        .btn-cancel:hover{color:var(--text)}
        .btn-save{background:var(--mid);color:#fff;border:none;border-radius:9px;padding:11px 24px;font-size:14px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:8px;transition:background .2s}
        .btn-save:hover:not(:disabled){background:#158057}
        .btn-save:disabled{opacity:.5;cursor:not-allowed}

        /* CONFIRM */
        .confirm-modal{background:#0f1d16;border:1px solid rgba(26,144,104,0.3);border-radius:16px;width:100%;max-width:380px;padding:28px;animation:slideUp .2s ease}
        .confirm-title{font-size:17px;font-weight:600;color:var(--text);margin-bottom:8px}
        .confirm-body{font-size:14px;color:var(--muted);line-height:1.6;margin-bottom:18px}
        .confirm-name{color:var(--text);font-weight:500}
        .confirm-btns{display:flex;gap:10px;justify-content:flex-end}

        .chatbot-bubble{position:fixed;bottom:28px;right:28px;width:52px;height:52px;border-radius:50%;background:var(--mid);display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;box-shadow:0 4px 16px rgba(26,144,104,0.4);transition:transform .2s;z-index:50;text-decoration:none}
        .chatbot-bubble:hover{transform:scale(1.08)}

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
            {icon:'🏠', label:'Panel',           href:'/secretaria/dashboard', active:false},
            {icon:'📅', label:'Agenda General',  href:'/secretaria/citas',     active:false},
            {icon:'👥', label:'Pacientes',        href:'/secretaria/pacientes', active:false},
            {icon:'💳', label:'Pagos',            href:'/secretaria/pagos',     active:true},
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
        <div className="topbar">
          <span className="topbar-title">Pagos</span>
          <div className="topbar-right">
            <div className="online-dot"><div className="dot"/>En línea</div>
            <div className="notif">🔔</div>
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

          {/* TOTALES — recalculados dinámicamente */}
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
              <div className="stat-num" style={{color: totales.pendiente>0?'#F5B400':'#E8F5EE'}}>${totales.pendiente.toLocaleString('es-MX',{minimumFractionDigits:2})}</div>
              <div className="stat-icon icon-amber">⏳</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Pagos pendientes</div>
              <div className="stat-num">{totales.totalPendientes}</div>
              <div className="stat-icon icon-purple">📋</div>
            </div>
          </div>

          {/* FILTROS */}
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

          {/* TABLA */}
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
                    <span className={`badge ${p.estado_pago==='pagado'?'b-green':p.estado_pago==='reembolsado'?'b-red':'b-amber'}`}>
                      {p.estado_pago==='pagado'?'Pagado':p.estado_pago==='reembolsado'?'Reembolsado':'Pendiente'}
                    </span>
                  </div>
                  <div>
                    {p.estado_pago==='pendiente' && (
                      <button className="btn-action" onClick={() => { setMetodoCobro(p.metodo_pago); setConfirmCobro(p) }}>Cobrar</button>
                    )}
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

      {/* MODAL NUEVO PAGO MANUAL */}
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

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <a href="#" className="chatbot-bubble" title="Asistente RC">💬</a>
    </>
  )
}
