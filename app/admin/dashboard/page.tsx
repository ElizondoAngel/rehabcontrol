import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TopbarActions from '@/app/components/TopbarActions'
import Sidebar, { MenuButton } from '@/app/components/Sidebar'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('nombre_completo,rol').eq('id', user.id).single()

  const hoy = new Date().toISOString().split('T')[0]
  const inicioHoy = `${hoy}T00:00:00`
  const finHoy    = `${hoy}T23:59:59`
  const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0,0,0,0)

  const { count: pacientesActivos } = await supabase
    .from('pacientes').select('*', { count:'exact', head:true }).eq('activo', true)

  const { data: citasHoy } = await supabase
    .from('citas').select('estado')
    .gte('fecha_hora', inicioHoy).lte('fecha_hora', finHoy)
  const sesionesHoy = citasHoy?.length ?? 0
  const sesionesCompletadas = citasHoy?.filter(c => c.estado === 'completada').length ?? 0

  const { data: pagosMes } = await supabase
    .from('pagos').select('monto')
    .eq('estado_pago', 'pagado')
    .gte('fecha_pago', inicioMes.toISOString())
  const ingresosMes = (pagosMes ?? []).reduce((s, p) => s + Number(p.monto), 0)

  const { data: usuarios, count: totalUsuarios } = await supabase
    .from('profiles')
    .select('id, nombre_completo, rol, activo, created_at', { count:'exact' })
    .order('created_at', { ascending: false })
    .limit(5)

  const rolesActivos = new Set((usuarios ?? []).map(u => u.rol)).size

  const { data: logs } = await supabase
    .from('audit_logs')
    .select('id_logs, accion, tabla_afectada, timestamp, profiles(nombre_completo)')
    .order('timestamp', { ascending: false })
    .limit(6)

  const ROL_LABELS: Record<string,string> = {
    admin:'Admin · Nivel 4', terapeuta:'Terapeuta · Nivel 2', secretaria:'Secretaria · Nivel 3', paciente:'Paciente · Nivel 1'
  }
  const AVATAR_COLORS = ['c1','c2','c3','c4']

  const ACCION_LABELS: Record<string,string> = {
    CREAR_PACIENTE:'Registro de paciente', EDITAR_PACIENTE:'Edición de paciente',
    BAJA_PACIENTE:'Baja de paciente', REACTIVAR_PACIENTE:'Reactivación de paciente',
    CREAR_CITA:'Cita agendada', EDITAR_CITA:'Edición de cita',
    CITA_COMPLETADA:'Cita completada', CITA_CANCELADA:'Cita cancelada', CITA_NO_ASISTIO:'Paciente no asistió',
    REGISTRAR_PAGO:'Registro de pago', COBRAR_PAGO:'Cobro registrado',
    EDITAR_PAGO:'Edición de pago', REEMBOLSAR_PAGO:'Reembolso registrado',
    CAMBIAR_ROL:'Cambio de rol', ACTIVAR_USUARIO:'Activación de usuario', DESACTIVAR_USUARIO:'Desactivación de usuario',
  }
  const ACCION_DOT: Record<string,string> = {
    CREAR_PACIENTE:'ld-green', EDITAR_PACIENTE:'ld-blue', BAJA_PACIENTE:'ld-amber', REACTIVAR_PACIENTE:'ld-green',
    CREAR_CITA:'ld-green', EDITAR_CITA:'ld-blue', CITA_COMPLETADA:'ld-green', CITA_CANCELADA:'ld-amber', CITA_NO_ASISTIO:'ld-amber',
    REGISTRAR_PAGO:'ld-blue', COBRAR_PAGO:'ld-green', EDITAR_PAGO:'ld-blue', REEMBOLSAR_PAGO:'ld-purple',
    CAMBIAR_ROL:'ld-purple', ACTIVAR_USUARIO:'ld-green', DESACTIVAR_USUARIO:'ld-red',
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

         /* MAIN */
        .main{flex:1;display:flex;flex-direction:column;overflow:hidden}
        .topbar{height:56px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 28px;flex-shrink:0}
        .topbar-title{font-size:14px;color:var(--muted);font-weight:500}
        .topbar-right{display:flex;align-items:center;gap:16px}
        .online-dot{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--cyan);font-weight:500}
        .dot{width:7px;height:7px;border-radius:50%;background:var(--cyan);box-shadow:0 0 8px var(--cyan)}
        .content{flex:1;overflow-y:auto;padding:28px}
        .page-title{font-size:26px;font-weight:800;color:var(--text);margin-bottom:4px;letter-spacing:-0.015em}
        .page-sub{font-size:14px;color:var(--muted);margin-bottom:28px}
        .metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px}
        .metric{background:var(--card);border:1px solid var(--card-border);border-radius:16px;padding:20px 22px;position:relative;overflow:hidden;transition:border-color .2s,transform .2s}
        .metric:hover{border-color:rgba(56,189,248,0.3);transform:translateY(-2px)}
        .metric-label{font-size:12px;color:var(--muted);margin-bottom:12px;font-weight:500}
        .metric-num{font-size:30px;font-weight:800;letter-spacing:-0.02em;line-height:1;background:linear-gradient(110deg,var(--blue-2),var(--cyan));-webkit-background-clip:text;background-clip:text;color:transparent}
        .metric-sub{font-size:12px;color:var(--muted);margin-top:6px}
        .metric-icon{position:absolute;top:18px;right:18px;width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px}
        .icon-green{background:rgba(52,211,153,0.15)}
        .icon-blue{background:rgba(56,189,248,0.15)}
        .icon-amber{background:rgba(245,180,0,0.15)}
        .icon-red{background:rgba(167,139,250,0.15)}
        .tables-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .table-card{background:var(--card);border:1px solid var(--card-border);border-radius:16px;padding:22px}
        .table-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
        .table-title{font-size:15px;font-weight:600;color:var(--text)}
        .table-action{font-size:12px;color:var(--cyan);text-decoration:none;cursor:pointer;font-weight:500}
        .live-badge{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--cyan);font-weight:500}
        .live-dot{width:6px;height:6px;border-radius:50%;background:var(--cyan);box-shadow:0 0 6px var(--cyan)}
        .user-row{display:flex;align-items:center;justify-content:space-between;padding:11px 0;border-bottom:1px solid var(--border)}
        .user-row:last-child{border-bottom:none}
        .user-left{display:flex;align-items:center;gap:11px}
        .u-avatar{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--text);flex-shrink:0}
        .u-name{font-size:13px;font-weight:500;color:var(--text)}
        .u-role{font-size:11px;color:var(--muted)}
        .badge{font-size:11px;font-weight:600;padding:3px 10px;border-radius:100px;text-align:right}
        .badge-green{background:rgba(52,211,153,0.15);color:var(--green)}
        .badge-gray{background:rgba(255,255,255,0.06);color:var(--muted)}
        .badge-sub{font-size:10px;color:var(--muted);text-align:right;margin-top:2px}
        .log-row{display:flex;align-items:flex-start;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)}
        .log-row:last-child{border-bottom:none}
        .log-left{display:flex;align-items:flex-start;gap:10px}
        .log-dot-wrap{padding-top:4px}
        .log-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
        .ld-green{background:var(--green)}
        .ld-amber{background:var(--amber)}
        .ld-blue{background:var(--cyan)}
        .ld-purple{background:var(--purple)}
        .ld-red{background:var(--red)}
        .log-action{font-size:13px;color:var(--text)}
        .log-user{font-size:11px;color:var(--muted)}
        .log-time{font-size:11px;color:var(--muted);white-space:nowrap}
        .c1{background:rgba(56,189,248,0.25)}
        .c2{background:rgba(59,130,246,0.25)}
        .c3{background:rgba(167,139,250,0.22)}
        .c4{background:rgba(245,180,0,0.20)}
        @media (max-width: 1000px) {
          .metrics{grid-template-columns:repeat(2,1fr)}
          .tables-grid{grid-template-columns:1fr}
        }
      `}</style>


      <Sidebar
              rol="admin"
              nombre="Administradora General"
              subRol="Acceso Total"
              icono="🛡"
              items={[
                {icon:'🏠', label:'Panel General',       href:'/admin/dashboard',        active:true},
              {icon:'👥', label:'Usuarios y Roles',    href:'/admin/usuarios',         active:false},
              {icon:'📋', label:'Expedientes',          href:'/admin/expedientes',      active:false},
              {icon:'💳', label:'Finanzas',             href:'/admin/finanzas',         active:false},
              {icon:'📊', label:'Reportes',             href:'/admin/reportes',         active:false},
              {icon:'🕘', label:'Disponibilidad',       href:'/admin/disponibilidad',   active:false },
              {icon:'⭐', label:'Opiniones',            href:'/admin/opiniones',        active:false},
              {icon:'⚠️', label:'Solicitudes de Baja',  href:'/admin/solicitudes-baja', active:false},
              {icon:'🔍', label:'Logs de Auditoría',   href:'/admin/logs',             active:false},
              {icon:'⚙️', label:'Configuración',        href:'/admin/configuracion',    active:false},
              ]}
            />

      <div className="main">
        <div className="topbar">
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <MenuButton />
            <span className="topbar-title">Panel</span>
          </div>
          <div className="topbar-right">
            <div className="online-dot"><div className="dot"/> En línea</div>
            <TopbarActions
              userId={user.id}
              rol={profile?.rol ?? 'admin'}
              nombre={profile?.nombre_completo}
            />
          </div>
        </div>
        <div className="content">
          <div className="page-title">Panel Administrativo</div>
          <div className="page-sub">Visión general del sistema — Acceso Total</div>

          <div className="metrics">
            {[
              {label:'Pacientes activos',    num:String(pacientesActivos ?? 0), sub:'base actual',                                           icon:'👥', cls:'icon-green'},
              {label:'Sesiones hoy',         num:String(sesionesHoy),           sub:`${sesionesCompletadas} completadas`,                    icon:'📅', cls:'icon-blue'},
              {label:'Ingresos del mes',     num:`$${ingresosMes.toLocaleString('es-MX',{minimumFractionDigits:2})}`, sub:'pagos cobrados', icon:'💲', cls:'icon-amber'},
              {label:'Usuarios del sistema', num:String(totalUsuarios ?? 0),    sub:`${rolesActivos} roles activos`,                         icon:'🛡', cls:'icon-red'},
            ].map(m => (
              <div className="metric" key={m.label}>
                <div className="metric-label">{m.label}</div>
                <div className="metric-num">{m.num}</div>
                <div className="metric-sub">{m.sub}</div>
                <div className={`metric-icon ${m.cls}`}>{m.icon}</div>
              </div>
            ))}
          </div>

          <div className="tables-grid">
            <div className="table-card">
              <div className="table-header">
                <span className="table-title">Usuarios del sistema</span>
                <Link href="/admin/usuarios" className="table-action">Ver todos</Link>
              </div>
              {(usuarios ?? []).map((u, i) => {
                const ini = u.nombre_completo.split(' ').map((w:string)=>w[0]).slice(0,2).join('').toUpperCase()
                const tiempo = new Date(u.created_at).toLocaleDateString('es-MX', { day:'2-digit', month:'short' })
                return (
                  <div className="user-row" key={u.id}>
                    <div className="user-left">
                      <div className={`u-avatar ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>{ini}</div>
                      <div><div className="u-name">{u.nombre_completo}</div><div className="u-role">{ROL_LABELS[u.rol] ?? u.rol}</div></div>
                    </div>
                    <div>
                      <div className={`badge ${u.activo?'badge-green':'badge-gray'}`}>{u.activo?'activo':'inactivo'}</div>
                      <div className="badge-sub">{tiempo}</div>
                    </div>
                  </div>
                )
              })}
              {(usuarios ?? []).length === 0 && (
                <div style={{padding:'24px 0', textAlign:'center', color:'var(--muted)', fontSize:13}}>Sin usuarios registrados</div>
              )}
            </div>

            <div className="table-card">
              <div className="table-header">
                <span className="table-title">Log de auditoría</span>
                <div className="live-badge"><div className="live-dot"/>En vivo</div>
              </div>
              {(logs ?? []).map((l:any) => {
                const hora = new Date(l.timestamp).toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit', hour12:true })
                return (
                  <div className="log-row" key={l.id_logs}>
                    <div className="log-left">
                      <div className="log-dot-wrap"><div className={`log-dot ${ACCION_DOT[l.accion] ?? 'ld-blue'}`}/></div>
                      <div><div className="log-action">{ACCION_LABELS[l.accion] ?? l.accion}</div><div className="log-user">{l.profiles?.nombre_completo ?? '—'}</div></div>
                    </div>
                    <div className="log-time">{hora}</div>
                  </div>
                )
              })}
              {(logs ?? []).length === 0 && (
                <div style={{padding:'24px 0', textAlign:'center', color:'var(--muted)', fontSize:13}}>Sin actividad registrada</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
