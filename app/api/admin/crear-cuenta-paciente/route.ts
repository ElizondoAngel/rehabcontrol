/**
 * /api/admin/crear-cuenta-paciente/route.ts
 * ─────────────────────────────────────────────────────────────
 * F9 — Crear cuenta de portal para un paciente (Admin)
 *
 * SEGURIDAD CRÍTICA:
 *   • Usa supabase.auth.admin (service_role key) — SOLO disponible
 *     en este archivo de servidor. NUNCA se expone al cliente.
 *   • Solo accesible si el usuario autenticado tiene rol admin.
 *   • inviteUserByEmail() crea el usuario en Auth y envía un correo
 *     con un link para que el paciente defina su propia contraseña
 *     (más seguro que generar contraseñas temporales nosotros).
 *   • Si se indica paciente_id, se vincula atómicamente en la misma
 *     operación: el registro clínico existente queda ligado a la
 *     nueva cuenta de acceso.
 *
 * REQUISITO: Variables de entorno
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (¡nunca usar el prefijo NEXT_PUBLIC_ aquí!)
 */

import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const BodySchema = z.object({
  email: z.string().email(),
  nombre_completo: z.string().min(2),
  telefono: z.string().optional(),
  paciente_id: z.number().int().positive().optional(), // vincular de inmediato (opcional)
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

    // 4. Invitar al usuario por correo — Supabase crea la cuenta y envía el link
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { nombre_completo, rol: 'paciente' }, // metadata leída por el trigger on_auth_user_created
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/establecer-contrasena`,
    })

    if (inviteError) {
      const msg = inviteError.message.includes('already registered')
        ? 'Ya existe una cuenta con ese correo'
        : 'Error al enviar la invitación'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const nuevoUserId = inviteData.user.id

    // 5. Completar/asegurar el profile (el trigger ya debería haberlo creado,
    //    pero forzamos los datos por si la metadata no llegó completa)
    await adminClient.from('profiles').update({
      nombre_completo,
      telefono: telefono ?? null,
      rol: 'paciente',
      activo: true,
    }).eq('id', nuevoUserId)

    // 6. Vincular con el paciente existente, si se indicó
    if (paciente_id) {
      const { error: errVinculo } = await supabase
        .from('pacientes')
        .update({ profile_id: nuevoUserId })
        .eq('id_paciente', paciente_id)

      if (errVinculo) {
        return NextResponse.json({ error: 'Cuenta creada, pero falló la vinculación con el paciente' }, { status: 500 })
      }
    }

    // 7. Audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      accion: paciente_id ? 'CREAR_CUENTA_PACIENTE_VINCULADA' : 'CREAR_CUENTA_PACIENTE',
      tabla_afectada: 'profiles',
      registro_id: nuevoUserId,
    })

    return NextResponse.json({ ok: true, user_id: nuevoUserId }, { status: 201 })

  } catch (err) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}