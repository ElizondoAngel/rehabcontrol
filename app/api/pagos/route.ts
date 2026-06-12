/**
 * /api/pagos/route.ts
 * ─────────────────────────────────────────────────────────────
 * F5 — Registro de pagos (vinculado a citas)
 *
 * SEGURIDAD:
 *   • Validación Zod
 *   • Solo admin/secretaria pueden registrar pagos
 *   • Audit log
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const PagoSchema = z.object({
  paciente_id: z.number().int().positive(),
  cita_id:     z.number().int().positive().optional(),
  contrato_id: z.number().int().positive().optional(),
  monto:       z.number().positive(),
  metodo_pago: z.enum(['efectivo','transferencia','tarjeta','aseguradora']),
  estado_pago: z.enum(['pendiente','pagado','reembolsado']).default('pendiente'),
})

async function verificarRol(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.rpc('auth_rol')
  return { user, rol: data as string }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const auth = await verificarRol(supabase)
    if (!auth || !['admin','secretaria'].includes(auth.rol)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = PagoSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { data: pago, error } = await supabase
      .from('pagos')
      .insert({ ...parsed.data, registrado_por: auth.user.id })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Error al registrar el pago' }, { status: 500 })
    }

    await supabase.from('audit_logs').insert({
      user_id: auth.user.id, accion: 'REGISTRAR_PAGO',
      tabla_afectada: 'pagos', registro_id: pago.id_pago.toString(),
    })

    return NextResponse.json({ pago }, { status: 201 })

  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// ── PATCH — Marcar pago pendiente como cobrado ────────────────
const PatchSchema = z.object({
  id: z.number().int().positive(),
  estado_pago: z.enum(['pendiente','pagado','reembolsado']),
  metodo_pago: z.enum(['efectivo','transferencia','tarjeta','aseguradora']).optional(),
})

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const auth = await verificarRol(supabase)
    if (!auth || !['admin','secretaria'].includes(auth.rol)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { id, ...campos } = parsed.data
    const update: Record<string, unknown> = { estado_pago: campos.estado_pago }
    if (campos.metodo_pago) update.metodo_pago = campos.metodo_pago
    if (campos.estado_pago === 'pagado') update.fecha_pago = new Date().toISOString()

    const { error } = await supabase
      .from('pagos')
      .update(update)
      .eq('id_pago', id)

    if (error) {
      return NextResponse.json({ error: 'Error al actualizar el pago' }, { status: 500 })
    }

    await supabase.from('audit_logs').insert({
      user_id: auth.user.id, accion: 'COBRAR_PAGO',
      tabla_afectada: 'pagos', registro_id: id.toString(),
    })

    return NextResponse.json({ ok: true })

  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
