import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// ── VALIDACIÓN SERVIDOR (segunda capa — Zod) ──────────────────
const ESTADOS_VALIDOS = ['activo', 'cerrado', 'en_revision'] as const

const expedienteSchema = z.object({
  paciente_id: z.union([z.string(), z.number()]),
  diagnostico: z.string().min(1, 'El diagnóstico es obligatorio'),
  antecedentes: z.string().optional().nullable(),
  plan_tratamiento: z.string().optional().nullable(),
  motivo_consulta: z.string().min(1, 'El motivo de consulta es obligatorio'),
  fecha_inicio_problema: z.string().optional().nullable(),
  nivel_dolor_inicial: z.coerce.number().min(0).max(10).optional().nullable(),
  limitaciones_fisicas: z.string().optional().nullable(),
  diagnostico_funcional: z.string().optional().nullable(),
  rango_movimiento: z.string().optional().nullable(),
  fuerza_muscular: z.string().optional().nullable(),
  postura_movilidad: z.string().optional().nullable(),
  observaciones_clinicas: z.string().optional().nullable(),
  objetivos_terapeuticos: z.string().optional().nullable(),
  tipo_terapias: z.string().optional().nullable(),
  frecuencia_sesiones: z.string().optional().nullable(),
  indicaciones: z.string().optional().nullable(),
  estado: z.enum(ESTADOS_VALIDOS).default('activo'),
})

// ── POST: crear expediente (solo si no existe ya uno para el paciente) ──
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (profile?.rol !== 'terapeuta' && profile?.rol !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = expedienteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  }

  // Verificar que el paciente esté asignado a este terapeuta (tercera capa: RLS también lo refuerza)
  const { data: paciente } = await supabase
    .from('pacientes')
    .select('id_paciente')
    .eq('id_paciente', parsed.data.paciente_id)
    .eq('terapeuta_id', user.id)
    .single()

  if (!paciente) {
    return NextResponse.json({ error: 'Paciente no encontrado o no asignado a tu cuenta' }, { status: 403 })
  }

  // Evitar duplicados: 1 expediente por paciente
  const { data: existente } = await supabase
    .from('expedientes')
    .select('id_expediente')
    .eq('paciente_id', parsed.data.paciente_id)
    .maybeSingle()

  if (existente) {
    return NextResponse.json({ error: 'Este paciente ya tiene un expediente. Usa edición en su lugar.' }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('expedientes')
    .insert({
      ...parsed.data,
      terapeuta_id: user.id,
      fecha_apertura: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ expediente: data })
}

// ── PUT: editar expediente existente ──────────────────────────
export async function PUT(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (profile?.rol !== 'terapeuta' && profile?.rol !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const { id_expediente, ...resto } = body
  if (!id_expediente) {
    return NextResponse.json({ error: 'Falta id_expediente' }, { status: 400 })
  }

  const parsed = expedienteSchema.safeParse(resto)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  }

  // Verificar que el expediente pertenezca a un paciente de este terapeuta
  const { data: expedienteActual } = await supabase
    .from('expedientes')
    .select('id_expediente, terapeuta_id')
    .eq('id_expediente', id_expediente)
    .eq('terapeuta_id', user.id)
    .single()

  if (!expedienteActual) {
    return NextResponse.json({ error: 'Expediente no encontrado o no autorizado' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('expedientes')
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq('id_expediente', id_expediente)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ expediente: data })
}