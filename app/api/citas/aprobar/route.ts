/**
 * /api/citas/aprobar/route.ts
 * POST — la secretaria (o admin) confirma o rechaza una cita que
 * solicitó un paciente (estado 'pendiente_aprobacion').
 *
 *   - accion='confirmar' → estado pasa a 'programada', se manda un
 *     correo al paciente avisándole (Gmail SMTP, mismo transporte que
 *     ya usamos para las invitaciones de cuenta).
 *   - accion='rechazar'  → estado pasa a 'cancelada'. No se manda
 *     correo por ahora (se puede agregar después si se necesita).
 *
 * El UPDATE exige que la cita SIGA en 'pendiente_aprobacion' al
 * momento de procesarla — evita que dos personas la resuelvan a la
 * vez o que se reprocese una ya resuelta.
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import nodemailer from 'nodemailer'

const BodySchema = z.object({
  cita_id: z.number().int().positive(),
  accion: z.enum(['confirmar', 'rechazar']),
})

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
    if (!['admin', 'secretaria'].includes(profile?.rol ?? '')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }
    const { cita_id, accion } = parsed.data
    const nuevoEstado = accion === 'confirmar' ? 'programada' : 'cancelada'

    // Update condicionado: solo si SIGUE pendiente — evita doble procesamiento
    const { data: cita, error } = await supabase
      .from('citas')
      .update({ estado: nuevoEstado, aprobado_por: user.id, aprobado_en: new Date().toISOString() })
      .eq('id_cita', cita_id)
      .eq('estado', 'pendiente_aprobacion')
      .select(`
        id_cita, fecha_hora, duracion_min, estado,
        pacientes(nombre_completo, profiles!pacientes_profile_id_fkey(email)),
        profiles!citas_terapeuta_id_fkey(nombre_completo)
      `)
      .single()

    if (error || !cita) {
      return NextResponse.json({ error: 'La solicitud ya no está pendiente o no existe' }, { status: 409 })
    }

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      accion: accion === 'confirmar' ? 'CONFIRMAR_CITA_PACIENTE' : 'RECHAZAR_CITA_PACIENTE',
      tabla_afectada: 'citas',
      registro_id: cita_id.toString(),
    })

    // Correo al paciente SOLO si se confirmó
    if (accion === 'confirmar') {
      const pacienteInfo: any = Array.isArray(cita.pacientes) ? cita.pacientes[0] : cita.pacientes
      const terapeutaInfo: any = Array.isArray(cita.profiles) ? cita.profiles[0] : cita.profiles
      const perfilPaciente: any = Array.isArray(pacienteInfo?.profiles) ? pacienteInfo.profiles[0] : pacienteInfo?.profiles
      const emailPaciente = perfilPaciente?.email

      if (emailPaciente) {
        const fecha = new Date(cita.fecha_hora)
        try {
          await transporter.sendMail({
            from: `"RehabControl" <${process.env.GMAIL_USER}>`,
            to: emailPaciente,
            subject: 'Tu cita fue confirmada — RehabControl',
            html: `
              <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
                <h2 style="color:#111827;">¡Tu cita fue confirmada! ✅</h2>
                <p style="color:#374151; line-height:1.5;">
                  Hola${pacienteInfo?.nombre_completo ? ', ' + pacienteInfo.nombre_completo : ''}, tu solicitud de cita ya fue confirmada por la clínica:
                </p>
                <div style="background:#F3F4F6; border-radius:8px; padding:16px; margin:20px 0;">
                  <p style="margin:0 0 6px;"><strong>Fecha:</strong> ${fecha.toLocaleDateString('es-MX', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</p>
                  <p style="margin:0 0 6px;"><strong>Hora:</strong> ${fecha.toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' })} hrs</p>
                  <p style="margin:0 0 6px;"><strong>Duración:</strong> ${cita.duracion_min} minutos</p>
                  <p style="margin:0;"><strong>Terapeuta:</strong> ${terapeutaInfo?.nombre_completo ?? '—'}</p>
                </div>
                <p style="color:#374151; line-height:1.5;">
                  Recuerda que el pago se realiza <strong>en la clínica</strong> al momento de tu sesión.
                </p>
                <p style="color:#9CA3AF; font-size:12px;">Si tienes dudas, contacta directamente a la clínica.</p>
              </div>
            `,
          })
        } catch (mailErr) {
          console.error('Cita confirmada pero falló el correo:', mailErr)
          // No fallamos la respuesta por esto — la cita ya quedó confirmada,
          // el correo es un plus. Se puede reenviar manualmente si hace falta.
        }
      } else {
        console.warn('Cita confirmada pero el paciente no tiene email registrado (id_cita:', cita_id, ')')
      }
    }

    return NextResponse.json({ ok: true, cita: { id_cita: cita.id_cita, estado: cita.estado } })
  } catch (err) {
    console.error('Error en POST /api/citas/aprobar:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
