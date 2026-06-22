/**
 * /api/admin/expedientes/route.ts
 * GET  — detalle completo de un paciente (expediente + citas + pagos)
 * POST — crear expediente
 * PATCH — actualizar expediente
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const ExpedienteSchema = z.object({
  paciente_id: z.number().int().positive(),
  id_expediente: z.number().int().positive().optional(),
  diagnostico: z.string().min(1).optional(),
  estado: z.enum(['activo','alta','suspendido']).optional(),
  motivo_consulta: z.string().nullable().optional(),
  fecha_inicio_problema: z.string().nullable().optional(),
  nivel_dolor_inicial: z.coerce.number().min(0).max(10).nullable().optional(),
  limitaciones_fisicas: z.string().nullable().optional(),
  diagnostico_funcional: z.string().nullable().optional(),
  rango_movimiento: z.string().nullable().optional(),
  fuerza_muscular: z.string().nullable().optional(),
  postura_movilidad: z.string().nullable().optional(),
  observaciones_clinicas: z.string().nullable().optional(),
  objetivos_terapeuticos: z.string().nullable().optional(),
  tipo_terapias: z.string().nullable().optional(),
  frecuencia_sesiones: z.string().nullable().optional(),
  plan_tratamiento: z.string().nullable().optional(),
  antecedentes: z.string().nullable().optional(),
  indicaciones: z.string().nullable().optional(),
})

async function verificarAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
  if (!['admin','secretaria'].includes(profile?.rol ?? '')) return null
  return user
}

// GET — detalle completo de un paciente
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const user = await verificarAdmin(supabase)
    if (!user) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const paciente_id = searchParams.get('paciente_id')
    if (!paciente_id) return NextResponse.json({ error: 'paciente_id requerido' }, { status: 400 })

    const { data: paciente, error } = await supabase
      .from('pacientes')
      .select(`
        *,
        profiles(nombre_completo),
        expedientes(*),
        citas(
          id_cita, fecha_hora, estado, notas, duracion_min,
          progreso_sesiones(nivel_dolor, movilidad, observaciones, ejercicios_completados)
        ),
        pagos(id_pago, monto, estado_pago, metodo_pago, fecha_pago, motivo_reembolso)
      `)
      .eq('id_paciente', paciente_id)
      .order('fecha_hora', { referencedTable: 'citas', ascending: false })
      .single()

    if (error) return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })

    return NextResponse.json({ paciente })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// POST — crear expediente nuevo
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const user = await verificarAdmin(supabase)
    if (!user) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const body = await request.json()
    const parsed = ExpedienteSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

    const { paciente_id, id_expediente, ...campos } = parsed.data

    const { data: expediente, error } = await supabase
      .from('expedientes')
      .insert({ paciente_id, terapeuta_id: user.id, ...campos })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Error al crear expediente' }, { status: 500 })

    await supabase.from('audit_logs').insert({
      user_id: user.id, accion: 'CREAR_EXPEDIENTE',
      tabla_afectada: 'expedientes', registro_id: expediente.id_expediente.toString(),
    })

    return NextResponse.json({ expediente }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// PATCH — actualizar expediente existente
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const user = await verificarAdmin(supabase)
    if (!user) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const body = await request.json()
    const parsed = ExpedienteSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

    const { id_expediente, paciente_id, ...campos } = parsed.data
    if (!id_expediente) return NextResponse.json({ error: 'id_expediente requerido' }, { status: 400 })

    const { data: expediente, error } = await supabase
      .from('expedientes')
      .update({ ...campos, updated_at: new Date().toISOString() })
      .eq('id_expediente', id_expediente)
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Error al actualizar expediente' }, { status: 500 })

    await supabase.from('audit_logs').insert({
      user_id: user.id, accion: 'EDITAR_EXPEDIENTE',
      tabla_afectada: 'expedientes', registro_id: id_expediente.toString(),
    })

    return NextResponse.json({ expediente })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
