'use client'

/**
 * ContratosClient.tsx (Secretaria)
 * ─────────────────────────────────────────────────────────────
 * Asignar paquetes a pacientes (crear contratos) y registrar abonos.
 * Reutiliza los mismos endpoints que Admin → Finanzas → Contratos:
 *   GET  /api/admin/pacientes-activos
 *   POST /api/contratos
 *   POST /api/contratos/abonar
 */

import { useState } from 'react'
import Sidebar, { MenuButton } from '@/app/components/Sidebar'
import TopbarActions from '@/app/components/TopbarActions'

interface Paquete { id_paquete: number; nombre: string; num_sesiones: number; precio_total: number; duracion_sesion_min?: number }
interface Contrato {
  id_contrato_paciente: number
  sesiones_totales: number; sesiones_usadas: number; sesiones_restantes: number
  monto_pagado: number; fecha_vencimiento: string; estado: string
  pacientes?: { nombre_completo: string } | null
  paquetes?: { nombre: string; precio_total: number } | null
}
interface Props {
  paquetes: Paquete[]
  contratosIniciales: Contrato[]
  userId: string
  nombre?: string
}

function Toast({ msg, type, onClose }: { msg: string; type: 'success'|'error'; onClose: ()=>void }) {
  setTimeout(onClose, 3500)
  return (
    <div style={{
      position:'fixed', bottom:90, right:28, zIndex:200,
      background: type==='success' ? 'rgba(52,211,153,0.10)' : 'rgba(242,85,85,0.10)',
      border: `1px solid ${type==='success' ? 'rgba(52,211,153,0.35)' : 'rgba(242,85,85,0.35)'}`,
      borderLeft: `3px solid ${type==='success' ? '#34D399' : '#F25555'}`,
      borderRadius:12, padding:'14px 18px', minWidth:280, maxWidth:380,
      display:'flex', alignItems:'center', gap:12,
      boxShadow:'0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <span style={{fontSize:18}}>{type==='success'?'✅':'❌'}</span>
      <span style={{fontSize:14, color:'#E7EDF7', flex:1}}>{msg}</span>
      <button onClick={onClose} style={{background:'none',border:'none',color:'rgba(231,237,247,0.4)',cursor:'pointer',fontSize:16}}>✕</button>
    </div>
  )
}

// Da la fecha de HOY (o +N días) en formato YYYY-MM-DD usando componentes
// LOCALES del navegador — evita el bug de .toISOString(), que convierte a
// UTC y puede adelantar un día completo si es de noche en México.
function fechaLocalHoy(masDias = 0) {
  const d = new Date()
  d.setDate(d.getDate() + masDias)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dia}`
}

export default function ContratosClient({ paquetes, contratosIniciales, userId, nombre }: Props) {
  const [contratos, setContratos] = useState<Contrato[]>(contratosIniciales)
  const [toast, setToast] = useState<{msg:string;type:'success'|'error'}|null>(null)

  const [modalContrato, setModalContrato] = useState(false)
  const [pacientesActivos, setPacientesActivos] = useState<{id_paciente:number; nombre_completo:string}[]>([])
  const [erroresContrato, setErroresContrato] = useState<Record<string,string>>({})
  const [loadingContrato, setLoadingContrato] = useState(false)
  const [paqueteSeleccionado, setPaqueteSeleccionado] = useState<Paquete | null>(null)
  const [incluirPagoInicial, setIncluirPagoInicial] = useState(true)

  const [modalAbonar, setModalAbonar] = useState<Contrato | null>(null)
  const [erroresAbono, setErroresAbono] = useState<Record<string,string>>({})
  const [loadingAbono, setLoadingAbono] = useState(false)

  async function abrirModalNuevoContrato() {
    setModalContrato(true)
    setErroresContrato({})
    setPaqueteSeleccionado(null)
    if (pacientesActivos.length === 0) {
      const res = await fetch('/api/admin/pacientes-activos')
      const data = await res.json()
      if (res.ok) setPacientesActivos(data.pacientes ?? [])
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --bg:#060B14;--sidebar:#0A1220;--card:rgba(255,255,255,0.035);--card-border:rgba(255,255,255,0.09);
          --border:rgba(255,255,255,0.09);--surface2:rgba(255,255,255,0.07);
          --blue:#2563EB;--cyan:#38BDF8;
          --text:#E7EDF7;--muted:#8C9BB5;
          --red:#F25555;--amber:#F5B400;--green:#34D399;
        }
        body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex}
        .main{flex:1;display:flex;flex-direction:column;overflow:hidden}
        .topbar{height:56px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 28px;flex-shrink:0}
        .topbar-title{font-size:14px;color:var(--muted);font-weight:500}
        .topbar-right{display:flex;align-items:center;gap:16px}
        .online-dot{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--cyan);font-weight:500}
        .dot{width:7px;height:7px;border-radius:50%;background:var(--cyan);box-shadow:0 0 8px var(--cyan)}
        .content{flex:1;overflow-y:auto;padding:28px}
        .page-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;flex-wrap:wrap;gap:12px}
        .page-title{font-size:26px;font-weight:800;color:var(--text);letter-spacing:-0.015em}
        .page-sub{font-size:14px;color:var(--muted);margin-top:4px}
        .btn-nuevo{background:linear-gradient(135deg,var(--blue),var(--cyan));color:#fff;border:none;border-radius:11px;padding:11px 20px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;box-shadow:0 4px 18px rgba(37,99,235,0.32)}
        .contrato-item{background:var(--card);border:1px solid var(--card-border);border-radius:14px;padding:16px 18px;margin-bottom:10px}
        .contrato-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px}
        .contrato-pac{font-size:14px;font-weight:600;color:var(--text)}
        .contrato-paq{font-size:12px;color:var(--muted);margin-top:1px}
        .sesiones-bar{height:5px;background:var(--border);border-radius:100px;overflow:hidden;margin:8px 0}
        .sesiones-fill{height:100%;border-radius:100px;background:linear-gradient(90deg,var(--blue),var(--cyan))}
        .contrato-meta{display:flex;justify-content:space-between;font-size:11px;color:var(--muted);flex-wrap:wrap;gap:6px}
        .badge{font-size:11px;font-weight:600;padding:3px 10px;border-radius:100px}
        .b-green{background:rgba(52,211,153,0.15);color:var(--green)}
        .b-red{background:rgba(242,85,85,0.15);color:var(--red)}
        .b-amber{background:rgba(245,180,0,0.15);color:var(--amber)}
        .empty{color:var(--muted);font-size:13px;text-align:center;padding:40px}

        @media (max-width:640px){
          .content{padding:18px 16px}
          .page-title{font-size:22px}
          .btn-nuevo{width:100%}
          .form-row-2{grid-template-columns:1fr !important}
        }
      `}</style>

      <Sidebar
        rol="secretaria"
        nombre="Secretaria"
        subRol="Acceso Operativo"
        icono="📁"
        items={[
          {icon:'🏠', label:'Panel',          href:'/secretaria/dashboard', active:false},
          {icon:'📅', label:'Agenda General', href:'/secretaria/citas',     active:false},
          {icon:'👥', label:'Pacientes',      href:'/secretaria/pacientes', active:false},
          {icon:'📄', label:'Contratos',      href:'/secretaria/contratos', active:true},
          {icon:'💳', label:'Pagos',          href:'/secretaria/pagos',     active:false},
          { icon:'🕘', label:'Disponibilidad', href:'/secretaria/disponibilidad', active:false },
        ]}
      />

      <div className="main">
        <div className="topbar">
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <MenuButton />
            <span className="topbar-title">Contratos</span>
          </div>
          <div className="topbar-right">
            <div className="online-dot"><div className="dot"/>En línea</div>
            <TopbarActions userId={userId} rol="secretaria" nombre={nombre} />
          </div>
        </div>

        <div className="content">
          <div className="page-header">
            <div>
              <div className="page-title">Contratos</div>
              <div className="page-sub">Asigna paquetes a pacientes y registra sus abonos</div>
            </div>
            <button className="btn-nuevo" onClick={abrirModalNuevoContrato}>+ Nuevo contrato</button>
          </div>

          {contratos.length === 0 && <div className="empty">No hay contratos registrados</div>}
          {contratos.map(c => {
            const pct = c.sesiones_totales > 0 ? (c.sesiones_usadas / c.sesiones_totales * 100) : 0
            const vence = new Date(c.fecha_vencimiento)
            const diasRestantes = Math.ceil((vence.getTime() - Date.now()) / (1000*60*60*24))
            const precioTotal = Number(c.paquetes?.precio_total ?? 0)
            const saldo = precioTotal - Number(c.monto_pagado)
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
                <div className="sesiones-bar"><div className="sesiones-fill" style={{width:`${pct}%`}}/></div>
                <div className="contrato-meta">
                  <span>{c.sesiones_usadas}/{c.sesiones_totales} sesiones usadas</span>
                  <span style={{color:'var(--green)',fontWeight:600}}>${Number(c.monto_pagado).toLocaleString('es-MX',{minimumFractionDigits:2})} pagado</span>
                </div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:10,paddingTop:10,borderTop:'1px solid var(--border)'}}>
                  <span style={{fontSize:12,color:saldo>0?'var(--amber)':'var(--muted)'}}>
                    {saldo > 0 ? `Saldo pendiente: $${saldo.toLocaleString('es-MX',{minimumFractionDigits:2})}` : 'Pagado en su totalidad'}
                  </span>
                  {saldo > 0 && (
                    <button
                      onClick={() => { setModalAbonar(c); setErroresAbono({}) }}
                      style={{background:'rgba(56,189,248,0.12)',border:'1px solid rgba(56,189,248,0.3)',borderRadius:8,padding:'5px 12px',fontSize:12,fontWeight:600,color:'var(--cyan)',cursor:'pointer',fontFamily:'Inter'}}
                    >+ Abonar</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── MODAL ABONAR ── */}
      {modalAbonar && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(6px)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}
          onClick={e => { if(e.target===e.currentTarget) setModalAbonar(null) }}>
          <div style={{background:'#0A1220',border:'1px solid rgba(56,189,248,0.25)',borderRadius:18,width:'100%',maxWidth:420,padding:28}}>
            <div style={{fontSize:17,fontWeight:700,color:'var(--text)',marginBottom:6}}>💳 Abonar a contrato</div>
            <p style={{fontSize:13,color:'var(--muted)',marginBottom:8}}>
              {modalAbonar.pacientes?.nombre_completo} · {modalAbonar.paquetes?.nombre}
            </p>
            <p style={{fontSize:13,color:'var(--amber)',marginBottom:22,fontWeight:600}}>
              Saldo pendiente: ${(Number(modalAbonar.paquetes?.precio_total ?? 0) - Number(modalAbonar.monto_pagado)).toLocaleString('es-MX',{minimumFractionDigits:2})}
            </p>
            <form onSubmit={async (e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              const monto = fd.get('monto') as string
              const metodo_pago = fd.get('metodo_pago') as string
              const estado_pago = fd.get('estado_pago') as string
              const errs: Record<string,string> = {}
              if (!monto || Number(monto) <= 0) errs.monto = 'Monto inválido'
              if (!metodo_pago) errs.metodo_pago = 'Selecciona un método'
              if (Object.keys(errs).length > 0) { setErroresAbono(errs); return }

              setLoadingAbono(true)
              const res = await fetch('/api/contratos/abonar', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contrato_id: modalAbonar.id_contrato_paciente, monto: Number(monto), metodo_pago, estado_pago: estado_pago || 'pagado' }),
              })
              const data = await res.json()
              setLoadingAbono(false)
              if (!res.ok) { setToast({ msg: data.error ?? 'Error al registrar el abono', type:'error' }); return }
              setContratos(prev => prev.map(c => c.id_contrato_paciente === modalAbonar.id_contrato_paciente ? data.contrato : c))
              setToast({ msg: 'Abono registrado correctamente', type:'success' })
              setModalAbonar(null)
            }} noValidate>
              <div className="form-row-2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                <div>
                  <label style={{display:'block',fontSize:11,fontWeight:600,color:'var(--muted)',marginBottom:7}}>MONTO ($) *</label>
                  <input name="monto" type="number" min="0" step="0.01"
                    style={{width:'100%',background:'rgba(255,255,255,0.05)',border:`1.5px solid ${erroresAbono.monto?'rgba(242,85,85,0.5)':'var(--border)'}`,borderRadius:10,padding:'11px 13px',fontSize:14,color:'var(--text)',outline:'none'}} placeholder="0.00" />
                  {erroresAbono.monto && <span style={{fontSize:11,color:'var(--red)'}}>{erroresAbono.monto}</span>}
                </div>
                <div>
                  <label style={{display:'block',fontSize:11,fontWeight:600,color:'var(--muted)',marginBottom:7}}>MÉTODO *</label>
                  <select name="metodo_pago" style={{width:'100%',background:'rgba(255,255,255,0.05)',border:`1.5px solid ${erroresAbono.metodo_pago?'rgba(242,85,85,0.5)':'var(--border)'}`,borderRadius:10,padding:'11px 13px',fontSize:14,color:'var(--text)',outline:'none'}}>
                    <option value="">— Selecciona —</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="aseguradora">Aseguradora</option>
                  </select>
                  {erroresAbono.metodo_pago && <span style={{fontSize:11,color:'var(--red)'}}>{erroresAbono.metodo_pago}</span>}
                </div>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{display:'block',fontSize:11,fontWeight:600,color:'var(--muted)',marginBottom:7}}>ESTADO DEL PAGO</label>
                <select name="estado_pago" defaultValue="pagado" style={{width:'100%',background:'rgba(255,255,255,0.05)',border:'1.5px solid var(--border)',borderRadius:10,padding:'11px 13px',fontSize:14,color:'var(--text)',outline:'none'}}>
                  <option value="pagado">Pagado ahora</option>
                  <option value="pendiente">Pendiente — cobrar después</option>
                </select>
              </div>
              <div style={{display:'flex',gap:10,justifyContent:'flex-end',paddingTop:8,borderTop:'1px solid var(--border)'}}>
                <button type="button" style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 18px',fontSize:14,color:'var(--muted)',cursor:'pointer'}} onClick={() => setModalAbonar(null)}>Cancelar</button>
                <button type="submit" disabled={loadingAbono} style={{background:'linear-gradient(135deg,var(--blue),var(--cyan))',color:'#fff',border:'none',borderRadius:10,padding:'10px 20px',fontSize:14,fontWeight:600,cursor:'pointer',opacity:loadingAbono?.5:1}}>
                  Registrar abono
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL NUEVO CONTRATO ── */}
      {modalContrato && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(6px)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}
          onClick={e => { if(e.target===e.currentTarget) { setModalContrato(false); setPaqueteSeleccionado(null) } }}>
          <div style={{background:'#0A1220',border:'1px solid rgba(56,189,248,0.25)',borderRadius:18,width:'100%',maxWidth:460,padding:28}}>
            <div style={{fontSize:17,fontWeight:700,color:'var(--text)',marginBottom:6}}>📄 Nuevo contrato</div>
            <p style={{fontSize:13,color:'var(--muted)',marginBottom:22}}>
              Asigna un paquete a un paciente. La duración de sus sesiones saldrá automáticamente de este paquete.
            </p>
            <form onSubmit={async (e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              const paciente_id = fd.get('paciente_id') as string
              const paquete_id = fd.get('paquete_id') as string
              const fecha_inicio = fd.get('fecha_inicio') as string
              const fecha_vencimiento = fd.get('fecha_vencimiento') as string
              const pagoMonto = fd.get('pago_monto') as string
              const pagoMetodo = fd.get('pago_metodo') as string
              const pagoEstado = fd.get('pago_estado') as string

              const errs: Record<string,string> = {}
              if (!paciente_id) errs.paciente_id = 'Selecciona un paciente'
              if (!paquete_id) errs.paquete_id = 'Selecciona un paquete'
              if (!fecha_inicio) errs.fecha_inicio = 'Requerido'
              if (!fecha_vencimiento) errs.fecha_vencimiento = 'Requerido'
              if (incluirPagoInicial) {
                if (!pagoMonto || Number(pagoMonto) <= 0) errs.pago_monto = 'Monto inválido'
                if (!pagoMetodo) errs.pago_metodo = 'Selecciona un método'
              }
              if (Object.keys(errs).length > 0) { setErroresContrato(errs); return }

              setLoadingContrato(true)
              const res = await fetch('/api/contratos', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  paciente_id: Number(paciente_id), paquete_id: Number(paquete_id),
                  fecha_inicio, fecha_vencimiento,
                  pago_inicial: incluirPagoInicial ? { monto: Number(pagoMonto), metodo_pago: pagoMetodo, estado_pago: pagoEstado || 'pagado' } : undefined,
                }),
              })
              const data = await res.json()
              setLoadingContrato(false)
              if (!res.ok) { setToast({ msg: data.error ?? 'Error al crear el contrato', type:'error' }); return }
              setContratos(prev => [data.contrato, ...prev])
              setToast({ msg: data.warning ?? 'Contrato creado correctamente', type: data.warning ? 'error' : 'success' })
              setModalContrato(false)
              setPaqueteSeleccionado(null)
            }} noValidate>
              <div style={{marginBottom:14}}>
                <label style={{display:'block',fontSize:11,fontWeight:600,color:'var(--muted)',marginBottom:7}}>PACIENTE *</label>
                <select name="paciente_id" style={{width:'100%',background:'rgba(255,255,255,0.05)',border:`1.5px solid ${erroresContrato.paciente_id?'rgba(242,85,85,0.5)':'var(--border)'}`,borderRadius:10,padding:'11px 13px',fontSize:14,color:'var(--text)',outline:'none'}}>
                  <option value="">— Selecciona un paciente —</option>
                  {pacientesActivos.map(p => <option key={p.id_paciente} value={p.id_paciente}>{p.nombre_completo}</option>)}
                </select>
                {erroresContrato.paciente_id && <span style={{fontSize:11,color:'var(--red)'}}>{erroresContrato.paciente_id}</span>}
              </div>
              <div style={{marginBottom:14}}>
                <label style={{display:'block',fontSize:11,fontWeight:600,color:'var(--muted)',marginBottom:7}}>PAQUETE *</label>
                <select name="paquete_id"
                  onChange={e => setPaqueteSeleccionado(paquetes.find(p => String(p.id_paquete) === e.target.value) ?? null)}
                  style={{width:'100%',background:'rgba(255,255,255,0.05)',border:`1.5px solid ${erroresContrato.paquete_id?'rgba(242,85,85,0.5)':'var(--border)'}`,borderRadius:10,padding:'11px 13px',fontSize:14,color:'var(--text)',outline:'none'}}>
                  <option value="">— Selecciona un paquete —</option>
                  {paquetes.map(p => <option key={p.id_paquete} value={p.id_paquete}>{p.nombre} · {p.num_sesiones} sesiones · {p.duracion_sesion_min ?? '—'} min</option>)}
                </select>
                {erroresContrato.paquete_id && <span style={{fontSize:11,color:'var(--red)'}}>{erroresContrato.paquete_id}</span>}
                {paqueteSeleccionado && (
                  <div style={{marginTop:8,fontSize:13,color:'var(--cyan)',fontWeight:600}}>
                    Precio del paquete: ${Number(paqueteSeleccionado.precio_total).toLocaleString('es-MX',{minimumFractionDigits:2})}
                  </div>
                )}
              </div>
              <div style={{margin:'18px 0 14px',paddingTop:14,borderTop:'1px solid var(--border)'}}>
                <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'var(--text)',cursor:'pointer'}}>
                  <input type="checkbox" checked={incluirPagoInicial} onChange={e => setIncluirPagoInicial(e.target.checked)} />
                  💳 Registrar un pago inicial ahora
                </label>
              </div>
              {incluirPagoInicial && (
                <>
                  <div className="form-row-2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                    <div>
                      <label style={{display:'block',fontSize:11,fontWeight:600,color:'var(--muted)',marginBottom:7}}>MONTO ($) *</label>
                      <input name="pago_monto" type="number" min="0" step="0.01" defaultValue={paqueteSeleccionado ? paqueteSeleccionado.precio_total : ''}
                        style={{width:'100%',background:'rgba(255,255,255,0.05)',border:`1.5px solid ${erroresContrato.pago_monto?'rgba(242,85,85,0.5)':'var(--border)'}`,borderRadius:10,padding:'11px 13px',fontSize:14,color:'var(--text)',outline:'none'}} placeholder="0.00" />
                      {erroresContrato.pago_monto && <span style={{fontSize:11,color:'var(--red)'}}>{erroresContrato.pago_monto}</span>}
                    </div>
                    <div>
                      <label style={{display:'block',fontSize:11,fontWeight:600,color:'var(--muted)',marginBottom:7}}>MÉTODO *</label>
                      <select name="pago_metodo" style={{width:'100%',background:'rgba(255,255,255,0.05)',border:`1.5px solid ${erroresContrato.pago_metodo?'rgba(242,85,85,0.5)':'var(--border)'}`,borderRadius:10,padding:'11px 13px',fontSize:14,color:'var(--text)',outline:'none'}}>
                        <option value="">— Selecciona —</option>
                        <option value="efectivo">Efectivo</option>
                        <option value="transferencia">Transferencia</option>
                        <option value="tarjeta">Tarjeta</option>
                        <option value="aseguradora">Aseguradora</option>
                      </select>
                      {erroresContrato.pago_metodo && <span style={{fontSize:11,color:'var(--red)'}}>{erroresContrato.pago_metodo}</span>}
                    </div>
                  </div>
                  <div style={{marginBottom:14}}>
                    <label style={{display:'block',fontSize:11,fontWeight:600,color:'var(--muted)',marginBottom:7}}>ESTADO DEL PAGO</label>
                    <select name="pago_estado" defaultValue="pagado" style={{width:'100%',background:'rgba(255,255,255,0.05)',border:'1.5px solid var(--border)',borderRadius:10,padding:'11px 13px',fontSize:14,color:'var(--text)',outline:'none'}}>
                      <option value="pagado">Pagado ahora</option>
                      <option value="pendiente">Pendiente — cobrar después</option>
                    </select>
                  </div>
                </>
              )}
              <div className="form-row-2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                <div>
                  <label style={{display:'block',fontSize:11,fontWeight:600,color:'var(--muted)',marginBottom:7}}>FECHA INICIO *</label>
                  <input name="fecha_inicio" type="date" defaultValue={fechaLocalHoy()}
                    style={{width:'100%',maxWidth:'100%',minWidth:0,boxSizing:'border-box',WebkitAppearance:'none',height:46,paddingTop:0,paddingBottom:0,lineHeight:'46px',background:'rgba(255,255,255,0.05)',border:`1.5px solid ${erroresContrato.fecha_inicio?'rgba(242,85,85,0.5)':'var(--border)'}`,borderRadius:10,paddingLeft:13,paddingRight:13,fontSize:14,color:'var(--text)',outline:'none'}} />
                  {erroresContrato.fecha_inicio && <span style={{fontSize:11,color:'var(--red)'}}>{erroresContrato.fecha_inicio}</span>}
                </div>
                <div>
                  <label style={{display:'block',fontSize:11,fontWeight:600,color:'var(--muted)',marginBottom:7}}>FECHA VENCIMIENTO *</label>
                  <input name="fecha_vencimiento" type="date" defaultValue={fechaLocalHoy(90)}
                    style={{width:'100%',maxWidth:'100%',minWidth:0,boxSizing:'border-box',WebkitAppearance:'none',height:46,paddingTop:0,paddingBottom:0,lineHeight:'46px',background:'rgba(255,255,255,0.05)',border:`1.5px solid ${erroresContrato.fecha_vencimiento?'rgba(242,85,85,0.5)':'var(--border)'}`,borderRadius:10,paddingLeft:13,paddingRight:13,fontSize:14,color:'var(--text)',outline:'none'}} />
                  {erroresContrato.fecha_vencimiento && <span style={{fontSize:11,color:'var(--red)'}}>{erroresContrato.fecha_vencimiento}</span>}
                </div>
              </div>
              <div style={{display:'flex',gap:10,justifyContent:'flex-end',paddingTop:8,borderTop:'1px solid var(--border)'}}>
                <button type="button" style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 18px',fontSize:14,color:'var(--muted)',cursor:'pointer'}} onClick={() => { setModalContrato(false); setPaqueteSeleccionado(null) }}>Cancelar</button>
                <button type="submit" disabled={loadingContrato} style={{background:'linear-gradient(135deg,var(--blue),var(--cyan))',color:'#fff',border:'none',borderRadius:10,padding:'10px 20px',fontSize:14,fontWeight:600,cursor:'pointer',opacity:loadingContrato?.5:1}}>
                  Crear contrato
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
