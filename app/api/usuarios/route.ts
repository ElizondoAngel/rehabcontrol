/**
 * /api/usuarios/route.ts
 * ─────────────────────────────────────────────────────────────
 * F7 — Cambio de rol / activación de cuentas (solo Admin)
 *
 * SEGURIDAD:
 *   • Solo admin puede ejecutar
 *   • Un admin NO puede modificarse a sí mismo (evita auto-bloqueo
 *     o escalación accidental documentada como riesgo en Fase 1)
 *   • Validación Zod
 *   • Audit log de cada cambio (acción crítica)
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const PatchSchema = z.object({
  id: z.string().uuid(),
  rol: z.enum(['admin','terapeuta','secretaria','paciente']).optional(),
  activo: z.boolean().optional(),
}).refine(d => d.rol !== undefined || d.activo !== undefined, 'Nada que actualizar')

async function verificarRol(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.rpc('auth_rol')
  return { user, rol: data as string }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const auth = await verificarRol(supabase)
    if (!auth || auth.rol !== 'admin') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { id, ...campos } = parsed.data

    // Un admin no puede modificar su propia cuenta desde aquí
    if (id === auth.user.id) {
      return NextResponse.json({ error: 'No puedes modificar tu propia cuenta' }, { status: 403 })
    }

    const { error } = await supabase
      .from('profiles')
      .update(campos)
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: 'Error al actualizar el usuario' }, { status: 500 })
    }

    await supabase.from('audit_logs').insert({
      user_id: auth.user.id,
      accion: campos.rol ? 'CAMBIAR_ROL' : (campos.activo ? 'ACTIVAR_USUARIO' : 'DESACTIVAR_USUARIO'),
      tabla_afectada: 'profiles',
      registro_id: id,
    })

    return NextResponse.json({ ok: true })

  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
