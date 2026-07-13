'use client'

/**
 * DisponibilidadClient.tsx (Secretaria)
 * ─────────────────────────────────────────────────────────────
 * Configurar el horario semanal de un terapeuta — los bloques que
 * el paciente ve al agendar salen directo de aquí.
 *
 * Modelo simple: un bloque (hora_inicio–hora_fin) por día de la
 * semana. Al guardar, se reemplaza TODO el horario de ese terapeuta
 * de una vez (borrar + insertar), vía PUT /api/disponibilidad.
 */

import { useState, useEffect } from 'react'
import Sidebar, { MenuButton } from '@/app/components/Sidebar'
import TopbarActions from '@/app/components/TopbarActions'

interface Terapeuta { id: string; nombre_completo: string }
interface Props { terapeutas: Terapeuta[]; userId: string; nombre?: string; rol?: 'admin' | 'secretaria' }

const DIAS = [
  { valor: 1, label: 'Lunes' },
  { valor: 2, label: 'Martes' },
  { valor: 3, label: 'Miércoles' },
  { valor: 4, label: 'Jueves' },
  { valor: 5, label: 'Viernes' },
  { valor: 6, label: 'Sábado' },
  { valor: 0, label: 'Domingo' },
]

type DiaConfig = { activo: boolean; hora_inicio: string; hora_fin: string }

function estadoInicial(): Record<number, DiaConfig> {
  const base: Record<number, DiaConfig> = {}
  DIAS.forEach(d => { base[d.valor] = { activo: false, hora_inicio: '08:00', hora_fin: '18:00' } })
  return base
}

export default function DisponibilidadClient({ terapeutas, userId, nombre, rol = 'secretaria' }: Props) {
  const [terapeutaId, setTerapeutaId] = useState('')
  const [dias, setDias] = useState<Record<number, DiaConfig>>(estadoInicial())
  const [loading, setLoading] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [toast, setToast] = useState<{msg:string;type:'success'|'error'}|null>(null)

  useEffect(() => {
    if (!terapeutaId) { setDias(estadoInicial()); return }
    setLoading(true)
    fetch(`/api/disponibilidad?terapeuta_id=${terapeutaId}`)
      .then(r => r.json())
      .then(data => {
        const nuevo = estadoInicial()
        for (const b of (data.bloques ?? [])) {
          nuevo[b.dia_semana] = {
            activo: true,
            hora_inicio: b.hora_inicio.slice(0,5),
            hora_fin: b.hora_fin.slice(0,5),
          }
        }
        setDias(nuevo)
      })
      .finally(() => setLoading(false))
  }, [terapeutaId])

  function actualizarDia(valor: number, cambios: Partial<DiaConfig>) {
    setDias(prev => ({ ...prev, [valor]: { ...prev[valor], ...cambios } }))
  }

  async function guardar() {
    if (!terapeutaId) { setToast({ msg: 'Selecciona un terapeuta primero', type: 'error' }); return }

    const bloques = DIAS
      .filter(d => dias[d.valor].activo)
      .map(d => ({
        dia_semana: d.valor,
        hora_inicio: dias[d.valor].hora_inicio,
        hora_fin: dias[d.valor].hora_fin,
      }))

    const invalido = bloques.find(b => b.hora_fin <= b.hora_inicio)
    if (invalido) {
      setToast({ msg: 'La hora de fin debe ser posterior a la de inicio', type: 'error' })
      return
    }

    setGuardando(true)
    const res = await fetch('/api/disponibilidad', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ terapeuta_id: terapeutaId, bloques }),
    })
    const data = await res.json()
    setGuardando(false)

    if (!res.ok) { setToast({ msg: data.error ?? 'Error al guardar', type: 'error' }); return }
    setToast({ msg: 'Horario guardado correctamente', type: 'success' })
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
          --red:#F25555;--green:#34D399;
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
        .select-terapeuta{width:100%;max-width:360px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:11px 13px;font-size:14px;font-family:'Inter',sans-serif;color:var(--text);outline:none;margin-bottom:24px}
        .dia-row{display:flex;align-items:center;gap:16px;background:var(--card);border:1px solid var(--card-border);border-radius:12px;padding:14px 18px;margin-bottom:8px;opacity:1;transition:opacity .18s}
        .dia-row.inactivo{opacity:0.55}
        .dia-label{width:110px;font-size:14px;font-weight:600;color:var(--text);flex-shrink:0}
        .dia-check{width:18px;height:18px;cursor:pointer;flex-shrink:0}
        .dia-horas{display:flex;align-items:center;gap:8px;flex:1}
        .dia-horas input{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 10px;font-size:13px;color:var(--text);outline:none;font-family:'Inter',sans-serif}
        .dia-horas input:disabled{opacity:0.4;cursor:not-allowed}
        .dia-sep{color:var(--muted);font-size:13px}
        .btn-guardar{background:linear-gradient(135deg,var(--blue),var(--cyan));color:#fff;border:none;border-radius:11px;padding:12px 24px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;margin-top:20px;box-shadow:0 4px 18px rgba(37,99,235,0.32)}
        .btn-guardar:disabled{opacity:0.5;cursor:not-allowed}
        .estado-msg{color:var(--muted);font-size:13px;padding:20px 0}
        .toast{position:fixed;bottom:28px;right:28px;z-index:200;background:var(--card);border:1px solid var(--card-border);border-radius:12px;padding:14px 18px;font-size:13.5px;display:flex;align-items:center;gap:12}

        @media (max-width:640px){
          .content{padding:18px 16px}
          .page-title{font-size:22px}
          .select-terapeuta{max-width:100%}
          .dia-row{flex-wrap:wrap}
          .dia-horas{width:100%; margin-left:34px; flex-basis:100%}
          .btn-guardar{width:100%}
        }
      `}</style>

      <Sidebar
        rol={rol}
        nombre={rol === 'admin' ? 'Administradora General' : 'Secretaria'}
        subRol={rol === 'admin' ? 'Acceso Total' : 'Acceso Operativo'}
        icono={rol === 'admin' ? '🛡' : '📁'}
        items={rol === 'admin' ? [
          {icon:'🏠', label:'Panel General',       href:'/admin/dashboard',        active:false},
          {icon:'👥', label:'Usuarios y Roles',    href:'/admin/usuarios',         active:false},
          {icon:'📋', label:'Expedientes',          href:'/admin/expedientes',      active:false},
          {icon:'💳', label:'Finanzas',             href:'/admin/finanzas',         active:false},
          {icon:'📊', label:'Reportes',             href:'/admin/reportes',         active:false},
          {icon:'🕘', label:'Disponibilidad',       href:'/admin/disponibilidad',   active:false},
          {icon:'⭐', label:'Opiniones',            href:'/admin/opiniones',        active:false},
          {icon:'⚠️', label:'Solicitudes de Baja',  href:'/admin/solicitudes-baja', active:false},
          {icon:'🔍', label:'Logs de Auditoría',   href:'/admin/logs',             active:false},
          {icon:'⚙️', label:'Configuración',        href:'/admin/configuracion',    active:false},
        ] : [
          {icon:'🏠', label:'Panel',          href:'/secretaria/dashboard', active:false},
          {icon:'📅', label:'Agenda General', href:'/secretaria/citas',     active:false},
          {icon:'👥', label:'Pacientes',      href:'/secretaria/pacientes', active:false},
          {icon:'📄', label:'Contratos',      href:'/secretaria/contratos', active:false},
          {icon:'💳', label:'Pagos',          href:'/secretaria/pagos',     active:false},
          {icon:'🕘', label:'Disponibilidad', href:'/secretaria/disponibilidad', active:true},
        ]}
      />

      <div className="main">
        <div className="topbar">
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <MenuButton />
            <span className="topbar-title">Disponibilidad</span>
          </div>
          <div className="topbar-right">
            <div className="online-dot"><div className="dot"/>En línea</div>
            <TopbarActions userId={userId} rol={rol} nombre={nombre} />
          </div>
        </div>

        <div className="content">
          <div className="page-title">Disponibilidad de terapeutas</div>
          <div className="page-sub">Configura el horario semanal — esto define los bloques que ve el paciente al agendar</div>

          <select className="select-terapeuta" value={terapeutaId} onChange={e => setTerapeutaId(e.target.value)}>
            <option value="">— Selecciona un terapeuta —</option>
            {terapeutas.map(t => <option key={t.id} value={t.id}>{t.nombre_completo}</option>)}
          </select>

          {!terapeutaId ? (
            <div className="estado-msg">Selecciona un terapeuta para ver y editar su horario.</div>
          ) : loading ? (
            <div className="estado-msg">Cargando horario…</div>
          ) : (
            <>
              {DIAS.map(d => {
                const cfg = dias[d.valor]
                return (
                  <div key={d.valor} className={`dia-row${cfg.activo ? '' : ' inactivo'}`}>
                    <input
                      type="checkbox"
                      className="dia-check"
                      checked={cfg.activo}
                      onChange={e => actualizarDia(d.valor, { activo: e.target.checked })}
                    />
                    <div className="dia-label">{d.label}</div>
                    <div className="dia-horas">
                      <input
                        type="time"
                        value={cfg.hora_inicio}
                        disabled={!cfg.activo}
                        onChange={e => actualizarDia(d.valor, { hora_inicio: e.target.value })}
                      />
                      <span className="dia-sep">a</span>
                      <input
                        type="time"
                        value={cfg.hora_fin}
                        disabled={!cfg.activo}
                        onChange={e => actualizarDia(d.valor, { hora_fin: e.target.value })}
                      />
                    </div>
                  </div>
                )
              })}
              <button className="btn-guardar" onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar horario'}
              </button>
            </>
          )}
        </div>
      </div>

      {toast && (
        <div className="toast" style={{color: toast.type === 'success' ? 'var(--green)' : 'var(--red)'}}>
          {toast.msg}
          <button onClick={() => setToast(null)} style={{background:'none',border:'none',color:'inherit',cursor:'pointer'}}>✕</button>
        </div>
      )}
    </>
  )
}