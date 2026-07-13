'use client'

import { useState, useEffect } from 'react'
import Sidebar, { MenuButton } from '@/app/components/Sidebar'
import TopbarActions from '@/app/components/TopbarActions'

interface Opinion {
  id_opinion: number; calificacion: number; comentario: string; estado: string; created_at: string
  pacientes?: { nombre_completo: string } | null
  profiles?: { nombre_completo: string } | null
}
interface Props { userId: string; nombre?: string }

export default function OpinionesAdminClient({ userId, nombre }: Props) {
  const [filtro, setFiltro] = useState<'pendiente'|'aprobada'|'rechazada'|'todas'>('pendiente')
  const [opiniones, setOpiniones] = useState<Opinion[]>([])
  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState<number | null>(null)
  const [toast, setToast] = useState<{msg:string;type:'success'|'error'}|null>(null)

  async function cargar(f: string) {
    setLoading(true)
    const res = await fetch(`/api/admin/opiniones?estado=${f}`)
    const data = await res.json()
    setLoading(false)
    if (res.ok) setOpiniones(data.opiniones ?? [])
  }

  useEffect(() => { cargar(filtro) }, [filtro])

  async function resolver(o: Opinion, accion: 'aprobar' | 'rechazar') {
    setProcesando(o.id_opinion)
    const res = await fetch('/api/admin/opiniones', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_opinion: o.id_opinion, accion }),
    })
    const data = await res.json()
    setProcesando(null)

    if (!res.ok) { setToast({ msg: data.error ?? 'No se pudo procesar', type: 'error' }); return }

    setOpiniones(prev => prev.filter(x => x.id_opinion !== o.id_opinion))
    setToast({ msg: accion === 'aprobar' ? 'Opinión publicada en el landing' : 'Opinión rechazada', type: 'success' })
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
        .page-title{font-size:26px;font-weight:800;color:var(--text);margin-bottom:4px}
        .page-sub{font-size:14px;color:var(--muted);margin-bottom:24px}
        .filtros{display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap}
        .filtro-btn{padding:7px 16px;border-radius:100px;border:1px solid var(--border);background:transparent;color:var(--muted);font-size:13px;font-weight:500;cursor:pointer;font-family:'Inter',sans-serif}
        .filtro-btn.activo{background:rgba(56,189,248,0.12);border-color:rgba(56,189,248,0.4);color:var(--cyan)}
        .op-card{background:var(--card);border:1px solid var(--card-border);border-radius:14px;padding:18px 20px;margin-bottom:12px}
        .op-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:10px}
        .op-nombres{font-size:14px;font-weight:600;color:var(--text)}
        .op-stars{color:var(--amber);font-size:14px;letter-spacing:2px;margin-top:2px}
        .op-texto{font-size:13.5px;color:var(--text);line-height:1.55;margin-bottom:12px}
        .op-fecha{font-size:11.5px;color:var(--muted)}
        .op-actions{display:flex;gap:8px}
        .btn-ok{background:rgba(52,211,153,0.15);border:1px solid rgba(52,211,153,0.3);color:var(--green);border-radius:8px;padding:7px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif}
        .btn-no{background:rgba(242,85,85,0.10);border:1px solid rgba(242,85,85,0.3);color:var(--red);border-radius:8px;padding:7px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif}
        .empty{text-align:center;padding:48px 0;color:var(--muted);font-size:14px}

        @media (max-width:640px){
          .content{padding:18px 16px}
          .page-title{font-size:22px}
          .op-actions{width:100%}
          .op-actions button{flex:1}
        }
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
          {icon:'🕘', label:'Disponibilidad',       href:'/admin/disponibilidad',   active:false},
          {icon:'⭐', label:'Opiniones',            href:'/admin/opiniones',        active:true},
          {icon:'⚠️', label:'Solicitudes de Baja',  href:'/admin/solicitudes-baja', active:false},
          {icon:'🔍', label:'Logs de Auditoría',   href:'/admin/logs',             active:false},
          {icon:'⚙️', label:'Configuración',        href:'/admin/configuracion',    active:false},
        ]}
      />

      <div className="main">
        <div className="topbar">
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <MenuButton />
            <span className="topbar-title">Opiniones</span>
          </div>
          <div className="topbar-right">
            <div className="online-dot"><div className="dot"/>En línea</div>
            <TopbarActions userId={userId} rol="admin" nombre={nombre} />
          </div>
        </div>

        <div className="content">
          <div className="page-title">Moderación de opiniones</div>
          <div className="page-sub">Aprueba las opiniones que quieres mostrar en el landing público</div>

          <div className="filtros">
            {(['pendiente','aprobada','rechazada','todas'] as const).map(f => (
              <button key={f} className={`filtro-btn${filtro===f?' activo':''}`} onClick={() => setFiltro(f)}>
                {f === 'pendiente' ? 'Pendientes' : f === 'aprobada' ? 'Aprobadas' : f === 'rechazada' ? 'Rechazadas' : 'Todas'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="empty">Cargando…</div>
          ) : opiniones.length === 0 ? (
            <div className="empty">No hay opiniones en este filtro.</div>
          ) : (
            opiniones.map(o => (
              <div className="op-card" key={o.id_opinion}>
                <div className="op-header">
                  <div>
                    <div className="op-nombres">{o.pacientes?.nombre_completo ?? '—'} → {o.profiles?.nombre_completo ?? '—'}</div>
                    <div className="op-stars">{'★'.repeat(o.calificacion)}{'☆'.repeat(5 - o.calificacion)}</div>
                  </div>
                  {filtro === 'pendiente' && (
                    <div className="op-actions">
                      <button className="btn-ok" disabled={procesando===o.id_opinion} onClick={() => resolver(o, 'aprobar')}>✓ Aprobar</button>
                      <button className="btn-no" disabled={procesando===o.id_opinion} onClick={() => resolver(o, 'rechazar')}>✕ Rechazar</button>
                    </div>
                  )}
                </div>
                <div className="op-texto">{o.comentario}</div>
                <div className="op-fecha">{new Date(o.created_at).toLocaleDateString('es-MX', { day:'numeric', month:'long', year:'numeric' })}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {toast && (
        <div style={{position:'fixed',bottom:28,right:28,zIndex:200,background:'var(--card)',border:'1px solid var(--card-border)',borderRadius:12,padding:'14px 18px',fontSize:13.5,color: toast.type==='success' ? 'var(--green)' : 'var(--red)'}}>
          {toast.msg}
        </div>
      )}
    </>
  )
}
