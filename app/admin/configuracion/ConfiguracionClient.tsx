'use client'

/**
 * ConfiguracionClient.tsx
 * Admin — Panel de configuración del sistema
 *
 * DISEÑO: Estética de panel de sistema operativo / ajustes avanzados.
 * Filas con borde izquierdo de color, tipografía monoespaciada para
 * valores técnicos, secciones colapsables. Visualmente distinto del
 * resto del dashboard para comunicar "zona de ajustes" sin ambigüedad.
 *
 * SEGURIDAD: Solo accesible para admin. Cambios de datos de la clínica
 * y del perfil del admin van a endpoints PATCH correspondientes.
 * Las secciones de SMTP e integraciones son informativas (configuración
 * en Supabase Dashboard / Vercel).
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface AdminProfile {
  nombre_completo?: string; email?: string; telefono?: string; rol?: string
}
interface Stats {
  totalPacientes?: number | null; totalCitas?: number | null
  totalPagos?: number | null; totalLogs?: number | null
}
interface Props { adminProfile: AdminProfile; stats: Stats }

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

// ── SECCIÓN COLAPSABLE ───────────────────────────────────────
function Seccion({ id, icono, titulo, subtitulo, color, children, defaultOpen=false }:
  { id:string; icono:string; titulo:string; subtitulo:string; color:string; children:React.ReactNode; defaultOpen?:boolean }) {
  const [abierta, setAbierta] = useState(defaultOpen)
  return (
    <div style={{borderLeft:`3px solid ${color}`,marginBottom:2,background:'rgba(255,255,255,0.02)',transition:'background .2s'}}>
      <button
        onClick={() => setAbierta(a=>!a)}
        style={{width:'100%',display:'flex',alignItems:'center',gap:16,padding:'18px 24px',background:'none',border:'none',cursor:'pointer',fontFamily:'Inter,sans-serif',textAlign:'left',transition:'background .15s'}}
        onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.03)')}
        onMouseLeave={e=>(e.currentTarget.style.background='none')}
      >
        <div style={{width:36,height:36,borderRadius:8,background:`${color}18`,border:`1px solid ${color}30`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{icono}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:600,color:'#E7EDF7'}}>{titulo}</div>
          <div style={{fontSize:12,color:'#8C9BB5',marginTop:2}}>{subtitulo}</div>
        </div>
        <div style={{fontSize:14,color:'#8C9BB5',transform:abierta?'rotate(180deg)':'none',transition:'transform .2s',flexShrink:0}}>▾</div>
      </button>
      {abierta && (
        <div style={{padding:'0 24px 24px 76px',animation:'expandir .2s ease'}}>
          {children}
        </div>
      )}
    </div>
  )
}

// ── FILA DE AJUSTE ───────────────────────────────────────────
function FilaAjuste({ label, valor, mono=false, badge, children }:
  { label:string; valor?:string; mono?:boolean; badge?:{txt:string,color:string}; children?:React.ReactNode }) {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0',borderBottom:'1px solid rgba(255,255,255,0.06)',gap:16,flexWrap:'wrap'}}>
      <div style={{fontSize:13,color:'#8C9BB5',minWidth:180}}>{label}</div>
      <div style={{display:'flex',alignItems:'center',gap:12,flex:1,justifyContent:'flex-end',flexWrap:'wrap'}}>
        {valor && <span style={{fontSize:13,color:'#E7EDF7',fontFamily:mono?'JetBrains Mono,Fira Code,monospace':'Inter,sans-serif',background:mono?'rgba(56,189,248,0.08)':'none',padding:mono?'2px 8px':'0',borderRadius:mono?6:0}}>{valor}</span>}
        {badge && <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:100,background:`${badge.color}18`,color:badge.color}}>{badge.txt}</span>}
        {children}
      </div>
    </div>
  )
}

// ── CAMPO EDITABLE ───────────────────────────────────────────
function CampoEditable({ label, name, defaultValue, tipo='text', placeholder }:
  { label:string; name:string; defaultValue?:string; tipo?:string; placeholder?:string }) {
  return (
    <div style={{marginBottom:14}}>
      <label style={{display:'block',fontSize:11,fontWeight:600,color:'#8C9BB5',letterSpacing:'0.07em',textTransform:'uppercase',marginBottom:7}}>{label}</label>
      <input name={name} type={tipo} defaultValue={defaultValue??''} placeholder={placeholder}
        style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1.5px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'10px 12px',fontSize:13,fontFamily:'Inter,sans-serif',color:'#E7EDF7',outline:'none',transition:'border-color .2s'}}
        onFocus={e=>(e.target.style.borderColor='#38BDF8')}
        onBlur={e=>(e.target.style.borderColor='rgba(255,255,255,0.1)')}
      />
    </div>
  )
}

// ── COMPONENTE PRINCIPAL ─────────────────────────────────────
export default function ConfiguracionClient({ adminProfile, stats }: Props) {
  const [loading, setLoading] = useState(false)
  const [loadingRespaldo, setLoadingRespaldo] = useState<'json'|'excel'|null>(null)
  const [toast, setToast] = useState<{msg:string;type:'success'|'error'}|null>(null)

  // ── DESCARGAR RESPALDO ───────────────────────────────────
  async function descargarRespaldo(formato: 'json'|'excel') {
    setLoadingRespaldo(formato)
    try {
      const res = await fetch('/api/admin/respaldo')
      if (!res.ok) {
        const err = await res.json()
        setToast({ msg: err.error ?? 'Error al generar el respaldo', type:'error' })
        return
      }

      const datos = await res.json()
      const fecha = new Date().toISOString().split('T')[0]

      if (formato === 'json') {
        // ── Descarga JSON ──────────────────────────────────
        const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `rehabcontrol-respaldo-${fecha}.json`
        document.body.appendChild(a); a.click()
        document.body.removeChild(a); URL.revokeObjectURL(url)
        setToast({ msg: 'Respaldo JSON descargado correctamente', type:'success' })

      } else {
        // ── Descarga Excel (SheetJS) ───────────────────────
        const XLSX = await import('xlsx')
        const wb = XLSX.utils.book_new()

        // Una hoja por tabla
        const hojas: Record<string, any[]> = {
          'Pacientes':          datos.datos.pacientes,
          'Usuarios':           datos.datos.usuarios,
          'Citas':              datos.datos.citas,
          'Pagos':              datos.datos.pagos,
          'Expedientes':        datos.datos.expedientes,
          'Progreso Sesiones':  datos.datos.progreso_sesiones,
          'Contratos':          datos.datos.contratos_paciente,
          'Paquetes':           datos.datos.paquetes,
          'Audit Logs':         datos.datos.audit_logs,
        }

        Object.entries(hojas).forEach(([nombre, filas]) => {
          if (!filas || filas.length === 0) {
            // Hoja vacía con encabezado
            const ws = XLSX.utils.aoa_to_sheet([[`Sin datos en ${nombre}`]])
            XLSX.utils.book_append_sheet(wb, ws, nombre)
            return
          }
          const ws = XLSX.utils.json_to_sheet(filas)
          // Ancho automático de columnas
          const cols = Object.keys(filas[0]).map(k => ({ wch: Math.max(k.length, 14) }))
          ws['!cols'] = cols
          XLSX.utils.book_append_sheet(wb, ws, nombre)
        })

        // Hoja de resumen
        const resumenRows = [
          ['Campo', 'Valor'],
          ['Sistema', 'RehabControl v2.1'],
          ['Fecha de generación', new Date().toLocaleString('es-MX')],
          ['Total pacientes', datos.resumen.total_pacientes],
          ['Total usuarios', datos.resumen.total_usuarios],
          ['Total citas', datos.resumen.total_citas],
          ['Total pagos', datos.resumen.total_pagos],
          ['Total expedientes', datos.resumen.total_expedientes],
          ['Total logs', datos.resumen.total_logs],
        ]
        const wsResumen = XLSX.utils.aoa_to_sheet(resumenRows)
        wsResumen['!cols'] = [{ wch: 24 }, { wch: 30 }]
        XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')

        XLSX.writeFile(wb, `rehabcontrol-respaldo-${fecha}.xlsx`)
        setToast({ msg: 'Respaldo Excel descargado correctamente', type:'success' })
      }

    } catch (err) {
      console.error(err)
      setToast({ msg: 'Error al generar el respaldo', type:'error' })
    } finally {
      setLoadingRespaldo(null)
    }
  }

  // ── GUARDAR DATOS CLÍNICA ────────────────────────────────
  async function guardarClinica(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const body: Record<string,string> = {}
    fd.forEach((v,k) => { body[k] = v as string })

    setLoading(true)
    const res = await fetch('/api/admin/configuracion', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'clinica', ...body }),
    })
    setLoading(false)
    setToast(res.ok
      ? { msg: 'Datos de la clínica actualizados', type:'success' }
      : { msg: 'Error al guardar los datos', type:'error' }
    )
  }

  // ── GUARDAR PERFIL ADMIN ─────────────────────────────────
  async function guardarPerfil(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const body: Record<string,string> = {}
    fd.forEach((v,k) => { body[k] = v as string })

    setLoading(true)
    const res = await fetch('/api/admin/configuracion', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'perfil', ...body }),
    })
    setLoading(false)
    setToast(res.ok
      ? { msg: 'Perfil actualizado correctamente', type:'success' }
      : { msg: 'Error al actualizar el perfil', type:'error' }
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');
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
        .page-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;flex-wrap:wrap;gap:12px}
        .page-title{font-size:26px;font-weight:800;color:var(--text);letter-spacing:-0.015em}
        .page-sub{font-size:14px;color:var(--muted);margin-top:4px}

        /* PANEL DE SECCIONES */
        .secciones-panel{background:var(--card);border:1px solid var(--card-border);border-radius:16px;overflow:hidden}
        .panel-top{padding:16px 24px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px}
        .panel-top-title{font-size:12px;font-weight:700;color:var(--muted);letter-spacing:0.1em;text-transform:uppercase}

        /* GRID INFO SISTEMA */
        .sistema-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px}
        .sistema-item{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:12px 14px;text-align:center}
        .sistema-num{font-size:22px;font-weight:800;color:var(--cyan);font-variant-numeric:tabular-nums}
        .sistema-label{font-size:10px;color:var(--muted);margin-top:3px;font-weight:500}

        /* BOTONES */
        .btn-guardar{background:linear-gradient(135deg,var(--blue),var(--cyan));color:#fff;border:none;border-radius:9px;padding:10px 20px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;display:flex;align-items:center;gap:8px;transition:transform .2s,box-shadow .2s;box-shadow:0 4px 14px rgba(37,99,235,0.28)}
        .btn-guardar:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 18px rgba(56,189,248,0.35)}
        .btn-guardar:disabled{opacity:.5;cursor:not-allowed;transform:none}
        .btn-externo{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 14px;font-size:12px;font-weight:500;color:var(--muted);cursor:pointer;font-family:'Inter',sans-serif;text-decoration:none;display:inline-flex;align-items:center;gap:6px;transition:all .18s}
        .btn-externo:hover{color:var(--text);border-color:var(--cyan)}
        .spinner{width:13px;height:13px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;animation:spin .7s linear infinite}

        /* INFO BOX */
        .info-box{background:rgba(56,189,248,0.06);border:1px solid rgba(56,189,248,0.18);border-radius:10px;padding:12px 14px;font-size:12px;color:var(--muted);line-height:1.6;margin-top:12px}
        .info-box strong{color:var(--cyan)}
        .warn-box{background:rgba(245,180,0,0.06);border:1px solid rgba(245,180,0,0.2);border-radius:10px;padding:12px 14px;font-size:12px;color:var(--muted);line-height:1.6}
        .warn-box strong{color:var(--amber)}

        /* VERSION BADGE */
        .ver-badge{font-family:'JetBrains Mono','Fira Code',monospace;font-size:11px;background:rgba(56,189,248,0.08);color:var(--cyan);padding:3px 8px;border-radius:5px;border:1px solid rgba(56,189,248,0.15)}

        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes expandir{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}

        @media(max-width:900px){.sistema-grid{grid-template-columns:repeat(2,1fr)}}
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
            {icon:'💳', label:'Finanzas',           href:'/admin/finanzas',       active:false},
            {icon:'📊', label:'Reportes',           href:'/admin/reportes',       active:false},
            {icon:'🔍', label:'Logs de Auditoría', href:'/admin/logs',           active:false},
            {icon:'⚙️', label:'Configuración',      href:'/admin/configuracion',  active:true},
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
          <span className="topbar-title">Configuración del sistema</span>
          <div className="online-dot"><div className="dot"/>En línea</div>
        </div>

        <div className="content">
          <div className="page-header">
            <div>
              <div className="page-title">Configuración</div>
              <div className="page-sub">Ajustes del sistema · solo accesible para administradores</div>
            </div>
            <span className="ver-badge">RehabControl v2.1.0</span>
          </div>

          <div className="secciones-panel">
            <div className="panel-top">
              <span style={{fontSize:14}}>⚙️</span>
              <span className="panel-top-title">Ajustes del sistema</span>
            </div>

            {/* ── 1. DATOS DE LA CLÍNICA ── */}
            <Seccion id="clinica" icono="🏥" titulo="Datos de la clínica" subtitulo="Nombre, dirección, teléfono y horario de atención" color="#38BDF8" defaultOpen>
              <form onSubmit={guardarClinica}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                  <CampoEditable label="Nombre de la clínica" name="nombre_clinica" defaultValue="RehabControl" placeholder="Ej. Clínica de Rehabilitación RC" />
                  <CampoEditable label="Teléfono de contacto" name="telefono_clinica" placeholder="10 dígitos" tipo="tel" />
                </div>
                <CampoEditable label="Dirección" name="direccion_clinica" placeholder="Calle, número, colonia, ciudad" />
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                  <CampoEditable label="Horario de atención" name="horario" placeholder="Lun–Vie 8:00–18:00" />
                  <CampoEditable label="Correo de contacto" name="email_clinica" tipo="email" placeholder="contacto@clinica.com" />
                </div>
                <div style={{display:'flex',justifyContent:'flex-end',paddingTop:8,borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                  <button type="submit" className="btn-guardar" disabled={loading}>
                    {loading && <span className="spinner"/>}
                    Guardar cambios
                  </button>
                </div>
              </form>
            </Seccion>

            {/* ── 2. PERFIL DEL ADMINISTRADOR ── */}
            <Seccion id="perfil" icono="👤" titulo="Perfil del administrador" subtitulo="Nombre de contacto y teléfono del admin activo" color="#A78BFA">
              <form onSubmit={guardarPerfil}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                  <CampoEditable label="Nombre completo" name="nombre_completo" defaultValue={adminProfile.nombre_completo} />
                  <CampoEditable label="Teléfono" name="telefono" defaultValue={adminProfile.telefono} tipo="tel" />
                </div>
                <div className="info-box">
                  📧 Correo actual: <strong>{adminProfile.email ?? '—'}</strong>. El correo no puede cambiarse desde aquí — usa <strong>Supabase → Authentication</strong> para modificarlo.
                </div>
                <div style={{display:'flex',justifyContent:'flex-end',paddingTop:12,marginTop:12,borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                  <button type="submit" className="btn-guardar" disabled={loading}>
                    {loading && <span className="spinner"/>}
                    Guardar perfil
                  </button>
                </div>
              </form>
            </Seccion>

            {/* ── 3. SEGURIDAD Y ACCESOS ── */}
            <Seccion id="seguridad" icono="🔒" titulo="Seguridad y accesos" subtitulo="RLS, roles, sesiones y protección de datos" color="#34D399">
              <FilaAjuste label="Row Level Security (RLS)" valor="Habilitado en todas las tablas" badge={{txt:'Activo',color:'#34D399'}} />
              <FilaAjuste label="Autenticación" valor="Supabase Auth · JWT + cookies HttpOnly" mono />
              <FilaAjuste label="Roles del sistema" valor="admin · secretaria · terapeuta · paciente" mono />
              <FilaAjuste label="Verificación de cuenta activa" valor="Habilitada en /api/auth/login" badge={{txt:'Activo',color:'#34D399'}} />
              <FilaAjuste label="Audit log (append-only)" valor="audit_logs · sin borrado permitido" badge={{txt:'Activo',color:'#34D399'}} />
              <FilaAjuste label="Service Role Key" valor="Configurada en variables de entorno" badge={{txt:'Server-only',color:'#A78BFA'}} />
              <div className="info-box" style={{marginTop:14}}>
                🛡 Para rotar la <strong>service_role key</strong> o cambiar políticas RLS, hazlo desde <strong>Supabase Dashboard → Authentication / Database</strong>. Después de rotar la key, actualiza la variable <strong>SUPABASE_SERVICE_ROLE_KEY</strong> en Vercel.
              </div>
            </Seccion>

            {/* ── 4. CORREO / SMTP ── */}
            <Seccion id="smtp" icono="📧" titulo="Correo y notificaciones" subtitulo="SMTP para invitaciones y recuperación de contraseña" color="#F5B400">
              <FilaAjuste label="Proveedor SMTP actual" valor="Supabase (SMTP gratuito)" badge={{txt:'Límite bajo',color:'#F5B400'}} />
              <FilaAjuste label="Correos de invitación" valor="inviteUserByEmail() · /api/admin/crear-cuenta-paciente" mono />
              <FilaAjuste label="Recuperación de contraseña" valor="auth.resetPasswordForEmail()" mono />
              <div className="warn-box" style={{marginTop:14}}>
                ⚠️ El SMTP gratuito de Supabase tiene un <strong>límite de ~3 correos/hora</strong>. Para producción real, configura un proveedor propio (Resend, SendGrid, Postmark) desde <strong>Supabase → Project Settings → Auth → SMTP</strong>.
              </div>
              <div style={{display:'flex',gap:10,marginTop:14,flexWrap:'wrap'}}>
                <a href="https://resend.com" target="_blank" rel="noopener" className="btn-externo">↗ Resend (recomendado)</a>
                <a href="https://app.supabase.com" target="_blank" rel="noopener" className="btn-externo">↗ Supabase SMTP Settings</a>
              </div>
            </Seccion>

            {/* ── 5. DESPLIEGUE E INFRAESTRUCTURA ── */}
            <Seccion id="infra" icono="🚀" titulo="Despliegue e infraestructura" subtitulo="Vercel, variables de entorno y dominio" color="#F25555">
              <FilaAjuste label="Hosting" valor="Vercel · Auto-deploy desde main" badge={{txt:'Activo',color:'#34D399'}} />
              <FilaAjuste label="URL de producción" valor="rehabcontrol.vercel.app" mono />
              <FilaAjuste label="Base de datos" valor="Supabase Postgres (free tier)" mono />
              <FilaAjuste label="Framework" valor="Next.js 15 · App Router · TypeScript" mono />
              <FilaAjuste label="NEXT_PUBLIC_OFFLINE_DEV" valor="Solo en .env.local (desarrollo)" badge={{txt:'Local only',color:'#8C9BB5'}} />
              <div style={{display:'flex',gap:10,marginTop:14,flexWrap:'wrap'}}>
                <a href="https://vercel.com/dashboard" target="_blank" rel="noopener" className="btn-externo">↗ Vercel Dashboard</a>
                <a href="https://app.supabase.com" target="_blank" rel="noopener" className="btn-externo">↗ Supabase Dashboard</a>
              </div>
            </Seccion>

            {/* ── 6. MANTENIMIENTO DEL SISTEMA ── */}
            <Seccion id="mantenimiento" icono="🔧" titulo="Mantenimiento del sistema" subtitulo="Estado de la base de datos y registros del sistema" color="#8C9BB5">
              <div style={{fontSize:12,color:'var(--muted)',fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:12}}>Estado actual de la base de datos</div>
              <div className="sistema-grid">
                {[
                  {label:'Pacientes', num:stats.totalPacientes??0, icon:'👥'},
                  {label:'Citas',     num:stats.totalCitas??0,     icon:'📅'},
                  {label:'Pagos',     num:stats.totalPagos??0,     icon:'💳'},
                  {label:'Logs',      num:stats.totalLogs??0,      icon:'📋'},
                ].map(s => (
                  <div key={s.label} className="sistema-item">
                    <div style={{fontSize:16,marginBottom:4}}>{s.icon}</div>
                    <div className="sistema-num">{Number(s.num).toLocaleString('es-MX')}</div>
                    <div className="sistema-label">{s.label}</div>
                  </div>
                ))}
              </div>
              <FilaAjuste label="Audit logs" valor="Tabla append-only · nunca se borran" badge={{txt:'Inmutables',color:'#34D399'}} />
              <FilaAjuste label="Respaldo automático" valor="Supabase realiza backups diarios (free tier: 7 días)" />
              <FilaAjuste label="Respaldo manual" valor="Supabase → Project Settings → Backups" />

              {/* BOTONES DE RESPALDO */}
              <div style={{marginTop:20,padding:'18px',background:'rgba(56,189,248,0.04)',border:'1px solid rgba(56,189,248,0.15)',borderRadius:12}}>
                <div style={{fontSize:13,fontWeight:600,color:'#E7EDF7',marginBottom:6}}>⬇ Respaldo completo del sistema</div>
                <div style={{fontSize:12,color:'#8C9BB5',lineHeight:1.6,marginBottom:16}}>
                  Descarga todos los datos del sistema: pacientes, usuarios, citas, pagos, expedientes, progreso, contratos y audit logs. No incluye contraseñas. Cada descarga queda registrada en el audit log.
                </div>
                <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                  {/* JSON */}
                  <button
                    onClick={() => descargarRespaldo('json')}
                    disabled={loadingRespaldo !== null}
                    style={{
                      background:'linear-gradient(135deg,#2563EB,#38BDF8)',
                      color:'#fff',border:'none',borderRadius:10,padding:'11px 20px',
                      fontSize:13,fontWeight:600,cursor:loadingRespaldo?'not-allowed':'pointer',
                      fontFamily:'Inter,sans-serif',display:'flex',alignItems:'center',gap:8,
                      boxShadow:'0 4px 14px rgba(37,99,235,0.3)',transition:'transform .2s',
                      opacity:loadingRespaldo&&loadingRespaldo!=='json'?.5:1,
                    }}
                  >
                    {loadingRespaldo==='json'
                      ? <><span style={{width:13,height:13,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',animation:'spin .7s linear infinite',display:'inline-block'}}/> Generando…</>
                      : <><span style={{fontFamily:'JetBrains Mono,monospace',fontSize:11,background:'rgba(255,255,255,0.2)',padding:'1px 6px',borderRadius:4}}>{'{}'}</span> Descargar JSON</>
                    }
                  </button>

                  {/* EXCEL */}
                  <button
                    onClick={() => descargarRespaldo('excel')}
                    disabled={loadingRespaldo !== null}
                    style={{
                      background:'linear-gradient(135deg,#1a7d3f,#34D399)',
                      color:'#fff',border:'none',borderRadius:10,padding:'11px 20px',
                      fontSize:13,fontWeight:600,cursor:loadingRespaldo?'not-allowed':'pointer',
                      fontFamily:'Inter,sans-serif',display:'flex',alignItems:'center',gap:8,
                      boxShadow:'0 4px 14px rgba(52,211,153,0.25)',transition:'transform .2s',
                      opacity:loadingRespaldo&&loadingRespaldo!=='excel'?.5:1,
                    }}
                  >
                    {loadingRespaldo==='excel'
                      ? <><span style={{width:13,height:13,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',animation:'spin .7s linear infinite',display:'inline-block'}}/> Generando…</>
                      : <><span style={{fontSize:14}}>📊</span> Descargar Excel</>
                    }
                  </button>
                </div>

                <div style={{marginTop:12,display:'flex',gap:16,flexWrap:'wrap'}}>
                  <div style={{fontSize:11,color:'#8C9BB5',display:'flex',alignItems:'center',gap:5}}>
                    <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,background:'rgba(56,189,248,0.1)',color:'#38BDF8',padding:'1px 5px',borderRadius:3}}>.json</span>
                    Estructura completa · ideal para reimportar
                  </div>
                  <div style={{fontSize:11,color:'#8C9BB5',display:'flex',alignItems:'center',gap:5}}>
                    <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,background:'rgba(52,211,153,0.1)',color:'#34D399',padding:'1px 5px',borderRadius:3}}>.xlsx</span>
                    9 hojas · compatible con Excel y Google Sheets
                  </div>
                </div>
              </div>

              <div className="info-box" style={{marginTop:12}}>
                💡 Para un respaldo completo de la base de datos (incluyendo estructura SQL), usa <strong>Supabase → SQL Editor</strong> con un <strong>pg_dump</strong>, o descarga tablas individuales como CSV desde <strong>Table Editor → Export</strong>.
              </div>
            </Seccion>

          </div>{/* fin secciones-panel */}
        </div>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}
