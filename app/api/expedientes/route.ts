import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sincronizarRutinaConPaciente } from '@/lib/rutina-ia'

// ── VALIDACIÓN SERVIDOR (segunda capa — Zod, HU #3) ──────────────────
const ESTADOS_VALIDOS = ['activo', 'cerrado', 'en_revision', 'alta', 'suspendido'] as const

const expedienteSchema = z.object({
  paciente_id: z.union([z.string(), z.number()]),
  diagnostico: z
    .string()
    .trim()
    .min(10, 'El diagnóstico clínico es obligatorio y debe tener al menos 10 caracteres (Regla de Negocio HU #3)'),
  antecedentes: z.string().optional().nullable(),
  plan_tratamiento: z.string().optional().nullable(),
  motivo_consulta: z
    .string()
    .trim()
    .min(5, 'El motivo de consulta es obligatorio y debe tener al menos 5 caracteres'),
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

function obtenerIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  return forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1'
}

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
    .select('id_paciente, terapeuta_id')
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

  await sincronizarRutinaConPaciente(
    supabase,
    paciente.terapeuta_id ?? user.id,
    Number(parsed.data.paciente_id),
    parsed.data.indicaciones,
    parsed.data.plan_tratamiento
  )

  try {
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      accion: 'CREAR_EXPEDIENTE',
      tabla_afectada: 'expedientes',
      ip: obtenerIp(req),
      timestamp: new Date().toISOString(),
    })
  } catch {}

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
    .select('id_expediente, terapeuta_id, indicaciones')
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

  await sincronizarRutinaConPaciente(
    supabase,
    expedienteActual.terapeuta_id ?? user.id,
    Number(parsed.data.paciente_id),
    parsed.data.indicaciones,
    parsed.data.plan_tratamiento
  )

  try {
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      accion: 'ACTUALIZAR_EXPEDIENTE',
      tabla_afectada: 'expedientes',
      ip: obtenerIp(req),
      timestamp: new Date().toISOString(),
    })
  } catch {}

  return NextResponse.json({ expediente: data })
}
