/**
 * /api/contratos/route.ts
 * POST — asigna un paquete a un paciente, creando su contrato.
 * Accesible a admin y secretaria.
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const BodySchema = z.object({
  paciente_id: z.number().int().positive(),
  paquete_id: z.number().int().positive(),
  fecha_inicio: z.string(),        // 'YYYY-MM-DD'
  fecha_vencimiento: z.string(),   // 'YYYY-MM-DD'
  // Pago inicial OPCIONAL — si viene, se crea como un registro real en
  // 'pagos' (no como un número suelto). El trigger de la base de datos
  // recalcula monto_pagado del contrato automáticamente a partir de esto.
  pago_inicial: z.object({
    monto: z.coerce.number().min(0.01),
    metodo_pago: z.enum(['efectivo', 'transferencia', 'tarjeta', 'aseguradora']),
    estado_pago: z.enum(['pagado', 'pendiente']).default('pagado'),
  }).optional(),
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
    const { paciente_id, paquete_id, fecha_inicio, fecha_vencimiento, pago_inicial } = parsed.data

    // Traer el paquete para copiar num_sesiones como sesiones_totales
    const { data: paquete, error: errorPaquete } = await supabase
      .from('paquetes')
      .select('num_sesiones')
      .eq('id_paquete', paquete_id)
      .single()

    if (errorPaquete || !paquete) {
      return NextResponse.json({ error: 'Paquete no encontrado' }, { status: 404 })
    }

    // monto_pagado nace en 0 — el trigger de la BD lo recalcula solo en
    // cuanto se registre algún pago real ligado a este contrato.
    const { data: contrato, error } = await supabase
      .from('contratos_paciente')
      .insert({
        paciente_id,
        paquete_id,
        sesiones_totales: paquete.num_sesiones,
        sesiones_usadas: 0,
        sesiones_restantes: paquete.num_sesiones,
        monto_pagado: 0,
        fecha_inicio,
        fecha_vencimiento,
        estado: 'activo',
      })
      .select('*, pacientes(nombre_completo), paquetes(nombre, precio_total)')
      .single()

    if (error) {
      console.error('Error al crear contrato:', error)
      return NextResponse.json({ error: 'No se pudo crear el contrato' }, { status: 500 })
    }

    // Pago inicial opcional — se registra como un pago real vinculado al
    // contrato, no como un número aparte. El trigger recalcula monto_pagado.
    if (pago_inicial) {
      const { error: errorPago } = await supabase.from('pagos').insert({
        paciente_id,
        contrato_id: contrato.id_contrato_paciente,
        monto: pago_inicial.monto,
        metodo_pago: pago_inicial.metodo_pago,
        estado_pago: pago_inicial.estado_pago,
        registrado_por: user.id,
        fecha_pago: new Date().toISOString(),
      })
      if (errorPago) {
        console.error('Contrato creado pero falló el pago inicial:', errorPago)
        return NextResponse.json({
          contrato,
          warning: 'El contrato se creó, pero el pago inicial no se pudo registrar. Regístralo manualmente desde Pagos.',
        }, { status: 201 })
      }

      // Refresca el contrato para traer el monto_pagado ya actualizado
      // por el trigger (arriba lo teníamos en 0, de antes de este pago).
      const { data: contratoActualizado } = await supabase
        .from('contratos_paciente')
        .select('*, pacientes(nombre_completo), paquetes(nombre, precio_total)')
        .eq('id_contrato_paciente', contrato.id_contrato_paciente)
        .single()

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        accion: 'CREAR_CONTRATO_PACIENTE',
        tabla_afectada: 'contratos_paciente',
        registro_id: contrato.id_contrato_paciente?.toString(),
      })

      return NextResponse.json({ contrato: contratoActualizado ?? contrato }, { status: 201 })
    }

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      accion: 'CREAR_CONTRATO_PACIENTE',
      tabla_afectada: 'contratos_paciente',
      registro_id: contrato.id_contrato_paciente?.toString(),
    })

    return NextResponse.json({ contrato }, { status: 201 })
  } catch (err) {
    console.error('Error en POST /api/contratos:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
