'use client'

/**
 * UsuariosClient.tsx
 * ─────────────────────────────────────────────────────────────
 * F7 — Gestión de usuarios y roles (Admin)
 *
 * IMPORTANTE — SEGURIDAD:
 *   • El admin NO crea cuentas de Auth desde aquí (eso requiere
 *     service_role key, riesgo si se expone al cliente).
 *   • Las cuentas se crean en Supabase Auth (Authentication > Users)
 *     por un desarrollador/admin del proyecto.
 *   • Esta pantalla permite: cambiar ROL, activar/desactivar cuenta,
 *     y editar datos de contacto — todo sobre perfiles existentes.
 *   • Un admin NO puede desactivarse ni quitarse el rol admin a sí mismo
 *     (regla de negocio: "Acciones críticas quedan en log").
 *
 * UNIDAD 2:
 *   • DOM dinámico, fetch asíncrona, eventos, animaciones, toasts/modales
 */

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'

interface Usuario {
  id: string
  nombre_completo: string
  email: string
  rol: 'admin'|'terapeuta'|'secretaria'|'paciente'
  telefono?: string
  activo: boolean
  created_at: string
}
interface PacienteOpt { id_paciente: number; nombre_completo: string; curp: string }
interface Vinculo { id_paciente: number; nombre_completo: string; profile_id: string }
interface Props {
  usuariosIniciales: Usuario[]
  currentUserId: string
  pacientesSinCuenta: PacienteOpt[]
  vinculos: Vinculo[]
}

const ROL_LABELS: Record<string,string> = { admin:'Admin', terapeuta:'Terapeuta', secretaria:'Secretaria', paciente:'Paciente' }
const ROL_NIVEL:  Record<string,string> = { admin:'Nivel 4', terapeuta:'Nivel 2', secretaria:'Nivel 3', paciente:'Nivel 1' }
const ROL_BADGE:  Record<string,string> = { admin:'b-red', terapeuta:'b-blue', secretaria:'b-purple', paciente:'b-green' }

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

export default function UsuariosClient({ usuariosIniciales, currentUserId, pacientesSinCuenta, vinculos }: Props) {
  const [usuarios, setUsuarios] = useState<Usuario[]>(usuariosIniciales)
  const [busqueda, setBusqueda] = useState('')
  const [filtroRol, setFiltroRol] = useState<'todos'|'admin'|'terapeuta'|'secretaria'|'paciente'>('todos')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{msg:string;type:'success'|'error'}|null>(null)
  const [confirmCambio, setConfirmCambio] = useState<{usuario:Usuario, accion:'rol'|'estado', nuevoValor:string}|null>(null)
  const [modalCrearCuenta, setModalCrearCuenta] = useState(false)
  const [modalVincular, setModalVincular] = useState<Usuario|null>(null)
  const [pacientesDisponibles, setPacientesDisponibles] = useState<PacienteOpt[]>(pacientesSinCuenta)
  const [vinculosMap, setVinculosMap] = useState<Record<string,string>>(() => {
    const m: Record<string,string> = {}
    vinculos.forEach(v => { m[v.profile_id] = v.nombre_completo })
    return m
  })
  const [errores, setErrores] = useState<Record<string,string>>({})

  const usuariosFiltrados = useMemo(() => {
    return usuarios
      .filter(u => filtroRol==='todos' ? true : u.rol===filtroRol)
      .filter(u => u.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) || u.email.toLowerCase().includes(busqueda.toLowerCase()))
  }, [usuarios, filtroRol, busqueda])

  const conteos = useMemo(() => {
    const c: Record<string,number> = { admin:0, terapeuta:0, secretaria:0, paciente:0 }
    usuarios.forEach(u => { c[u.rol] = (c[u.rol] ?? 0) + 1 })
    return c
  }, [usuarios])

  // ── EJECUTAR CAMBIO (rol o estado) ────────────────────────────
  async function ejecutarCambio() {
    if (!confirmCambio) return
    const { usuario, accion, nuevoValor } = confirmCambio
    setLoading(true)

    const body = accion === 'rol'
      ? { id: usuario.id, rol: nuevoValor }
      : { id: usuario.id, activo: nuevoValor === 'true' }

    const res = await fetch('/api/usuarios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setLoading(false)
    setConfirmCambio(null)

    if (!res.ok) {
      setToast({ msg: data.error ?? 'Error al actualizar', type:'error' })
      return
    }

    setUsuarios(prev => prev.map(u => u.id===usuario.id
      ? { ...u, ...(accion==='rol' ? { rol: nuevoValor as Usuario['rol'] } : { activo: nuevoValor==='true' }) }
      : u
    ))
    setToast({ msg: accion==='rol' ? 'Rol actualizado correctamente' : (nuevoValor==='true' ? 'Cuenta activada' : 'Cuenta desactivada'), type:'success' })
  }

  // ── CREAR CUENTA DE PACIENTE (invitación por correo) ──────────
  async function crearCuentaPaciente(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const email = fd.get('email') as string
    const nombre_completo = fd.get('nombre_completo') as string
    const telefono = fd.get('telefono') as string
    const paciente_id = fd.get('paciente_id') as string

    const errs: Record<string,string> = {}
    if (!email) errs.email = 'El correo es obligatorio'
    if (!nombre_completo?.trim()) errs.nombre_completo = 'El nombre es obligatorio'
    if (Object.keys(errs).length > 0) { setErrores(errs); return }

    setLoading(true)
    const res = await fetch('/api/admin/crear-cuenta-paciente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email, nombre_completo,
        telefono: telefono || undefined,
        paciente_id: paciente_id ? Number(paciente_id) : undefined,
      }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setToast({ msg: data.error ?? 'Error al crear la cuenta', type: 'error' })
      return
    }

    setUsuarios(prev => [{
      id: data.user_id, nombre_completo, email, rol: 'paciente', telefono,
      activo: true, created_at: new Date().toISOString(),
    }, ...prev])

    if (paciente_id) {
      const p = pacientesDisponibles.find(x => x.id_paciente === Number(paciente_id))
      if (p) {
        setVinculosMap(prev => ({ ...prev, [data.user_id]: p.nombre_completo }))
        setPacientesDisponibles(prev => prev.filter(x => x.id_paciente !== Number(paciente_id)))
      }
    }

    setToast({ msg: 'Invitación enviada. El paciente recibirá un correo para definir su contraseña.', type: 'success' })
    setModalCrearCuenta(false)
    setErrores({})
  }

  // ── VINCULAR CUENTA EXISTENTE CON UN PACIENTE ──────────────────
  async function vincularPaciente(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!modalVincular) return
    const fd = new FormData(e.currentTarget)
    const paciente_id = fd.get('paciente_id') as string

    if (!paciente_id) { setErrores({ paciente_id: 'Selecciona un paciente' }); return }

    setLoading(true)
    const res = await fetch('/api/admin/vincular-paciente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paciente_id: Number(paciente_id), profile_id: modalVincular.id }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setToast({ msg: data.error ?? 'Error al vincular', type: 'error' })
      return
    }

    const p = pacientesDisponibles.find(x => x.id_paciente === Number(paciente_id))
    if (p) {
      setVinculosMap(prev => ({ ...prev, [modalVincular.id]: p.nombre_completo }))
      setPacientesDisponibles(prev => prev.filter(x => x.id_paciente !== Number(paciente_id)))
    }
    setToast({ msg: 'Cuenta vinculada correctamente', type: 'success' })
    setModalVincular(null)
    setErrores({})
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
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
        .topbar-right{display:flex;align-items:center;gap:16px}
        .online-dot{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--cyan);font-weight:500}
        .dot{width:7px;height:7px;border-radius:50%;background:var(--cyan);box-shadow:0 0 8px var(--cyan)}
        .notif{width:32px;height:32px;border-radius:9px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:15px;transition:background .18s}
        .notif:hover{background:var(--surface2)}
        .content{flex:1;overflow-y:auto;padding:28px}

        .page-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;flex-wrap:wrap;gap:12px}
        .page-title{font-size:26px;font-weight:800;color:var(--text);letter-spacing:-0.015em}
        .page-sub{font-size:14px;color:var(--muted);margin-top:4px}
        .btn-nuevo{background:linear-gradient(135deg,var(--blue),var(--cyan));color:#fff;border:none;border-radius:11px;padding:11px 20px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;display:flex;align-items:center;gap:7px;transition:transform .2s,box-shadow .2s;box-shadow:0 4px 18px rgba(37,99,235,0.32);white-space:nowrap}
        .btn-nuevo:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(56,189,248,0.4)}
        .note-box{background:rgba(56,189,248,0.06);border:1px solid rgba(56,189,248,0.18);border-radius:12px;padding:14px 16px;margin-bottom:20px;font-size:13px;color:var(--muted);line-height:1.6}
        .note-box strong{color:var(--cyan)}

        /* STATS */
        .stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px}
        .stat-card{background:var(--card);border:1px solid var(--card-border);border-radius:16px;padding:18px 20px;display:flex;align-items:center;justify-content:space-between;transition:border-color .2s,transform .2s}
        .stat-card:hover{border-color:rgba(56,189,248,0.3);transform:translateY(-2px)}
        .stat-num{font-size:24px;font-weight:800;color:var(--text);letter-spacing:-0.01em}
        .stat-label{font-size:12px;color:var(--muted);margin-top:4px}
        .stat-dot{width:10px;height:10px;border-radius:50%;box-shadow:0 0 8px currentColor}

        /* FILTROS */
        .filters{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap}
        .search-wrap{flex:1;min-width:220px;position:relative}
        .search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:14px;color:var(--muted)}
        .search-input{width:100%;background:var(--card);border:1px solid var(--card-border);border-radius:10px;padding:10px 12px 10px 34px;font-size:14px;font-family:'Inter',sans-serif;color:var(--text);outline:none;transition:border-color .2s}
        .search-input:focus{border-color:var(--cyan)}
        .search-input::placeholder{color:var(--muted)}
        .filter-tab{background:var(--card);border:1px solid var(--card-border);border-radius:9px;padding:8px 14px;font-size:13px;font-weight:500;color:var(--muted);cursor:pointer;font-family:'Inter',sans-serif;transition:all .18s}
        .filter-tab:hover{border-color:rgba(56,189,248,0.35);color:var(--text)}
        .filter-tab.active{background:rgba(56,189,248,0.14);border-color:rgba(56,189,248,0.4);color:var(--cyan)}

        /* TABLA */
        .table-card{background:var(--card);border:1px solid var(--card-border);border-radius:16px;overflow:hidden}
        .header-row{display:grid;grid-template-columns:2fr 1.2fr 1fr 1fr 1fr 1.3fr;gap:14px;padding:12px 20px;border-bottom:1px solid var(--border)}
        .th{font-size:11px;font-weight:600;color:var(--muted);letter-spacing:0.07em;text-transform:uppercase}
        .user-row{display:grid;grid-template-columns:2fr 1.2fr 1fr 1fr 1fr 1.3fr;gap:14px;padding:14px 20px;border-bottom:1px solid var(--border);align-items:center;animation:fadeIn .3s ease both;transition:background .18s;min-width:0}
        .user-row > div{min-width:0;overflow:hidden}
        .user-row:last-child{border-bottom:none}
        .user-row:hover{background:var(--surface2)}
        .u-left{display:flex;align-items:center;gap:10px}
        .u-avatar{width:36px;height:36px;border-radius:50%;background:rgba(56,189,248,0.18);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--text);flex-shrink:0}
        .u-name{font-size:13px;font-weight:500;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .u-email{font-size:11px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .td-text{font-size:13px;color:var(--muted)}
        .badge{font-size:11px;font-weight:600;padding:3px 10px;border-radius:100px;display:inline-block}
        .b-red{background:rgba(242,85,85,0.15);color:var(--red)}
        .b-blue{background:rgba(56,189,248,0.15);color:var(--cyan)}
        .b-purple{background:rgba(167,139,250,0.15);color:var(--purple)}
        .b-green{background:rgba(52,211,153,0.15);color:var(--green)}
        .badge-gray{background:rgba(255,255,255,0.06);color:var(--muted)}
        .rol-select{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:6px 10px;font-size:12px;font-family:'Inter',sans-serif;color:var(--text);cursor:pointer;outline:none}
        .rol-select option{background:#0A1220;color:var(--text)}
        .rol-select:disabled{opacity:0.4;cursor:not-allowed}
        .form-group{display:flex;flex-direction:column;gap:6px}
        .form-label{font-size:11px;font-weight:600;color:var(--muted);letter-spacing:0.07em;text-transform:uppercase;display:block;margin-bottom:7px}
        .form-input,.form-select{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:11px 13px;font-size:14px;font-family:'Inter',sans-serif;color:var(--text);outline:none;transition:border-color .2s,box-shadow .2s;width:100%}
        .form-input:focus,.form-select:focus{border-color:var(--cyan);box-shadow:0 0 0 3px rgba(56,189,248,0.12)}
        .form-input::placeholder{color:rgba(231,237,247,0.25)}
        .form-select option{background:#0A1220;color:var(--text)}
        .form-input.err,.form-select.err{border-color:rgba(242,85,85,0.5)}
        .err-msg{font-size:11px;color:var(--red)}
        .toggle{position:relative;width:40px;height:22px;border-radius:100px;background:rgba(255,255,255,0.08);border:1px solid var(--border);cursor:pointer;transition:background .2s;flex-shrink:0}
        .toggle.on{background:rgba(56,189,248,0.30);border-color:rgba(56,189,248,0.5)}
        .toggle-dot{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:var(--text);transition:transform .2s}
        .toggle.on .toggle-dot{transform:translateX(18px);background:var(--cyan)}
        .toggle.disabled{opacity:0.4;cursor:not-allowed}
        .you-tag{font-size:10px;color:var(--cyan);font-weight:700;background:rgba(56,189,248,0.12);padding:2px 6px;border-radius:6px;margin-left:6px}
        .btn-vincular{background:var(--surface2);border:1px solid var(--border);border-radius:7px;padding:5px 10px;font-size:11px;font-weight:500;color:var(--muted);cursor:pointer;font-family:'Inter',sans-serif;transition:all .18s;white-space:nowrap}
        .btn-vincular:hover{background:rgba(56,189,248,0.15);border-color:rgba(56,189,248,0.3);color:var(--cyan)}
        .empty-state{padding:60px 20px;text-align:center;color:var(--muted);font-size:14px}

        /* MODAL CONFIRM */
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .2s ease}
        .confirm-modal{background:#0A1220;border:1px solid rgba(56,189,248,0.25);border-radius:18px;width:100%;max-width:400px;padding:28px;animation:slideUp .2s ease}
        .confirm-title{font-size:17px;font-weight:700;color:var(--text);margin-bottom:8px}
        .confirm-body{font-size:14px;color:var(--muted);line-height:1.6;margin-bottom:22px}
        .confirm-name{color:var(--text);font-weight:600}
        .confirm-btns{display:flex;gap:10px;justify-content:flex-end}
        .btn-cancel{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px 18px;font-size:14px;font-weight:500;color:var(--muted);cursor:pointer;font-family:'Inter',sans-serif;transition:all .18s}
        .btn-cancel:hover{color:var(--text)}
        .btn-confirm{background:linear-gradient(135deg,var(--blue),var(--cyan));color:#fff;border:none;border-radius:10px;padding:10px 20px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;display:flex;align-items:center;gap:8px;transition:transform .2s,box-shadow .2s;box-shadow:0 4px 16px rgba(37,99,235,0.3)}
        .btn-confirm:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(56,189,248,0.4)}
        .btn-confirm:disabled{opacity:.5;cursor:not-allowed;transform:none}
        .btn-confirm.danger{background:var(--red);box-shadow:none}
        .btn-confirm.danger:hover{opacity:.85;box-shadow:none;transform:none}

        .chatbot-bubble{position:fixed;bottom:28px;right:28px;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--blue),var(--cyan));display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;box-shadow:0 8px 24px rgba(37,99,235,0.4);transition:transform .2s;z-index:50;text-decoration:none}
        .chatbot-bubble:hover{transform:scale(1.08)}

        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }

        @media (max-width: 900px) {
          .stats-row{grid-template-columns:repeat(2,1fr)}
          .header-row{display:none}
          .user-row{grid-template-columns:1fr;gap:10px}
        }
      `}</style>

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
            {icon:'🏠', label:'Panel General',     href:'/admin/dashboard', active:false},
            {icon:'👥', label:'Usuarios y Roles',  href:'/admin/usuarios',  active:true},
            {icon:'📋', label:'Expedientes',        href:'#',                active:false},
            {icon:'💳', label:'Finanzas',           href:'#',                active:false},
            {icon:'📊', label:'Reportes',           href:'#',                active:false},
            {icon:'🔍', label:'Logs de Auditoría', href:'/admin/logs',     active:false},
            {icon:'⚙️', label:'Configuración',      href:'#',                active:false},
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

      <div className="main">
        <div className="topbar">
          <span className="topbar-title">Usuarios y Roles</span>
          <div className="topbar-right">
            <div className="online-dot"><div className="dot"/>En línea</div>
            <div className="notif">🔔</div>
          </div>
        </div>

        <div className="content">
          <div className="page-header">
            <div>
              <div className="page-title">Usuarios del sistema</div>
              <div className="page-sub">Gestiona roles y estado de las cuentas</div>
            </div>
            <button className="btn-nuevo" onClick={() => setModalCrearCuenta(true)}>+ Crear cuenta de paciente</button>
          </div>

          <div className="note-box">
            💡 Usa <strong>+ Crear cuenta de paciente</strong> para invitar a un paciente al portal por correo. Para cuentas de <strong>admin, terapeuta o secretaria</strong>, sigue creándolas desde <strong>Supabase → Authentication</strong>. No puedes modificar tu propia cuenta.
          </div>

          {/* STATS POR ROL */}
          <div className="stats-row">
            {[
              {rol:'admin',      label:'Administradores', color:'var(--purple)'},
              {rol:'terapeuta',  label:'Terapeutas',       color:'var(--cyan)'},
              {rol:'secretaria', label:'Secretarias',      color:'var(--blue-2)'},
              {rol:'paciente',   label:'Pacientes',        color:'var(--green)'},
            ].map(s => (
              <div className="stat-card" key={s.rol}>
                <div>
                  <div className="stat-num">{conteos[s.rol] ?? 0}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
                <div className="stat-dot" style={{background:s.color, color:s.color}} />
              </div>
            ))}
          </div>

          {/* FILTROS */}
          <div className="filters">
            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              <input className="search-input" placeholder="Buscar por nombre o correo..."
                value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            </div>
            {(['todos','admin','terapeuta','secretaria','paciente'] as const).map(f => (
              <button key={f} className={`filter-tab${filtroRol===f?' active':''}`} onClick={() => setFiltroRol(f)}>
                {f==='todos'?'Todos':ROL_LABELS[f]}
              </button>
            ))}
          </div>

          {/* TABLA */}
          <div className="table-card">
            <div className="header-row">
              <div className="th">Usuario</div>
              <div className="th">Rol</div>
              <div className="th">Cambiar rol</div>
              <div className="th">Registro</div>
              <div className="th">Cuenta activa</div>
              <div className="th">Vínculo</div>
            </div>

            {usuariosFiltrados.length === 0 && (
              <div className="empty-state">No hay usuarios que coincidan con el filtro</div>
            )}

            {usuariosFiltrados.map((u, i) => {
              const ini = u.nombre_completo.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()
              const esYo = u.id === currentUserId
              const fecha = new Date(u.created_at).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'})
              return (
                <div className="user-row" key={u.id} style={{animationDelay:`${i*30}ms`}}>
                  <div className="u-left">
                    <div className="u-avatar">{ini}</div>
                    <div>
                      <div className="u-name">{u.nombre_completo}{esYo && <span className="you-tag">Tú</span>}</div>
                      <div className="u-email">{u.email}</div>
                    </div>
                  </div>
                  <div><span className={`badge ${ROL_BADGE[u.rol]}`}>{ROL_LABELS[u.rol]} · {ROL_NIVEL[u.rol]}</span></div>
                  <div>
                    <select
                      className="rol-select"
                      value={u.rol}
                      disabled={esYo}
                      onChange={e => setConfirmCambio({ usuario:u, accion:'rol', nuevoValor:e.target.value })}
                    >
                      <option value="admin">Admin</option>
                      <option value="terapeuta">Terapeuta</option>
                      <option value="secretaria">Secretaria</option>
                      <option value="paciente">Paciente</option>
                    </select>
                  </div>
                  <div className="td-text">{fecha}</div>
                  <div>
                    <div
                      className={`toggle${u.activo?' on':''}${esYo?' disabled':''}`}
                      onClick={() => { if(!esYo) setConfirmCambio({ usuario:u, accion:'estado', nuevoValor: u.activo ? 'false' : 'true' }) }}
                    >
                      <div className="toggle-dot" />
                    </div>
                  </div>
                  <div>
                    {u.rol !== 'paciente' ? (
                      <span className="td-text" style={{opacity:0.4}}>—</span>
                    ) : vinculosMap[u.id] ? (
                      <span className="badge b-green" title={`Vinculado a ${vinculosMap[u.id]}`}>🔗 {vinculosMap[u.id]}</span>
                    ) : (
                      <button className="btn-vincular" onClick={() => { setModalVincular(u); setErrores({}) }}>Vincular paciente</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* MODAL CONFIRMACIÓN */}
      {confirmCambio && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) setConfirmCambio(null) }}>
          <div className="confirm-modal">
            <div className="confirm-title">
              {confirmCambio.accion==='rol' ? '🔄 Cambiar rol' : (confirmCambio.nuevoValor==='true' ? '✅ Activar cuenta' : '⚠️ Desactivar cuenta')}
            </div>
            <p className="confirm-body">
              {confirmCambio.accion==='rol' ? (
                <>¿Cambiar el rol de <span className="confirm-name">{confirmCambio.usuario.nombre_completo}</span> de <strong>{ROL_LABELS[confirmCambio.usuario.rol]}</strong> a <strong>{ROL_LABELS[confirmCambio.nuevoValor]}</strong>? Esto cambiará inmediatamente sus permisos de acceso.</>
              ) : confirmCambio.nuevoValor==='true' ? (
                <>¿Reactivar el acceso de <span className="confirm-name">{confirmCambio.usuario.nombre_completo}</span> al sistema?</>
              ) : (
                <>¿Desactivar la cuenta de <span className="confirm-name">{confirmCambio.usuario.nombre_completo}</span>? No podrá iniciar sesión hasta que la reactives.</>
              )}
            </p>
            <div className="confirm-btns">
              <button className="btn-cancel" onClick={() => setConfirmCambio(null)}>Cancelar</button>
              <button
                className={`btn-confirm${confirmCambio.accion==='estado' && confirmCambio.nuevoValor==='false' ? ' danger':''}`}
                disabled={loading}
                onClick={ejecutarCambio}
              >
                {loading && <div style={{width:14,height:14,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',animation:'spin .7s linear infinite'}}/>}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR CUENTA DE PACIENTE */}
      {modalCrearCuenta && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) { setModalCrearCuenta(false); setErrores({}) } }}>
          <div className="confirm-modal" style={{maxWidth:460, textAlign:'left'}}>
            <div className="confirm-title">📧 Crear cuenta de paciente</div>
            <p className="confirm-body" style={{marginBottom:18}}>
              Se enviará un correo de invitación al paciente para que defina su propia contraseña y acceda al portal.
            </p>
            <form onSubmit={crearCuentaPaciente} noValidate>
              <div className="form-group" style={{marginBottom:14}}>
                <label className="form-label">Correo electrónico *</label>
                <input name="email" type="email" className={`form-input${errores.email?' err':''}`} placeholder="paciente@correo.com" />
                {errores.email && <span className="err-msg">{errores.email}</span>}
              </div>
              <div className="form-group" style={{marginBottom:14}}>
                <label className="form-label">Nombre completo *</label>
                <input name="nombre_completo" className={`form-input${errores.nombre_completo?' err':''}`} placeholder="Ej. Carlos Martínez" />
                {errores.nombre_completo && <span className="err-msg">{errores.nombre_completo}</span>}
              </div>
              <div className="form-group" style={{marginBottom:14}}>
                <label className="form-label">Teléfono (opcional)</label>
                <input name="telefono" type="tel" className="form-input" placeholder="10 dígitos" />
              </div>
              <div className="form-group" style={{marginBottom:18}}>
                <label className="form-label">Vincular con paciente existente (opcional)</label>
                <select name="paciente_id" className="form-select" defaultValue="">
                  <option value="">— No vincular por ahora —</option>
                  {pacientesDisponibles.map(p => (
                    <option key={p.id_paciente} value={p.id_paciente}>{p.nombre_completo} · {p.curp}</option>
                  ))}
                </select>
                {pacientesDisponibles.length === 0 && (
                  <span style={{fontSize:11, color:'var(--muted)', marginTop:4, display:'block'}}>No hay pacientes activos sin cuenta vinculada</span>
                )}
              </div>
              <div className="confirm-btns">
                <button type="button" className="btn-cancel" onClick={() => { setModalCrearCuenta(false); setErrores({}) }}>Cancelar</button>
                <button type="submit" className="btn-confirm" disabled={loading}>
                  {loading && <div style={{width:14,height:14,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',animation:'spin .7s linear infinite'}}/>}
                  Enviar invitación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VINCULAR PACIENTE EXISTENTE */}
      {modalVincular && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) { setModalVincular(null); setErrores({}) } }}>
          <div className="confirm-modal" style={{maxWidth:420, textAlign:'left'}}>
            <div className="confirm-title">🔗 Vincular paciente</div>
            <p className="confirm-body" style={{marginBottom:18}}>
              Selecciona el registro clínico que corresponde a la cuenta de <span className="confirm-name">{modalVincular.nombre_completo}</span> ({modalVincular.email}).
            </p>
            <form onSubmit={vincularPaciente} noValidate>
              <div className="form-group" style={{marginBottom:18}}>
                <label className="form-label">Paciente *</label>
                <select name="paciente_id" className={`form-select${errores.paciente_id?' err':''}`} defaultValue="">
                  <option value="">— Selecciona un paciente —</option>
                  {pacientesDisponibles.map(p => (
                    <option key={p.id_paciente} value={p.id_paciente}>{p.nombre_completo} · {p.curp}</option>
                  ))}
                </select>
                {errores.paciente_id && <span className="err-msg">{errores.paciente_id}</span>}
                {pacientesDisponibles.length === 0 && (
                  <span style={{fontSize:11, color:'var(--muted)', marginTop:4, display:'block'}}>No hay pacientes activos sin cuenta vinculada</span>
                )}
              </div>
              <div className="confirm-btns">
                <button type="button" className="btn-cancel" onClick={() => { setModalVincular(null); setErrores({}) }}>Cancelar</button>
                <button type="submit" className="btn-confirm" disabled={loading || pacientesDisponibles.length===0}>
                  {loading && <div style={{width:14,height:14,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',animation:'spin .7s linear infinite'}}/>}
                  Vincular
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