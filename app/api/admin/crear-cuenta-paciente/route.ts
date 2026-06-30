/**
 * /api/admin/crear-cuenta-paciente/route.ts
 * ─────────────────────────────────────────────────────────────
 * F9 — Crear cuenta de portal para un paciente (Admin)
 *
 * SEGURIDAD CRÍTICA:
 *   • Usa supabase.auth.admin (service_role key) — SOLO disponible
 *     en este archivo de servidor. NUNCA se expone al cliente.
 *   • Solo accesible si el usuario autenticado tiene rol admin.
 *   • Si se indica paciente_id, se vincula atómicamente en la misma
 *     operación: el registro clínico existente queda ligado a la
 *     nueva cuenta de acceso.
 *
 * v2 — CAMBIO IMPORTANTE (corrige bug de "otp_expired" por escaneo
 * automático de links en Gmail/Outlook):
 *   Antes usábamos `inviteUserByEmail()`, que hace que Supabase
 *   genere Y ENVÍE el correo con un link de un solo uso que apunta
 *   a su propio endpoint de verificación. Ese link se consume con
 *   solo visitarlo — y los escáneres de seguridad de Gmail/Outlook
 *   lo visitan automáticamente antes de que el usuario haga click,
 *   dejando el token "gastado" para el usuario real.
 *
 *   Ahora usamos `generateLink()`, que SOLO crea el usuario y nos
 *   regresa un token_hash (no manda correo, no es visitable-y-listo).
 *   Nosotros armamos el link nosotros mismos apuntando a nuestra
 *   propia página (?token_hash=...&type=invite como query param,
 *   no fragmento), y mandamos el correo vía Resend con nuestro
 *   propio HTML. Visitar esa página no consume nada — el token solo
 *   se canjea cuando el usuario da click en "Aceptar invitación"
 *   dentro de la página (ver page.tsx, que llama a verifyOtp()).
 *
 * REQUISITO: Variables de entorno
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (¡nunca usar el prefijo NEXT_PUBLIC_ aquí!)
 *   RESEND_API_KEY
 *   NEXT_PUBLIC_SITE_URL
 *
 * NOTA SOBRE RESEND EN SANDBOX:
 *   Mientras no haya un dominio verificado en Resend (resend.com →
 *   Domains), el remitente de prueba `onboarding@resend.dev` SOLO
 *   puede enviar correos a la dirección con la que se creó la cuenta
 *   de Resend — no a cualquier correo de paciente. Para producción,
 *   verifica un dominio propio y cambia EMAIL_FROM más abajo.
 */

import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import nodemailer from 'nodemailer'

const BodySchema = z.object({
  email: z.string().email(),
  nombre_completo: z.string().min(2),
  telefono: z.string().optional(),
  paciente_id: z.number().int().positive().optional(), // vincular de inmediato (opcional)
})

// Envío vía Gmail SMTP (sin restricción de destinatario, a diferencia del
// sandbox de Resend). Requiere GMAIL_USER + GMAIL_APP_PASSWORD (contraseña
// de aplicación generada en myaccount.google.com/apppasswords — NUNCA la
// contraseña normal de la cuenta).
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function POST(request: Request) {
  try {
    // 1. Verificar que quien llama es un admin autenticado
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: rolActual } = await supabase.rpc('auth_rol')
    if (rolActual !== 'admin') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }
    const { email, nombre_completo, telefono, paciente_id } = parsed.data

    // 2. Si se quiere vincular, validar que el paciente existe y no tiene ya una cuenta
    if (paciente_id) {
      const { data: pacienteExistente, error: errBusqueda } = await supabase
        .from('pacientes')
        .select('id_paciente, profile_id')
        .eq('id_paciente', paciente_id)
        .single()

      if (errBusqueda || !pacienteExistente) {
        return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })
      }
      if (pacienteExistente.profile_id) {
        return NextResponse.json({ error: 'Este paciente ya tiene una cuenta vinculada' }, { status: 409 })
      }
    }

    // 3. Cliente admin — service_role key, SOLO en este servidor
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    const redirectTo = `${siteUrl}/auth/establecer-contrasena`

    // 4. Generar el link de invitación SIN enviar correo (eso lo hacemos nosotros)
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        data: { nombre_completo, rol: 'paciente' }, // metadata leída por el trigger on_auth_user_created
        redirectTo,
      },
    })

    if (linkError) {
      const msg = linkError.message.includes('already registered')
        ? 'Ya existe una cuenta con ese correo'
        : 'Error al generar la invitación'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const nuevoUserId = linkData.user.id
    const tokenHash = linkData.properties.hashed_token

    if (!tokenHash) {
      return NextResponse.json({ error: 'No se pudo generar el token de invitación' }, { status: 500 })
    }

    // Link a NUESTRA página, con query params (no fragmento) — cargar esta
    // página no consume nada, solo el click explícito en "Aceptar invitación"
    const linkInvitacion = `${redirectTo}?token_hash=${tokenHash}&type=invite`

    // 5. Mandar el correo nosotros mismos vía Gmail SMTP
    try {
      await transporter.sendMail({
        from: `"RehabControl" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: 'Invitación a tu portal de paciente — RehabControl',
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="color:#111827;">Hola${nombre_completo ? ', ' + nombre_completo : ''} 👋</h2>
            <p style="color:#374151; line-height:1.5;">
              Has sido invitado a crear tu cuenta en el portal de pacientes de RehabControl.
              Da click en el botón para aceptar la invitación y definir tu contraseña.
            </p>
            <p style="text-align:center; margin: 32px 0;">
              <a href="${linkInvitacion}"
                 style="background:#2563EB; color:#fff; padding:14px 28px; border-radius:8px; text-decoration:none; font-weight:600;">
                Aceptar invitación
              </a>
            </p>
            <p style="color:#9CA3AF; font-size:12px;">
              Si tú no solicitaste esto, puedes ignorar este correo.
            </p>
          </div>
        `,
      })
    } catch (mailErr) {
      console.error('Gmail SMTP error:', mailErr)
      // El usuario ya se creó en Auth aunque el correo falle — lo informamos
      // para que el admin pueda reenviar manualmente o revisar las credenciales SMTP.
      return NextResponse.json(
        { error: 'Cuenta creada, pero falló el envío del correo de invitación' },
        { status: 502 }
      )
    }

    // 6. Completar/asegurar el profile (el trigger ya debería haberlo creado,
    //    pero forzamos los datos por si la metadata no llegó completa)
    await adminClient.from('profiles').update({
      nombre_completo,
      telefono: telefono ?? null,
      rol: 'paciente',
      activo: true,
    }).eq('id', nuevoUserId)

    // 7. Vincular con el paciente existente, si se indicó
    if (paciente_id) {
      const { error: errVinculo } = await supabase
        .from('pacientes')
        .update({ profile_id: nuevoUserId })
        .eq('id_paciente', paciente_id)

      if (errVinculo) {
        return NextResponse.json({ error: 'Cuenta creada, pero falló la vinculación con el paciente' }, { status: 500 })
      }
    }

    // 8. Audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      accion: paciente_id ? 'CREAR_CUENTA_PACIENTE_VINCULADA' : 'CREAR_CUENTA_PACIENTE',
      tabla_afectada: 'profiles',
      registro_id: nuevoUserId,
    })

    return NextResponse.json({ ok: true, user_id: nuevoUserId }, { status: 201 })

  } catch (err) {
    console.error('Error en crear-cuenta-paciente:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
