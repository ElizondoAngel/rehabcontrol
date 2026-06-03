import Link from 'next/link'

export default function LandingPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=DM+Serif+Display:ital@0;1&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:      #F2F8F5;
          --bg-card: #FFFFFF;
          --dark:    #163D2B;
          --mid:     #1A9068;
          --light:   #4FC49A;
          --pale:    #DCF2E9;
          --border:  #C4E0D2;
          --text:    #122E20;
          --muted:   #527A66;
          --shadow:  0 1px 4px rgba(22,61,43,0.07), 0 6px 24px rgba(22,61,43,0.06);
        }

        html { scroll-behavior: smooth; }

        body {
          font-family: 'DM Sans', sans-serif;
          background: var(--bg);
          color: var(--text);
          font-size: 16px;
          line-height: 1.6;
          overflow-x: hidden;
        }

        /* ── NAV ── */
        .nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 6%;
          height: 68px;
          background: rgba(242,248,245,0.90);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border);
        }
        .nav-brand { display: flex; align-items: center; gap: 11px; text-decoration: none; }
        .nav-logo {
          width: 38px; height: 38px; border-radius: 10px;
          background: var(--dark);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 600; color: var(--pale); letter-spacing: -0.5px;
        }
        .nav-name { font-size: 15px; font-weight: 600; color: var(--dark); }
        .nav-tag  { font-size: 10px; font-weight: 500; color: var(--mid); letter-spacing: 0.09em; text-transform: uppercase; }
        .nav-links { display: flex; gap: 36px; list-style: none; }
        .nav-links a { font-size: 14px; color: var(--muted); text-decoration: none; transition: color .2s; }
        .nav-links a:hover { color: var(--dark); }
        .nav-cta {
          background: var(--dark); color: var(--pale);
          border: none; border-radius: 9px;
          padding: 10px 22px; font-size: 14px; font-weight: 500;
          cursor: pointer; text-decoration: none; transition: background .2s, transform .15s;
          display: inline-flex; align-items: center; gap: 6px;
        }
        .nav-cta:hover { background: var(--mid); transform: translateY(-1px); }

        /* ── HERO ── */
        .hero {
          min-height: 100vh;
          display: flex; align-items: center;
          padding: 140px 6% 100px;
          position: relative; overflow: hidden;
        }
        .hero-orb1 {
          position: absolute; top: -120px; right: -80px;
          width: 600px; height: 600px; border-radius: 50%;
          background: radial-gradient(circle, rgba(26,144,104,0.13) 0%, transparent 70%);
          pointer-events: none;
        }
        .hero-orb2 {
          position: absolute; bottom: -100px; left: -60px;
          width: 400px; height: 400px; border-radius: 50%;
          background: radial-gradient(circle, rgba(79,196,154,0.09) 0%, transparent 70%);
          pointer-events: none;
        }
        .hero-grid {
          max-width: 1140px; margin: 0 auto;
          display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center;
          width: 100%;
        }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: var(--pale); border: 1px solid var(--border);
          border-radius: 100px; padding: 6px 16px;
          font-size: 12px; font-weight: 500; color: var(--mid);
          margin-bottom: 28px; letter-spacing: 0.05em;
        }
        .hero-badge-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--mid); flex-shrink: 0; }
        .hero-title {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(40px, 5.5vw, 68px);
          line-height: 1.07; color: var(--dark);
          margin-bottom: 24px;
        }
        .hero-title em { font-style: italic; color: var(--mid); }
        .hero-desc {
          font-size: 17px; color: var(--muted); line-height: 1.75;
          font-weight: 300; margin-bottom: 40px; max-width: 480px;
        }
        .hero-btns { display: flex; gap: 12px; flex-wrap: wrap; }
        .btn-primary {
          background: var(--dark); color: var(--pale);
          border: none; border-radius: 10px;
          padding: 14px 28px; font-size: 15px; font-weight: 500;
          cursor: pointer; text-decoration: none;
          display: inline-flex; align-items: center; gap: 8px;
          transition: background .2s, transform .15s;
          font-family: 'DM Sans', sans-serif;
        }
        .btn-primary:hover { background: var(--mid); transform: translateY(-2px); }
        .btn-secondary {
          background: transparent; color: var(--dark);
          border: 1.5px solid var(--border); border-radius: 10px;
          padding: 14px 28px; font-size: 15px; font-weight: 500;
          cursor: pointer; text-decoration: none;
          transition: border-color .2s, background .2s, transform .15s;
          font-family: 'DM Sans', sans-serif;
        }
        .btn-secondary:hover { border-color: var(--mid); background: var(--pale); transform: translateY(-2px); }

        /* Hero visual panel */
        .hero-panel {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: 20px; padding: 28px;
          box-shadow: var(--shadow);
          display: flex; flex-direction: column; gap: 14px;
        }
        .panel-header {
          display: flex; align-items: center; justify-content: space-between;
          padding-bottom: 16px; border-bottom: 1px solid var(--border);
        }
        .panel-title { font-size: 14px; font-weight: 600; color: var(--dark); }
        .panel-badge {
          background: var(--pale); color: var(--mid);
          font-size: 11px; font-weight: 600; padding: 3px 10px;
          border-radius: 100px; letter-spacing: 0.04em;
        }
        .panel-row {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px; border-radius: 12px;
          background: var(--bg); border: 1px solid var(--border);
          transition: box-shadow .2s;
        }
        .panel-row:hover { box-shadow: 0 2px 8px rgba(22,61,43,0.08); }
        .panel-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: var(--pale); display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 600; color: var(--dark); flex-shrink: 0;
        }
        .panel-info { flex: 1; }
        .panel-name { font-size: 13px; font-weight: 500; color: var(--dark); }
        .panel-sub  { font-size: 11px; color: var(--muted); }
        .panel-status {
          font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 100px;
        }
        .status-ok  { background: #DCF2E9; color: #1A9068; }
        .status-pen { background: #FFF3DC; color: #B47B00; }
        .status-pro { background: #E6F0FB; color: #2065B4; }
        .panel-metrics {
          display: grid; grid-template-columns: repeat(3,1fr); gap: 10px;
          padding-top: 4px;
        }
        .metric-box {
          background: var(--bg); border: 1px solid var(--border);
          border-radius: 10px; padding: 12px;
          text-align: center;
        }
        .metric-num { font-size: 22px; font-weight: 600; color: var(--dark); }
        .metric-lbl { font-size: 11px; color: var(--muted); margin-top: 2px; }

        /* ── STATS BAR ── */
        .stats-bar { background: var(--dark); padding: 0 6%; }
        .stats-inner {
          max-width: 1140px; margin: 0 auto;
          display: grid; grid-template-columns: repeat(4,1fr);
        }
        .stat-item {
          padding: 40px 20px; text-align: center;
          border-right: 1px solid rgba(255,255,255,0.07);
        }
        .stat-item:last-child { border-right: none; }
        .stat-num {
          font-family: 'DM Serif Display', serif;
          font-size: 44px; color: var(--light); line-height: 1; margin-bottom: 8px;
        }
        .stat-lbl { font-size: 13px; color: rgba(255,255,255,0.5); }
        .stat-sub { font-size: 11px; color: rgba(255,255,255,0.28); margin-top: 2px; }

        /* ── SECTIONS ── */
        section { padding: 100px 6%; }
        .container { max-width: 1140px; margin: 0 auto; }

        .section-tag {
          display: flex; align-items: center; gap: 10px;
          font-size: 11px; font-weight: 600; color: var(--mid);
          letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 18px;
        }
        .section-tag::before { content:''; width:24px; height:2px; background:var(--mid); flex-shrink:0; }
        .section-tag.center { justify-content: center; }
        .section-tag.center::before { display:none; }
        .section-tag.center::after { content:''; width:24px; height:2px; background:var(--mid); flex-shrink:0; }
        .section-title {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(32px, 4vw, 50px); line-height: 1.12;
          color: var(--dark); margin-bottom: 18px;
        }
        .section-title em { font-style: italic; color: var(--mid); }
        .section-body { font-size: 16px; color: var(--muted); line-height: 1.8; font-weight: 300; }

        /* ── QUIÉNES ── */
        .quienes-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 72px; align-items: start; }
        .check-list { list-style:none; margin-top:24px; display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .check-list li { display:flex; align-items:center; gap:8px; font-size:14px; color:var(--text); }
        .check-list li::before {
          content:'✓'; width:20px; height:20px; border-radius:50%;
          background:var(--pale); color:var(--mid);
          display:flex; align-items:center; justify-content:center;
          font-size:11px; font-weight:700; flex-shrink:0;
        }
        .team-cards { display:flex; flex-direction:column; gap:10px; }
        .team-card {
          background:var(--bg-card); border:1px solid var(--border);
          border-radius:14px; padding:16px 20px;
          display:flex; align-items:center; justify-content:space-between;
          transition: box-shadow .2s, transform .2s;
        }
        .team-card:hover { box-shadow:var(--shadow); transform:translateX(3px); }
        .team-left { display:flex; align-items:center; gap:14px; }
        .avatar {
          width:42px; height:42px; border-radius:50%;
          background:var(--pale); display:flex; align-items:center; justify-content:center;
          font-size:13px; font-weight:600; color:var(--dark); flex-shrink:0;
        }
        .team-name  { font-size:14px; font-weight:500; color:var(--dark); }
        .team-role  { font-size:12px; color:var(--muted); }
        .team-spec  { font-size:12px; color:var(--mid); font-weight:500; }
        .problem-box {
          background:var(--pale); border:1px solid var(--border);
          border-left: 3px solid var(--mid);
          border-radius:14px; padding:20px;
        }
        .problem-label {
          font-size:11px; font-weight:600; color:var(--mid);
          letter-spacing:0.08em; text-transform:uppercase; margin-bottom:10px;
        }
        .problem-text { font-size:13px; color:var(--text); line-height:1.65; }

        /* ── OFRECEMOS ── */
        .ofrecemos-bg { background: var(--bg-card); }
        .ofrecemos-header { text-align:center; margin-bottom:60px; }
        .ofrecemos-sub { font-size:16px; color:var(--muted); max-width:520px; margin:16px auto 0; font-weight:300; line-height:1.7; }
        .features-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; }
        .feature-card {
          background:var(--bg); border:1px solid var(--border);
          border-radius:18px; padding:28px 24px;
          transition: box-shadow .25s, transform .2s;
          position: relative; overflow: hidden;
        }
        .feature-card::before {
          content:''; position:absolute; top:0; left:0; right:0; height:3px;
          background: linear-gradient(90deg, var(--mid), var(--light));
          opacity: 0; transition: opacity .25s;
        }
        .feature-card:hover { box-shadow:var(--shadow); transform:translateY(-3px); }
        .feature-card:hover::before { opacity: 1; }
        .feature-icon {
          width:46px; height:46px; border-radius:12px;
          background:var(--pale); display:flex; align-items:center; justify-content:center;
          font-size:22px; margin-bottom:20px;
        }
        .feature-name { font-size:16px; font-weight:600; color:var(--dark); margin-bottom:10px; }
        .feature-desc { font-size:14px; color:var(--muted); line-height:1.65; font-weight:300; }

        /* Roles banner */
        .roles-banner {
          margin-top:48px; background:var(--dark); border-radius:20px;
          padding:40px 48px; display:flex; align-items:center; justify-content:space-between; gap:32px;
        }
        .roles-text h3 { font-family:'DM Serif Display',serif; font-size:28px; color:var(--pale); margin-bottom:6px; }
        .roles-text p  { font-size:14px; color:rgba(255,255,255,0.45); }
        .roles-chips { display:flex; gap:10px; flex-wrap:wrap; }
        .chip {
          background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.10);
          border-radius:14px; padding:12px 18px;
          display:flex; align-items:center; gap:10px;
          transition: background .2s;
        }
        .chip:hover { background:rgba(255,255,255,0.10); }
        .chip-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        .chip-label { font-size:13px; color:rgba(255,255,255,0.8); font-weight:500; }
        .chip-sub   { font-size:11px; color:rgba(255,255,255,0.35); margin-top:1px; }

        /* ── CONTACTO ── */
        .contacto-grid { display:grid; grid-template-columns:1fr 1fr; gap:72px; align-items:start; }
        .contacto-info { display:flex; flex-direction:column; gap:18px; margin-top:32px; }
        .contacto-item { display:flex; align-items:center; gap:16px; }
        .contacto-icon {
          width:44px; height:44px; border-radius:12px;
          background:var(--pale); display:flex; align-items:center; justify-content:center;
          font-size:18px; flex-shrink:0;
        }
        .contacto-lbl { font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:0.07em; }
        .contacto-val { font-size:14px; font-weight:500; color:var(--dark); margin-top:1px; }
        .form-card {
          background:var(--bg-card); border:1px solid var(--border);
          border-radius:22px; padding:40px;
          box-shadow:var(--shadow);
        }
        .form-title { font-size:19px; font-weight:600; color:var(--dark); margin-bottom:28px; }
        .form-group { margin-bottom:16px; }
        .form-label {
          font-size:11px; font-weight:600; color:var(--muted);
          letter-spacing:0.08em; text-transform:uppercase;
          display:block; margin-bottom:7px;
        }
        .form-input, .form-textarea {
          width:100%; background:var(--bg); border:1px solid var(--border);
          border-radius:10px; padding:13px 15px; font-size:14px;
          font-family:'DM Sans',sans-serif; color:var(--text);
          transition:border-color .2s, box-shadow .2s; outline:none;
        }
        .form-input:focus, .form-textarea:focus {
          border-color:var(--mid);
          box-shadow:0 0 0 3px rgba(26,144,104,0.10);
        }
        .form-textarea { resize:vertical; min-height:100px; }
        .form-submit {
          width:100%; background:var(--mid); color:white;
          border:none; border-radius:10px;
          padding:15px; font-size:15px; font-weight:500;
          cursor:pointer; margin-top:8px;
          font-family:'DM Sans',sans-serif;
          transition:background .2s, transform .15s;
          display:flex; align-items:center; justify-content:center; gap:8px;
        }
        .form-submit:hover { background:var(--dark); transform:translateY(-2px); }

        /* ── FOOTER ── */
        footer {
          background:var(--dark); padding:40px 6%;
          display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px;
        }
        .footer-brand { display:flex; align-items:center; gap:10px; }
        .footer-logo {
          width:32px; height:32px; border-radius:8px;
          background:rgba(255,255,255,0.08);
          display:flex; align-items:center; justify-content:center;
          font-size:12px; font-weight:600; color:var(--pale);
        }
        .footer-name { font-size:14px; color:rgba(255,255,255,0.75); font-weight:500; }
        .footer-copy { font-size:12px; color:rgba(255,255,255,0.30); }
        .footer-desc { font-size:12px; color:rgba(255,255,255,0.30); max-width:380px; text-align:center; line-height:1.6; }
        .footer-links { display:flex; gap:24px; }
        .footer-links a { font-size:13px; color:rgba(255,255,255,0.35); text-decoration:none; transition:color .2s; }
        .footer-links a:hover { color:var(--light); }

        /* ── ANIMATIONS ── */
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .anim-1 { animation: fadeUp .55s .05s ease both; }
        .anim-2 { animation: fadeUp .55s .15s ease both; }
        .anim-3 { animation: fadeUp .55s .25s ease both; }
        .anim-4 { animation: fadeUp .55s .35s ease both; }
        .anim-5 { animation: fadeUp .55s .45s ease both; }

        /* ── RESPONSIVE ── */
        @media (max-width: 900px) {
          .nav-links { display:none; }
          .hero-grid, .quienes-grid, .contacto-grid { grid-template-columns:1fr; gap:40px; }
          .hero-panel { display:none; }
          .features-grid { grid-template-columns:1fr; }
          .stats-inner { grid-template-columns:repeat(2,1fr); }
          .stat-item { border-right:none; border-bottom:1px solid rgba(255,255,255,0.07); }
          .roles-banner { flex-direction:column; align-items:flex-start; padding:28px; }
          .check-list { grid-template-columns:1fr; }
          footer { flex-direction:column; align-items:center; text-align:center; }
          .footer-desc { text-align:center; }
        }
      `}</style>

      {/* NAV */}
      <nav className="nav">
        <a href="#inicio" className="nav-brand">
          <div className="nav-logo">RC</div>
          <div>
            <div className="nav-name">RehabControl</div>
            <div className="nav-tag">Sistema Clínico</div>
          </div>
        </a>
        <ul className="nav-links">
          <li><a href="#inicio">Inicio</a></li>
          <li><a href="#quienes">Quiénes somos</a></li>
          <li><a href="#ofrecemos">Qué ofrecemos</a></li>
          <li><a href="#contacto">Contacto</a></li>
        </ul>
        <Link href="/login" className="nav-cta">Iniciar sesión →</Link>
      </nav>

      {/* HERO */}
      <section className="hero" id="inicio">
        <div className="hero-orb1" />
        <div className="hero-orb2" />
        <div className="hero-grid">
          <div>
            <div className="hero-badge anim-1">
              <span className="hero-badge-dot" />
              Sistema clínico seguro
            </div>
            <h1 className="hero-title anim-2">
              Gestión clínica <em>segura</em><br />y centralizada
            </h1>
            <p className="hero-desc anim-3">
              RehabControl unifica expedientes, citas y pagos en un sistema web con control de acceso por roles, cifrado total y trazabilidad completa. Diseñado para clínicas de terapia física y rehabilitación.
            </p>
            <div className="hero-btns anim-4">
              <Link href="/login" className="btn-primary">Acceder al sistema →</Link>
              <a href="#ofrecemos" className="btn-secondary">Ver funcionalidades</a>
            </div>
          </div>

          {/* Panel visual derecho */}
          <div className="anim-5">
            <div className="hero-panel">
              <div className="panel-header">
                <span className="panel-title">Pacientes de hoy</span>
                <span className="panel-badge">En vivo</span>
              </div>
              {[
                { ini:'MR', name:'María Rodríguez', sub:'Sesión 7 de 10', status:'Completada', st:'ok' },
                { ini:'JL', name:'José López',       sub:'Sesión 3 de 10', status:'En curso',   st:'pro' },
                { ini:'AC', name:'Ana Castro',       sub:'Pago pendiente', status:'Pendiente',  st:'pen' },
              ].map(p => (
                <div className="panel-row" key={p.ini}>
                  <div className="panel-avatar">{p.ini}</div>
                  <div className="panel-info">
                    <div className="panel-name">{p.name}</div>
                    <div className="panel-sub">{p.sub}</div>
                  </div>
                  <span className={`panel-status status-${p.st}`}>{p.status}</span>
                </div>
              ))}
              <div className="panel-metrics">
                <div className="metric-box">
                  <div className="metric-num">12</div>
                  <div className="metric-lbl">Citas hoy</div>
                </div>
                <div className="metric-box">
                  <div className="metric-num">8</div>
                  <div className="metric-lbl">Completadas</div>
                </div>
                <div className="metric-box">
                  <div className="metric-num" style={{color:'var(--mid)'}}>98%</div>
                  <div className="metric-lbl">Asistencia</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <div className="stats-bar">
        <div className="stats-inner">
          {[
            { num:'4',    lbl:'Roles de acceso',  sub:'diferenciados' },
            { num:'100%', lbl:'Datos cifrados',   sub:'en tránsito y reposo' },
            { num:'0',    lbl:'Exposición',        sub:'de datos no autorizados' },
            { num:'24/7', lbl:'Disponibilidad',   sub:'del sistema' },
          ].map(s => (
            <div className="stat-item" key={s.lbl}>
              <div className="stat-num">{s.num}</div>
              <div className="stat-lbl">{s.lbl}</div>
              <div className="stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* QUIÉNES SOMOS */}
      <section id="quienes">
        <div className="container quienes-grid">
          <div>
            <div className="section-tag">Quiénes somos</div>
            <h2 className="section-title">Tecnología diseñada<br /><em>para la salud</em></h2>
            <div className="section-body">
              <p>RehabControl nació de la necesidad real de clínicas de terapia física y rehabilitación que operaban con cuadernos físicos, hojas de cálculo y calendarios compartidos sin ningún control de acceso.</p>
              <br />
              <p>Nuestra misión es proteger la información médica de cada paciente y devolverle al equipo clínico el tiempo y la confianza que merece, con tecnología segura y accesible desde cualquier dispositivo.</p>
            </div>
            <ul className="check-list">
              {['Autenticación por roles','Cifrado de datos médicos','Logs de auditoría completos','Sin instalación local','Operación bajo HTTPS','Soporte especializado'].map(i => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="team-cards">
              {[
                { ini:'VM', name:'Dra. Valeria Moreno', role:'Directora Clínica',    spec:'Rehabilitación Neurológica' },
                { ini:'DR', name:'Lic. Diego Ramírez',  role:'Jefe de Terapeutas',  spec:'Fisioterapia Deportiva' },
                { ini:'SC', name:'Ing. Sofía Castillo', role:'Coordinadora de TI',  spec:'Seguridad de Información' },
              ].map(t => (
                <div className="team-card" key={t.ini}>
                  <div className="team-left">
                    <div className="avatar">{t.ini}</div>
                    <div>
                      <div className="team-name">{t.name}</div>
                      <div className="team-role">{t.role}</div>
                    </div>
                  </div>
                  <div className="team-spec">{t.spec}</div>
                </div>
              ))}
              <div className="problem-box">
                <div className="problem-label">⚠ Problemática resuelta</div>
                <p className="problem-text">Sin RehabControl, cualquier colaborador con acceso al archivo podía ver datos sensibles de cualquier paciente, sin registro de quién consultó qué ni cuándo.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QUÉ OFRECEMOS */}
      <section id="ofrecemos" className="ofrecemos-bg">
        <div className="container">
          <div className="ofrecemos-header">
            <div className="section-tag center">Qué ofrecemos</div>
            <h2 className="section-title">Todo lo que tu clínica necesita,<br /><em>en un solo lugar</em></h2>
            <p className="ofrecemos-sub">Seis módulos diseñados para cubrir cada aspecto de la operación clínica, con seguridad integrada desde el primer día.</p>
          </div>
          <div className="features-grid">
            {[
              { icon:'📋', name:'Expediente Clínico Digital',     desc:'Historial completo, seguro y accesible solo para quienes corresponde. Sin papeles, sin riesgo de pérdida.' },
              { icon:'📅', name:'Gestión de Citas Inteligente',   desc:'Agenda centralizada con control de acceso por rol. Sin conflictos, sin sobreposiciones.' },
              { icon:'💳', name:'Control de Pagos',               desc:'Registro financiero por sesión, reportes globales y trazabilidad completa de cada transacción.' },
              { icon:'🛡', name:'Seguridad por Roles',            desc:'Cada usuario accede únicamente a lo que su función requiere. HTTPS, cifrado y logs de auditoría.' },
              { icon:'📊', name:'Reportes y Métricas',            desc:'Datos precisos para decisiones clínicas y financieras. Visualiza el desempeño en tiempo real.' },
              { icon:'💬', name:'Asistente RC integrado',         desc:'Chatbot de apoyo disponible para terapeutas y pacientes. Orientación inmediata las 24 horas.' },
            ].map(f => (
              <div className="feature-card" key={f.name}>
                <div className="feature-icon">{f.icon}</div>
                <div className="feature-name">{f.name}</div>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="roles-banner">
            <div className="roles-text">
              <h3>Control de acceso por rol</h3>
              <p>Cada usuario ve exactamente lo que necesita. Nada más, nada menos.</p>
            </div>
            <div className="roles-chips">
              {[
                { dot:'#E24B4A', label:'Administradora', sub:'Nivel 4 · Acceso total' },
                { dot:'#378ADD', label:'Terapeuta',      sub:'Nivel 3 · Acceso clínico' },
                { dot:'#7F77DD', label:'Secretaria',     sub:'Nivel 2 · Acceso operativo' },
                { dot:'#1D9E75', label:'Paciente',       sub:'Nivel 1 · Solo su info' },
              ].map(c => (
                <div className="chip" key={c.label}>
                  <div className="chip-dot" style={{background: c.dot}} />
                  <div>
                    <div className="chip-label">{c.label}</div>
                    <div className="chip-sub">{c.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CONTACTO */}
      <section id="contacto">
        <div className="container contacto-grid">
          <div>
            <div className="section-tag">Contacto</div>
            <h2 className="section-title">Empieza a proteger<br /><em>tu clínica hoy</em></h2>
            <p className="section-body">Agenda una demostración gratuita y te mostramos cómo RehabControl transforma la gestión de tu clínica en menos de 30 minutos.</p>
            <div className="contacto-info">
              {[
                { icon:'📞', lbl:'Teléfono', val:'(55) 1234-5678' },
                { icon:'✉️', lbl:'Correo',   val:'contacto@rehabcontrol.mx' },
                { icon:'🌐', lbl:'Web',      val:'www.rehabcontrol.mx' },
                { icon:'📍', lbl:'Oficina',  val:'Ciudad de México, CDMX' },
              ].map(c => (
                <div className="contacto-item" key={c.lbl}>
                  <div className="contacto-icon">{c.icon}</div>
                  <div>
                    <div className="contacto-lbl">{c.lbl}</div>
                    <div className="contacto-val">{c.val}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="form-card">
            <div className="form-title">Solicitar demostración</div>
            <div className="form-group">
              <label className="form-label">Nombre completo</label>
              <input className="form-input" type="text" placeholder="Dr. Carlos Herrera" />
            </div>
            <div className="form-group">
              <label className="form-label">Correo electrónico</label>
              <input className="form-input" type="email" placeholder="clinica@ejemplo.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Mensaje</label>
              <textarea className="form-textarea" placeholder="Cuéntanos sobre tu clínica y lo que necesitas..." />
            </div>
            <button className="form-submit">Enviar solicitud →</button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-brand">
          <div className="footer-logo">RC</div>
          <div>
            <div className="footer-name">RehabControl</div>
            <div className="footer-copy">© 2025</div>
          </div>
        </div>
        <p className="footer-desc">Sistema web seguro de gestión clínica para rehabilitación física · Todos los derechos reservados.</p>
        <div className="footer-links">
          <a href="#">Privacidad</a>
          <a href="#">Términos</a>
          <a href="#">Seguridad</a>
        </div>
      </footer>
    </>
  )
}
