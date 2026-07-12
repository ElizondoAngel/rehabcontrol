'use client'

import { useState } from 'react'
import Sidebar, { MenuButton } from '@/app/components/Sidebar'
import TopbarActions from '@/app/components/TopbarActions'

interface Opinion { id_opinion: number; calificacion: number; comentario: string; estado: string; created_at: string }
interface Props {
  profile: any
  terapeutaNombre: string | null
  opinionesPrevias: Opinion[]
  userId: string
}

const ESTADO_LABEL: Record<string,string> = { pendiente: 'En revisión', aprobada: 'Publicada', rechazada: 'No publicada' }
const ESTADO_CLASS: Record<string,string> = { pendiente: 'b-amber', aprobada: 'b-green', rechazada: 'b-gray' }

export default function OpinionesClient({ profile, terapeutaNombre, opinionesPrevias, userId }: Props) {
  const [calificacion, setCalificacion] = useState(5)
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [toast, setToast] = useState<{msg:string;type:'success'|'error'}|null>(null)
  const [historial, setHistorial] = useState<Opinion[]>(opinionesPrevias)

  async function enviarOpinion(e: React.FormEvent) {
    e.preventDefault()
    if (comentario.trim().length < 10) {
      setToast({ msg: 'Cuéntanos un poco más — mínimo 10 caracteres', type: 'error' })
      return
    }
    setEnviando(true)
    const res = await fetch('/api/opiniones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ calificacion, comentario: comentario.trim() }),
    })
    const data = await res.json()
    setEnviando(false)

    if (!res.ok) {
      setToast({ msg: data.error ?? 'No se pudo enviar tu opinión', type: 'error' })
      return
    }
    setHistorial(prev => [data.opinion, ...prev])
    setComentario('')
    setCalificacion(5)
    setToast({ msg: 'Gracias por tu opinión — quedará publicada en cuanto la revisemos', type: 'success' })
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
        .content{flex:1;overflow-y:auto;padding:28px 32px 40px}
        .page-title{font-size:26px;font-weight:800;color:var(--text);margin-bottom:4px}
        .page-sub{font-size:14px;color:var(--muted);margin-bottom:24px}

        .form-card{background:var(--card);border:1px solid var(--card-border);border-radius:16px;padding:24px 26px;margin-bottom:28px}
        .form-card-title{font-size:16px;font-weight:700;color:var(--text);margin-bottom:4px}
        .form-card-sub{font-size:13px;color:var(--muted);margin-bottom:20px}
        .stars{display:flex;gap:6px;margin-bottom:18px}
        .star-btn{background:none;border:none;font-size:30px;cursor:pointer;line-height:1;padding:0;color:var(--surface2);transition:transform .1s}
        .star-btn.on{color:var(--amber)}
        .star-btn:hover{transform:scale(1.1)}
        textarea{width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px 14px;font-size:14px;font-family:'Inter',sans-serif;color:var(--text);outline:none;resize:vertical;min-height:90px}
        textarea:focus{border-color:var(--cyan)}
        .char-count{font-size:11.5px;color:var(--muted);margin-top:6px;text-align:right}
        .btn-enviar{background:linear-gradient(135deg,var(--blue),var(--cyan));color:#fff;border:none;border-radius:10px;padding:11px 22px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;margin-top:14px}
        .btn-enviar:disabled{opacity:0.5;cursor:not-allowed}

        .seccion-titulo{font-size:15px;font-weight:700;color:var(--text);margin-bottom:14px}
        .op-card{background:var(--card);border:1px solid var(--card-border);border-radius:12px;padding:14px 16px;margin-bottom:10px}
        .op-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;flex-wrap:wrap;gap:8px}
        .op-stars{color:var(--amber);font-size:13px;letter-spacing:2px}
        .op-texto{font-size:13.5px;color:var(--text);line-height:1.5}
        .op-fecha{font-size:11.5px;color:var(--muted);margin-top:6px}
        .badge{font-size:11px;font-weight:600;padding:3px 10px;border-radius:100px}
        .b-amber{background:rgba(245,180,0,0.15);color:var(--amber)}
        .b-green{background:rgba(52,211,153,0.15);color:var(--green)}
        .b-gray{background:var(--surface2);color:var(--muted)}
        .empty{text-align:center;padding:32px 0;color:var(--muted);font-size:13px}

        .toast{position:fixed;bottom:28px;right:28px;z-index:200;background:var(--card);border:1px solid var(--card-border);border-radius:12px;padding:14px 18px;font-size:13.5px;display:flex;align-items:center;gap:12px;max-width:340px}
      `}</style>

      <Sidebar
        rol="paciente"
        nombre={profile?.nombre_completo ?? ''}
        subRol="Solo su información"
        icono="👤"
        items={[
          { icon:'🏠', label:'Mi Inicio',   href:'/paciente/dashboard', active:false },
          { icon:'📅', label:'Mis Citas',   href:'/paciente/citas',     active:false },
          { icon:'🏋️', label:'Mis Ejercicios', href:'/paciente/ejercicios', active:false },
          { icon:'📈', label:'Mi Progreso', href:'/paciente/progreso',  active:false },
          { icon:'💳', label:'Mis Pagos',   href:'/paciente/pagos',     active:false },
          { icon:'⭐', label:'Mi Opinión',  href:'/paciente/opiniones', active:true  },
          { icon:'⚙️', label:'Mis Datos',   href:'/paciente/perfil',    active:false },
        ]}
      />

      <div className="main">
        <div className="topbar">
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <MenuButton />
            <span className="topbar-title">Mi Opinión</span>
          </div>
          <div className="topbar-right">
            <div className="online-dot"><div className="dot"/> En línea</div>
            <TopbarActions userId={userId} rol="paciente" nombre={profile?.nombre_completo} />
          </div>
        </div>

        <div className="content">
          <div className="page-title">Cuéntanos tu experiencia</div>
          <div className="page-sub">Tu opinión ayuda a otros pacientes y a mejorar el servicio</div>

          <div className="form-card">
            <div className="form-card-title">
              Califica tu experiencia{terapeutaNombre ? ` con ${terapeutaNombre}` : ''}
            </div>
            <div className="form-card-sub">
              Antes de publicarse, tu opinión pasa por una revisión de la clínica.
            </div>
            <form onSubmit={enviarOpinion}>
              <div className="stars">
                {[1,2,3,4,5].map(n => (
                  <button
                    key={n}
                    type="button"
                    className={`star-btn${n <= calificacion ? ' on' : ''}`}
                    onClick={() => setCalificacion(n)}
                    aria-label={`${n} estrellas`}
                  >★</button>
                ))}
              </div>
              <textarea
                value={comentario}
                onChange={e => setComentario(e.target.value.slice(0, 1000))}
                placeholder="¿Cómo fue tu experiencia con el servicio y tu terapeuta?"
                maxLength={1000}
              />
              <div className="char-count">{comentario.length}/1000</div>
              <button type="submit" className="btn-enviar" disabled={enviando}>
                {enviando ? 'Enviando…' : 'Enviar opinión'}
              </button>
            </form>
          </div>

          <div className="seccion-titulo">Tus opiniones anteriores</div>
          {historial.length === 0 ? (
            <div className="empty">Aún no has dejado ninguna opinión.</div>
          ) : (
            historial.map(o => (
              <div className="op-card" key={o.id_opinion}>
                <div className="op-header">
                  <span className="op-stars">{'★'.repeat(o.calificacion)}{'☆'.repeat(5 - o.calificacion)}</span>
                  <span className={`badge ${ESTADO_CLASS[o.estado] ?? 'b-gray'}`}>{ESTADO_LABEL[o.estado] ?? o.estado}</span>
                </div>
                <div className="op-texto">{o.comentario}</div>
                <div className="op-fecha">{new Date(o.created_at).toLocaleDateString('es-MX', { day:'numeric', month:'long', year:'numeric' })}</div>
              </div>
            ))
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
