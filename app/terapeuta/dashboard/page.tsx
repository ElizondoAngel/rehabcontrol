import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar, { MenuButton } from '@/app/components/Sidebar'
import TopbarActions from '@/app/components/TopbarActions'

export default async function TerapeutaDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, nombre_completo')
    .eq('id', user.id)
    .single()

  if (profile?.rol !== 'terapeuta' && profile?.rol !== 'admin') {
    redirect('/unauthorized')
  }

  // ── 1. PACIENTES asignados a este terapeuta ──────────────────
  const { data: pacientesData, error: errorPacientes } = await supabase
    .from('pacientes')
    .select('id_paciente, nombre_completo, activo')
    .eq('terapeuta_id', user.id)
    .order('nombre_completo', { ascending: true })

  if (errorPacientes) console.error('Error cargando pacientes:', errorPacientes.message)
  const pacientes = pacientesData ?? []
  const idsPacientes = pacientes.map(p => p.id_paciente)
  const pacientesActivos = pacientes.filter(p => p.activo)

  // ── 2. CITAS de este terapeuta (todas, para derivar varias métricas) ──
  const { data: citasData, error: errorCitas } = await supabase
    .from('citas')
    .select('id_cita, paciente_id, fecha_hora, estado')
    .eq('terapeuta_id', user.id)

  if (errorCitas) console.error('Error cargando citas:', errorCitas.message)
  const citas = citasData ?? []

  const hoyStr = new Date().toISOString().split('T')[0]
  const citasHoy = citas.filter(c => c.fecha_hora.startsWith(hoyStr))
  const citasHoyPendientes = citasHoy.filter(c => c.estado === 'programada').length
  const proximaCitaHoy = citasHoy
    .filter(c => c.estado === 'programada')
    .sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora))[0]

  const ahora = new Date()
  const proximaCitaPorPaciente = new Map<number, { fecha_hora: string }>()
  for (const c of citas) {
    if (c.estado !== 'programada') continue
    if (new Date(c.fecha_hora) < ahora) continue
    const actual = proximaCitaPorPaciente.get(c.paciente_id)
    if (!actual || new Date(c.fecha_hora) < new Date(actual.fecha_hora)) {
      proximaCitaPorPaciente.set(c.paciente_id, { fecha_hora: c.fecha_hora })
    }
  }

  const completadasPorPaciente = new Map<number, number>()
  for (const c of citas) {
    if (c.estado !== 'completada') continue
    completadasPorPaciente.set(c.paciente_id, (completadasPorPaciente.get(c.paciente_id) ?? 0) + 1)
  }

  // ── 3. EXPEDIENTES ──
  const { data: expedientesData, error: errorExpedientes } = idsPacientes.length > 0
    ? await supabase.from('expedientes').select('paciente_id, diagnostico').in('paciente_id', idsPacientes)
    : { data: [], error: null }

  if (errorExpedientes) console.error('Error cargando expedientes:', errorExpedientes.message)
  const diagnosticoPorPaciente = new Map<number, string>()
  for (const e of expedientesData ?? []) {
    diagnosticoPorPaciente.set(e.paciente_id, e.diagnostico)
  }

  // ── 4. PROGRESO_SESIONES ──
  const { data: sesionesData, error: errorSesiones } = idsPacientes.length > 0
    ? await supabase.from('progreso_sesiones').select('paciente_id, nivel_dolor, movilidad').in('paciente_id', idsPacientes)
    : { data: [], error: null }

  if (errorSesiones) console.error('Error cargando progreso_sesiones:', errorSesiones.message)
  const sesiones = sesionesData ?? []

  const sesionesRegistradasPorPaciente = new Map<number, number>()
  const movilidadPorPaciente = new Map<number, number[]>()
  for (const s of sesiones) {
    sesionesRegistradasPorPaciente.set(s.paciente_id, (sesionesRegistradasPorPaciente.get(s.paciente_id) ?? 0) + 1)
    const arr = movilidadPorPaciente.get(s.paciente_id) ?? []
    arr.push(s.movilidad ?? 0)
    movilidadPorPaciente.set(s.paciente_id, arr)
  }

  const promedioProgreso = sesiones.length > 0
    ? Math.round(sesiones.reduce((acc, s) => acc + (s.movilidad ?? 0), 0) / sesiones.length * 10)
    : 0

  // ── 5. Lista final de pacientes ──
  const pacientesConDatos = pacientesActivos.map(p => {
    const sesionesReg = sesionesRegistradasPorPaciente.get(p.id_paciente) ?? 0
    const totalCompletadas = completadasPorPaciente.get(p.id_paciente) ?? 0
    const proxima = proximaCitaPorPaciente.get(p.id_paciente)
    const ini = p.nombre_completo.split(' ').map((w: string) => w[0]).slice(0,2).join('').toUpperCase()
    const movArr = movilidadPorPaciente.get(p.id_paciente) ?? []
    const movProm = movArr.length > 0 ? Math.round(movArr.reduce((a,b)=>a+b,0) / movArr.length * 10) : null

    return {
      id_paciente: p.id_paciente,
      ini,
      nombre: p.nombre_completo,
      diagnostico: diagnosticoPorPaciente.get(p.id_paciente) ?? null,
      sesionesReg,
      totalCompletadas,
      movProm,
      proximaCita: proxima
        ? new Date(proxima.fecha_hora).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }) +
          ' · ' + new Date(proxima.fecha_hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
        : null,
    }
  })

  const primerNombre = profile?.nombre_completo?.split(' ')[0] ?? 'Terapeuta'
  const horaActual = new Date().getHours()
  const saludo = horaActual < 12 ? 'Buenos días' : horaActual < 19 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --bg:#060B14;--sidebar:#0A1220;--card:#0F1B2E;--card-soft:rgba(255,255,255,0.025);--border:rgba(255,255,255,0.08);
          --mid:#2563EB;--light:#38BDF8;--pale:#DCEEFA;--text:#E7EDF7;--muted:rgba(140,155,181,0.85);
          --green:#34D399;--amber:#F5B400;--red:#F25555;
        }
        body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex}

        .main{flex:1;display:flex;flex-direction:column;overflow:hidden}
        .topbar{height:52px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 32px;flex-shrink:0}
        .topbar-title{font-size:13px;color:var(--muted);font-weight:500}
        .topbar-right{display:flex;align-items:center;gap:16px}
        .online-dot{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--light)}
        .dot{width:6px;height:6px;border-radius:50%;background:var(--light)}
        .notif{width:30px;height:30px;border-radius:8px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px}
        .content{flex:1;overflow-y:auto;padding:36px 40px}

        /* HERO */
        .hero{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:36px;flex-wrap:wrap}
        .hero-greeting{font-size:13.5px;color:var(--light);font-weight:600;letter-spacing:.02em;margin-bottom:8px;text-transform:uppercase}
        .hero-title{font-size:34px;font-weight:700;color:var(--text);letter-spacing:-0.02em;line-height:1.15}
        .hero-sub{font-size:14.5px;color:var(--muted);margin-top:8px;max-width:480px;line-height:1.5}
        .hero-next{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:18px 22px;min-width:240px;flex-shrink:0}
        .hero-next-label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;display:flex;align-items:center;gap:6px}
        .hero-next-time{font-size:24px;font-weight:700;color:var(--light);letter-spacing:-0.01em}
        .hero-next-empty{font-size:14px;color:var(--muted);font-style:italic}
        .hero-next-count{font-size:12.5px;color:var(--muted);margin-top:4px}

        /* MÉTRICAS — franja delgada en línea, no tarjetas cuadradas */
        .metrics-strip{display:flex;gap:0;margin-bottom:36px;background:var(--card);border:1px solid var(--border);border-radius:16px;overflow:hidden}
        .metric-cell{flex:1;padding:18px 24px;position:relative}
        .metric-cell:not(:last-child){border-right:1px solid var(--border)}
        .metric-num{font-size:28px;font-weight:700;color:var(--text);letter-spacing:-0.01em;line-height:1}
        .metric-label{font-size:12.5px;color:var(--muted);margin-top:6px;display:flex;align-items:center;gap:6px}
        .metric-accent{position:absolute;top:0;left:0;width:3px;height:100%;border-radius:0}
        .accent-blue{background:var(--mid)}
        .accent-cyan{background:var(--light)}
        .accent-green{background:var(--green)}

        /* SECCIÓN PACIENTES */
        .section-header{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:18px}
        .section-title{font-size:18px;font-weight:600;color:var(--text)}
        .section-link{font-size:13px;color:var(--light);text-decoration:none;font-weight:500}
        .section-link:hover{text-decoration:underline}

        .patient-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
        .patient-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:20px 22px;text-decoration:none;color:inherit;transition:border-color .18s,transform .18s;display:flex;flex-direction:column;gap:14px}
        .patient-card:hover{border-color:rgba(56,189,248,0.35);transform:translateY(-2px)}
        .patient-card-top{display:flex;align-items:center;gap:12px}
        .p-avatar{width:42px;height:42px;border-radius:50%;background:rgba(37,99,235,0.22);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:var(--light);flex-shrink:0}
        .p-name{font-size:14.5px;font-weight:600;color:var(--text)}
        .p-diag{font-size:12px;color:var(--muted);margin-top:2px}
        .patient-card-stats{display:flex;gap:18px;padding-top:14px;border-top:1px solid var(--border)}
        .pcs-item{flex:1}
        .pcs-label{font-size:10.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px}
        .pcs-val{font-size:13.5px;font-weight:600;color:var(--text)}
        .pcs-val.muted{color:var(--muted);font-weight:500;font-style:italic;font-size:12.5px}
        .mov-bar{height:4px;background:rgba(255,255,255,0.07);border-radius:100px;overflow:hidden;margin-top:6px}
        .mov-fill{height:100%;background:linear-gradient(90deg,var(--mid),var(--light));border-radius:100px}

        .empty-state{background:var(--card);border:1px dashed var(--border);border-radius:16px;padding:48px 24px;text-align:center;color:var(--muted);font-size:14px}

        .chatbot-bubble{position:fixed;bottom:28px;right:28px;width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,var(--mid),var(--light));display:flex;align-items:center;justify-content:center;font-size:20px;cursor:pointer;box-shadow:0 4px 16px rgba(37,99,235,0.35);transition:transform .2s;z-index:50;text-decoration:none}
        .chatbot-bubble:hover{transform:scale(1.08)}

        @media (max-width:900px){
          .patient-grid{grid-template-columns:1fr}
          .metrics-strip{flex-direction:column}
          .metric-cell:not(:last-child){border-right:none;border-bottom:1px solid var(--border)}
        }
      `}</style>

      <Sidebar
        rol="terapeuta"
        nombre="Terapeuta"
        subRol="Acceso limitado"
        icono="📈"
        items={[
          {icon:'🏠', label:'Mi Panel',        href:'/terapeuta/dashboard',   active:true},
          {icon:'👥', label:'Mis Pacientes',   href:'/terapeuta/pacientes',   active:false},
          {icon:'📋', label:'Expedientes',      href:'/terapeuta/expedientes', active:false},
          {icon:'📅', label:'Mi Agenda',        href:'/terapeuta/agenda',      active:false},
          {icon:'📊', label:'Progreso',         href:'/terapeuta/progreso',    active:false},
        ]}
      />

      <div className="main">
        <div className="topbar">
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <MenuButton />
            <span className="topbar-title">Mi Panel</span>
          </div>
          <div className="topbar-right">
            <div className="online-dot"><div className="dot"/> En línea</div>
            <TopbarActions userId={user.id} rol={profile?.rol ?? 'terapeuta'} nombre={profile?.nombre_completo} />
          </div>
        </div>

        <div className="content">
          {/* HERO */}
          <div className="hero">
            <div>
              <div className="hero-greeting">{saludo}</div>
              <div className="hero-title">Hola, {primerNombre}</div>
              <div className="hero-sub">
                Tienes {pacientesActivos.length} paciente{pacientesActivos.length !== 1 ? 's' : ''} activo{pacientesActivos.length !== 1 ? 's' : ''} bajo tu cuidado.
                {citasHoyPendientes > 0 ? ` Te quedan ${citasHoyPendientes} sesión${citasHoyPendientes !== 1 ? 'es' : ''} por atender hoy.` : ' No tienes sesiones pendientes por hoy.'}
              </div>
            </div>
            <div className="hero-next">
              <div className="hero-next-label">📅 Próxima sesión de hoy</div>
              {proximaCitaHoy ? (
                <>
                  <div className="hero-next-time">
                    {new Date(proximaCitaHoy.fecha_hora).toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit', hour12:false })}
                  </div>
                  <div className="hero-next-count">{citasHoyPendientes} pendiente{citasHoyPendientes !== 1 ? 's' : ''} en total hoy</div>
                </>
              ) : (
                <div className="hero-next-empty">Sin sesiones programadas</div>
              )}
            </div>
          </div>

          {/* MÉTRICAS — franja horizontal compacta */}
          <div className="metrics-strip">
            <div className="metric-cell">
              <div className="metric-accent accent-blue" />
              <div className="metric-num">{pacientesActivos.length}</div>
              <div className="metric-label">👥 Pacientes activos</div>
            </div>
            <div className="metric-cell">
              <div className="metric-accent accent-cyan" />
              <div className="metric-num">{citasHoy.length}</div>
              <div className="metric-label">📅 Sesiones programadas hoy</div>
            </div>
            <div className="metric-cell">
              <div className="metric-accent accent-green" />
              <div className="metric-num">{promedioProgreso}%</div>
              <div className="metric-label">📈 Movilidad promedio registrada</div>
            </div>
          </div>

          {/* PACIENTES — tarjetas en grid, no filas de tabla */}
          <div className="section-header">
            <div className="section-title">Mis pacientes</div>
            <Link href="/terapeuta/pacientes" className="section-link">Ver todos →</Link>
          </div>

          {pacientesConDatos.length === 0 ? (
            <div className="empty-state">Aún no tienes pacientes activos asignados.</div>
          ) : (
            <div className="patient-grid">
              {pacientesConDatos.map(p => (
                <Link href={`/terapeuta/expedientes/${p.id_paciente}`} className="patient-card" key={p.id_paciente}>
                  <div className="patient-card-top">
                    <div className="p-avatar">{p.ini}</div>
                    <div>
                      <div className="p-name">{p.nombre}</div>
                      <div className="p-diag">{p.diagnostico ?? 'Sin expediente clínico'}</div>
                    </div>
                  </div>
                  <div className="patient-card-stats">
                    <div className="pcs-item">
                      <div className="pcs-label">Sesiones</div>
                      <div className="pcs-val">{p.sesionesReg}/{p.totalCompletadas}</div>
                      <div className="mov-bar">
                        <div className="mov-fill" style={{width: `${p.totalCompletadas > 0 ? Math.min(100, Math.round(p.sesionesReg/p.totalCompletadas*100)) : 0}%`}} />
                      </div>
                    </div>
                    <div className="pcs-item">
                      <div className="pcs-label">Próxima cita</div>
                      {p.proximaCita
                        ? <div className="pcs-val">{p.proximaCita}</div>
                        : <div className="pcs-val muted">Sin programar</div>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <a href="#" className="chatbot-bubble" title="Asistente RC">💬</a>
    </>
  )
}
