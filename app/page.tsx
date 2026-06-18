import Link from 'next/link'

export default function LandingPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:       #060B14;
          --bg-2:     #0A1220;
          --surface:  rgba(255,255,255,0.04);
          --surface2: rgba(255,255,255,0.07);
          --border:   rgba(255,255,255,0.10);
          --blue:     #2563EB;
          --blue-2:   #3B82F6;
          --cyan:     #38BDF8;
          --white:    #FFFFFF;
          --text:     #E7EDF7;
          --muted:    #8C9BB5;
          --light-bg: #F4F8FF;
          --light-card: #FFFFFF;
          --light-border: #E1E9F7;
          --light-text: #0B1A33;
          --light-muted: #5C6F8E;
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
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 6%;
          height: 72px;
          background: rgba(6,11,20,0.72);
          backdrop-filter: blur(20px) saturate(140%);
          border-bottom: 1px solid var(--border);
        }
        .nav-brand { display: flex; align-items: center; gap: 11px; text-decoration: none; }
        .nav-logo {
          width: 38px; height: 38px; border-radius: 11px;
          background: linear-gradient(135deg, var(--blue), var(--cyan));
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 800; color: #fff; letter-spacing: -0.5px;
          box-shadow: 0 0 24px rgba(56,189,248,0.35);
        }
        .nav-name { font-size: 15px; font-weight: 700; color: var(--white); letter-spacing: -0.01em; }
        .nav-tag  { font-size: 10px; font-weight: 500; color: var(--cyan); letter-spacing: 0.12em; text-transform: uppercase; }
        .nav-links { display: flex; gap: 38px; list-style: none; }
        .nav-links a { font-size: 14px; font-weight: 500; color: var(--muted); text-decoration: none; transition: color .2s; }
        .nav-links a:hover { color: var(--white); }
        .nav-cta {
          background: linear-gradient(135deg, var(--blue), var(--cyan));
          color: #fff;
          border: none; border-radius: 10px;
          padding: 11px 24px; font-size: 14px; font-weight: 600;
          cursor: pointer; text-decoration: none; transition: transform .2s, box-shadow .2s;
          display: inline-flex; align-items: center; gap: 6px;
          box-shadow: 0 4px 20px rgba(37,99,235,0.35);
        }
        .nav-cta:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(56,189,248,0.45); }

        /* ── HERO ── */
        .hero {
          min-height: 100vh;
          display: flex; align-items: center;
          padding: 150px 6% 100px;
          position: relative; overflow: hidden;
        }
        .hero-grid-bg {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(56,189,248,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56,189,248,0.06) 1px, transparent 1px);
          background-size: 56px 56px;
          mask-image: radial-gradient(ellipse 70% 60% at 50% 30%, black 0%, transparent 80%);
          pointer-events: none;
        }
        .hero-glow1 {
          position: absolute; top: -180px; right: -100px;
          width: 700px; height: 700px; border-radius: 50%;
          background: radial-gradient(circle, rgba(37,99,235,0.30) 0%, transparent 65%);
          pointer-events: none; filter: blur(20px);
        }
        .hero-glow2 {
          position: absolute; bottom: -200px; left: -120px;
          width: 500px; height: 500px; border-radius: 50%;
          background: radial-gradient(circle, rgba(56,189,248,0.18) 0%, transparent 65%);
          pointer-events: none; filter: blur(20px);
        }
        .hero-content {
          max-width: 1180px; margin: 0 auto; width: 100%; position: relative; z-index: 2;
          text-align: center;
        }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 9px;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 100px; padding: 7px 18px 7px 14px;
          font-size: 12.5px; font-weight: 500; color: var(--cyan);
          margin-bottom: 32px; letter-spacing: 0.02em;
          backdrop-filter: blur(8px);
        }
        .hero-badge-dot {
          width: 7px; height: 7px; border-radius: 50%; background: var(--cyan); flex-shrink: 0;
          box-shadow: 0 0 8px var(--cyan);
          animation: pulse-dot 2s ease infinite;
        }
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:.4} }
        .hero-title {
          font-family: 'Inter', sans-serif;
          font-weight: 800;
          font-size: clamp(42px, 6.4vw, 84px);
          line-height: 1.04; letter-spacing: -0.025em;
          color: var(--white);
          margin-bottom: 26px;
        }
        .hero-title .grad {
          background: linear-gradient(110deg, var(--blue-2) 10%, var(--cyan) 60%);
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }
        .hero-desc {
          font-size: 18px; color: var(--muted); line-height: 1.7;
          font-weight: 400; max-width: 620px; margin: 0 auto 44px;
        }
        .hero-btns { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; margin-bottom: 72px; }
        .btn-primary {
          background: linear-gradient(135deg, var(--blue), var(--cyan));
          color: #fff;
          border: none; border-radius: 12px;
          padding: 16px 32px; font-size: 15px; font-weight: 600;
          cursor: pointer; text-decoration: none;
          display: inline-flex; align-items: center; gap: 8px;
          transition: transform .2s, box-shadow .2s;
          font-family: 'Inter', sans-serif;
          box-shadow: 0 8px 28px rgba(37,99,235,0.35);
        }
        .btn-primary:hover { transform: translateY(-3px); box-shadow: 0 12px 36px rgba(56,189,248,0.45); }
        .btn-secondary {
          background: var(--surface); color: var(--white);
          border: 1px solid var(--border); border-radius: 12px;
          padding: 16px 32px; font-size: 15px; font-weight: 600;
          cursor: pointer; text-decoration: none;
          transition: border-color .2s, background .2s, transform .2s;
          font-family: 'Inter', sans-serif;
          backdrop-filter: blur(8px);
        }
        .btn-secondary:hover { border-color: var(--cyan); background: var(--surface2); transform: translateY(-3px); }

        /* Hero dashboard preview (glass card) */
        .hero-preview {
          max-width: 980px; margin: 0 auto;
          background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
          border: 1px solid var(--border); border-radius: 24px;
          padding: 8px;
          box-shadow: 0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03) inset;
          backdrop-filter: blur(20px);
        }
        .hero-preview-inner {
          background: var(--bg-2); border-radius: 18px; padding: 28px;
          display: grid; grid-template-columns: 1.1fr 1fr; gap: 20px;
        }
        .preview-card {
          background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px;
        }
        .preview-card-title { font-size: 12px; color: var(--muted); margin-bottom: 14px; font-weight: 500; }
        .preview-row {
          display: flex; align-items: center; gap: 10px; padding: 9px 0;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .preview-row:last-child { border-bottom: none; }
        .preview-avatar {
          width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
          background: linear-gradient(135deg, var(--blue), var(--cyan));
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 700; color: #fff;
        }
        .preview-name { font-size: 12.5px; font-weight: 500; color: var(--text); }
        .preview-sub  { font-size: 10.5px; color: var(--muted); }
        .preview-pill {
          margin-left: auto; font-size: 10px; font-weight: 600; padding: 3px 9px; border-radius: 100px;
        }
        .pill-ok  { background: rgba(56,189,248,0.15); color: var(--cyan); }
        .pill-pen { background: rgba(245,180,0,0.15); color: #F5B400; }
        .preview-metrics { display: grid; grid-template-columns: repeat(2,1fr); gap: 10px; }
        .preview-metric { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px; }
        .preview-metric-num {
          font-size: 28px; font-weight: 800; letter-spacing: -0.02em;
          background: linear-gradient(110deg, var(--blue-2), var(--cyan));
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }
        .preview-metric-lbl { font-size: 11px; color: var(--muted); margin-top: 4px; }

        /* ── STATS STRIP ── */
        .stats-strip { padding: 0 6%; }
        .stats-inner {
          max-width: 1140px; margin: -1px auto 0;
          display: grid; grid-template-columns: repeat(4,1fr);
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        .stat-item {
          padding: 48px 20px; text-align: center;
          border-right: 1px solid var(--border);
        }
        .stat-item:last-child { border-right: none; }
        .stat-num {
          font-weight: 800;
          font-size: 40px; letter-spacing: -0.02em;
          background: linear-gradient(110deg, var(--blue-2), var(--cyan));
          -webkit-background-clip: text; background-clip: text; color: transparent;
          line-height: 1; margin-bottom: 10px;
        }
        .stat-lbl { font-size: 13px; color: var(--text); font-weight: 500; }
        .stat-sub { font-size: 11.5px; color: var(--muted); margin-top: 3px; }

        /* ── SECTIONS (light theme switch) ── */
        .light-section { background: var(--light-bg); color: var(--light-text); }
        section { padding: 110px 6%; }
        .container { max-width: 1140px; margin: 0 auto; }

        .section-tag {
          display: inline-flex; align-items: center; gap: 9px;
          font-size: 11.5px; font-weight: 600; color: var(--blue);
          letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 20px;
        }
        .section-tag::before { content:''; width:22px; height:2px; background: var(--blue); flex-shrink:0; }
        .section-tag.center { justify-content: center; width: 100%; }
        .section-title {
          font-weight: 800;
          font-size: clamp(32px, 4.2vw, 52px); line-height: 1.1; letter-spacing: -0.02em;
          color: var(--light-text); margin-bottom: 20px;
        }
        .section-title .grad {
          background: linear-gradient(110deg, var(--blue), var(--cyan));
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }
        .section-body { font-size: 16.5px; color: var(--light-muted); line-height: 1.85; font-weight: 400; }

        /* ── QUIÉNES ── */
        .quienes-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: start; }
        .check-list { list-style:none; margin-top:28px; display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .check-list li { display:flex; align-items:center; gap:10px; font-size:14.5px; color:var(--light-text); font-weight: 500; }
        .check-list li::before {
          content:'✓'; width:22px; height:22px; border-radius:50%;
          background: linear-gradient(135deg, var(--blue), var(--cyan)); color:#fff;
          display:flex; align-items:center; justify-content:center;
          font-size:11px; font-weight:700; flex-shrink:0;
        }
        .team-cards { display:flex; flex-direction:column; gap:12px; }
        .team-card {
          background: var(--light-card); border: 1px solid var(--light-border);
          border-radius: 16px; padding: 18px 22px;
          display: flex; align-items: center; justify-content: space-between;
          transition: box-shadow .25s, transform .2s, border-color .2s;
        }
        .team-card:hover { box-shadow: 0 12px 32px rgba(37,99,235,0.12); transform: translateX(4px); border-color: var(--blue); }
        .team-left { display:flex; align-items:center; gap:15px; }
        .avatar {
          width:44px; height:44px; border-radius:13px;
          background: linear-gradient(135deg, var(--blue), var(--cyan));
          display:flex; align-items:center; justify-content:center;
          font-size:13px; font-weight:700; color:#fff; flex-shrink:0;
        }
        .team-name  { font-size:14.5px; font-weight:600; color:var(--light-text); }
        .team-role  { font-size:12px; color:var(--light-muted); }
        .team-spec  { font-size:12px; color:var(--blue); font-weight:600; }
        .problem-box {
          background: var(--light-text); border-radius:18px; padding:24px;
          position: relative; overflow: hidden;
        }
        .problem-box::before {
          content:''; position:absolute; top:-40px; right:-40px; width:140px; height:140px; border-radius:50%;
          background: radial-gradient(circle, rgba(56,189,248,0.30), transparent 70%);
        }
        .problem-label {
          font-size:11px; font-weight:700; color: var(--cyan);
          letter-spacing:0.08em; text-transform:uppercase; margin-bottom:12px;
          position: relative; z-index: 1;
        }
        .problem-text { font-size:13.5px; color: rgba(255,255,255,0.85); line-height:1.7; position: relative; z-index: 1; }

        /* ── OFRECEMOS ── */
        .ofrecemos-header { text-align:center; margin-bottom:64px; }
        .ofrecemos-sub { font-size:16.5px; color:var(--light-muted); max-width:560px; margin:18px auto 0; font-weight:400; line-height:1.75; }
        .features-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
        .feature-card {
          background: var(--light-card); border: 1px solid var(--light-border);
          border-radius: 20px; padding: 30px 26px;
          transition: box-shadow .25s, transform .2s, border-color .2s;
          position: relative; overflow: hidden;
        }
        .feature-card:hover { box-shadow: 0 16px 40px rgba(37,99,235,0.14); transform: translateY(-5px); border-color: var(--blue); }
        .feature-icon {
          width:50px; height:50px; border-radius:14px;
          background: linear-gradient(135deg, var(--blue), var(--cyan));
          display:flex; align-items:center; justify-content:center;
          font-size:23px; margin-bottom:22px;
          box-shadow: 0 8px 20px rgba(37,99,235,0.25);
        }
        .feature-name { font-size:16.5px; font-weight:700; color:var(--light-text); margin-bottom:11px; letter-spacing: -0.01em; }
        .feature-desc { font-size:14px; color:var(--light-muted); line-height:1.7; font-weight:400; }

        /* Roles banner */
        .roles-banner {
          margin-top:52px;
          background: linear-gradient(135deg, var(--light-text) 0%, #122F5C 100%);
          border-radius:24px;
          padding:44px 50px; display:flex; align-items:center; justify-content:space-between; gap:36px;
          position: relative; overflow: hidden;
        }
        .roles-banner::before {
          content:''; position:absolute; top:-60px; right:60px; width:220px; height:220px; border-radius:50%;
          background: radial-gradient(circle, rgba(56,189,248,0.25), transparent 70%);
        }
        .roles-text { position: relative; z-index: 1; }
        .roles-text h3 { font-weight: 800; font-size:30px; color:#fff; margin-bottom:8px; letter-spacing: -0.02em; }
        .roles-text p  { font-size:14.5px; color:rgba(255,255,255,0.55); }
        .roles-chips { display:flex; gap:11px; flex-wrap:wrap; position: relative; z-index: 1; }
        .chip {
          background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.14);
          border-radius:16px; padding:13px 19px;
          display:flex; align-items:center; gap:11px;
          transition: background .2s, transform .2s;
          backdrop-filter: blur(8px);
        }
        .chip:hover { background:rgba(255,255,255,0.14); transform: translateY(-2px); }
        .chip-dot { width:9px; height:9px; border-radius:50%; flex-shrink:0; box-shadow: 0 0 10px currentColor; }
        .chip-label { font-size:13.5px; color:#fff; font-weight:600; }
        .chip-sub   { font-size:11px; color:rgba(255,255,255,0.45); margin-top:2px; }

        /* ── CONTACTO ── */
        .contacto-grid { display:grid; grid-template-columns:1fr 1fr; gap:80px; align-items:start; }
        .contacto-info { display:flex; flex-direction:column; gap:20px; margin-top:36px; }
        .contacto-item { display:flex; align-items:center; gap:18px; }
        .contacto-icon {
          width:48px; height:48px; border-radius:14px;
          background: var(--light-card); border: 1px solid var(--light-border);
          display:flex; align-items:center; justify-content:center;
          font-size:19px; flex-shrink:0;
        }
        .contacto-lbl { font-size:11px; color:var(--light-muted); text-transform:uppercase; letter-spacing:0.07em; font-weight: 600; }
        .contacto-val { font-size:14.5px; font-weight:600; color:var(--light-text); margin-top:2px; }
        .form-card {
          background: var(--light-card); border: 1px solid var(--light-border);
          border-radius:24px; padding:42px;
          box-shadow: 0 20px 60px rgba(37,99,235,0.08);
        }
        .form-title { font-size:20px; font-weight:700; color:var(--light-text); margin-bottom:30px; letter-spacing: -0.01em; }
        .form-group { margin-bottom:18px; }
        .form-label {
          font-size:11px; font-weight:600; color:var(--light-muted);
          letter-spacing:0.08em; text-transform:uppercase;
          display:block; margin-bottom:8px;
        }
        .form-input, .form-textarea {
          width:100%; background: var(--light-bg); border:1px solid var(--light-border);
          border-radius:12px; padding:14px 16px; font-size:14px;
          font-family:'Inter',sans-serif; color:var(--light-text);
          transition:border-color .2s, box-shadow .2s; outline:none;
        }
        .form-input:focus, .form-textarea:focus {
          border-color: var(--blue);
          box-shadow:0 0 0 4px rgba(37,99,235,0.10);
        }
        .form-textarea { resize:vertical; min-height:100px; }
        .form-submit {
          width:100%;
          background: linear-gradient(135deg, var(--blue), var(--cyan));
          color:white;
          border:none; border-radius:12px;
          padding:16px; font-size:15px; font-weight:600;
          cursor:pointer; margin-top:10px;
          font-family:'Inter',sans-serif;
          transition: transform .2s, box-shadow .2s;
          display:flex; align-items:center; justify-content:center; gap:8px;
          box-shadow: 0 8px 24px rgba(37,99,235,0.3);
        }
        .form-submit:hover { transform:translateY(-2px); box-shadow: 0 12px 32px rgba(56,189,248,0.4); }

        /* ── FOOTER ── */
        footer {
          background: var(--bg); padding:48px 6%;
          display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:18px;
          border-top: 1px solid var(--border);
        }
        .footer-brand { display:flex; align-items:center; gap:11px; }
        .footer-logo {
          width:34px; height:34px; border-radius:10px;
          background: linear-gradient(135deg, var(--blue), var(--cyan));
          display:flex; align-items:center; justify-content:center;
          font-size:12px; font-weight:800; color:#fff;
        }
        .footer-name { font-size:14px; color: var(--white); font-weight:600; }
        .footer-copy { font-size:12px; color: var(--muted); }
        .footer-desc { font-size:12.5px; color: var(--muted); max-width:380px; text-align:center; line-height:1.6; }
        .footer-links { display:flex; gap:26px; }
        .footer-links a { font-size:13px; color: var(--muted); text-decoration:none; transition:color .2s; font-weight: 500; }
        .footer-links a:hover { color: var(--cyan); }

        /* ── ANIMATIONS ── */
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(24px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .anim-1 { animation: fadeUp .6s .05s ease both; }
        .anim-2 { animation: fadeUp .6s .15s ease both; }
        .anim-3 { animation: fadeUp .6s .25s ease both; }
        .anim-4 { animation: fadeUp .6s .35s ease both; }
        .anim-5 { animation: fadeUp .7s .45s ease both; }

        /* ── RESPONSIVE ── */
        @media (max-width: 900px) {
          .nav-links { display:none; }
          .quienes-grid, .contacto-grid { grid-template-columns:1fr; gap:48px; }
          .hero-preview-inner { grid-template-columns: 1fr; }
          .features-grid { grid-template-columns:1fr; }
          .stats-inner { grid-template-columns:repeat(2,1fr); }
          .stat-item { border-right:none; border-bottom:1px solid var(--border); }
          .roles-banner { flex-direction:column; align-items:flex-start; padding:32px; }
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
        <div className="hero-grid-bg" />
        <div className="hero-glow1" />
        <div className="hero-glow2" />
        <div className="hero-content">
          <div className="hero-badge anim-1">
            <span className="hero-badge-dot" />
            Plataforma clínica de nueva generación
          </div>
          <h1 className="hero-title anim-2">
            Gestión clínica<br /><span className="grad">segura y centralizada</span>
          </h1>
          <p className="hero-desc anim-3">
            RehabControl unifica expedientes, citas y pagos en un sistema web con control de acceso por roles, cifrado total y trazabilidad completa. Diseñado para clínicas de terapia física y rehabilitación.
          </p>
          <div className="hero-btns anim-4">
            <Link href="/login" className="btn-primary">Acceder al sistema →</Link>
            <a href="#ofrecemos" className="btn-secondary">Ver funcionalidades</a>
          </div>

          {/* Preview tipo dashboard */}
          <div className="hero-preview anim-5">
            <div className="hero-preview-inner">
              <div className="preview-card">
                <div className="preview-card-title">PACIENTES DE HOY</div>
                {[
                  { ini:'MR', name:'María Rodríguez', sub:'Sesión 7 de 10', pill:'Completada', cls:'pill-ok' },
                  { ini:'JL', name:'José López',       sub:'Sesión 3 de 10', pill:'En curso',   cls:'pill-ok' },
                  { ini:'AC', name:'Ana Castro',       sub:'Pago pendiente', pill:'Pendiente',  cls:'pill-pen' },
                ].map(p => (
                  <div className="preview-row" key={p.ini}>
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
                <div className="preview-metric">
                  <div className="preview-metric-num">12</div>
                  <div className="preview-metric-lbl">Citas hoy</div>
                </div>
                <div className="preview-metric">
                  <div className="preview-metric-num">98%</div>
                  <div className="preview-metric-lbl">Asistencia</div>
                </div>
                <div className="preview-metric">
                  <div className="preview-metric-num">4</div>
                  <div className="preview-metric-lbl">Roles activos</div>
                </div>
                <div className="preview-metric">
                  <div className="preview-metric-num">100%</div>
                  <div className="preview-metric-lbl">Datos cifrados</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <div className="stats-strip">
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

      {/* ───── A PARTIR DE AQUÍ, FONDO CLARO ───── */}
      <div className="light-section">

        {/* QUIÉNES SOMOS */}
        <section id="quienes">
          <div className="container quienes-grid">
            <div>
              <div className="section-tag">Quiénes somos</div>
              <h2 className="section-title">Tecnología diseñada<br /><span className="grad">para la salud</span></h2>
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
        <section id="ofrecemos">
          <div className="container">
            <div className="ofrecemos-header">
              <div className="section-tag center">Qué ofrecemos</div>
              <h2 className="section-title">Todo lo que tu clínica necesita,<br /><span className="grad">en un solo lugar</span></h2>
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
                  { dot:'#38BDF8', label:'Administradora', sub:'Acceso total' },
                  { dot:'#3B82F6', label:'Terapeuta',      sub:'Acceso clínico' },
                  { dot:'#6E8FD9', label:'Secretaria',     sub:'Acceso operativo' },
                  { dot:'#A8C5EC', label:'Paciente',       sub:'Solo su información' },
                ].map(c => (
                  <div className="chip" key={c.label}>
                    <div className="chip-dot" style={{background: c.dot, color: c.dot}} />
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
              <h2 className="section-title">Empieza a proteger<br /><span className="grad">tu clínica hoy</span></h2>
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
              <Link href="/login" passHref>
                <button className="form-submit">Enviar solicitud →</button>
              </Link>
            </div>
          </div>
        </section>
      </div>

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