/**
 * /api/contacto/route.ts
 * POST — recibe solicitud de valoración desde la landing de Rehabilitandomed
 *
 * Estrategia de envío:
 *   1. Guarda la solicitud en la tabla `solicitudes_contacto` (trazabilidad)
 *   2. Envía correo de notificación a la clínica usando el SMTP configurado
 *      en Supabase (el mismo que usamos para las invitaciones de pacientes)
 *
 * No requiere autenticación — es un endpoint público de la landing.
 * Rate limiting básico: Supabase/Vercel controlan el abuso a nivel de proxy.
 */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const BodySchema = z.object({
  nombre:   z.string().min(2, 'Nombre demasiado corto').max(100),
  telefono: z.string().min(10, 'Teléfono inválido').max(15),
  motivo:   z.string().min(10, 'Describe brevemente tu motivo').max(1000),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }
    const { nombre, telefono, motivo } = parsed.data

    // ── 1. Guardar solicitud en BD para trazabilidad ──────────
    // Usamos service_role para insertar sin restricciones de RLS
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    await adminClient.from('solicitudes_contacto').insert({
      nombre,
      telefono,
      motivo,
      fecha: new Date().toISOString(),
      atendida: false,
    })

    // ── 2. Enviar correo de notificación a la clínica ─────────
    const correoClinica = (process.env.CORREO_CLINICA ?? '').trim()

    if (process.env.RESEND_API_KEY && correoClinica) {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // En plan gratuito de Resend sin dominio verificado,
          // el "from" DEBE ser onboarding@resend.dev
          // Una vez que verifiques tu dominio en Resend, cámbialo
          // a: 'Rehabilitandomed <noreply@rehabilitandomed.mx>'
          from: 'Rehabilitandomed <onboarding@resend.dev>',
          to: [correoClinica],
          subject: `Nueva solicitud de valoración — ${nombre}`,
          html: `
            <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #f8fafc;">
              <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">
                <div style="background: linear-gradient(135deg, #2563EB, #38BDF8); padding: 3px; border-radius: 10px; margin-bottom: 24px; display: inline-block;">
                  <div style="background: white; border-radius: 8px; padding: 8px 16px;">
                    <span style="font-size: 13px; font-weight: 700; color: #2563EB;">REHABILITANDOMED</span>
                  </div>
                </div>
                <h2 style="color: #0B1A33; font-size: 20px; margin-bottom: 6px;">Nueva solicitud de valoración</h2>
                <p style="color: #64748b; font-size: 14px; margin-bottom: 24px;">Recibida el ${new Date().toLocaleDateString('es-MX', { weekday:'long', day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })}</p>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: 600; width: 140px;">Nombre</td>
                      <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #0B1A33; font-weight: 500;">${nombre}</td></tr>
                  <tr><td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: 600;">Teléfono</td>
                      <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #0B1A33; font-weight: 500;">${telefono}</td></tr>
                  <tr><td style="padding: 12px 0; font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: 600; vertical-align: top; padding-top: 16px;">Motivo</td>
                      <td style="padding: 12px 0; font-size: 14px; color: #0B1A33; padding-top: 16px; line-height: 1.6;">${motivo}</td></tr>
                </table>
                <div style="margin-top: 24px; padding: 16px; background: #EEF4FB; border-radius: 10px; font-size: 13px; color: #4A6180;">
                  💡 Recuerda marcar esta solicitud como atendida en el panel de administración de RehabControl una vez que hagas contacto.
                </div>
              </div>
            </div>
          `,
        }),
      })
      const resendData = await resendRes.json()
      if (!resendRes.ok) {
        console.error('Resend error:', resendData)
      } else {
        console.log('Correo enviado correctamente:', resendData.id)
      }
    }
    // Si no hay RESEND_API_KEY o CORREO_CLINICA, la solicitud
    // quedó guardada en BD — visible desde Supabase Table Editor.

    return NextResponse.json({ ok: true }, { status: 201 })

  } catch (err) {
    console.error('Error en /api/contacto:', err)
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 })
  }
}
