'use client'

/**
 * FinanzasClient.tsx
 * Admin — Módulo de Finanzas completo
 * Dashboard con métricas, gráfica de barras, tabla de pagos con filtros
 */

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'

// ── TIPOS ────────────────────────────────────────────────────
interface Pago {
  id_pago: number
  monto: number
  estado_pago: 'pagado'|'pendiente'|'reembolsado'
  metodo_pago: string
  fecha_pago: string
  motivo_reembolso?: string
  pacientes?: { nombre_completo: string } | null
  registrado_por?: { nombre_completo: string } | null
}
interface IngresoMes { mes: string; ingresos: number; pendientes: number; reembolsos: number; total_transacciones: number }
interface Paquete { id_paquete: number; nombre: string; tipo: string; num_sesiones: number; precio_total: number; precio_por_sesion: number }
interface Contrato {
  id_contrato_paciente: number
  sesiones_totales: number; sesiones_usadas: number; sesiones_restantes: number
  monto_pagado: number; fecha_vencimiento: string; estado: string
  pacientes?: { nombre_completo: string } | null
  paquetes?: { nombre: string; precio_total: number } | null
}
interface Props {
  pagosMes: any[]; pagosAnterior: any[]
  todosLosPagos: Pago[]; ingresosPorMes: IngresoMes[]
  paquetes: Paquete[]; contratos: Contrato[]
}

// ── TOAST ────────────────────────────────────────────────────
function Toast({ msg, type, onClose }: { msg:string; type:'success'|'error'; onClose:()=>void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div style={{
      position:'fixed',bottom:90,right:28,zIndex:200,
      background:type==='success'?'rgba(52,211,153,0.10)':'rgba(242,85,85,0.10)',
      border:`1px solid ${type==='success'?'rgba(52,211,153,0.35)':'rgba(242,85,85,0.35)'}`,
      borderLeft:`3px solid ${type==='success'?'#34D399':'#F25555'}`,
      borderRadius:12,padding:'14px 18px',minWidth:280,maxWidth:380,
      display:'flex',alignItems:'center',gap:12,
      backdropFilter:'blur(16px)',boxShadow:'0 8px 32px rgba(0,0,0,0.5)',animation:'slideUp .3s ease',
    }}>
      <span style={{fontSize:18}}>{type==='success'?'✅':'❌'}</span>
      <span style={{fontSize:14,color:'#E7EDF7',flex:1}}>{msg}</span>
      <button onClick={onClose} style={{background:'none',border:'none',color:'rgba(231,237,247,0.4)',cursor:'pointer',fontSize:16}}>✕</button>
    </div>
  )
}

// ── GRÁFICA DE BARRAS ────────────────────────────────────────
function GraficaBarras({ data }: { data: IngresoMes[] }) {
  const max = Math.max(...data.map(d => Number(d.ingresos)), 1)
  const reversed = [...data].reverse()
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:8,height:120,padding:'0 4px'}}>
      {reversed.map((d, i) => (
        <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
          <div style={{fontSize:9,color:'var(--muted)',fontWeight:600}}>
            ${Number(d.ingresos)>=1000?`${(Number(d.ingresos)/1000).toFixed(1)}k`:Number(d.ingresos)}
          </div>
          <div style={{width:'100%',position:'relative',height:80,display:'flex',alignItems:'flex-end',gap:2}}>
            <div style={{
              flex:1,background:'linear-gradient(180deg,var(--cyan),var(--blue))',
              borderRadius:'4px 4px 0 0',opacity:.9,
              height:`${Math.max((Number(d.ingresos)/max)*100,4)}%`,
              transition:'height .4s ease',
            }}/>
            {Number(d.pendientes)>0 && (
              <div style={{
                flex:1,background:'rgba(245,180,0,0.6)',
                borderRadius:'4px 4px 0 0',
                height:`${Math.max((Number(d.pendientes)/max)*100,4)}%`,
                transition:'height .4s ease',
              }}/>
            )}
          </div>
          <div style={{fontSize:9,color:'var(--muted)',textAlign:'center',whiteSpace:'nowrap'}}>{d.mes}</div>
        </div>
      ))}
      {data.length === 0 && (
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--muted)',fontSize:13}}>
          Sin datos disponibles
        </div>
      )}
    </div>
  )
}

// ── COMPONENTE PRINCIPAL ─────────────────────────────────────
export default function FinanzasClient({ pagosMes, pagosAnterior, todosLosPagos, ingresosPorMes, paquetes, contratos }: Props) {
  const [tabActiva, setTabActiva] = useState<'resumen'|'pagos'|'contratos'|'paquetes'>('resumen')
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroMetodo, setFiltroMetodo] = useState('todos')
  const [toast, setToast] = useState<{msg:string;type:'success'|'error'}|null>(null)
  const [loading, setLoading] = useState(false)

  // ── ESTADO PAQUETES ──────────────────────────────────────
  const [listaPaquetes, setListaPaquetes] = useState<Paquete[]>(paquetes)
  const [busquedaPaq, setBusquedaPaq] = useState('')
  const [modalPaq, setModalPaq] = useState<Paquete|'nuevo'|null>(null)
  const [confirmEliminar, setConfirmEliminar] = useState<Paquete|null>(null)
  const [erroresPaq, setErroresPaq] = useState<Record<string,string>>({})

  const paquetesFiltrados = useMemo(() => {
    if (!busquedaPaq) return listaPaquetes
    return listaPaquetes.filter(p => p.nombre.toLowerCase().includes(busquedaPaq.toLowerCase()) || p.tipo.includes(busquedaPaq.toLowerCase()))
  }, [listaPaquetes, busquedaPaq])

  async function guardarPaquete(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const nombre = fd.get('nombre') as string
    const tipo = fd.get('tipo') as string
    const num_sesiones = fd.get('num_sesiones') as string
    const precio_total = fd.get('precio_total') as string

    const errs: Record<string,string> = {}
    if (!nombre?.trim()) errs.nombre = 'El nombre es obligatorio'
    if (!num_sesiones || Number(num_sesiones) < 1) errs.num_sesiones = 'Mínimo 1 sesión'
    if (!precio_total || Number(precio_total) <= 0) errs.precio_total = 'El precio debe ser mayor a 0'
    if (Object.keys(errs).length > 0) { setErroresPaq(errs); return }

    const esEdicion = modalPaq !== 'nuevo'
    const body = {
      nombre, tipo, num_sesiones: Number(num_sesiones), precio_total: Number(precio_total),
      ...(esEdicion ? { id_paquete: (modalPaq as Paquete).id_paquete } : {}),
    }

    setLoading(true)
    const res = await fetch('/api/admin/paquetes', {
      method: esEdicion ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) { setToast({ msg: data.error ?? 'Error al guardar', type:'error' }); return }

    if (esEdicion) {
      setListaPaquetes(prev => prev.map(p => p.id_paquete===data.paquete.id_paquete ? data.paquete : p))
      setToast({ msg: 'Paquete actualizado correctamente', type:'success' })
    } else {
      setListaPaquetes(prev => [data.paquete, ...prev])
      setToast({ msg: 'Paquete creado correctamente', type:'success' })
    }
    setModalPaq(null)
    setErroresPaq({})
  }

  async function desactivarPaquete() {
    if (!confirmEliminar) return
    setLoading(true)
    const res = await fetch(`/api/admin/paquetes?id=${confirmEliminar.id_paquete}`, { method: 'DELETE' })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setToast({ msg: data.error ?? 'Error al desactivar', type:'error' }); setConfirmEliminar(null); return }
    setListaPaquetes(prev => prev.filter(p => p.id_paquete !== confirmEliminar.id_paquete))
    setToast({ msg: 'Paquete desactivado correctamente', type:'success' })
    setConfirmEliminar(null)
  }

  // ── MÉTRICAS ─────────────────────────────────────────────
  const ingresosMes    = useMemo(() => pagosMes.filter(p=>p.estado_pago==='pagado').reduce((s,p)=>s+Number(p.monto),0), [pagosMes])
  const pendientesMes  = useMemo(() => pagosMes.filter(p=>p.estado_pago==='pendiente').reduce((s,p)=>s+Number(p.monto),0), [pagosMes])
  const reembolsosMes  = useMemo(() => pagosMes.filter(p=>p.estado_pago==='reembolsado').reduce((s,p)=>s+Number(p.monto),0), [pagosMes])
  const ingresosAnterior = useMemo(() => pagosAnterior.filter(p=>p.estado_pago==='pagado').reduce((s,p)=>s+Number(p.monto),0), [pagosAnterior])
  const variacion = ingresosAnterior > 0 ? ((ingresosMes - ingresosAnterior) / ingresosAnterior * 100).toFixed(1) : null

  // ── DISTRIBUCIÓN MÉTODOS DE PAGO ─────────────────────────
  const porMetodo = useMemo(() => {
    const m: Record<string,number> = {}
    pagosMes.filter(p=>p.estado_pago==='pagado').forEach(p => {
      m[p.metodo_pago] = (m[p.metodo_pago]??0) + Number(p.monto)
    })
    return Object.entries(m).sort((a,b)=>b[1]-a[1])
  }, [pagosMes])

  // ── FILTROS DE PAGOS ─────────────────────────────────────
  const pagosFiltrados = useMemo(() => {
    return todosLosPagos
      .filter(p => filtroEstado==='todos' ? true : p.estado_pago===filtroEstado)
      .filter(p => filtroMetodo==='todos' ? true : p.metodo_pago===filtroMetodo)
      .filter(p => {
        if (!busqueda) return true
        return p.pacientes?.nombre_completo?.toLowerCase().includes(busqueda.toLowerCase())
      })
  }, [todosLosPagos, filtroEstado, filtroMetodo, busqueda])

  const METODO_LABELS: Record<string,string> = { efectivo:'Efectivo', transferencia:'Transferencia', tarjeta:'Tarjeta', aseguradora:'Aseguradora' }
  const ESTADO_COLORS: Record<string,string> = { pagado:'b-green', pendiente:'b-amber', reembolsado:'b-purple' }
  const ESTADO_LABELS: Record<string,string> = { pagado:'Pagado', pendiente:'Pendiente', reembolsado:'Reembolsado' }

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
        .sidebar{width:260px;min-height:100vh;background:var(--sidebar);border-right:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0}
        .sb-brand{padding:20px 20px 16px;border-bottom:1px solid var(--border)}
        .sb-logo-row{display:flex;align-items:center;gap:10px}
        .sb-logo{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,var(--blue),var(--cyan));display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;box-shadow:0 0 18px rgba(56,189,248,0.3)}
        .sb-name{font-size:14px;font-weight:700;color:var(--text);letter-spacing:-0.01em}
        .sb-ver{font-size:10px;color:var(--muted)}
        .sb-role{margin:12px 12px 4px;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:10px}
        .sb-role-icon{width:32px;height:32px;border-radius:9px;background:rgba(167,139,250,0.15);border:1px solid rgba(167,139,250,0.28);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
        .sb-role-name{font-size:13px;font-weight:600;color:var(--text)}
        .sb-role-sub{font-size:11px;color:var(--purple)}
        .sb-nav{flex:1;padding:8px 10px}
        .sb-nav a{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;font-size:14px;font-weight:500;color:var(--muted);text-decoration:none;transition:all .18s;margin-bottom:2px}
        .sb-nav a:hover{background:var(--surface2);color:var(--text)}
        .sb-nav a.active{background:linear-gradient(135deg,rgba(37,99,235,0.18),rgba(56,189,248,0.12));color:var(--cyan);box-shadow:inset 0 0 0 1px rgba(56,189,248,0.2)}
        .sb-nav-icon{font-size:16px;width:20px;text-align:center}
        .sb-bottom{padding:12px 10px;border-top:1px solid var(--border)}
        .sb-bottom a{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;font-size:14px;font-weight:500;color:var(--muted);text-decoration:none;transition:color .18s}
        .sb-bottom a:hover{color:var(--red)}
        .main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
        .topbar{height:56px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 28px;flex-shrink:0}
        .topbar-title{font-size:14px;color:var(--muted);font-weight:500}
        .online-dot{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--cyan);font-weight:500}
        .dot{width:7px;height:7px;border-radius:50%;background:var(--cyan);box-shadow:0 0 8px var(--cyan)}
        .content{flex:1;overflow-y:auto;padding:28px}
        .page-title{font-size:26px;font-weight:800;color:var(--text);letter-spacing:-0.015em}
        .page-sub{font-size:14px;color:var(--muted);margin-top:4px;margin-bottom:24px}

        /* MÉTRICAS */
        .metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px}
        .metric{background:var(--card);border:1px solid var(--card-border);border-radius:16px;padding:20px 22px;position:relative;overflow:hidden;transition:border-color .2s,transform .2s}
        .metric:hover{border-color:rgba(56,189,248,0.3);transform:translateY(-2px)}
        .metric-label{font-size:12px;color:var(--muted);margin-bottom:10px;font-weight:500}
        .metric-num{font-size:28px;font-weight:800;letter-spacing:-0.02em;line-height:1;background:linear-gradient(110deg,var(--blue-2),var(--cyan));-webkit-background-clip:text;background-clip:text;color:transparent}
        .metric-num.red{background:var(--red);-webkit-background-clip:text;background-clip:text}
        .metric-num.amber{background:var(--amber);-webkit-background-clip:text;background-clip:text}
        .metric-num.green{background:var(--green);-webkit-background-clip:text;background-clip:text}
        .metric-sub{font-size:11px;color:var(--muted);margin-top:6px}
        .metric-icon{position:absolute;top:18px;right:18px;width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px}
        .variacion{font-size:11px;font-weight:600;padding:2px 7px;border-radius:6px;margin-top:6px;display:inline-block}
        .variacion.up{background:rgba(52,211,153,0.15);color:var(--green)}
        .variacion.down{background:rgba(242,85,85,0.15);color:var(--red)}

        /* GRID CONTENIDO */
        .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}
        .grid-3{display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:20px}
        .card{background:var(--card);border:1px solid var(--card-border);border-radius:16px;padding:20px 22px}
        .card-title{font-size:14px;font-weight:600;color:var(--text);margin-bottom:16px;display:flex;align-items:center;justify-content:space-between}
        .card-sub{font-size:12px;color:var(--muted);font-weight:400}

        /* TABS */
        .tabs-bar{display:flex;gap:4px;margin-bottom:20px;background:var(--card);border:1px solid var(--card-border);border-radius:12px;padding:5px}
        .tab-btn{flex:1;padding:9px 14px;border-radius:9px;font-size:13px;font-weight:500;color:var(--muted);cursor:pointer;border:none;background:none;font-family:'Inter',sans-serif;transition:all .18s;text-align:center}
        .tab-btn:hover{color:var(--text)}
        .tab-btn.active{background:linear-gradient(135deg,rgba(37,99,235,0.25),rgba(56,189,248,0.15));color:var(--cyan);box-shadow:0 0 0 1px rgba(56,189,248,0.2)}

        /* FILTROS */
        .filters{display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap}
        .search-wrap{flex:1;min-width:200px;position:relative}
        .search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:14px;color:var(--muted)}
        .search-input{width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px 12px 10px 34px;font-size:13px;font-family:'Inter',sans-serif;color:var(--text);outline:none;transition:border-color .2s}
        .search-input:focus{border-color:var(--cyan)}
        .search-input::placeholder{color:var(--muted)}
        .filter-select{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px 13px;font-size:13px;font-family:'Inter',sans-serif;color:var(--text);outline:none}
        .filter-select option{background:#0A1220}

        /* TABLA */
        .table-card{background:var(--card);border:1px solid var(--card-border);border-radius:16px;overflow:hidden}
        .table-header-row{display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr;gap:12px;padding:12px 20px;border-bottom:1px solid var(--border)}
        .th{font-size:11px;font-weight:600;color:var(--muted);letter-spacing:0.07em;text-transform:uppercase}
        .pago-row{display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr;gap:12px;padding:13px 20px;border-bottom:1px solid var(--border);align-items:center;transition:background .15s;animation:fadeIn .25s ease both}
        .pago-row:last-child{border-bottom:none}
        .pago-row:hover{background:var(--surface2)}
        .p-name{font-size:13px;font-weight:500;color:var(--text)}
        .p-date{font-size:11px;color:var(--muted);margin-top:2px}
        .p-monto{font-size:14px;font-weight:700;color:var(--text)}
        .td-text{font-size:13px;color:var(--muted)}
        .empty-state{padding:48px 20px;text-align:center;color:var(--muted);font-size:13px}

        /* BADGES */
        .badge{font-size:11px;font-weight:600;padding:3px 10px;border-radius:100px;display:inline-block}
        .b-green{background:rgba(52,211,153,0.15);color:var(--green)}
        .b-amber{background:rgba(245,180,0,0.15);color:var(--amber)}
        .b-red{background:rgba(242,85,85,0.15);color:var(--red)}
        .b-purple{background:rgba(167,139,250,0.15);color:var(--purple)}
        .b-blue{background:rgba(56,189,248,0.15);color:var(--cyan)}

        /* MÉTODO */
        .metodo-bar{display:flex;flex-direction:column;gap:8px}
        .metodo-row{display:flex;align-items:center;gap:10px}
        .metodo-label{font-size:12px;color:var(--muted);width:110px;flex-shrink:0}
        .metodo-track{flex:1;height:6px;background:var(--surface2);border-radius:100px;overflow:hidden}
        .metodo-fill{height:100%;border-radius:100px;background:linear-gradient(90deg,var(--blue),var(--cyan))}
        .metodo-val{font-size:12px;font-weight:600;color:var(--text);min-width:60px;text-align:right}

        /* PAQUETES */
        .paquete-item{background:var(--surface2);border-radius:12px;padding:14px 16px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between}
        .paquete-nombre{font-size:14px;font-weight:600;color:var(--text)}
        .paquete-meta{font-size:12px;color:var(--muted);margin-top:3px}
        .paquete-precio{font-size:16px;font-weight:800;background:linear-gradient(110deg,var(--blue-2),var(--cyan));-webkit-background-clip:text;background-clip:text;color:transparent}

        /* CONTRATOS */
        .contrato-item{background:var(--surface2);border-radius:12px;padding:14px 16px;margin-bottom:10px}
        .contrato-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
        .contrato-pac{font-size:13px;font-weight:600;color:var(--text)}
        .contrato-paq{font-size:12px;color:var(--muted);margin-top:1px}
        .sesiones-bar{height:5px;background:var(--border);border-radius:100px;overflow:hidden;margin:8px 0}
        .sesiones-fill{height:100%;border-radius:100px;background:linear-gradient(90deg,var(--blue),var(--cyan))}
        .contrato-meta{display:flex;justify-content:space-between;font-size:11px;color:var(--muted)}

        .chatbot-bubble{position:fixed;bottom:28px;right:28px;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--blue),var(--cyan));display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;box-shadow:0 8px 24px rgba(37,99,235,0.4);transition:transform .2s;z-index:50;text-decoration:none}
        .chatbot-bubble:hover{transform:scale(1.08)}

        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}

        @media(max-width:1100px){.metrics{grid-template-columns:repeat(2,1fr)}.grid-3{grid-template-columns:1fr}}
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
          <div className="sb-role-icon">🛡</div>
          <div><div className="sb-role-name">Administradora General</div><div className="sb-role-sub">Acceso Total</div></div>
        </div>
        <nav className="sb-nav">
          {[
            {icon:'🏠', label:'Panel General',     href:'/admin/dashboard',      active:false},
            {icon:'👥', label:'Usuarios y Roles',  href:'/admin/usuarios',       active:false},
            {icon:'📋', label:'Expedientes',        href:'/admin/expedientes',    active:false},
            {icon:'💳', label:'Finanzas',           href:'/admin/finanzas',       active:true},
            {icon:'📊', label:'Reportes',           href:'/admin/reportes',       active:false},
            {icon:'⚠️', label:'Solicitudes de Baja',  href:'/admin/solicitudes-baja', active:false},
            {icon:'🔍', label:'Logs de Auditoría', href:'/admin/logs',           active:false},
            {icon:'⚙️', label:'Configuración',      href:'/admin/configuracion',  active:false},
          ].map(n => (
            <Link key={n.label} href={n.href} className={n.active ? 'active' : ''}>
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
          <span className="topbar-title">Finanzas</span>
          <div className="online-dot"><div className="dot"/>En línea</div>
        </div>

        <div className="content">
          <div className="page-title">Finanzas</div>
          <div className="page-sub">Control financiero de la clínica — ingresos, pagos y contratos</div>

          {/* TABS */}
          <div className="tabs-bar">
            {[
              {k:'resumen', l:'📊 Resumen'},
              {k:'pagos',   l:'💳 Todos los pagos'},
              {k:'contratos',l:'📄 Contratos'},
              {k:'paquetes', l:'📦 Paquetes'},
            ].map(t => (
              <button key={t.k} className={`tab-btn${tabActiva===t.k?' active':''}`} onClick={() => setTabActiva(t.k as any)}>{t.l}</button>
            ))}
          </div>

          {/* ── TAB RESUMEN ── */}
          {tabActiva==='resumen' && (
            <>
              <div className="metrics">
                {[
                  {label:'Ingresos del mes', num:`$${ingresosMes.toLocaleString('es-MX',{minimumFractionDigits:2})}`, icon:'💰', cls:'icon-green', sub: variacion ? `${Number(variacion)>=0?'▲':'▼'} ${Math.abs(Number(variacion))}% vs mes anterior` : 'Primer mes registrado', variacion},
                  {label:'Pagos pendientes', num:`$${pendientesMes.toLocaleString('es-MX',{minimumFractionDigits:2})}`, icon:'⏳', cls:'icon-amber', sub:`${pagosMes.filter(p=>p.estado_pago==='pendiente').length} pagos sin cobrar`},
                  {label:'Reembolsos del mes', num:`$${reembolsosMes.toLocaleString('es-MX',{minimumFractionDigits:2})}`, icon:'↩️', cls:'icon-red', sub:`${pagosMes.filter(p=>p.estado_pago==='reembolsado').length} reembolsos`},
                  {label:'Total transacciones', num:String(pagosMes.length), icon:'📋', cls:'icon-blue', sub:'Este mes'},
                ].map(m => (
                  <div className="metric" key={m.label}>
                    <div className="metric-label">{m.label}</div>
                    <div className={`metric-num${m.label.includes('pendiente')?'':m.label.includes('Reembolso')?'':''}`}>{m.num}</div>
                    <div className="metric-sub">{m.sub}</div>
                    {m.variacion && (
                      <div className={`variacion ${Number(m.variacion)>=0?'up':'down'}`}>
                        {Number(m.variacion)>=0?'▲':'▼'} {Math.abs(Number(m.variacion))}% vs mes anterior
                      </div>
                    )}
                    <div className={`metric-icon ${m.cls}`}>{m.icon}</div>
                  </div>
                ))}
              </div>

              <div className="grid-3">
                {/* GRÁFICA */}
                <div className="card">
                  <div className="card-title">
                    Ingresos últimos 6 meses
                    <div style={{display:'flex',gap:12,alignItems:'center'}}>
                      <span style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--muted)'}}>
                        <span style={{width:10,height:10,borderRadius:2,background:'var(--cyan)',display:'inline-block'}}/>Cobrado
                      </span>
                      <span style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--muted)'}}>
                        <span style={{width:10,height:10,borderRadius:2,background:'rgba(245,180,0,0.6)',display:'inline-block'}}/>Pendiente
                      </span>
                    </div>
                  </div>
                  <GraficaBarras data={ingresosPorMes} />
                  {ingresosPorMes.length === 0 && (
                    <div style={{textAlign:'center',color:'var(--muted)',fontSize:12,marginTop:8}}>
                      Solo se muestran meses con pagos registrados
                    </div>
                  )}
                </div>

                {/* MÉTODOS DE PAGO */}
                <div className="card">
                  <div className="card-title">Métodos de pago</div>
                  {porMetodo.length === 0 ? (
                    <div style={{color:'var(--muted)',fontSize:13}}>Sin pagos este mes</div>
                  ) : (
                    <div className="metodo-bar">
                      {porMetodo.map(([metodo, monto]) => (
                        <div key={metodo} className="metodo-row">
                          <div className="metodo-label">{METODO_LABELS[metodo]??metodo}</div>
                          <div className="metodo-track">
                            <div className="metodo-fill" style={{width:`${(monto/ingresosMes*100).toFixed(0)}%`}}/>
                          </div>
                          <div className="metodo-val">${Number(monto).toLocaleString('es-MX',{minimumFractionDigits:0})}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{marginTop:16,paddingTop:12,borderTop:'1px solid var(--border)'}}>
                    <div style={{fontSize:12,color:'var(--muted)',marginBottom:6}}>Resumen del mes</div>
                    {ingresosPorMes[0] && (
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                        {[
                          {l:'Cobrado', v:`$${Number(ingresosPorMes[0].ingresos).toLocaleString('es-MX',{minimumFractionDigits:0})}`, c:'var(--green)'},
                          {l:'Pendiente', v:`$${Number(ingresosPorMes[0].pendientes).toLocaleString('es-MX',{minimumFractionDigits:0})}`, c:'var(--amber)'},
                        ].map(item => (
                          <div key={item.l} style={{background:'var(--surface2)',borderRadius:8,padding:'8px 10px'}}>
                            <div style={{fontSize:10,color:'var(--muted)',marginBottom:2}}>{item.l}</div>
                            <div style={{fontSize:14,fontWeight:700,color:item.c}}>{item.v}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ALERTAS ADEUDOS */}
              {pendientesMes > 0 && (
                <div style={{background:'rgba(245,180,0,0.06)',border:'1px solid rgba(245,180,0,0.2)',borderRadius:12,padding:'14px 16px',marginBottom:16,display:'flex',alignItems:'center',gap:12}}>
                  <span style={{fontSize:20}}>⚠️</span>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:'var(--amber)'}}>Pagos pendientes por cobrar</div>
                    <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>
                      Hay ${pendientesMes.toLocaleString('es-MX',{minimumFractionDigits:2})} en {pagosMes.filter(p=>p.estado_pago==='pendiente').length} pagos pendientes este mes.
                      <button onClick={() => setTabActiva('pagos')} style={{background:'none',border:'none',color:'var(--cyan)',cursor:'pointer',fontFamily:'Inter',fontSize:12,marginLeft:8,fontWeight:600}}>Ver pagos →</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── TAB TODOS LOS PAGOS ── */}
          {tabActiva==='pagos' && (
            <>
              <div className="filters">
                <div className="search-wrap">
                  <span className="search-icon">🔍</span>
                  <input className="search-input" placeholder="Buscar paciente..."
                    value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                </div>
                <select className="filter-select" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                  <option value="todos">Todos los estados</option>
                  <option value="pagado">Pagado</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="reembolsado">Reembolsado</option>
                </select>
                <select className="filter-select" value={filtroMetodo} onChange={e => setFiltroMetodo(e.target.value)}>
                  <option value="todos">Todos los métodos</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="aseguradora">Aseguradora</option>
                </select>
              </div>

              <div style={{fontSize:13,color:'var(--muted)',marginBottom:12}}>
                {pagosFiltrados.length} pagos · Total cobrado: <strong style={{color:'var(--green)'}}>
                  ${pagosFiltrados.filter(p=>p.estado_pago==='pagado').reduce((s,p)=>s+Number(p.monto),0).toLocaleString('es-MX',{minimumFractionDigits:2})}
                </strong>
              </div>

              <div className="table-card">
                <div className="table-header-row">
                  <div className="th">Paciente</div>
                  <div className="th">Monto</div>
                  <div className="th">Estado</div>
                  <div className="th">Método</div>
                  <div className="th">Fecha</div>
                </div>
                {pagosFiltrados.length === 0 && <div className="empty-state">No hay pagos que coincidan</div>}
                {pagosFiltrados.map((p, i) => (
                  <div key={p.id_pago} className="pago-row" style={{animationDelay:`${i*15}ms`}}>
                    <div>
                      <div className="p-name">{p.pacientes?.nombre_completo ?? '—'}</div>
                      <div className="p-date">Registrado por {p.registrado_por?.nombre_completo ?? '—'}</div>
                    </div>
                    <div className="p-monto">${Number(p.monto).toLocaleString('es-MX',{minimumFractionDigits:2})}</div>
                    <div><span className={`badge ${ESTADO_COLORS[p.estado_pago]}`}>{ESTADO_LABELS[p.estado_pago]}</span></div>
                    <div className="td-text">{METODO_LABELS[p.metodo_pago]??p.metodo_pago}</div>
                    <div className="td-text">{new Date(p.fecha_pago).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'})}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── TAB CONTRATOS ── */}
          {tabActiva==='contratos' && (
            <>
              <div style={{fontSize:13,color:'var(--muted)',marginBottom:16}}>
                {contratos.length} contratos activos
              </div>
              {contratos.length === 0 && <div style={{color:'var(--muted)',fontSize:13,textAlign:'center',padding:40}}>No hay contratos registrados</div>}
              {contratos.map(c => {
                const pct = c.sesiones_totales > 0 ? (c.sesiones_usadas / c.sesiones_totales * 100) : 0
                const vence = new Date(c.fecha_vencimiento)
                const diasRestantes = Math.ceil((vence.getTime() - Date.now()) / (1000*60*60*24))
                return (
                  <div key={c.id_contrato_paciente} className="contrato-item">
                    <div className="contrato-header">
                      <div>
                        <div className="contrato-pac">{c.pacientes?.nombre_completo ?? '—'}</div>
                        <div className="contrato-paq">{c.paquetes?.nombre ?? '—'}</div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <span className={`badge ${c.estado==='activo'?'b-green':c.estado==='vencido'?'b-red':'b-amber'}`}>{c.estado}</span>
                        <div style={{fontSize:11,color:diasRestantes<7?'var(--red)':'var(--muted)',marginTop:4}}>
                          {diasRestantes > 0 ? `Vence en ${diasRestantes} días` : 'Vencido'}
                        </div>
                      </div>
                    </div>
                    <div className="sesiones-bar">
                      <div className="sesiones-fill" style={{width:`${pct}%`}}/>
                    </div>
                    <div className="contrato-meta">
                      <span>{c.sesiones_usadas}/{c.sesiones_totales} sesiones usadas</span>
                      <span style={{color:'var(--green)',fontWeight:600}}>${Number(c.monto_pagado).toLocaleString('es-MX',{minimumFractionDigits:2})} pagado</span>
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {/* ── TAB PAQUETES ── */}
          {tabActiva==='paquetes' && (
            <>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,gap:12,flexWrap:'wrap'}}>
                <div style={{position:'relative',flex:1,minWidth:200}}>
                  <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:14,color:'var(--muted)'}}>🔍</span>
                  <input
                    style={{width:'100%',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 12px 10px 34px',fontSize:13,fontFamily:'Inter',color:'var(--text)',outline:'none'}}
                    placeholder="Buscar paquete..." value={busquedaPaq} onChange={e => setBusquedaPaq(e.target.value)}
                  />
                </div>
                <button
                  onClick={() => { setModalPaq('nuevo'); setErroresPaq({}) }}
                  style={{background:'linear-gradient(135deg,var(--blue),var(--cyan))',color:'#fff',border:'none',borderRadius:11,padding:'10px 20px',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'Inter',boxShadow:'0 4px 14px rgba(37,99,235,0.3)',whiteSpace:'nowrap'}}
                >+ Nuevo paquete</button>
              </div>

              <div style={{fontSize:13,color:'var(--muted)',marginBottom:12}}>{paquetesFiltrados.length} paquetes</div>

              {paquetesFiltrados.length === 0 && (
                <div style={{textAlign:'center',padding:'48px 20px',color:'var(--muted)',fontSize:13}}>
                  {busquedaPaq ? 'No hay paquetes que coincidan' : 'No hay paquetes registrados'}
                </div>
              )}

              {paquetesFiltrados.map(p => (
                <div key={p.id_paquete} className="paquete-item">
                  <div style={{flex:1}}>
                    <div className="paquete-nombre">{p.nombre}</div>
                    <div className="paquete-meta">
                      {p.num_sesiones} sesión{p.num_sesiones!==1?'es':''} · ${Number(p.precio_por_sesion).toLocaleString('es-MX',{minimumFractionDigits:2})}/sesión · {p.tipo}
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <div className="paquete-precio">${Number(p.precio_total).toLocaleString('es-MX',{minimumFractionDigits:2})}</div>
                    <button
                      onClick={() => { setModalPaq(p); setErroresPaq({}) }}
                      style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,padding:'6px 12px',fontSize:12,fontWeight:500,color:'var(--muted)',cursor:'pointer',fontFamily:'Inter',transition:'all .18s'}}
                    >✏️ Editar</button>
                    <button
                      onClick={() => setConfirmEliminar(p)}
                      style={{background:'rgba(242,85,85,0.10)',border:'1px solid rgba(242,85,85,0.25)',borderRadius:8,padding:'6px 12px',fontSize:12,fontWeight:500,color:'var(--red)',cursor:'pointer',fontFamily:'Inter'}}
                    >🗑 Desactivar</button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ── MODAL CREAR / EDITAR PAQUETE ── */}
      {modalPaq !== null && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(6px)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:20,animation:'fadeIn .2s ease'}}
          onClick={e => { if(e.target===e.currentTarget){ setModalPaq(null); setErroresPaq({}) } }}>
          <div style={{background:'#0A1220',border:'1px solid rgba(56,189,248,0.25)',borderRadius:18,width:'100%',maxWidth:460,padding:28,animation:'slideUp .2s ease'}}>
            <div style={{fontSize:17,fontWeight:700,color:'var(--text)',marginBottom:6}}>
              {modalPaq==='nuevo' ? '📦 Nuevo paquete' : '✏️ Editar paquete'}
            </div>
            <p style={{fontSize:13,color:'var(--muted)',marginBottom:22,lineHeight:1.5}}>
              El precio por sesión se calculará automáticamente.
            </p>
            <form onSubmit={guardarPaquete} noValidate>
              <div style={{marginBottom:14}}>
                <label style={{display:'block',fontSize:11,fontWeight:600,color:'var(--muted)',letterSpacing:'0.07em',textTransform:'uppercase',marginBottom:7}}>Nombre del paquete *</label>
                <input name="nombre" className="form-input"
                  style={{width:'100%',background:'rgba(255,255,255,0.05)',border:`1.5px solid ${erroresPaq.nombre?'rgba(242,85,85,0.5)':'var(--border)'}`,borderRadius:10,padding:'11px 13px',fontSize:14,fontFamily:'Inter',color:'var(--text)',outline:'none'}}
                  placeholder="Ej. Paquete Premium" defaultValue={modalPaq!=='nuevo'?(modalPaq as Paquete).nombre:''} />
                {erroresPaq.nombre && <span style={{fontSize:11,color:'var(--red)'}}>{erroresPaq.nombre}</span>}
              </div>
              <div style={{marginBottom:14}}>
                <label style={{display:'block',fontSize:11,fontWeight:600,color:'var(--muted)',letterSpacing:'0.07em',textTransform:'uppercase',marginBottom:7}}>Tipo *</label>
                <select name="tipo"
                  style={{width:'100%',background:'rgba(255,255,255,0.05)',border:'1.5px solid var(--border)',borderRadius:10,padding:'11px 13px',fontSize:14,fontFamily:'Inter',color:'var(--text)',outline:'none'}}
                  defaultValue={modalPaq!=='nuevo'?(modalPaq as Paquete).tipo:'individual'}>
                  <option value="individual">Individual</option>
                  <option value="contado">Contado</option>
                  <option value="aseguradora">Aseguradora</option>
                </select>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                <div>
                  <label style={{display:'block',fontSize:11,fontWeight:600,color:'var(--muted)',letterSpacing:'0.07em',textTransform:'uppercase',marginBottom:7}}>Núm. sesiones *</label>
                  <input name="num_sesiones" type="number" min="1"
                    style={{width:'100%',background:'rgba(255,255,255,0.05)',border:`1.5px solid ${erroresPaq.num_sesiones?'rgba(242,85,85,0.5)':'var(--border)'}`,borderRadius:10,padding:'11px 13px',fontSize:14,fontFamily:'Inter',color:'var(--text)',outline:'none'}}
                    placeholder="10" defaultValue={modalPaq!=='nuevo'?(modalPaq as Paquete).num_sesiones:''} />
                  {erroresPaq.num_sesiones && <span style={{fontSize:11,color:'var(--red)'}}>{erroresPaq.num_sesiones}</span>}
                </div>
                <div>
                  <label style={{display:'block',fontSize:11,fontWeight:600,color:'var(--muted)',letterSpacing:'0.07em',textTransform:'uppercase',marginBottom:7}}>Precio total ($) *</label>
                  <input name="precio_total" type="number" min="0" step="0.01"
                    style={{width:'100%',background:'rgba(255,255,255,0.05)',border:`1.5px solid ${erroresPaq.precio_total?'rgba(242,85,85,0.5)':'var(--border)'}`,borderRadius:10,padding:'11px 13px',fontSize:14,fontFamily:'Inter',color:'var(--text)',outline:'none'}}
                    placeholder="6150.00" defaultValue={modalPaq!=='nuevo'?(modalPaq as Paquete).precio_total:''} />
                  {erroresPaq.precio_total && <span style={{fontSize:11,color:'var(--red)'}}>{erroresPaq.precio_total}</span>}
                </div>
              </div>
              <div style={{display:'flex',gap:10,justifyContent:'flex-end',paddingTop:8,borderTop:'1px solid var(--border)'}}>
                <button type="button"
                  style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 18px',fontSize:14,fontWeight:500,color:'var(--muted)',cursor:'pointer',fontFamily:'Inter'}}
                  onClick={() => { setModalPaq(null); setErroresPaq({}) }}>Cancelar</button>
                <button type="submit" disabled={loading}
                  style={{background:'linear-gradient(135deg,var(--blue),var(--cyan))',color:'#fff',border:'none',borderRadius:10,padding:'10px 20px',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'Inter',display:'flex',alignItems:'center',gap:8,opacity:loading?.5:1}}>
                  {loading && <span style={{width:14,height:14,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',animation:'spin .7s linear infinite',display:'inline-block'}}/>}
                  {modalPaq==='nuevo' ? 'Crear paquete' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL CONFIRMAR DESACTIVAR ── */}
      {confirmEliminar && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(6px)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}
          onClick={e => { if(e.target===e.currentTarget) setConfirmEliminar(null) }}>
          <div style={{background:'#1A0E0E',border:'1px solid rgba(242,85,85,0.25)',borderRadius:18,width:'100%',maxWidth:400,padding:28,animation:'slideUp .2s ease'}}>
            <div style={{fontSize:17,fontWeight:700,color:'var(--text)',marginBottom:8}}>🗑 Desactivar paquete</div>
            <p style={{fontSize:14,color:'var(--muted)',lineHeight:1.6,marginBottom:22}}>
              ¿Desactivar <strong style={{color:'var(--text)'}}>{confirmEliminar.nombre}</strong>? Los contratos existentes no se verán afectados, pero no se podrán crear nuevos contratos con este paquete.
            </p>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 18px',fontSize:14,fontWeight:500,color:'var(--muted)',cursor:'pointer',fontFamily:'Inter'}}
                onClick={() => setConfirmEliminar(null)}>Cancelar</button>
              <button disabled={loading}
                style={{background:'var(--red)',color:'#fff',border:'none',borderRadius:10,padding:'10px 20px',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'Inter',display:'flex',alignItems:'center',gap:8,opacity:loading?.5:1}}
                onClick={desactivarPaquete}>
                {loading && <span style={{width:14,height:14,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',animation:'spin .7s linear infinite',display:'inline-block'}}/>}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <a href="#" className="chatbot-bubble" title="Asistente RC">💬</a>
    </>
  )
}

