'use client'

/**
 * app/unauthorized/page.tsx
 * ─────────────────────────────────────────────────────────────
 * Página 403 personalizada — versión "clínica".
 * 100% SVG/CSS original, sin dependencias externas: línea de
 * electrocardiograma animada + expediente clínico con sello de
 * "DENEGADO" que cae y rebota al cargar la página.
 */

export default function UnauthorizedPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --bg:#060B14;--card:rgba(255,255,255,0.035);--card-border:rgba(255,255,255,0.09);
          --border:rgba(255,255,255,0.09);
          --blue:#2563EB;--cyan:#38BDF8;
          --text:#E7EDF7;--muted:#8C9BB5;
          --red:#F25555;--red-dark:#B91C1C;
        }
        body{
          font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);
          min-height:100vh;display:flex;align-items:center;justify-content:center;
          padding:24px;position:relative;overflow:hidden;
        }
        .glow-red{position:absolute;top:-180px;right:-120px;width:520px;height:520px;border-radius:50%;
          background:radial-gradient(circle,rgba(242,85,85,0.2) 0%,transparent 65%);pointer-events:none}
        .glow-blue{position:absolute;bottom:-160px;left:-100px;width:420px;height:420px;border-radius:50%;
          background:radial-gradient(circle,rgba(37,99,235,0.18) 0%,transparent 65%);pointer-events:none}

        .card{
          position:relative;z-index:1;width:100%;max-width:850px;
          background:var(--card);border:1px solid var(--card-border);border-radius:22px;
          overflow:hidden;backdrop-filter:blur(16px);
          box-shadow:0 20px 60px rgba(0,0,0,0.5);
        }

        /* ── FRANJA DE ELECTROCARDIOGRAMA (loop continuo) ── */
        .ekg-strip{
          position:relative;height:64px;background:#04070D;
          border-bottom:1px solid var(--card-border);overflow:hidden;
        }
        .ekg-strip svg{position:absolute;top:0;left:0;height:100%;width:200%}
        .ekg-line{
          fill:none;stroke:var(--cyan);stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;
          filter:drop-shadow(0 0 4px rgba(56,189,248,0.6));
          animation:ekg-scroll 3.2s linear infinite;
        }
        @keyframes ekg-scroll{ from{transform:translateX(0)} to{transform:translateX(-50%)} }
        .ekg-grid{position:absolute;inset:0;
          background-image:
            linear-gradient(rgba(242,85,85,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(242,85,85,0.06) 1px, transparent 1px);
          background-size:14px 14px;
        }
        .ekg-label{
          position:absolute;top:8px;left:14px;font-size:9.5px;font-weight:700;
          letter-spacing:.1em;text-transform:uppercase;color:rgba(56,189,248,0.65);
          display:flex;align-items:center;gap:6px;z-index:2;
        }
        .ekg-dot{width:6px;height:6px;border-radius:50%;background:var(--red);animation:pulse 1s ease-in-out infinite}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.6)}}

        /* ── ESCENA: EXPEDIENTE + SELLO ── */
        .scene{
          position:relative;padding:34px 30px 14px;display:flex;align-items:center;justify-content:center;
          min-height:150px;
        }
        .folder{
          position:relative;width:150px;
        }
        .folder-back{
          background:linear-gradient(145deg,#1a2942,#0F1B2E);
          border:1px solid var(--card-border);border-radius:6px 10px 10px 10px;
          height:104px;position:relative;
          box-shadow:0 10px 26px rgba(0,0,0,0.4);
          animation:folder-in .6s cubic-bezier(.34,1.56,.64,1) both;
        }
        @keyframes folder-in{ from{opacity:0;transform:translateY(10px) scale(.92)} to{opacity:1;transform:none} }
        .folder-tab{
          position:absolute;top:-9px;left:14px;width:46px;height:12px;
          background:#1a2942;border:1px solid var(--card-border);border-bottom:none;
          border-radius:5px 5px 0 0;
        }
        .folder-lines{position:absolute;top:20px;left:16px;right:16px;display:flex;flex-direction:column;gap:8px}
        .folder-line{height:5px;border-radius:3px;background:rgba(231,237,247,0.1)}
        .folder-line:nth-child(1){width:70%}
        .folder-line:nth-child(2){width:90%}
        .folder-line:nth-child(3){width:55%}

        .stamp{
          position:absolute;top:38%;left:50%;
          transform-origin:center;
          width:112px;height:112px;
          border:3.5px solid var(--red);border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          background:rgba(242,85,85,0.06);
          animation:stamp-slam .55s cubic-bezier(.2,1.4,.4,1) .5s both;
        }
        @keyframes stamp-slam{
          0%{ opacity:0; transform:translate(-50%,-160%) rotate(-22deg) scale(1.6); }
          60%{ opacity:1; transform:translate(-50%,-50%) rotate(-12deg) scale(1.08); }
          80%{ transform:translate(-50%,-50%) rotate(-14deg) scale(0.97); }
          100%{ opacity:1; transform:translate(-50%,-50%) rotate(-13deg) scale(1); }
        }
        .stamp-text{
          font-size:15px;font-weight:900;color:var(--red);letter-spacing:.03em;
          text-align:center;line-height:1.15;transform:rotate(-13deg);
          text-shadow:0 0 10px rgba(242,85,85,0.4);
        }
        .stamp-ring{
          position:absolute;inset:-6px;border-radius:50%;border:1.5px dashed rgba(242,85,85,0.45);
          animation:ring-spin 14s linear infinite;
        }
        @keyframes ring-spin{ to{ transform:rotate(360deg) } }

        .body{padding:8px 30px 30px;text-align:center}

        .code-row{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:6px}
        .code{
          font-size:52px;font-weight:900;letter-spacing:-0.03em;line-height:1;
          background:linear-gradient(135deg,var(--red),#FF8A8A);
          -webkit-background-clip:text;background-clip:text;color:transparent;
        }
        .badge{
          font-size:10.5px;font-weight:700;color:var(--red);background:rgba(242,85,85,0.12);
          border:1px solid rgba(242,85,85,0.3);padding:4px 10px;border-radius:100px;
          letter-spacing:.05em;text-transform:uppercase;
        }

        .title{font-size:18px;font-weight:800;color:var(--text);letter-spacing:-0.01em;margin-bottom:10px}
        .sub{font-size:13.5px;color:var(--muted);line-height:1.6;margin-bottom:6px}
        .sub strong{color:var(--text);font-weight:600}
        .flavor{
          font-size:12.5px;color:rgba(140,155,181,0.75);font-style:italic;
          margin-top:14px;margin-bottom:26px;line-height:1.5;
        }

        .btn-back{
          display:inline-flex;align-items:center;gap:8px;
          background:linear-gradient(135deg,var(--blue),var(--cyan));color:#fff;
          border:none;border-radius:11px;padding:13px 26px;
          font-size:14px;font-weight:600;text-decoration:none;font-family:'Inter',sans-serif;
          box-shadow:0 8px 24px rgba(37,99,235,0.35);transition:transform .2s,box-shadow .2s;
        }
        .btn-back:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(56,189,248,0.4)}

        .footer-note{margin-top:20px;font-size:10.5px;color:rgba(140,155,181,0.5)}
      `}</style>

      <div className="glow-red" />
      <div className="glow-blue" />

      <div className="card">
        {/* FRANJA EKG — loop infinito */}
        <div className="ekg-strip">
          <div className="ekg-grid" />
          <div className="ekg-label"><span className="ekg-dot" />Monitor de acceso</div>
          <svg viewBox="0 0 600 64" preserveAspectRatio="none">
            <path
              className="ekg-line"
              d="M0,32 L60,32 L80,32 L92,10 L104,54 L116,32 L140,32
                 L160,32 L172,10 L184,54 L196,32 L220,32
                 L300,32 L320,32 L332,10 L344,54 L356,32 L380,32
                 L400,32 L412,10 L424,54 L436,32 L460,32
                 L600,32
                 M600,32 L660,32 L680,32 L692,10 L704,54 L716,32 L740,32
                 L760,32 L772,10 L784,54 L796,32 L820,32
                 L900,32 L920,32 L932,10 L944,54 L956,32 L980,32
                 L1000,32 L1012,10 L1024,54 L1036,32 L1060,32
                 L1200,32"
            />
          </svg>
        </div>

        {/* ESCENA: EXPEDIENTE + SELLO DE DENEGADO */}
        <div className="scene">
          <div className="folder">
            <div className="folder-tab" />
            <div className="folder-back">
              <div className="folder-lines">
                <div className="folder-line" />
                <div className="folder-line" />
                <div className="folder-line" />
              </div>
            </div>
          </div>
          <div className="stamp">
            <div className="stamp-ring" />
            <div className="stamp-text">ACCESO<br/>DENEGADO</div>
          </div>
        </div>

        <div className="body">
          <div className="code-row">
            <span className="code">403</span>
            <span className="badge">🩺 Consulta restringida</span>
          </div>

          <div className="title">Este expediente no está bajo tu cuidado</div>
          <div className="sub">
            Tu cuenta <strong>no tiene el nivel de autorización</strong> necesario para acceder a esta sección.
          </div>
          <div className="flavor">
            Como en cualquier consultorio, solo el personal asignado puede revisar este historial clínico.
          </div>

          <a href="/login" className="btn-back">
            ← Volver a zona segura
          </a>

          <div className="footer-note">Si crees que esto es un error, contacta a tu administrador.</div>
        </div>
      </div>
    </>
  )
}
