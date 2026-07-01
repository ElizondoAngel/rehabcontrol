'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import Sidebar, { MenuButton } from '@/app/components/Sidebar'
import TopbarActions from '@/app/components/TopbarActions'

const METODO_ICONO: Record<string,string> = {
  efectivo: '💵', transferencia: '🏦', tarjeta: '💳', aseguradora: '🛡️'
}
const METODO_LABEL: Record<string,string> = {
  efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta', aseguradora: 'Aseguradora'
}

function formatMoney(n: number) {
  return Number(n ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })
}

function agruparPorMes(pagos: any[]) {
  const grupos: Record<string, any[]> = {}
  pagos.forEach(p => {
    const d = new Date(p.fecha_pago)
    const key = d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
    if (!grupos[key]) grupos[key] = []
    grupos[key].push(p)
  })
  return Object.entries(grupos)
}

export default function PagosClient({ profile, pagos, userId }: any) {

  const [filtro, setFiltro] = useState('todos')

  const pagosOrdenados = useMemo(() => {
    return [...pagos].sort((a: any, b: any) => new Date(b.fecha_pago).getTime() - new Date(a.fecha_pago).getTime())
  }, [pagos])

  const pagosFiltrados = filtro === 'todos'
    ? pagosOrdenados
    : pagosOrdenados.filter((p: any) => p.estado_pago === filtro)

  const gruposPorMes = useMemo(() => agruparPorMes(pagosFiltrados), [pagosFiltrados])

  const totalPagado    = pagos.filter((p: any) => p.estado_pago === 'pagado').reduce((acc: number, p: any) => acc + (p.monto ?? 0), 0)
  const totalPendiente = pagos.filter((p: any) => p.estado_pago === 'pendiente').reduce((acc: number, p: any) => acc + (p.monto ?? 0), 0)
  const totalGeneral   = totalPagado + totalPendiente
  const pctPagado      = totalGeneral > 0 ? Math.round((totalPagado / totalGeneral) * 100) : 100

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
        .content{flex:1;overflow-y:auto;padding:28px 32px 40px}
        .page-title{font-size:26px;font-weight:800;color:var(--text);letter-spacing:-0.015em;margin-bottom:4px}
        .page-sub{font-size:14px;color:var(--muted);margin-bottom:26px}

        /* ── RESUMEN — tarjeta destacada con barra comparativa ── */
        .resumen-hero{background:var(--card);border:1px solid var(--card-border);border-radius:18px;padding:26px 28px;margin-bottom:16px;position:relative;overflow:hidden}
        .resumen-hero::before{content:'';position:absolute;top:0;left:0;width:3px;height:100%;background:linear-gradient(180deg,var(--blue),var(--cyan))}
        .resumen-top{display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:18px}
        .resumen-total{font-size:12px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px}
        .resumen-num{font-size:34px;font-weight:800;letter-spacing:-0.02em;color:var(--text)}
        .resumen-pct{font-size:13px;color:var(--cyan);font-weight:600;background:rgba(56,189,248,0.1);padding:5px 12px;border-radius:100px}
        .resumen-bar{height:10px;background:rgba(245,180,0,0.18);border-radius:100px;overflow:hidden;margin-bottom:16px}
        .resumen-bar-fill{height:100%;background:linear-gradient(90deg,var(--blue),var(--cyan));border-radius:100px;transition:width .5s ease}
        .resumen-legend{display:flex;gap:24px;flex-wrap:wrap}
        .leg-item{display:flex;align-items:center;gap:8px}
        .leg-dot{width:9px;height:9px;border-radius:3px;flex-shrink:0}
        .leg-text{font-size:13px;color:var(--muted)}
        .leg-text strong{color:var(--text);font-weight:700}

        .resumen-mini{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:26px}
        .mini-card{background:var(--card);border:1px solid var(--card-border);border-radius:14px;padding:16px 20px;display:flex;align-items:center;gap:14px}
        .mini-icon{width:40px;height:40px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
        .mini-icon.amber{background:rgba(245,180,0,0.14)}
        .mini-icon.muted{background:var(--surface2)}
        .mini-label{font-size:11px;color:var(--muted);font-weight:500}
        .mini-num{font-size:19px;font-weight:700;color:var(--text);margin-top:2px}

        /* ── FILTROS ── */
        .filtros{display:flex;gap:8px;margin-bottom:22px}
        .filtro-btn{padding:7px 16px;border-radius:100px;border:1px solid var(--border);background:transparent;color:var(--muted);font-size:13px;font-weight:500;cursor:pointer;transition:all .18s;font-family:'Inter',sans-serif}
        .filtro-btn:hover{border-color:var(--cyan);color:var(--text)}
        .filtro-btn.activo{background:rgba(56,189,248,0.12);border-color:rgba(56,189,248,0.4);color:var(--cyan)}

        /* ── LISTA AGRUPADA POR MES ── */
        .mes-grupo{margin-bottom:22px}
        .mes-titulo{font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;padding-left:2px}
        .lista-pagos{display:flex;flex-direction:column;gap:8px}
        .pago-card{background:var(--card);border:1px solid var(--card-border);border-radius:13px;padding:14px 18px;display:flex;align-items:center;gap:14px;transition:background .18s,border-color .18s}
        .pago-card:hover{background:var(--surface2);border-color:rgba(56,189,248,0.25)}
        .pago-icon{width:42px;height:42px;border-radius:11px;background:var(--surface2);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
        .pago-info{flex:1;min-width:0}
        .pago-concepto{font-size:14px;font-weight:600;color:var(--text)}
        .pago-fecha{font-size:12px;color:var(--muted);margin-top:2px}
        .pago-right{display:flex;align-items:center;gap:12px;flex-shrink:0}
        .pago-monto{font-size:15px;font-weight:700;color:var(--text)}
        .badge{font-size:11px;font-weight:600;padding:4px 11px;border-radius:100px;display:inline-block;white-space:nowrap}
        .b-green{background:rgba(52,211,153,0.15);color:var(--green)}
        .b-amber{background:rgba(245,180,0,0.15);color:var(--amber)}
        .b-gray{background:var(--surface2);color:var(--muted)}

        .empty-state{text-align:center;padding:64px 20px;color:var(--muted);background:var(--card);border:1px dashed var(--card-border);border-radius:16px}
        .empty-icon{font-size:34px;margin-bottom:10px;opacity:.5}
        .empty-text{font-size:14px}

        .chatbot-bubble{position:fixed;bottom:28px;right:28px;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--blue),var(--cyan));display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;box-shadow:0 8px 24px rgba(37,99,235,0.4);transition:transform .2s;z-index:50;text-decoration:none}
        .chatbot-bubble:hover{transform:scale(1.08)}

        @media(max-width:640px){ .resumen-mini{grid-template-columns:1fr} }
      `}</style>

      <Sidebar
        rol="paciente"
        nombre={profile?.nombre_completo ?? ''}
        subRol="Solo su información"
        icono="👤"
        items={[
          { icon:'🏠', label:'Mi Inicio',   href:'/paciente/dashboard', active:false },
          { icon:'📅', label:'Mis Citas',   href:'/paciente/citas',     active:false },
          { icon:'📈', label:'Mi Progreso', href:'/paciente/progreso',  active:false },
          { icon:'💳', label:'Mis Pagos',   href:'/paciente/pagos',     active:true  },
          { icon:'⚙️', label:'Mis Datos',   href:'/paciente/perfil',    active:false },
        ]}
      />

      <div className="main">
        <div className="topbar">
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <MenuButton />
            <span className="topbar-title">Mis Pagos</span>
          </div>
          <div className="topbar-right">
            <div className="online-dot"><div className="dot"/> En línea</div>
            <TopbarActions userId={userId} rol="paciente" nombre={profile?.nombre_completo} />
          </div>
        </div>

        <div className="content">
          <div className="page-title">Mis Pagos</div>
          <div className="page-sub">Solo lectura — historial de cobros de tu tratamiento</div>

          {/* RESUMEN DESTACADO con barra comparativa pagado vs. pendiente */}
          <div className="resumen-hero">
            <div className="resumen-top">
              <div>
                <div className="resumen-total">Total pagado</div>
                <div className="resumen-num">${formatMoney(totalPagado)}</div>
              </div>
              {totalGeneral > 0 && <div className="resumen-pct">{pctPagado}% al corriente</div>}
            </div>
            <div className="resumen-bar">
              <div className="resumen-bar-fill" style={{ width: `${pctPagado}%` }} />
            </div>
            <div className="resumen-legend">
              <div className="leg-item">
                <span className="leg-dot" style={{background:'var(--cyan)'}} />
                <span className="leg-text">Pagado: <strong>${formatMoney(totalPagado)}</strong></span>
              </div>
              <div className="leg-item">
                <span className="leg-dot" style={{background:'rgba(245,180,0,0.7)'}} />
                <span className="leg-text">Pendiente: <strong>${formatMoney(totalPendiente)}</strong></span>
              </div>
            </div>
          </div>

          <div className="resumen-mini">
            <div className="mini-card">
              <div className="mini-icon amber">⏳</div>
              <div>
                <div className="mini-label">Pendiente por pagar</div>
                <div className="mini-num" style={{color: totalPendiente > 0 ? 'var(--amber)' : 'var(--text)'}}>
                  ${formatMoney(totalPendiente)}
                </div>
              </div>
            </div>
            <div className="mini-card">
              <div className="mini-icon muted">📋</div>
              <div>
                <div className="mini-label">Total de registros</div>
                <div className="mini-num">{pagos.length}</div>
              </div>
            </div>
          </div>

          <div className="filtros">
            {['todos','pagado','pendiente'].map(f => (
              <button
                key={f}
                className={`filtro-btn ${filtro === f ? 'activo' : ''}`}
                onClick={() => setFiltro(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {pagosFiltrados.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💳</div>
              <div className="empty-text">
                Sin registros de pago{filtro !== 'todos' ? ` con estado "${filtro}"` : ''}.
              </div>
            </div>
          ) : (
            gruposPorMes.map(([mes, pagosDelMes]) => (
              <div className="mes-grupo" key={mes}>
                <div className="mes-titulo">{mes.charAt(0).toUpperCase() + mes.slice(1)}</div>
                <div className="lista-pagos">
                  {pagosDelMes.map((p: any) => {
                    const fecha = new Date(p.fecha_pago).toLocaleDateString('es-MX', {
                      day: 'numeric', month: 'short'
                    })
                    return (
                      <div className="pago-card" key={p.id_pago}>
                        <div className="pago-icon">{METODO_ICONO[p.metodo_pago] ?? '💰'}</div>
                        <div className="pago-info">
                          <div className="pago-concepto">
                            {METODO_LABEL[p.metodo_pago] ?? 'Sesión de terapia'}
                          </div>
                          <div className="pago-fecha">{fecha}</div>
                        </div>
                        <div className="pago-right">
                          <span className="pago-monto">${formatMoney(p.monto)}</span>
                          <span className={`badge ${
                            p.estado_pago === 'pagado' ? 'b-green' :
                            p.estado_pago === 'pendiente' ? 'b-amber' : 'b-gray'
                          }`}>
                            {p.estado_pago}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <a href="#" className="chatbot-bubble" title="Asistente RC">💬</a>
    </>
  )
}
