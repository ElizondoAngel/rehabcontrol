/**
 * /api/contratos/abonar/route.ts
 * POST — registra un abono (pago por cuotas) sobre un contrato ya
 * existente. Crea un registro real en 'pagos' ligado al contrato — el
 * trigger de la base de datos recalcula monto_pagado automáticamente.
 * Accesible a admin y secretaria.
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const BodySchema = z.object({
  contrato_id: z.number().int().positive(),
  monto: z.coerce.number().min(0.01),
  metodo_pago: z.enum(['efectivo', 'transferencia', 'tarjeta', 'aseguradora']),
  estado_pago: z.enum(['pagado', 'pendiente']).default('pagado'),
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
    const { contrato_id, monto, metodo_pago, estado_pago } = parsed.data

    // Confirmar que el contrato existe y traer su paciente_id
    const { data: contrato, error: errorContrato } = await supabase
      .from('contratos_paciente')
      .select('id_contrato_paciente, paciente_id')
      .eq('id_contrato_paciente', contrato_id)
      .single()

    if (errorContrato || !contrato) {
      return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
    }

    const { error: errorPago } = await supabase.from('pagos').insert({
      paciente_id: contrato.paciente_id,
      contrato_id: contrato.id_contrato_paciente,
      monto,
      metodo_pago,
      estado_pago,
      registrado_por: user.id,
      fecha_pago: new Date().toISOString(),
    })

    if (errorPago) {
      console.error('Error al registrar abono:', errorPago)
      return NextResponse.json({ error: 'No se pudo registrar el abono' }, { status: 500 })
    }

    // Traer el contrato ya actualizado (el trigger recalcula monto_pagado)
    const { data: contratoActualizado } = await supabase
      .from('contratos_paciente')
      .select('*, pacientes(nombre_completo), paquetes(nombre, precio_total)')
      .eq('id_contrato_paciente', contrato_id)
      .single()

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      accion: 'ABONAR_CONTRATO_PACIENTE',
      tabla_afectada: 'pagos',
      registro_id: contrato_id.toString(),
    })

    return NextResponse.json({ contrato: contratoActualizado }, { status: 201 })
  } catch (err) {
    console.error('Error en POST /api/contratos/abonar:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
