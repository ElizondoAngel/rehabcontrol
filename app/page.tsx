'use client'
import Link from 'next/link'
import { useState } from 'react'

export default function LandingPage() {
  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          /* Paleta idéntica al login/admin — azul tech oscuro */
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
          /* Secciones claras — sin blanco puro, tinte azulado suave */
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
        .nav-links { display:flex; gap:36px; list-style:none; }
        .nav-links a { font-size:14px; font-weight:500; color:var(--muted); text-decoration:none; transition:color .2s; }
        .nav-links a:hover { color:#fff; }
        .nav-cta {
          background:linear-gradient(135deg,var(--blue),var(--cyan));
          color:#fff; border:none; border-radius:10px;
          padding:10px 22px; font-size:14px; font-weight:600;
          cursor:pointer; text-decoration:none;
          display:inline-flex; align-items:center; gap:6px;
          box-shadow:0 4px 18px rgba(37,99,235,0.4);
          transition:transform .2s, box-shadow .2s;
        }
        .nav-cta:hover { transform:translateY(-2px); box-shadow:0 8px 26px rgba(56,189,248,0.45); }

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

        /* ── TRANSICIÓN suave oscuro → claro azulado ── */
        .fade-to-light { height:72px; background:linear-gradient(180deg,var(--bg-2) 0%,var(--light-bg) 100%); }
        .fade-to-dark  { height:72px; background:linear-gradient(180deg,var(--light-bg-2) 0%,var(--bg-2) 100%); }
        .fade-to-light2{ height:72px; background:linear-gradient(180deg,var(--bg-2) 0%,var(--light-bg) 100%); }

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
        .section-title {
          font-weight:800;
          font-size:clamp(30px,4vw,50px); line-height:1.1; letter-spacing:-0.02em;
          color:var(--light-text); margin-bottom:18px;
        }
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

        /* ── PROCESO ── oscuro como el admin ── */
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

        /* ── ANIM ── */
        @keyframes fadeUp { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        .a1{animation:fadeUp .6s .05s ease both}
        .a2{animation:fadeUp .6s .15s ease both}
        .a3{animation:fadeUp .6s .25s ease both}
        .a4{animation:fadeUp .6s .35s ease both}
        .a5{animation:fadeUp .7s .45s ease both}

        /* ── RESPONSIVE ── */
        @media(max-width:900px){
          .nav-links{display:none}
          .preview-inner,.quienes-grid,.servicios-grid,.contacto-grid{grid-template-columns:1fr}
          .proceso-grid{grid-template-columns:1fr 1fr;gap:32px}
          .proceso-grid::before{display:none}
          .stats-inner{grid-template-columns:repeat(2,1fr)}
          .stat-item{border-right:none;border-bottom:1px solid var(--border)}
          .aviso-sistema{flex-direction:column;text-align:center}
          .check-list{grid-template-columns:1fr}
          footer{flex-direction:column;align-items:center;text-align:center}
        }
        @media(max-width:500px){
          .proceso-grid{grid-template-columns:1fr}
          .hero-title{font-size:36px}
          .servicios-grid{grid-template-columns:1fr}
        }
      `}</style>

      {/* ── NAV ── */}
      <nav className="nav">
        <a href="#inicio" className="nav-brand">
          <div className="nav-logo">RM</div>
          <div>
            <div className="nav-name">Rehabilitandomed</div>
            <div className="nav-tag">Clínica de Rehabilitación Física</div>
          </div>
        </a>
        <ul className="nav-links">
          <li><a href="#inicio">Inicio</a></li>
          <li><a href="#nosotros">Nosotros</a></li>
          <li><a href="#servicios">Servicios</a></li>
          <li><a href="#proceso">Cómo funciona</a></li>
          <li><a href="#contacto">Contacto</a></li>
        </ul>
        <Link href="/login" className="nav-cta">Portal de pacientes →</Link>
      </nav>

      {/* ── HERO ── */}
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
                  {ini:'MR', name:'Paciente en tratamiento', sub:'Sesión 7 de 10 · Plan activo',         pill:'En progreso',    cls:'pill-ok'},
                  {ini:'AG', name:'Paciente en tratamiento', sub:'Evaluación inicial completada',         pill:'Activo',         cls:'pill-ok'},
                  {ini:'CL', name:'Paciente en tratamiento', sub:'Próxima cita: mañana 10:00 am',        pill:'Pendiente',      cls:'pill-pen'},
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

      {/* ── STATS ── */}
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

      {/* Transición suave oscuro → claro azulado */}
      <div className="fade-to-light"/>

      <div className="light-section">
        {/* ── NOSOTROS ── */}
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

        {/* ── SERVICIOS ── */}
        <section id="servicios" style={{background:'var(--light-bg-2)'}}>
          <div className="container">
            <div className="servicios-header">
              <div className="section-tag center">Servicios</div>
              <h2 className="section-title">Especialidades de<br/><span className="grad">terapia física</span></h2>
              <p className="servicios-sub">Tratamientos físicos basados en evidencia clínica, diseñados para cada tipo de lesión o condición musculoesquelética.</p>
            </div>
            <div className="servicios-grid">
              {[
                {icon:'🦴', nombre:'Rehabilitación ortopédica',      desc:'Recuperación post-quirúrgica, fracturas, prótesis, lesiones articulares y musculoesqueléticas en general.'},
                {icon:'⚽', nombre:'Fisioterapia deportiva',         desc:'Recuperación de lesiones por deporte, readaptación funcional y regreso seguro a la actividad física.'},
                {icon:'🧓', nombre:'Rehabilitación geriátrica',      desc:'Programa para adultos mayores: mejora de equilibrio, prevención de caídas y mantenimiento funcional.'},
                {icon:'💪', nombre:'Terapia manual y masoterapia',   desc:'Técnicas manuales, liberación miofascial, punción seca y manipulación articular terapéutica.'},
                {icon:'🔄', nombre:'Rehabilitación postural',        desc:'Corrección de alteraciones posturales, escoliosis funcional y dolor crónico de columna vertebral.'},
                {icon:'⚡', nombre:'Electroterapia y ultrasonido',   desc:'Equipos de electroterapia, ultrasonido terapéutico y láser para acelerar la recuperación tisular.'},
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

      {/* Transición claro → oscuro */}
      <div className="fade-to-dark"/>

      {/* ── PROCESO ── */}
      <section className="proceso-section" id="proceso">
        <div className="container">
          <div className="proceso-header">
            <div className="section-tag center">Cómo funciona</div>
            <h2 className="section-title">Tu camino hacia<br/><span className="grad">la recuperación</span></h2>
            <p className="section-body">El acceso al portal digital requiere una valoración presencial. Tu cuenta se crea solo cuando el equipo evalúa tu caso y decides iniciar un plan de tratamiento.</p>
          </div>
          <div className="proceso-grid">
            {[
              {icon:'📞', titulo:'Agenda tu cita',      desc:'Llámanos o escríbenos para agendar tu primera cita. La valoración inicial está incluida sin costo adicional.',      nota:''},
              {icon:'🩺', titulo:'Valoración clínica',  desc:'Un terapeuta certificado evalúa tu condición, hace el diagnóstico funcional y diseña tu plan de tratamiento.',       nota:''},
              {icon:'📦', titulo:'Elige tu paquete',    desc:'Te presentamos las opciones según tu plan. Tú decides con qué paquete iniciar. Manejamos efectivo, tarjeta y aseguradora.', nota:'Solo con paquete activo'},
              {icon:'🔑', titulo:'Accede al portal',    desc:'Con paquete activo, la clínica crea tu cuenta digital. Recibes invitación por correo para establecer tu contraseña.',   nota:'Cuenta creada por la clínica'},
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

      {/* Transición oscuro → claro */}
      <div className="fade-to-light2"/>

      {/* ── CONTACTO ── */}
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

      {/* ── FOOTER ── */}
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
    </>
  )
}

// ── FORMULARIO DE CONTACTO (componente cliente) ──────────────
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
      {estado==='ok'  && <div className="form-success">✅ {msg}</div>}
      {estado==='error'&&<div className="form-error">⚠ {msg}</div>}
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
