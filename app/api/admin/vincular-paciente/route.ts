/**
 * /api/admin/vincular-paciente/route.ts
 * ─────────────────────────────────────────────────────────────
 * F9 — Vincular una cuenta de portal (profiles, rol=paciente)
 * con un registro clínico (pacientes) que ya existe.
 *
 * Caso de uso: la secretaria registró al paciente primero (sin
 * cuenta) y el admin crea/vincula su acceso al portal después.
 *
 * SEGURIDAD:
 *   • Solo admin
 *   • Valida que el profile sea rol paciente
 *   • Valida que ni el profile ni el paciente ya estén vinculados
 *   • Audit log
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const BodySchema = z.object({
  paciente_id: z.number().int().positive(),
  profile_id: z.string().uuid(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
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
    const { paciente_id, profile_id } = parsed.data

    // Validar que el profile existe, es rol paciente y no está ya vinculado a otro registro
    const { data: profile, error: errProfile } = await supabase
      .from('profiles')
      .select('id, rol')
      .eq('id', profile_id)
      .single()
    if (errProfile || !profile) {
      return NextResponse.json({ error: 'Cuenta de usuario no encontrada' }, { status: 404 })
    }
    if (profile.rol !== 'paciente') {
      return NextResponse.json({ error: 'Solo se pueden vincular cuentas con rol paciente' }, { status: 400 })
    }

    const { data: yaVinculado } = await supabase
      .from('pacientes')
      .select('id_paciente')
      .eq('profile_id', profile_id)
      .maybeSingle()
    if (yaVinculado) {
      return NextResponse.json({ error: 'Esta cuenta ya está vinculada a otro paciente' }, { status: 409 })
    }

    const { data: paciente, error: errPaciente } = await supabase
      .from('pacientes')
      .select('id_paciente, profile_id')
      .eq('id_paciente', paciente_id)
      .single()
    if (errPaciente || !paciente) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })
    }
    if (paciente.profile_id) {
      return NextResponse.json({ error: 'Este paciente ya tiene una cuenta vinculada' }, { status: 409 })
    }

    const { error: errUpdate } = await supabase
      .from('pacientes')
      .update({ profile_id })
      .eq('id_paciente', paciente_id)

    if (errUpdate) {
      return NextResponse.json({ error: 'Error al vincular la cuenta' }, { status: 500 })
    }

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      accion: 'VINCULAR_CUENTA_PACIENTE',
      tabla_afectada: 'pacientes',
      registro_id: paciente_id.toString(),
    })

    return NextResponse.json({ ok: true })

  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}