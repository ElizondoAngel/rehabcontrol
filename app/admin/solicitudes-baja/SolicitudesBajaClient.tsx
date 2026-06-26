'use client'

import Link from 'next/link'
import { useState } from 'react'
import NotifBell from '@/app/components/NotifBell'
import Sidebar, { MenuButton } from '@/app/components/Sidebar'


interface Solicitud {
  id: number
  nombre: string
  email: string
  estado: 'pendiente' | 'aprobada' | 'rechazada'
  motivo: string | null
  created_at: string
  fecha_revision: string | null
  paciente_id: number
}

interface Props {
  solicitudesIniciales: Solicitud[]
  adminNombre: string
  currentUserId: string
}

export default function SolicitudesBajaClient({ solicitudesIniciales, adminNombre, currentUserId }: Props) {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>(solicitudesIniciales)
  const [filtro, setFiltro] = useState<'todas' | 'pendiente' | 'aprobada' | 'rechazada'>('pendiente')
  const [procesando, setProcesando] = useState<number | null>(null)
  const [toast, setToast] = useState<{ msg: string; tipo: 'ok' | 'err' } | null>(null)
  const [modalDetalle, setModalDetalle] = useState<Solicitud | null>(null)

  const mostrarToast = (msg: string, tipo: 'ok' | 'err') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3500)
  }

  const resolver = async (id: number, estado: 'aprobada' | 'rechazada') => {
    setProcesando(id)
    try {
      const res = await fetch(`/api/admin/solicitudes-baja/${id}`, {
        method : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ estado }),
      })
      if (res.ok) {
        setSolicitudes(prev => prev.map(s => s.id === id ? { ...s, estado, fecha_revision: new Date().toISOString() } : s))
        setModalDetalle(null)
        mostrarToast(estado === 'aprobada' ? 'Solicitud aprobada correctamente' : 'Solicitud rechazada', 'ok')
      } else {
        const { error } = await res.json().catch(() => ({ error: 'Error desconocido' }))
        mostrarToast(error ?? 'Error al procesar', 'err')
      }
    } catch {
      mostrarToast('Error de conexión', 'err')
    } finally {
      setProcesando(null)
    }
  }

  const filtradas = solicitudes.filter(s => filtro === 'todas' || s.estado === filtro)
  const pendientesCount = solicitudes.filter(s => s.estado === 'pendiente').length
  const formatFecha = (iso: string) => new Date(iso).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' })
  const formatHora  = (iso: string) => new Date(iso).toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit', hour12:true })

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --bg:#060B14;--sidebar:#0A1220;--card:rgba(255,255,255,0.035);
          --card-border:rgba(255,255,255,0.09);--border:rgba(255,255,255,0.09);
          --surface2:rgba(255,255,255,0.07);
          --blue:#2563EB;--cyan:#38BDF8;
          --text:#E7EDF7;--muted:#8C9BB5;
          --red:#F25555;--amber:#F5B400;--green:#34D399;--purple:#A78BFA;
        }
        body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex}

        /* MAIN */
        .main{flex:1;display:flex;flex-direction:column;overflow:hidden}
        .topbar{height:56px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 28px;flex-shrink:0}
        .topbar-title{font-size:14px;color:var(--muted);font-weight:500}
        .topbar-right{display:flex;align-items:center;gap:16px}
        .online-dot{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--cyan);font-weight:500}
        .dot{width:7px;height:7px;border-radius:50%;background:var(--cyan);box-shadow:0 0 8px var(--cyan)}
        .content{flex:1;overflow-y:auto;padding:28px}
        .page-header{margin-bottom:24px}
        .page-title{font-size:26px;font-weight:800;color:var(--text);letter-spacing:-0.015em;margin-bottom:4px}
        .page-sub{font-size:14px;color:var(--muted)}
        .alerta-pendientes{background:rgba(242,85,85,0.07);border:1px solid rgba(242,85,85,0.2);border-radius:12px;padding:14px 18px;font-size:13px;color:var(--red);margin-bottom:24px;font-weight:500;display:flex;align-items:center;gap:10px}
        .alerta-pendientes.none{background:rgba(52,211,153,0.06);border-color:rgba(52,211,153,0.2);color:var(--green)}
        .filtros{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap}
        .filtro-btn{padding:7px 16px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--muted);font-family:'Inter',sans-serif;transition:all .18s}
        .filtro-btn:hover{background:var(--surface2);color:var(--text)}
        .filtro-btn.active{background:linear-gradient(135deg,rgba(37,99,235,0.2),rgba(56,189,248,0.15));color:var(--cyan);border-color:rgba(56,189,248,0.3)}
        .table-card{background:var(--card);border:1px solid var(--card-border);border-radius:16px;overflow:hidden}
        .t-head{display:grid;grid-template-columns:2fr 2fr 1fr 1.2fr 1.5fr;gap:12px;padding:12px 20px;border-bottom:1px solid var(--border);background:rgba(255,255,255,0.02)}
        .t-head span{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;font-weight:600}
        .t-row{display:grid;grid-template-columns:2fr 2fr 1fr 1.2fr 1.5fr;gap:12px;padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.04);align-items:center;transition:background .15s}
        .t-row:last-child{border-bottom:none}
        .t-row:hover{background:rgba(255,255,255,0.025)}
        .t-name{font-size:13px;font-weight:600;color:var(--text)}
        .t-email{font-size:12px;color:var(--muted);margin-top:2px}
        .t-cell{font-size:13px;color:var(--text)}
        .t-date{font-size:12px;color:var(--muted)}
        .empty{padding:40px;text-align:center;color:var(--muted);font-size:13px}
        .estado-badge{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px}
        .estado-pendiente{background:rgba(245,180,0,0.12);color:var(--amber);border:1px solid rgba(245,180,0,0.25)}
        .estado-aprobada{background:rgba(52,211,153,0.12);color:var(--green);border:1px solid rgba(52,211,153,0.25)}
        .estado-rechazada{background:rgba(242,85,85,0.12);color:var(--red);border:1px solid rgba(242,85,85,0.25)}
        .acciones{display:flex;gap:6px}
        .btn-aprobar{background:rgba(52,211,153,0.12);border:1px solid rgba(52,211,153,0.3);border-radius:7px;padding:6px 12px;font-size:12px;font-weight:600;color:var(--green);cursor:pointer;font-family:'Inter',sans-serif;transition:all .18s}
        .btn-aprobar:hover:not(:disabled){background:rgba(52,211,153,0.22)}
        .btn-rechazar{background:rgba(242,85,85,0.1);border:1px solid rgba(242,85,85,0.3);border-radius:7px;padding:6px 12px;font-size:12px;font-weight:600;color:var(--red);cursor:pointer;font-family:'Inter',sans-serif;transition:all .18s}
        .btn-rechazar:hover:not(:disabled){background:rgba(242,85,85,0.2)}
        .btn-detalle{background:var(--surface2);border:1px solid var(--border);border-radius:7px;padding:6px 10px;font-size:12px;color:var(--muted);cursor:pointer;font-family:'Inter',sans-serif;transition:all .18s}
        .btn-detalle:hover{color:var(--text)}
        button:disabled{opacity:.5;cursor:not-allowed}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:200;backdrop-filter:blur(4px)}
        .modal-box{background:#0D1829;border:1px solid var(--card-border);border-radius:16px;padding:28px;max-width:460px;width:90%}
        .modal-title{font-size:17px;font-weight:700;color:var(--text);margin-bottom:4px}
        .modal-sub{font-size:13px;color:var(--muted);margin-bottom:20px}
        .detail-row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:13px}
        .detail-row:last-of-type{border-bottom:none}
        .detail-label{color:var(--muted);font-weight:500}
        .detail-val{color:var(--text);font-weight:500;text-align:right;max-width:60%;word-break:break-word}
        .motivo-box{background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px;font-size:13px;color:var(--muted);line-height:1.5;margin:14px 0 20px;font-style:italic}
        .modal-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:8px}
        .btn-cancel-modal{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px 18px;font-size:13px;color:var(--muted);cursor:pointer;font-family:'Inter',sans-serif}
        .toast{position:fixed;bottom:28px;right:28px;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:500;z-index:300;animation:fadeIn .2s ease}
        .toast-ok{background:rgba(52,211,153,0.12);color:var(--green);border:1px solid rgba(52,211,153,0.3)}
        .toast-err{background:rgba(242,85,85,0.12);color:var(--red);border:1px solid rgba(242,85,85,0.3)}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <Sidebar
                    rol="admin"
                    nombre="Administradora General"
                    subRol="Acceso Total"
                    icono="🛡"
                    items={[
                      {icon:'🏠', label:'Panel General',       href:'/admin/dashboard',        active:false},
                    {icon:'👥', label:'Usuarios y Roles',    href:'/admin/usuarios',         active:false},
                    {icon:'📋', label:'Expedientes',          href:'/admin/expedientes',      active:false},
                    {icon:'💳', label:'Finanzas',             href:'/admin/finanzas',         active:false},
                    {icon:'📊', label:'Reportes',             href:'/admin/reportes',         active:false},
                    {icon:'⚠️', label:'Solicitudes de Baja',  href:'/admin/solicitudes-baja', active:true},
                    {icon:'🔍', label:'Logs de Auditoría',   href:'/admin/logs',             active:false},
                    {icon:'⚙️', label:'Configuración',        href:'/admin/configuracion',    active:false},
                    ]}
                  />

      <div className="main">
        <div className="topbar">
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <MenuButton />
            <span className="topbar-title">Solicitudes de Baja</span>
          </div>
          <div className="topbar-right">
            <div className="online-dot"><div className="dot" /> En línea</div>
            <NotifBell userId={currentUserId} rol="admin" esAdmin />
          </div>
        </div>

        <div className="content">
          <div className="page-header">
            <div className="page-title">Solicitudes de Baja</div>
            <div className="page-sub">Gestiona las solicitudes enviadas por los pacientes</div>
          </div>

          {pendientesCount > 0 ? (
            <div className="alerta-pendientes">
              ⚠️ {pendientesCount} solicitud{pendientesCount > 1 ? 'es' : ''} pendiente{pendientesCount > 1 ? 's' : ''} de revisión
            </div>
          ) : (
            <div className="alerta-pendientes none">✓ No hay solicitudes pendientes</div>
          )}

          <div className="filtros">
            {(['todas','pendiente','aprobada','rechazada'] as const).map(f => (
              <button key={f} className={`filtro-btn ${filtro===f?'active':''}`} onClick={() => setFiltro(f)}>
                {f === 'todas' ? 'Todas' : f.charAt(0).toUpperCase()+f.slice(1)}
                {f === 'pendiente' && pendientesCount > 0 && ` (${pendientesCount})`}
              </button>
            ))}
          </div>

          <div className="table-card">
            <div className="t-head">
              <span>Paciente</span><span>Correo</span><span>Estado</span><span>Fecha</span><span>Acciones</span>
            </div>
            {filtradas.length === 0 ? (
              <div className="empty">No hay solicitudes en esta categoría</div>
            ) : filtradas.map(s => (
              <div className="t-row" key={s.id}>
                <div>
                  <div className="t-name">{s.nombre}</div>
                  <div className="t-email">ID paciente: {s.paciente_id}</div>
                </div>
                <div className="t-cell" style={{fontSize:12,color:'var(--muted)'}}>{s.email}</div>
                <div>
                  <span className={`estado-badge estado-${s.estado}`}>
                    {s.estado==='pendiente'?'⏳':s.estado==='aprobada'?'✓':'✗'} {s.estado}
                  </span>
                </div>
                <div>
                  <div className="t-cell">{formatFecha(s.created_at)}</div>
                  <div className="t-date">{formatHora(s.created_at)}</div>
                </div>
                <div className="acciones">
                  <button className="btn-detalle" onClick={() => setModalDetalle(s)}>Ver</button>
                  {s.estado === 'pendiente' && (
                    <>
                      <button className="btn-aprobar" onClick={() => resolver(s.id,'aprobada')} disabled={procesando===s.id}>
                        {procesando===s.id?'...':'✓'}
                      </button>
                      <button className="btn-rechazar" onClick={() => resolver(s.id,'rechazada')} disabled={procesando===s.id}>
                        {procesando===s.id?'...':'✗'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {modalDetalle && (
        <div className="modal-overlay" onClick={() => setModalDetalle(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Solicitud de baja</div>
            <div className="modal-sub">Detalle completo de la solicitud</div>
            <div className="detail-row"><span className="detail-label">Paciente</span><span className="detail-val">{modalDetalle.nombre}</span></div>
            <div className="detail-row"><span className="detail-label">Correo</span><span className="detail-val">{modalDetalle.email}</span></div>
            <div className="detail-row">
              <span className="detail-label">Estado</span>
              <span className="detail-val"><span className={`estado-badge estado-${modalDetalle.estado}`}>{modalDetalle.estado}</span></span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Fecha solicitud</span>
              <span className="detail-val">{formatFecha(modalDetalle.created_at)} {formatHora(modalDetalle.created_at)}</span>
            </div>
            {modalDetalle.fecha_revision && (
              <div className="detail-row"><span className="detail-label">Fecha revisión</span><span className="detail-val">{formatFecha(modalDetalle.fecha_revision)}</span></div>
            )}
            <div style={{marginTop:14,fontSize:11,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.07em',fontWeight:600}}>Motivo</div>
            <div className="motivo-box">{modalDetalle.motivo ?? 'Sin motivo especificado'}</div>
            <div className="modal-actions">
              <button className="btn-cancel-modal" onClick={() => setModalDetalle(null)}>Cerrar</button>
              {modalDetalle.estado === 'pendiente' && (
                <>
                  <button className="btn-rechazar" onClick={() => resolver(modalDetalle.id,'rechazada')} disabled={procesando===modalDetalle.id}>
                    {procesando===modalDetalle.id?'Procesando...':'✗ Rechazar'}
                  </button>
                  <button className="btn-aprobar" onClick={() => resolver(modalDetalle.id,'aprobada')} disabled={procesando===modalDetalle.id}>
                    {procesando===modalDetalle.id?'Procesando...':'✓ Aprobar'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toast.tipo==='ok'?'toast-ok':'toast-err'}`}>{toast.msg}</div>}
    </>
  )
}
