/**
 * /api/contratos/activo/route.ts
 * GET ?paciente_id=X — resumen del contrato activo de un paciente
 * (duración de sesión de su paquete, nombre, saldo). Accesible a
 * admin y secretaria. Se usa para autocompletar la duración al
 * agendar una cita, y para mostrar el estado del paquete.
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
    if (!['admin', 'secretaria'].includes(profile?.rol ?? '')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const pacienteId = searchParams.get('paciente_id')
    if (!pacienteId) return NextResponse.json({ error: 'paciente_id requerido' }, { status: 400 })

    const { data: contratoRaw, error } = await supabase
      .from('contratos_paciente')
      .select('id_contrato_paciente, sesiones_totales, sesiones_usadas, sesiones_restantes, monto_pagado, fecha_vencimiento, paquetes(nombre, precio_total, duracion_sesion_min)')
      .eq('paciente_id', pacienteId)
      .eq('estado', 'activo')
      .gte('fecha_vencimiento', (() => {
        const h = new Date()
        return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`
      })())
      .order('fecha_inicio', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error consultando contrato activo:', error)
      return NextResponse.json({ error: 'Error al consultar el contrato' }, { status: 500 })
    }

    if (!contratoRaw) {
      return NextResponse.json({ tiene_contrato: false })
    }

    const paquete: any = Array.isArray(contratoRaw.paquetes) ? contratoRaw.paquetes[0] : contratoRaw.paquetes

    return NextResponse.json({
      tiene_contrato: true,
      paquete_nombre: paquete?.nombre ?? null,
      duracion_sesion_min: paquete?.duracion_sesion_min ?? null,
      sesiones_restantes: contratoRaw.sesiones_restantes,
      saldo_pendiente: Math.max(Number(paquete?.precio_total ?? 0) - Number(contratoRaw.monto_pagado), 0),
    })
  } catch (err) {
    console.error('Error en /api/contratos/activo:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
