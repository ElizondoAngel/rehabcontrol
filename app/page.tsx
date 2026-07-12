'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'

// ── DATOS NUEVOS ─────────────────────────────────────────────
const terapeutas = [
  {
    ini: "MA", nombre: "Lic. María Alejandra Ruiz Vega", titulo: "Fisioterapeuta Ortopédica",
    color: "#2563EB", egreso: "Universidad Nacional Autónoma de México · 2009",
    diplomados: ["Terapia Manual Ortopédica — UNAM", "Punción Seca Nivel I y II", "Rehabilitación Deportiva Avanzada"],
    experiencia: "15 años en rehabilitación musculoesquelética",
    especialidades: ["Rehabilitación post-quirúrgica", "Lesiones de columna", "Recuperación de fractura"],
  },
  {
    ini: "CR", nombre: "Lic. Carlos Roberto Mendoza", titulo: "Fisioterapeuta Deportivo",
    color: "#0F6E56", egreso: "Instituto Politécnico Nacional · 2013",
    diplomados: ["Fisioterapia Deportiva — CONADE", "Readaptación Funcional al Deporte", "Kinesiotaping Avanzado"],
    experiencia: "11 años con deportistas y atletas recreativos",
    especialidades: ["Lesiones deportivas", "Readaptación funcional", "Vendaje neuromuscular"],
  },
  {
    ini: "LP", nombre: "Lic. Laura Patricia Sánchez", titulo: "Fisioterapeuta Geriátrica",
    color: "#7F77DD", egreso: "Universidad Iberoamericana · 2011",
    diplomados: ["Gerontología Clínica — UNAM", "Prevención de Caídas en Adulto Mayor", "Ejercicio Terapéutico Avanzado"],
    experiencia: "13 años en atención al adulto mayor",
    especialidades: ["Equilibrio y marcha", "Prevención de caídas", "Mantenimiento funcional"],
  },
  {
    ini: "JE", nombre: "Lic. José Ernesto Vargas", titulo: "Terapeuta Manual y Postural",
    color: "#D85A30", egreso: "Universidad La Salle · 2015",
    diplomados: ["Osteopatía Estructural — Escuela Mexicana de Osteopatía", "Reeducación Postural Global (RPG)", "Electroterapia Clínica"],
    experiencia: "9 años en terapia manual y dolor crónico",
    especialidades: ["Terapia manual", "Corrección postural", "Punción seca", "Electroterapia"],
  },
]

const instalaciones = [
  { icon: "🏥", nombre: "Área de fisioterapia general", desc: "4 cubículos individuales equipados con camillas regulables, privacidad garantizada para cada paciente." },
  { icon: "⚡", nombre: "Sala de electroterapia", desc: "Equipos de TENS, electroestimulación muscular, ultrasonido terapéutico y láser de baja potencia." },
  { icon: "💪", nombre: "Gimnasio de rehabilitación", desc: "Área de ejercicio terapéutico con ligas, mancuernas, barras paralelas, escalera de dedos y bandas." },
  { icon: "🔬", nombre: "Área de valoración", desc: "Espacio dedicado a evaluaciones funcionales, goniometría y pruebas de fuerza muscular." },
]

const paquetes = [
  { nombre: "Paquete Básico",    sesiones: 5,  precio: 1600, desc: "Ideal para lesiones simples o recuperaciones cortas.", popular: false },
  { nombre: "Paquete Estándar", sesiones: 10, precio: 3000, desc: "El más elegido. Mayor continuidad de tratamiento.",    popular: true  },
  { nombre: "Paquete Premium",  sesiones: 20, precio: 5500, desc: "Para tratamientos prolongados. Incluye evaluación mensual de progreso.", popular: false },
]

const galeria = [
  { id: 1, img: "/images/consulta-inicial.jpg",       titulo: "Consulta inicial",           terapia: "Evaluación diagnóstica",     duracion: "Primera sesión · sin costo",  desc: "Valoración completa del paciente, historial clínico y definición del plan de tratamiento personalizado." },
  { id: 2, img: "/images/terapia-hombro.jpg",         titulo: "Terapia de hombro",          terapia: "Rehabilitación ortopédica",  duracion: "5 semanas · 10 sesiones",  desc: "Movilización activa y fortalecimiento en tendinitis de manguito rotador. Resolución completa en 10 sesiones." },
  { id: 3, img: "/images/terapia-espalda.jpg",        titulo: "Terapia de espalda",         terapia: "Rehabilitación postural",    duracion: "6 semanas · 12 sesiones",  desc: "Reeducación postural global para dolor lumbar crónico. Reducción del dolor de 8/10 a 2/10 en 12 sesiones." },
  { id: 4, img: "/images/ejercicios-terapeuticos.jpg",titulo: "Ejercicios terapéuticos",    terapia: "Fisioterapia activa",        duracion: "8 semanas · 16 sesiones",  desc: "Ejercicios de resistencia y fortalecimiento progresivo, adaptados a la capacidad de cada paciente." },
  { id: 5, img: "/images/electroterapia.jpg",         titulo: "Electroterapia",             terapia: "Electroterapia",             duracion: "5 semanas · 10 sesiones",  desc: "Aplicación de TENS y ultrasonido terapéutico para acelerar la recuperación y reducir el dolor." },
  { id: 6, img: "/images/adulto-mayor.jpg",           titulo: "Rehabilitación geriátrica",  terapia: "Rehabilitación geriátrica", duracion: "10 semanas · 20 sesiones", desc: "Mejora de equilibrio y marcha en adulto mayor. Reducción del riesgo de caídas en un 70%." },
  { id: 7, img: "/images/rehabilitacion-rodilla.jpg", titulo: "Rehabilitación de rodilla",  terapia: "Rehabilitación ortopédica",  duracion: "8 semanas · 16 sesiones",  desc: "Entrenamiento de marcha con barras paralelas post-cirugía de rodilla. Recuperación completa de la movilidad." },
  { id: 8, img: "/images/terapia-manual.jpg",         titulo: "Terapia manual",             terapia: "Terapia manual",             duracion: "4 semanas · 8 sesiones",   desc: "Técnicas de terapia manual y liberación miofascial para contracturas y tensión muscular." },
]

// ── MODAL TERAPEUTA ──────────────────────────────────────────
function TerapeutaModal({ t, onClose }: { t: typeof terapeutas[0]; onClose: () => void }) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div style={{background:'#0A1220',border:'1px solid rgba(255,255,255,0.1)',borderRadius:20,padding:32,maxWidth:520,width:'100%',position:'relative'}} onClick={e=>e.stopPropagation()}>
        <button onClick={onClose} style={{position:'absolute',top:16,right:16,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,width:32,height:32,color:'#8C9BB5',cursor:'pointer',fontSize:16}}>✕</button>
        <div style={{display:'flex',gap:16,alignItems:'center',marginBottom:24}}>
          <div style={{width:64,height:64,borderRadius:'50%',background:t.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,fontWeight:700,color:'#fff',flexShrink:0}}>{t.ini}</div>
          <div>
            <div style={{fontSize:17,fontWeight:700,color:'#E7EDF7'}}>{t.nombre}</div>
            <div style={{fontSize:13,color:'#38BDF8',marginTop:3}}>{t.titulo}</div>
            <div style={{fontSize:12,color:'#8C9BB5',marginTop:2}}>📅 {t.experiencia}</div>
          </div>
        </div>
        <div style={{marginBottom:16}}>
          <div style={{fontSize:11,fontWeight:700,color:'#8C9BB5',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:8}}>Egresado de</div>
          <div style={{fontSize:13,color:'#E7EDF7',background:'rgba(255,255,255,0.04)',borderRadius:9,padding:'10px 13px'}}>{t.egreso}</div>
        </div>
        <div style={{marginBottom:16}}>
          <div style={{fontSize:11,fontWeight:700,color:'#8C9BB5',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:8}}>Diplomados y certificaciones</div>
          {t.diplomados.map((d,i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
              <div style={{width:6,height:6,borderRadius:'50%',background:t.color,flexShrink:0}}/>
              <div style={{fontSize:13,color:'#E7EDF7'}}>{d}</div>
            </div>
          ))}
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:'#8C9BB5',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:8}}>Especialidades</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
            {t.especialidades.map((e,i) => (
              <span key={i} style={{background:`${t.color}22`,color:t.color,border:`1px solid ${t.color}44`,borderRadius:100,fontSize:11,fontWeight:600,padding:'4px 11px'}}>{e}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── MODAL GALERÍA ────────────────────────────────────────────
function GaleriaModal({ item, onClose }: { item: typeof galeria[0]; onClose: () => void }) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div style={{background:'#0A1220',border:'1px solid rgba(56,189,248,0.2)',borderRadius:20,padding:0,maxWidth:440,width:'100%',position:'relative',textAlign:'center',overflow:'hidden'}} onClick={e=>e.stopPropagation()}>
        <button onClick={onClose} style={{position:'absolute',top:16,right:16,background:'rgba(0,0,0,0.4)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:8,width:32,height:32,color:'#fff',cursor:'pointer',fontSize:16,zIndex:2}}>✕</button>
        <img src={item.img} alt={item.titulo} style={{width:'100%', height:200, objectFit:'cover', display:'block'}} />
        <div style={{padding:32}}>
        <div style={{fontSize:18,fontWeight:700,color:'#E7EDF7',marginBottom:8}}>{item.titulo}</div>
        <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(56,189,248,0.12)',border:'1px solid rgba(56,189,248,0.25)',borderRadius:100,padding:'4px 12px',marginBottom:16}}>
          <span style={{fontSize:11,fontWeight:600,color:'#38BDF8'}}>{item.terapia}</span>
        </div>
        <p style={{fontSize:14,color:'#8C9BB5',lineHeight:1.75,marginBottom:16}}>{item.desc}</p>
        <div style={{background:'rgba(255,255,255,0.04)',borderRadius:10,padding:'10px 14px',fontSize:12,color:'#8C9BB5'}}>⏱ {item.duracion}</div>
        </div>
      </div>
    </div>
  )
}

// ── NAV CON MENÚ HAMBURGUESA ────────────────────────────────
function NavConMenu() {
  const [abierto, setAbierto] = useState(false)
  // Lista plana — se usa en el drawer móvil, donde el espacio vertical no es problema
  const links = [
    {href:'#inicio',        label:'Inicio'},
    {href:'#nosotros',      label:'Nosotros'},
    {href:'#equipo',        label:'Equipo'},
    {href:'#servicios',     label:'Servicios'},
    {href:'#instalaciones', label:'Instalaciones'},
    {href:'#galeria',       label:'Galería'},
    {href:'#precios',       label:'Precios'},
    {href:'#proceso',       label:'Cómo funciona'},
    {href:'#opiniones',     label:'Opiniones'},
    {href:'#contacto',      label:'Contacto'},
  ]
  // Agrupada por tema — se usa en el nav de escritorio, para no amontonar
  // 8 links sueltos en una sola fila.
  const gruposDesktop = [
    { href:'#inicio', label:'Inicio' },
    { label:'La Clínica', items:[
      {href:'#nosotros',      label:'Nosotros'},
      {href:'#equipo',        label:'Equipo'},
      {href:'#instalaciones', label:'Instalaciones'},
    ]},
    { label:'Pacientes', items:[
      {href:'#servicios',  label:'Servicios'},
      {href:'#proceso',    label:'Cómo funciona'},
      {href:'#galeria',    label:'Galería'},
      {href:'#precios',    label:'Precios'},
      {href:'#opiniones',  label:'Opiniones'},
    ]},
    { href:'#contacto', label:'Contacto' },
  ]
  return (
    <>
      <nav className="nav">
        <a href="#inicio" className="nav-brand">
          <div className="nav-logo">RM</div>
          <div>
            <div className="nav-name">Rehabilitandomed</div>
            <div className="nav-tag">Clínica de Rehabilitación Física</div>
          </div>
        </a>
        <ul className="nav-links">
          {gruposDesktop.map(g =>
            g.href ? (
              <li key={g.href}><a href={g.href}>{g.label}</a></li>
            ) : (
              <li key={g.label} className="nav-dropdown">
                <span className="nav-dropdown-label">{g.label} <span className="nav-chevron">▾</span></span>
                <div className="nav-dropdown-panel">
                  <div className="nav-dropdown-panel-inner">
                    {g.items!.map(item => <a key={item.href} href={item.href}>{item.label}</a>)}
                  </div>
                </div>
              </li>
            )
          )}
        </ul>
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <Link href="/login" className="nav-cta">Portal de pacientes →</Link>
          <button className="nav-hamburger" onClick={() => setAbierto(true)} aria-label="Abrir menú">
            <span/><span/><span/>
          </button>
        </div>
      </nav>

      {/* Overlay */}
      <div className={`nav-overlay${abierto?' open':''}`} onClick={() => setAbierto(false)}/>

      {/* Drawer — sigue siendo la lista plana, aquí sí cabe todo sin problema */}
      <div className={`nav-drawer${abierto?' open':''}`}>
        <div className="nav-drawer-header">
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <div className="nav-logo" style={{width:32, height:32, fontSize:11}}>RM</div>
            <div className="nav-name" style={{fontSize:14}}>Rehabilitandomed</div>
          </div>
          <button className="nav-drawer-close" onClick={() => setAbierto(false)}>✕</button>
        </div>
        <ul>
          {links.map(l => (
            <li key={l.href}>
              <a href={l.href} onClick={() => setAbierto(false)}>{l.label}</a>
            </li>
          ))}
        </ul>
        <Link href="/login" className="nav-drawer-cta" onClick={() => setAbierto(false)}>
          Portal de pacientes →
        </Link>
      </div>
    </>
  )
}

// ── COMPONENTE PRINCIPAL ─────────────────────────────────────
export default function LandingPage() {
  const [terapeutaModal, setTerapeutaModal] = useState<typeof terapeutas[0] | null>(null)
  const [galeriaModal, setGaleriaModal]     = useState<typeof galeria[0] | null>(null)
  const [hoveredGaleria, setHoveredGaleria] = useState<number | null>(null)
  const [opinionesPublicas, setOpinionesPublicas] = useState<{ calificacion: number; comentario: string; paciente_nombre: string; terapeuta_nombre: string | null }[]>([])

  useEffect(() => {
    fetch('/api/opiniones/publicas')
      .then(r => r.json())
      .then(data => setOpinionesPublicas(data.opiniones ?? []))
      .catch(() => setOpinionesPublicas([]))
  }, [])

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:        #060B14;
          --bg-2:      #0A1220;
          --surface:   rgba(255,255,255,0.035);
          --surface2:  rgba(255,255,255,0.07);
          --border:    rgba(255,255,255,0.09);
          --blue:      #2563EB;
          --blue-2:    #3B82F6;
          --cyan:      #38BDF8;
          --text:      #E7EDF7;
          --muted:     #8C9BB5;
          --light-bg:    #EEF4FB;
          --light-bg-2:  #E2EDF7;
          --light-card:  #FFFFFF;
          --light-border:#C8DCF0;
          --light-text:  #0B1A33;
          --light-muted: #4A6180;
        }

        html { scroll-behavior: smooth; }
        body {
          font-family: 'Inter', sans-serif;
          background: var(--bg);
          color: var(--text);
          font-size: 16px;
          line-height: 1.6;
          overflow-x: hidden;
        }

        /* ── NAV ── */
        .nav {
          position:fixed; top:0; left:0; right:0; z-index:100;
          display:flex; align-items:center; justify-content:space-between;
          padding:0 6%; height:70px;
          background:rgba(6,11,20,0.82);
          backdrop-filter:blur(20px) saturate(150%);
          border-bottom:1px solid var(--border);
        }
        .nav-brand { display:flex; align-items:center; gap:12px; text-decoration:none; }
        .nav-logo {
          width:40px; height:40px; border-radius:11px;
          background:linear-gradient(135deg,var(--blue),var(--cyan));
          display:flex; align-items:center; justify-content:center;
          font-size:13px; font-weight:800; color:#fff;
          box-shadow:0 0 20px rgba(56,189,248,0.35);
        }
        .nav-name { font-size:15px; font-weight:700; color:#fff; letter-spacing:-0.01em; }
        .nav-tag  { font-size:10px; font-weight:600; color:var(--cyan); letter-spacing:0.1em; text-transform:uppercase; }
        .nav-links { display:flex; align-items:center; gap:32px; list-style:none; }
        .nav-links a { font-size:14px; font-weight:500; color:var(--muted); text-decoration:none; transition:color .2s; }
        .nav-links a:hover { color:#fff; }
        .nav-dropdown { position:relative; }
        .nav-dropdown-label {
          font-size:14px; font-weight:500; color:var(--muted); cursor:default;
          display:flex; align-items:center; gap:5px; transition:color .2s; user-select:none;
        }
        .nav-dropdown:hover .nav-dropdown-label { color:#fff; }
        .nav-chevron { font-size:9px; transition:transform .2s; display:inline-block; }
        .nav-dropdown:hover .nav-chevron { transform:rotate(180deg); }
        .nav-dropdown-panel {
          position:absolute; top:100%; left:50%; transform:translateX(-50%) translateY(-6px);
          padding-top:14px; opacity:0; visibility:hidden; transition:opacity .18s ease, transform .18s ease, visibility .18s;
          z-index:110;
        }
        .nav-dropdown:hover .nav-dropdown-panel { opacity:1; visibility:visible; transform:translateX(-50%) translateY(0); }
        .nav-dropdown-panel-inner {
          background:#0A1220; border:1px solid rgba(56,189,248,0.15); border-radius:12px;
          padding:8px; min-width:190px; display:flex; flex-direction:column; gap:2px;
          box-shadow:0 16px 40px rgba(0,0,0,0.5);
        }
        .nav-dropdown-panel-inner a {
          padding:10px 12px; border-radius:8px; font-size:13.5px; font-weight:500;
          color:var(--muted); text-decoration:none; transition:all .15s; white-space:nowrap;
        }
        .nav-dropdown-panel-inner a:hover { background:rgba(56,189,248,0.1); color:#fff; }
        .nav-cta {
          background:linear-gradient(135deg,var(--blue),var(--cyan));
          color:#fff; border:none; border-radius:10px;
          padding:10px 22px; font-size:14px; font-weight:600;
          cursor:pointer; text-decoration:none;
          display:inline-flex; align-items:center; gap:6px;
          box-shadow:0 4px 18px rgba(37,99,235,0.4);
          transition:transform .2s, box-shadow .2s;
          white-space:nowrap;
        }
        .nav-cta:hover { transform:translateY(-2px); box-shadow:0 8px 26px rgba(56,189,248,0.45); }
        .nav-hamburger {
          display:none; flex-direction:column; justify-content:center; gap:5px;
          width:36px; height:36px; background:rgba(255,255,255,0.06);
          border:1px solid var(--border); border-radius:9px;
          cursor:pointer; padding:8px; flex-shrink:0;
        }
        .nav-hamburger span { display:block; height:2px; border-radius:2px; background:#E7EDF7; transition:all .25s; }
        .nav-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:98; backdrop-filter:blur(2px); }
        .nav-overlay.open { display:block; }
        .nav-drawer {
          position:fixed; top:0; right:0; bottom:0; width:280px; z-index:99;
          background:#0A1220; border-left:1px solid var(--border);
          display:flex; flex-direction:column;
          transform:translateX(100%); transition:transform .28s cubic-bezier(.4,0,.2,1);
          padding:24px 20px;
        }
        .nav-drawer.open { transform:translateX(0); }
        .nav-drawer-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:32px; padding-bottom:20px; border-bottom:1px solid var(--border); }
        .nav-drawer-close { width:32px; height:32px; border-radius:8px; background:rgba(255,255,255,0.06); border:1px solid var(--border); color:var(--muted); cursor:pointer; font-size:16px; display:flex; align-items:center; justify-content:center; }
        .nav-drawer ul { list-style:none; display:flex; flex-direction:column; gap:4px; flex:1; }
        .nav-drawer ul a { display:block; padding:12px 14px; border-radius:10px; font-size:15px; font-weight:500; color:var(--muted); text-decoration:none; transition:all .18s; }
        .nav-drawer ul a:hover { background:rgba(255,255,255,0.07); color:#fff; }
        .nav-drawer-cta { display:block; text-align:center; margin-top:24px; background:linear-gradient(135deg,var(--blue),var(--cyan)); color:#fff; border-radius:12px; padding:14px; font-size:15px; font-weight:600; text-decoration:none; box-shadow:0 6px 20px rgba(37,99,235,0.4); }

        /* ── HERO ── */
        .hero {
          min-height:100vh; display:flex; align-items:center;
          padding:140px 6% 100px; position:relative; overflow:hidden;
        }
        .hero-grid {
          position:absolute; inset:0;
          background-image:
            linear-gradient(rgba(56,189,248,0.06) 1px, transparent 1px),
            linear-gradient(90deg,rgba(56,189,248,0.06) 1px, transparent 1px);
          background-size:52px 52px;
          mask-image:radial-gradient(ellipse 75% 65% at 50% 35%, black 0%, transparent 80%);
          pointer-events:none;
        }
        .hero-glow1 {
          position:absolute; top:-160px; right:-80px;
          width:620px; height:620px; border-radius:50%;
          background:radial-gradient(circle,rgba(37,99,235,0.32) 0%,transparent 65%);
          filter:blur(18px); pointer-events:none;
        }
        .hero-glow2 {
          position:absolute; bottom:-180px; left:-100px;
          width:480px; height:480px; border-radius:50%;
          background:radial-gradient(circle,rgba(56,189,248,0.18) 0%,transparent 65%);
          filter:blur(18px); pointer-events:none;
        }
        .hero-content {
          max-width:1160px; margin:0 auto; width:100%;
          position:relative; z-index:2; text-align:center;
        }
        .hero-badge {
          display:inline-flex; align-items:center; gap:9px;
          background:var(--surface); border:1px solid var(--border);
          border-radius:100px; padding:7px 18px 7px 13px;
          font-size:12.5px; font-weight:500; color:var(--cyan);
          margin-bottom:28px; backdrop-filter:blur(8px);
        }
        .badge-dot {
          width:7px; height:7px; border-radius:50%;
          background:var(--cyan); flex-shrink:0;
          box-shadow:0 0 8px var(--cyan);
          animation:pulseDot 2s ease infinite;
        }
        @keyframes pulseDot { 0%,100%{opacity:1} 50%{opacity:.35} }
        .hero-title {
          font-weight:800;
          font-size:clamp(40px,6vw,80px);
          line-height:1.05; letter-spacing:-0.025em; color:#fff;
          margin-bottom:24px;
        }
        .grad {
          background:linear-gradient(110deg,var(--blue-2) 10%,var(--cyan) 65%);
          -webkit-background-clip:text; background-clip:text; color:transparent;
        }
        .hero-desc {
          font-size:18px; color:var(--muted); line-height:1.75;
          max-width:600px; margin:0 auto 42px; font-weight:400;
        }
        .hero-btns { display:flex; gap:14px; flex-wrap:wrap; justify-content:center; margin-bottom:68px; }
        .btn-primary {
          background:linear-gradient(135deg,var(--blue),var(--cyan));
          color:#fff; border:none; border-radius:12px;
          padding:16px 32px; font-size:15px; font-weight:600;
          cursor:pointer; text-decoration:none;
          display:inline-flex; align-items:center; gap:8px;
          font-family:'Inter',sans-serif;
          box-shadow:0 8px 26px rgba(37,99,235,0.4);
          transition:transform .2s, box-shadow .2s;
        }
        .btn-primary:hover { transform:translateY(-3px); box-shadow:0 12px 34px rgba(56,189,248,0.5); }
        .btn-secondary {
          background:var(--surface); color:#fff;
          border:1px solid var(--border); border-radius:12px;
          padding:16px 32px; font-size:15px; font-weight:600;
          cursor:pointer; text-decoration:none;
          backdrop-filter:blur(8px); font-family:'Inter',sans-serif;
          transition:border-color .2s, background .2s, transform .2s;
        }
        .btn-secondary:hover { border-color:var(--cyan); background:var(--surface2); transform:translateY(-3px); }

        /* PREVIEW */
        .hero-preview {
          max-width:920px; margin:0 auto;
          background:linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02));
          border:1px solid var(--border); border-radius:22px; padding:8px;
          box-shadow:0 30px 80px rgba(0,0,0,0.5);
          backdrop-filter:blur(20px);
        }
        .preview-inner {
          background:var(--bg-2); border-radius:16px; padding:26px;
          display:grid; grid-template-columns:1.1fr 1fr; gap:18px;
        }
        .preview-card { background:var(--surface); border:1px solid var(--border); border-radius:13px; padding:18px; }
        .preview-label { font-size:11px; color:var(--muted); font-weight:600; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:14px; }
        .preview-row { display:flex; align-items:center; gap:10px; padding:9px 0; border-bottom:1px solid rgba(255,255,255,0.05); }
        .preview-row:last-child { border-bottom:none; }
        .preview-avatar {
          width:30px; height:30px; border-radius:50%; flex-shrink:0;
          background:linear-gradient(135deg,var(--blue),var(--cyan));
          display:flex; align-items:center; justify-content:center;
          font-size:10px; font-weight:700; color:#fff;
        }
        .preview-name { font-size:12.5px; font-weight:500; color:var(--text); }
        .preview-sub  { font-size:10.5px; color:var(--muted); }
        .preview-pill { margin-left:auto; font-size:10px; font-weight:600; padding:3px 9px; border-radius:100px; }
        .pill-ok  { background:rgba(56,189,248,0.18); color:var(--cyan); }
        .pill-pen { background:rgba(245,180,0,0.15); color:#F5C842; }
        .preview-metrics { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .preview-metric { background:var(--surface); border:1px solid var(--border); border-radius:13px; padding:16px; }
        .preview-metric-num {
          font-size:26px; font-weight:800; letter-spacing:-0.02em;
          background:linear-gradient(110deg,var(--blue-2),var(--cyan));
          -webkit-background-clip:text; background-clip:text; color:transparent;
        }
        .preview-metric-lbl { font-size:11px; color:var(--muted); margin-top:4px; }

        /* ── STATS ── */
        .stats-strip { background:var(--bg-2); padding:0 6%; }
        .stats-inner {
          max-width:1140px; margin:0 auto;
          display:grid; grid-template-columns:repeat(4,1fr);
          border-top:1px solid var(--border); border-bottom:1px solid var(--border);
        }
        .stat-item { padding:44px 20px; text-align:center; border-right:1px solid var(--border); }
        .stat-item:last-child { border-right:none; }
        .stat-num {
          font-weight:800; font-size:38px; letter-spacing:-0.02em; line-height:1; margin-bottom:9px;
          background:linear-gradient(110deg,var(--blue-2),var(--cyan));
          -webkit-background-clip:text; background-clip:text; color:transparent;
        }
        .stat-lbl { font-size:13px; color:var(--text); font-weight:500; }
        .stat-sub { font-size:11.5px; color:var(--muted); margin-top:2px; }

        /* ── TRANSICIONES ── */
        .fade-to-light  { height:72px; background:linear-gradient(180deg,var(--bg-2) 0%,var(--light-bg) 100%); }
        .fade-to-dark   { height:72px; background:linear-gradient(180deg,var(--light-bg-2) 0%,var(--bg-2) 100%); }
        .fade-to-light2 { height:72px; background:linear-gradient(180deg,var(--bg-2) 0%,var(--light-bg) 100%); }
        .fade-dark-light { height:72px; background:linear-gradient(180deg,var(--bg-2) 0%,var(--light-bg-2) 100%); }
        .fade-light-dark { height:72px; background:linear-gradient(180deg,var(--light-bg-2) 0%,var(--bg-2) 100%); }

        /* ── SECCIONES CLARAS ── */
        .light-section { background:var(--light-bg); color:var(--light-text); }
        .light-section-2 { background:var(--light-bg-2); color:var(--light-text); }
        section { padding:96px 6%; }
        .container { max-width:1140px; margin:0 auto; }

        .section-tag {
          display:inline-flex; align-items:center; gap:9px;
          font-size:11.5px; font-weight:700; color:var(--blue);
          letter-spacing:0.1em; text-transform:uppercase; margin-bottom:18px;
        }
        .section-tag::before { content:''; width:20px; height:2.5px; background:var(--blue); border-radius:2px; flex-shrink:0; }
        .section-tag.center { justify-content:center; width:100%; }
        .section-tag.cyan { color:var(--cyan); }
        .section-tag.cyan::before { background:var(--cyan); }
        .section-title {
          font-weight:800;
          font-size:clamp(30px,4vw,50px); line-height:1.1; letter-spacing:-0.02em;
          color:var(--light-text); margin-bottom:18px;
        }
        .section-title-dark { color:#fff; }
        .section-body { font-size:16px; color:var(--light-muted); line-height:1.85; font-weight:400; }

        /* ── NOSOTROS ── */
        .quienes-grid { display:grid; grid-template-columns:1fr 1fr; gap:80px; align-items:start; }
        .check-list { list-style:none; margin-top:26px; display:grid; grid-template-columns:1fr 1fr; gap:11px; }
        .check-list li { display:flex; align-items:center; gap:9px; font-size:14px; color:var(--light-text); font-weight:500; }
        .check-list li::before {
          content:'✓'; width:20px; height:20px; border-radius:50%;
          background:linear-gradient(135deg,var(--blue),var(--cyan));
          color:#fff; display:flex; align-items:center; justify-content:center;
          font-size:11px; font-weight:700; flex-shrink:0;
        }
        .info-box-dark {
          background:var(--bg-2); border-radius:16px; padding:24px;
          border:1px solid rgba(56,189,248,0.2); margin-top:24px;
          position:relative; overflow:hidden;
        }
        .info-box-dark::before {
          content:''; position:absolute; top:-40px; right:-40px;
          width:130px; height:130px; border-radius:50%;
          background:radial-gradient(circle,rgba(56,189,248,0.2),transparent 70%);
        }
        .info-box-label { font-size:11px; font-weight:700; color:var(--cyan); letter-spacing:0.08em; text-transform:uppercase; margin-bottom:10px; position:relative; z-index:1; }
        .info-box-text  { font-size:13.5px; color:rgba(255,255,255,0.80); line-height:1.75; position:relative; z-index:1; }
        .valores-grid { display:flex; flex-direction:column; gap:12px; }
        .valor-card {
          background:var(--light-card); border:1px solid var(--light-border);
          border-radius:14px; padding:18px 22px;
          display:flex; align-items:center; gap:16px;
          border-left:4px solid var(--blue);
          transition:box-shadow .2s, transform .2s;
        }
        .valor-card:hover { box-shadow:0 8px 24px rgba(37,99,235,0.12); transform:translateX(4px); }
        .valor-icon {
          width:42px; height:42px; border-radius:11px; flex-shrink:0;
          background:linear-gradient(135deg,rgba(37,99,235,0.10),rgba(56,189,248,0.10));
          border:1px solid rgba(37,99,235,0.18);
          display:flex; align-items:center; justify-content:center; font-size:18px;
        }
        .valor-titulo { font-size:14px; font-weight:700; color:var(--light-text); }
        .valor-desc   { font-size:12.5px; color:var(--light-muted); margin-top:2px; }

        /* ── EQUIPO ── */
        .equipo-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:18px; }
        .terapeuta-card {
          background:var(--light-card); border:1px solid var(--light-border);
          border-radius:18px; padding:28px 20px; text-align:center; cursor:pointer;
          transition:transform .2s, box-shadow .2s, border-color .2s;
        }
        .terapeuta-card:hover { transform:translateY(-6px); box-shadow:0 16px 40px rgba(37,99,235,0.14); border-color:var(--blue); }

        /* ── INSTALACIONES ── */
        .instalaciones-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:18px; max-width:780px; margin:0 auto; }
        .instalacion-card {
          background:rgba(255,255,255,0.04); border:1px solid var(--border);
          border-radius:16px; padding:24px 22px;
          transition:border-color .2s, transform .2s;
        }
        .instalacion-card:hover { border-color:rgba(56,189,248,0.3); transform:translateY(-4px); }

        /* ── SERVICIOS ── */
        .servicios-header { text-align:center; margin-bottom:58px; }
        .servicios-sub { font-size:16px; color:var(--light-muted); max-width:540px; margin:14px auto 0; line-height:1.75; }
        .servicios-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; }
        .servicio-card {
          background:var(--light-card); border:1px solid var(--light-border);
          border-radius:18px; padding:28px 24px;
          transition:box-shadow .25s, transform .2s, border-color .2s;
          position:relative; overflow:hidden;
        }
        .servicio-card::after {
          content:''; position:absolute; bottom:0; left:0; right:0; height:3px;
          background:linear-gradient(90deg,var(--blue),var(--cyan));
          transform:scaleX(0); transform-origin:left; transition:transform .3s ease;
        }
        .servicio-card:hover::after { transform:scaleX(1); }
        .servicio-card:hover { box-shadow:0 16px 40px rgba(37,99,235,0.13); transform:translateY(-5px); border-color:rgba(37,99,235,0.3); }
        .servicio-icon {
          width:48px; height:48px; border-radius:13px; margin-bottom:20px;
          background:linear-gradient(135deg,var(--blue),var(--cyan));
          display:flex; align-items:center; justify-content:center; font-size:22px;
          box-shadow:0 6px 18px rgba(37,99,235,0.3);
        }
        .servicio-nombre { font-size:16px; font-weight:700; color:var(--light-text); margin-bottom:10px; letter-spacing:-0.01em; }
        .servicio-desc   { font-size:13.5px; color:var(--light-muted); line-height:1.7; }

        /* ── GALERÍA ── */
        .galeria-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; }
        .galeria-card {
          background:var(--light-card); border:1px solid var(--light-border);
          border-radius:18px; overflow:hidden; cursor:pointer;
          transition:transform .2s, box-shadow .2s;
        }
        .galeria-thumb {
          height:190px;
          background:linear-gradient(135deg,rgba(37,99,235,0.1),rgba(56,189,248,0.08));
          display:flex; align-items:center; justify-content:center;
          position:relative; overflow:hidden;
        }
        .galeria-thumb img { width:100%; height:100%; object-fit:cover; display:block; }
        .galeria-overlay {
          position:absolute; inset:0;
          background:rgba(37,99,235,0.88);
          display:flex; flex-direction:column; align-items:center; justify-content:center;
          gap:8px; opacity:0; transition:opacity .2s;
        }
        .galeria-card:hover .galeria-overlay { opacity:1; }

        /* ── PRECIOS ── */
        .precios-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; max-width:900px; margin:0 auto; }
        .opiniones-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; }
        .opinion-card {
          background:rgba(255,255,255,0.04); border:1px solid var(--border); border-radius:16px;
          padding:22px 24px; display:flex; flex-direction:column; gap:12px;
        }
        .opinion-stars { color:#F5B400; font-size:15px; letter-spacing:2px; }
        .opinion-texto { font-size:13.5px; color:var(--muted); line-height:1.65; flex:1; }
        .opinion-autor { font-size:13px; font-weight:600; color:var(--text); }
        .opinion-terapeuta { font-size:11.5px; color:var(--cyan); margin-top:2px; }
        .precio-card {
          border-radius:20px; padding:32px 26px; position:relative;
          transition:transform .2s;
        }
        .precio-card:hover { transform:translateY(-4px); }

        /* ── PROCESO ── */
        .proceso-section { background:var(--bg-2); padding:96px 6%; }
        .proceso-header  { text-align:center; margin-bottom:58px; }
        .proceso-header .section-title { color:#fff; }
        .proceso-header .section-tag   { color:var(--cyan); }
        .proceso-header .section-tag::before { background:var(--cyan); }
        .proceso-header .section-body  { color:var(--muted); max-width:520px; margin:0 auto; }
        .proceso-grid {
          display:grid; grid-template-columns:repeat(4,1fr);
          gap:0; position:relative;
          max-width:1140px; margin:0 auto;
        }
        .proceso-grid::before {
          content:''; position:absolute; top:35px; left:12%; right:12%; height:2px;
          background:linear-gradient(90deg,var(--blue),var(--cyan)); z-index:0;
        }
        .paso { display:flex; flex-direction:column; align-items:center; text-align:center; padding:0 16px; position:relative; z-index:1; }
        .paso-num {
          width:70px; height:70px; border-radius:50%; margin-bottom:20px;
          background:linear-gradient(135deg,var(--blue),var(--cyan));
          display:flex; align-items:center; justify-content:center;
          font-size:22px; font-weight:800; color:#fff;
          box-shadow:0 8px 24px rgba(37,99,235,0.45);
          border:3px solid var(--bg-2);
        }
        .paso-titulo { font-size:15px; font-weight:700; color:#fff; margin-bottom:10px; }
        .paso-desc   { font-size:13px; color:var(--muted); line-height:1.65; }
        .paso-nota   { font-size:11.5px; color:var(--cyan); font-weight:600; margin-top:8px; }
        .aviso-sistema {
          background:rgba(255,255,255,0.04); border:1px solid rgba(56,189,248,0.2);
          border-radius:16px; padding:28px 36px; margin-top:48px;
          display:flex; align-items:center; gap:24px;
          max-width:1140px; margin-left:auto; margin-right:auto; margin-top:48px;
        }
        .aviso-icon  { font-size:34px; flex-shrink:0; }
        .aviso-title { font-size:17px; font-weight:700; color:#fff; margin-bottom:6px; }
        .aviso-text  { font-size:13.5px; color:var(--muted); line-height:1.65; }
        .aviso-btn {
          background:linear-gradient(135deg,var(--blue),var(--cyan));
          color:#fff; border:none; border-radius:10px;
          padding:12px 22px; font-size:14px; font-weight:600;
          cursor:pointer; text-decoration:none; white-space:nowrap; flex-shrink:0;
          font-family:'Inter',sans-serif;
          box-shadow:0 4px 16px rgba(37,99,235,0.4);
          transition:transform .2s;
        }
        .aviso-btn:hover { transform:translateY(-2px); }

        /* ── CONTACTO ── */
        .contacto-grid { display:grid; grid-template-columns:1fr 1fr; gap:80px; align-items:start; }
        .contacto-info { display:flex; flex-direction:column; gap:16px; margin-top:32px; }
        .contacto-item { display:flex; align-items:center; gap:16px; }
        .contacto-icono {
          width:44px; height:44px; border-radius:12px; flex-shrink:0;
          background:var(--light-card); border:1px solid var(--light-border);
          display:flex; align-items:center; justify-content:center; font-size:18px;
        }
        .contacto-lbl { font-size:11px; color:var(--light-muted); text-transform:uppercase; letter-spacing:0.07em; font-weight:600; }
        .contacto-val { font-size:14px; font-weight:600; color:var(--light-text); margin-top:2px; }
        .form-card {
          background:var(--light-card); border:1px solid var(--light-border);
          border-radius:22px; padding:38px;
          box-shadow:0 20px 60px rgba(37,99,235,0.08);
        }
        .form-title { font-size:19px; font-weight:700; color:var(--light-text); margin-bottom:10px; letter-spacing:-0.01em; }
        .form-nota {
          font-size:12px; color:var(--light-muted);
          background:rgba(37,99,235,0.06); border:1px solid rgba(37,99,235,0.14);
          border-radius:8px; padding:10px 13px; line-height:1.6; margin-bottom:22px;
        }
        .form-nota strong { color:var(--blue); }
        .form-group { margin-bottom:15px; }
        .form-label { font-size:11px; font-weight:600; color:var(--light-muted); letter-spacing:0.08em; text-transform:uppercase; display:block; margin-bottom:7px; }
        .form-input,.form-textarea {
          width:100%; background:var(--light-bg); border:1.5px solid var(--light-border);
          border-radius:11px; padding:12px 14px; font-size:14px;
          font-family:'Inter',sans-serif; color:var(--light-text);
          transition:border-color .2s, box-shadow .2s; outline:none;
        }
        .form-input:focus,.form-textarea:focus { border-color:var(--blue); box-shadow:0 0 0 4px rgba(37,99,235,0.10); }
        .form-input::placeholder,.form-textarea::placeholder { color:#9EB5C4; }
        .form-textarea { resize:vertical; min-height:96px; }
        .form-success {
          background:rgba(56,189,248,0.10); border:1px solid rgba(56,189,248,0.3);
          border-radius:11px; padding:14px 16px;
          font-size:14px; color:var(--blue); font-weight:500;
          margin-bottom:16px; display:flex; align-items:center; gap:8px;
        }
        .form-error {
          background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.3);
          border-radius:11px; padding:14px 16px;
          font-size:14px; color:#B91C1C; font-weight:500;
          margin-bottom:16px; display:flex; align-items:center; gap:8px;
        }
        .form-submit {
          width:100%;
          background:linear-gradient(135deg,var(--blue),var(--cyan));
          color:#fff; border:none; border-radius:12px;
          padding:14px; font-size:15px; font-weight:600;
          cursor:pointer; font-family:'Inter',sans-serif;
          box-shadow:0 8px 24px rgba(37,99,235,0.3);
          transition:transform .2s, box-shadow .2s;
          display:flex; align-items:center; justify-content:center; gap:8px;
        }
        .form-submit:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 12px 32px rgba(56,189,248,0.4); }
        .form-submit:disabled { opacity:.55; cursor:not-allowed; transform:none; }
        .spinner { width:16px; height:16px; border-radius:50%; border:2px solid rgba(255,255,255,0.3); border-top-color:#fff; animation:spin .7s linear infinite; }
        @keyframes spin { to{transform:rotate(360deg)} }

        /* ── FOOTER ── */
        footer {
          background:var(--bg); padding:42px 6%;
          display:flex; align-items:center; justify-content:space-between;
          flex-wrap:wrap; gap:18px; border-top:1px solid var(--border);
        }
        .footer-brand { display:flex; align-items:center; gap:12px; }
        .footer-logo {
          width:34px; height:34px; border-radius:10px;
          background:linear-gradient(135deg,var(--blue),var(--cyan));
          display:flex; align-items:center; justify-content:center;
          font-size:12px; font-weight:800; color:#fff;
        }
        .footer-name { font-size:14px; color:#fff; font-weight:700; }
        .footer-tag  { font-size:10px; color:var(--cyan); font-weight:600; letter-spacing:0.08em; text-transform:uppercase; }
        .footer-desc { font-size:12px; color:var(--muted); max-width:380px; text-align:center; line-height:1.6; }
        .footer-links { display:flex; gap:24px; }
        .footer-links a { font-size:13px; color:var(--muted); text-decoration:none; font-weight:500; transition:color .2s; }
        .footer-links a:hover { color:var(--cyan); }

        /* ── ANIMACIONES ── */
        @keyframes fadeUp { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        .a1{animation:fadeUp .6s .05s ease both}
        .a2{animation:fadeUp .6s .15s ease both}
        .a3{animation:fadeUp .6s .25s ease both}
        .a4{animation:fadeUp .6s .35s ease both}
        .a5{animation:fadeUp .7s .45s ease both}

        /* ── RESPONSIVE ── */
        @media(max-width:900px){
          .nav-links{display:none}
          .nav-cta{display:none}
          .nav-hamburger{display:flex}
          .preview-inner,.quienes-grid,.servicios-grid,.contacto-grid{grid-template-columns:1fr}
          .proceso-grid{grid-template-columns:1fr 1fr;gap:32px}
          .proceso-grid::before{display:none}
          .stats-inner{grid-template-columns:repeat(2,1fr)}
          .stat-item{border-right:none;border-bottom:1px solid var(--border)}
          .aviso-sistema{flex-direction:column;text-align:center}
          .check-list{grid-template-columns:1fr}
          .equipo-grid{grid-template-columns:repeat(2,1fr)}
          .galeria-grid{grid-template-columns:repeat(2,1fr)}
          .precios-grid{grid-template-columns:1fr}
          .opiniones-grid{grid-template-columns:1fr}
          .instalaciones-grid{grid-template-columns:1fr}
          footer{flex-direction:column;align-items:center;text-align:center}
        }
        @media(max-width:500px){
          .proceso-grid{grid-template-columns:1fr}
          .hero-title{font-size:36px}
          .servicios-grid{grid-template-columns:1fr}
          .equipo-grid{grid-template-columns:1fr}
          .galeria-grid{grid-template-columns:1fr}
        }
      `}</style>

      {/* ── NAV ── */}
      <NavConMenu />

      {/* ── HERO (original intacto) ── */}
      <section className="hero" id="inicio">
        <div className="hero-grid"/>
        <div className="hero-glow1"/>
        <div className="hero-glow2"/>
        <div className="hero-content">
          <div className="hero-badge a1">
            <span className="badge-dot"/>
            Rehabilitación física especializada · Ciudad de México
          </div>
          <h1 className="hero-title a2">
            Tu recuperación<br/><span className="grad">en manos expertas</span>
          </h1>
          <p className="hero-desc a3">
            En Rehabilitandomed combinamos diagnóstico clínico personalizado, terapeutas certificados y seguimiento digital para que cada paciente recupere su calidad de vida.
          </p>
          <div className="hero-btns a4">
            <a href="#proceso" className="btn-primary">¿Cómo empiezo? →</a>
            <a href="#servicios" className="btn-secondary">Ver servicios</a>
          </div>
          <div className="hero-preview a5">
            <div className="preview-inner">
              <div className="preview-card">
                <div className="preview-label">Seguimiento de tratamientos</div>
                {[
                  {ini:'MR', name:'Paciente en tratamiento', sub:'Sesión 7 de 10 · Plan activo',      pill:'En progreso', cls:'pill-ok'},
                  {ini:'AG', name:'Paciente en tratamiento', sub:'Evaluación inicial completada',      pill:'Activo',      cls:'pill-ok'},
                  {ini:'CL', name:'Paciente en tratamiento', sub:'Próxima cita: mañana 10:00 am',     pill:'Pendiente',   cls:'pill-pen'},
                ].map((p,i) => (
                  <div className="preview-row" key={i}>
                    <div className="preview-avatar">{p.ini}</div>
                    <div>
                      <div className="preview-name">{p.name}</div>
                      <div className="preview-sub">{p.sub}</div>
                    </div>
                    <span className={`preview-pill ${p.cls}`}>{p.pill}</span>
                  </div>
                ))}
              </div>
              <div className="preview-metrics">
                {[
                  {num:'15+', lbl:'Años de experiencia'},
                  {num:'4',   lbl:'Especialidades físicas'},
                  {num:'100%',lbl:'Datos protegidos'},
                  {num:'24/7',lbl:'Acceso al portal'},
                ].map(m => (
                  <div className="preview-metric" key={m.lbl}>
                    <div className="preview-metric-num">{m.num}</div>
                    <div className="preview-metric-lbl">{m.lbl}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS (original intacto) ── */}
      <div className="stats-strip">
        <div className="stats-inner">
          {[
            {num:'15+', lbl:'Años de experiencia',       sub:'en rehabilitación física'},
            {num:'4',   lbl:'Especialidades físicas',    sub:'en terapia especializada'},
            {num:'100%',lbl:'Expedientes digitales',     sub:'seguros y cifrados'},
            {num:'Sí',  lbl:'Cobertura de aseguradoras', sub:'consulta disponibilidad'},
          ].map(s => (
            <div className="stat-item" key={s.lbl}>
              <div className="stat-num">{s.num}</div>
              <div className="stat-lbl">{s.lbl}</div>
              <div className="stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="fade-to-light"/>

      <div className="light-section">
        {/* ── NOSOTROS (original intacto) ── */}
        <section id="nosotros">
          <div className="container quienes-grid">
            <div>
              <div className="section-tag">Quiénes somos</div>
              <h2 className="section-title">Especialistas en<br/><span className="grad">recuperación física</span></h2>
              <p className="section-body">
                Rehabilitandomed es una clínica de rehabilitación física con más de 15 años devolviendo movilidad, fuerza y calidad de vida a nuestros pacientes. Nuestro equipo de terapeutas certificados diseña un plan de tratamiento personalizado para cada caso.
              </p>
              <ul className="check-list">
                {['Terapeutas certificados','Plan personalizado','Evaluación inicial incluida','Equipos especializados','Seguimiento digital','Ambiente clínico seguro'].map(i=><li key={i}>{i}</li>)}
              </ul>
              <div className="info-box-dark">
                <div className="info-box-label">💡 Nuestro compromiso</div>
                <p className="info-box-text">Cada paciente recibe atención individual. Somos un equipo especializado donde el terapeuta que te atiende conoce tu caso de principio a fin, y tu historial clínico está siempre disponible de forma segura.</p>
              </div>
            </div>
            <div className="valores-grid">
              {[
                {icon:'🩺', titulo:'Diagnóstico clínico preciso',  desc:'Evaluación funcional completa antes de iniciar cualquier tratamiento. Tu plan se basa en evidencia clínica.'},
                {icon:'🤝', titulo:'Atención personalizada',        desc:'Atención reducida y horarios flexibles. Tu terapeuta te acompaña en cada etapa del proceso.'},
                {icon:'🔒', titulo:'Expediente digital seguro',     desc:'Tu historial clínico está protegido y accesible solo para ti y tu terapeuta asignado.'},
                {icon:'📈', titulo:'Progreso medible por sesión',   desc:'Registramos nivel de dolor, movilidad y avances. Tú y tu terapeuta ven la evolución en tiempo real.'},
              ].map(v => (
                <div className="valor-card" key={v.titulo}>
                  <div className="valor-icon">{v.icon}</div>
                  <div>
                    <div className="valor-titulo">{v.titulo}</div>
                    <div className="valor-desc">{v.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── EQUIPO (NUEVO) ── */}
        <section id="equipo" style={{background:'var(--light-bg-2)'}}>
          <div className="container">
            <div style={{textAlign:'center', marginBottom:52}}>
              <div className="section-tag center">Nuestro equipo</div>
              <h2 className="section-title">Los profesionales que<br/><span className="grad">te van a atender</span></h2>
              <p className="section-body" style={{maxWidth:520, margin:'0 auto'}}>Haz clic en cualquier terapeuta para ver su formación académica, diplomados y especialidades.</p>
            </div>
            <div className="equipo-grid">
              {terapeutas.map(t => (
                <div key={t.ini} className="terapeuta-card" onClick={() => setTerapeutaModal(t)}>
                  <div style={{width:72, height:72, borderRadius:'50%', background:t.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:700, color:'#fff', margin:'0 auto 16px'}}>{t.ini}</div>
                  <div style={{fontSize:14, fontWeight:700, color:'var(--light-text)', marginBottom:5, lineHeight:1.3}}>{t.nombre}</div>
                  <div style={{fontSize:12, color:'var(--blue)', fontWeight:600, marginBottom:10}}>{t.titulo}</div>
                  <div style={{fontSize:11, color:'var(--light-muted)', background:'rgba(37,99,235,0.06)', borderRadius:100, padding:'4px 11px', display:'inline-block'}}>Ver perfil →</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SERVICIOS (original intacto) ── */}
        <section id="servicios">
          <div className="container">
            <div className="servicios-header">
              <div className="section-tag center">Servicios</div>
              <h2 className="section-title">Especialidades de<br/><span className="grad">terapia física</span></h2>
              <p className="servicios-sub">Tratamientos físicos basados en evidencia clínica, diseñados para cada tipo de lesión o condición musculoesquelética.</p>
            </div>
            <div className="servicios-grid">
              {[
                {icon:'🦴', nombre:'Rehabilitación ortopédica',    desc:'Recuperación post-quirúrgica, fracturas, prótesis, lesiones articulares y musculoesqueléticas en general.'},
                {icon:'⚽', nombre:'Fisioterapia deportiva',       desc:'Recuperación de lesiones por deporte, readaptación funcional y regreso seguro a la actividad física.'},
                {icon:'🧓', nombre:'Rehabilitación geriátrica',    desc:'Programa para adultos mayores: mejora de equilibrio, prevención de caídas y mantenimiento funcional.'},
                {icon:'💪', nombre:'Terapia manual y masoterapia', desc:'Técnicas manuales, liberación miofascial, punción seca y manipulación articular terapéutica.'},
                {icon:'🔄', nombre:'Rehabilitación postural',      desc:'Corrección de alteraciones posturales, escoliosis funcional y dolor crónico de columna vertebral.'},
                {icon:'⚡', nombre:'Electroterapia y ultrasonido', desc:'Equipos de electroterapia, ultrasonido terapéutico y láser para acelerar la recuperación tisular.'},
              ].map(s => (
                <div className="servicio-card" key={s.nombre}>
                  <div className="servicio-icon">{s.icon}</div>
                  <div className="servicio-nombre">{s.nombre}</div>
                  <p className="servicio-desc">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ── INSTALACIONES (NUEVO, sección oscura) ── */}
      <div className="fade-to-dark"/>
      <section id="instalaciones" style={{background:'var(--bg-2)', padding:'96px 6%'}}>
        <div className="container">
          <div style={{textAlign:'center', marginBottom:52}}>
            <div className="section-tag center cyan">Instalaciones</div>
            <h2 className="section-title section-title-dark">Espacio clínico<br/><span className="grad">diseñado para tu recuperación</span></h2>
            <p style={{fontSize:16, color:'var(--muted)', maxWidth:520, margin:'0 auto'}}>Contamos con áreas especializadas y equipos de última generación para ofrecerte la mejor atención.</p>
          </div>
          <div style={{borderRadius:20, overflow:'hidden', marginBottom:40, position:'relative', border:'1px solid var(--border)'}}>
            <img src="/images/fachada.jpg" alt="Fachada de la clínica Rehabilitandomed" style={{width:'100%', height:320, objectFit:'cover', display:'block'}} />
            <div style={{position:'absolute', bottom:0, left:0, right:0, background:'linear-gradient(0deg, rgba(6,11,20,0.85), transparent)', padding:'40px 24px 18px'}}>
              <div style={{fontSize:14, fontWeight:600, color:'#fff'}}>Nuestra clínica</div>
              <div style={{fontSize:12.5, color:'rgba(255,255,255,0.7)'}}>Un espacio pensado para tu recuperación, cerca de ti</div>
            </div>
          </div>
          <div className="instalaciones-grid">
            {instalaciones.map(inst => (
              <div key={inst.nombre} className="instalacion-card">
                <div style={{fontSize:32, marginBottom:14}}>{inst.icon}</div>
                <div style={{fontSize:15, fontWeight:700, color:'var(--text)', marginBottom:8}}>{inst.nombre}</div>
                <div style={{fontSize:13, color:'var(--muted)', lineHeight:1.7}}>{inst.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GALERÍA (NUEVO) ── */}
      <div className="fade-dark-light"/>
      <section id="galeria" style={{background:'var(--light-bg-2)', padding:'96px 6%'}}>
        <div className="container">
          <div style={{textAlign:'center', marginBottom:52}}>
            <div className="section-tag center">Galería de casos</div>
            <h2 className="section-title">Resultados reales de<br/><span className="grad">nuestros pacientes</span></h2>
            <p className="section-body" style={{maxWidth:520, margin:'0 auto'}}>Pasa el cursor sobre cada caso para más detalles. Haz clic para ver el resumen completo.</p>
          </div>
          <div className="galeria-grid">
            {galeria.map(item => (
              <div key={item.id} className="galeria-card"
                style={{transform:hoveredGaleria===item.id?'translateY(-5px)':'translateY(0)', boxShadow:hoveredGaleria===item.id?'0 16px 40px rgba(37,99,235,0.15)':'none'}}
                onMouseEnter={() => setHoveredGaleria(item.id)}
                onMouseLeave={() => setHoveredGaleria(null)}
                onClick={() => setGaleriaModal(item)}>
                <div className="galeria-thumb">
                  <img src={item.img} alt={item.titulo} loading="lazy" />
                  <div className="galeria-overlay">
                    <div style={{fontSize:14, fontWeight:700, color:'#fff', textAlign:'center', padding:'0 16px', lineHeight:1.4}}>{item.titulo}</div>
                    <div style={{fontSize:11, color:'rgba(255,255,255,0.85)', background:'rgba(255,255,255,0.15)', borderRadius:100, padding:'3px 10px'}}>{item.terapia}</div>
                    <div style={{fontSize:11, color:'rgba(255,255,255,0.7)', marginTop:4}}>Haz clic para más info →</div>
                  </div>
                </div>
                <div style={{padding:'16px 18px'}}>
                  <div style={{fontSize:14, fontWeight:700, color:'var(--light-text)', marginBottom:6}}>{item.titulo}</div>
                  <div style={{fontSize:12, color:'var(--light-muted)', lineHeight:1.65, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical'}}>{item.desc}</div>
                  <div style={{marginTop:10, fontSize:11, color:'var(--blue)', fontWeight:600}}>⏱ {item.duracion}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRECIOS (NUEVO, sección oscura) ── */}
      <div className="fade-light-dark"/>
      <section id="precios" style={{background:'var(--bg-2)', padding:'96px 6%'}}>
        <div className="container">
          <div style={{textAlign:'center', marginBottom:52}}>
            <div className="section-tag center cyan">Precios</div>
            <h2 className="section-title section-title-dark">Paquetes de<br/><span className="grad">tratamiento</span></h2>
            <p style={{fontSize:16, color:'var(--muted)', maxWidth:520, margin:'0 auto'}}>Manejamos efectivo, tarjeta y aseguradora. La valoración inicial es gratuita para todos los pacientes nuevos.</p>
          </div>
          <div className="precios-grid">
            {paquetes.map(p => (
              <div key={p.nombre} className="precio-card" style={{background:p.popular?'rgba(15,110,86,0.15)':'rgba(255,255,255,0.04)', border:p.popular?'2px solid #0F6E56':'1px solid var(--border)', position:'relative'}}>
                {p.popular && <div style={{position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)', background:'linear-gradient(135deg,#0F6E56,#1D9E75)', color:'#fff', fontSize:11, fontWeight:700, padding:'5px 16px', borderRadius:100, whiteSpace:'nowrap'}}>⭐ Más elegido</div>}
                <div style={{fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:8}}>{p.nombre}</div>
                <div style={{fontSize:36, fontWeight:800, color:'#fff', letterSpacing:'-0.02em', lineHeight:1}}>${p.precio.toLocaleString('es-MX')}</div>
                <div style={{fontSize:13, color:'var(--muted)', marginTop:4, marginBottom:18}}>{p.sesiones} sesiones incluidas</div>
                <div style={{fontSize:13, color:'var(--muted)', lineHeight:1.7, marginBottom:22}}>{p.desc}</div>
                <div style={{fontSize:13, color:'var(--cyan)', fontWeight:600, marginBottom:20}}>~ ${Math.round(p.precio/p.sesiones).toLocaleString('es-MX')}/sesión</div>
                <a href="#contacto" style={{display:'block', textAlign:'center', background:p.popular?'linear-gradient(135deg,#0F6E56,#1D9E75)':'rgba(255,255,255,0.08)', color:'#fff', border:p.popular?'none':'1px solid rgba(255,255,255,0.15)', borderRadius:10, padding:'11px 0', fontSize:14, fontWeight:600, textDecoration:'none'}}>
                  Solicitar este paquete →
                </a>
              </div>
            ))}
          </div>
          <div style={{textAlign:'center', marginTop:28, fontSize:13, color:'var(--muted)'}}>
            Las sesiones individuales también están disponibles. ·
            <span style={{color:'var(--cyan)', marginLeft:4}}>Aceptamos IMSS, ISSSTE y Seguro Popular</span>
          </div>
        </div>
      </section>

      {/* ── OPINIONES (paciente envía, admin aprueba) ── */}
      {opinionesPublicas.length > 0 && (
        <section id="opiniones" style={{background:'var(--bg-2)', padding:'96px 6%'}}>
          <div className="container">
            <div style={{textAlign:'center', marginBottom:52}}>
              <div className="section-tag center cyan">Opiniones</div>
              <h2 className="section-title section-title-dark">Lo que dicen<br/><span className="grad">nuestros pacientes</span></h2>
            </div>
            <div className="opiniones-grid">
              {opinionesPublicas.slice(0, 6).map((o, i) => (
                <div key={i} className="opinion-card">
                  <div className="opinion-stars">{'★'.repeat(o.calificacion)}{'☆'.repeat(5 - o.calificacion)}</div>
                  <div className="opinion-texto">"{o.comentario}"</div>
                  <div>
                    <div className="opinion-autor">{o.paciente_nombre}</div>
                    {o.terapeuta_nombre && <div className="opinion-terapeuta">Atendido por {o.terapeuta_nombre}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── PROCESO (original intacto) ── */}
      <section className="proceso-section" id="proceso">
        <div className="container">
          <div className="proceso-header">
            <div className="section-tag center">Cómo funciona</div>
            <h2 className="section-title">Tu camino hacia<br/><span className="grad">la recuperación</span></h2>
            <p className="section-body">El acceso al portal digital requiere una valoración presencial. Tu cuenta se crea solo cuando el equipo evalúa tu caso y decides iniciar un plan de tratamiento.</p>
          </div>
          <div className="proceso-grid">
            {[
              {icon:'📞', titulo:'Agenda tu cita',     desc:'Llámanos o escríbenos para agendar tu primera cita. La valoración inicial está incluida sin costo adicional.', nota:''},
              {icon:'🩺', titulo:'Valoración clínica', desc:'Un terapeuta certificado evalúa tu condición, hace el diagnóstico funcional y diseña tu plan de tratamiento.', nota:''},
              {icon:'📦', titulo:'Elige tu paquete',   desc:'Te presentamos las opciones según tu plan. Tú decides con qué paquete iniciar. Manejamos efectivo, tarjeta y aseguradora.', nota:'Solo con paquete activo'},
              {icon:'🔑', titulo:'Accede al portal',   desc:'Con paquete activo, la clínica crea tu cuenta digital. Recibes invitación por correo para establecer tu contraseña.', nota:'Cuenta creada por la clínica'},
            ].map(p => (
              <div className="paso" key={p.titulo}>
                <div className="paso-num">{p.icon}</div>
                <div className="paso-titulo">{p.titulo}</div>
                <p className="paso-desc">{p.desc}</p>
                {p.nota && <div className="paso-nota">✓ {p.nota}</div>}
              </div>
            ))}
          </div>
          <div className="aviso-sistema">
            <div className="aviso-icon">🔒</div>
            <div style={{flex:1}}>
              <div className="aviso-title">¿Ya tienes cuenta en el portal?</div>
              <p className="aviso-text">Si ya iniciaste un plan de tratamiento y recibiste invitación por correo, accede a tu portal personal para consultar sesiones, progreso y pagos. <strong style={{color:'var(--cyan)'}}>Las cuentas no se crean de forma autónoma</strong> — solo el personal de la clínica puede generarlas.</p>
            </div>
            <Link href="/login" className="aviso-btn">Entrar al portal →</Link>
          </div>
        </div>
      </section>

      <div className="fade-to-light2"/>

      {/* ── CONTACTO (original intacto) ── */}
      <div className="light-section">
        <section id="contacto">
          <div className="container contacto-grid">
            <div>
              <div className="section-tag">Contacto</div>
              <h2 className="section-title">Agenda tu<br/><span className="grad">valoración inicial</span></h2>
              <p className="section-body">La primera consulta de valoración está incluida sin costo. Cuéntanos tu caso y un terapeuta se pondrá en contacto para agendar tu cita.</p>
              <div className="contacto-info">
                {[
                  {icon:'📞', lbl:'Teléfono',  val:'+52 55 6783 6808'},
                  {icon:'✉️', lbl:'Correo',    val:'contacto@rehabilitandomed.mx'},
                  {icon:'📍', lbl:'Dirección', val:'Av. Río Altar 44, Paseos de Churubusco, Iztapalapa, 09030 Ciudad de México, CDMX'},
                  {icon:'🕐', lbl:'Horario',   val:'Lunes a Viernes 8:00 – 18:00 hrs'},
                ].map(c => (
                  <div className="contacto-item" key={c.lbl}>
                    <div className="contacto-icono">{c.icon}</div>
                    <div>
                      <div className="contacto-lbl">{c.lbl}</div>
                      <div className="contacto-val">{c.val}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <ContactForm />
          </div>
        </section>
      </div>

      {/* ── FOOTER (original intacto) ── */}
      <footer>
        <div className="footer-brand">
          <div className="footer-logo">RM</div>
          <div>
            <div className="footer-name">Rehabilitandomed</div>
            <div className="footer-tag">Clínica de Rehabilitación Física</div>
          </div>
        </div>
        <p className="footer-desc">Sistema de gestión operado con RehabControl · Datos de pacientes protegidos con cifrado de extremo a extremo.</p>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:12,color:'var(--muted)',marginBottom:8}}>© 2025 Rehabilitandomed · Todos los derechos reservados</div>
          <div className="footer-links">
            <a href="#">Aviso de privacidad</a>
            <a href="#">Términos</a>
            <Link href="/login">Portal pacientes</Link>
          </div>
        </div>
      </footer>

      {/* ── MODALS ── */}
      {terapeutaModal && <TerapeutaModal t={terapeutaModal} onClose={() => setTerapeutaModal(null)} />}
      {galeriaModal   && <GaleriaModal item={galeriaModal} onClose={() => setGaleriaModal(null)} />}
    </>
  )
}

// ── FORMULARIO DE CONTACTO (original intacto) ────────────────
function ContactForm() {
  const [estado, setEstado] = useState<'idle'|'loading'|'ok'|'error'>('idle')
  const [msg, setMsg] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setEstado('loading')
    const fd = new FormData(e.currentTarget)
    const res = await fetch('/api/contacto', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        nombre:  fd.get('nombre'),
        telefono:fd.get('telefono'),
        motivo:  fd.get('motivo'),
      }),
    })
    if (res.ok) {
      setEstado('ok')
      setMsg('¡Solicitud enviada! Te contactaremos a la brevedad para agendar tu valoración.')
      ;(e.target as HTMLFormElement).reset()
    } else {
      setEstado('error')
      setMsg('Hubo un error al enviar. Por favor llámanos directamente.')
    }
  }

  return (
    <div className="form-card">
      <div className="form-title">Solicitar valoración gratuita</div>
      <div className="form-nota">
        <strong>Nota:</strong> Este formulario agenda tu primera cita de valoración. El acceso al portal de pacientes se gestiona directamente con tu terapeuta asignado una vez que inicies tu plan.
      </div>
      {estado==='ok'   && <div className="form-success">✅ {msg}</div>}
      {estado==='error'&& <div className="form-error">⚠ {msg}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Nombre completo</label>
          <input name="nombre" className="form-input" type="text" placeholder="Tu nombre completo" required/>
        </div>
        <div className="form-group">
          <label className="form-label">Teléfono de contacto</label>
          <input name="telefono" className="form-input" type="tel" placeholder="10 dígitos" required/>
        </div>
        <div className="form-group">
          <label className="form-label">Motivo de consulta</label>
          <textarea name="motivo" className="form-textarea" placeholder="Describe brevemente tu lesión o condición a tratar..." required/>
        </div>
        <button type="submit" className="form-submit" disabled={estado==='loading'||estado==='ok'}>
          {estado==='loading' && <span className="spinner"/>}
          {estado==='ok' ? 'Solicitud enviada ✓' : 'Solicitar cita gratuita →'}
        </button>
      </form>
    </div>
  )
}
