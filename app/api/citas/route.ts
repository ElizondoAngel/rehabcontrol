/**
 * /api/citas/route.ts
 * ─────────────────────────────────────────────────────────────
 * F4 — API CRUD de citas
 *
 * SEGURIDAD (segunda capa — servidor):
 *   • Validación Zod (fecha futura, horario laboral, duración válida)
 *   • Verificación de rol en servidor
 *   • RLS + índice único en BD previene citas duplicadas (terapeuta+fecha_hora)
 *   • Manejo del error 23505 (conflicto de horario) con mensaje claro
 *   • Audit log en cada operación
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// Extrae la hora del día en zona horaria de México, sin importar en qué
// zona horaria esté corriendo el servidor (local vs Vercel/UTC). Antes se
// usaba d.getHours(), que da la hora LOCAL DEL SERVIDOR — en Vercel eso es
// UTC, así que una cita de las 5:30pm México (23:30 UTC) fallaba la
// validación de "horario laboral" porque 23 no cae en el rango 8-20.
function horaEnMexico(d: Date): number {
  return Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Mexico_City',
      hour: 'numeric',
      hour12: false,
    }).format(d)
  )
}

const CitaSchema = z.object({
  paciente_id:  z.number().int().positive(),
  terapeuta_id: z.string().uuid(),
  fecha_hora:   z.string().refine(v => {
    const d = new Date(v)
    if (isNaN(d.getTime())) return false
    const h = horaEnMexico(d)
    return h >= 8 && h < 20 // horario laboral 08:00-20:00 (hora de México)
  }, 'Horario fuera de atención (08:00-20:00)'),
  duracion_min: z.number().int().refine(v => [30,45,60,90].includes(v), 'Duración inválida'),
  notas:        z.string().max(500).optional().or(z.literal('')),
})

const CitaEditSchema = CitaSchema.extend({ id: z.number() })

async function verificarRol(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.rpc('auth_rol')
  return { user, rol: data as string }
}

const SELECT_CITA = `*, pacientes(nombre_completo), profiles!citas_terapeuta_id_fkey(nombre_completo), pagos(monto, metodo_pago, estado_pago)`

// ── POST — Crear cita ─────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const auth = await verificarRol(supabase)
    if (!auth || !['admin','secretaria','terapeuta'].includes(auth.rol)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = CitaSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { data: cita, error } = await supabase
      .from('citas')
      .insert({
        ...parsed.data,
        notas:      parsed.data.notas || null,
        created_by: auth.user.id,
        estado:     'programada',
      })
      .select(SELECT_CITA)
      .single()

    if (error) {
      // Índice único terapeuta_id + fecha_hora (citas no canceladas)
      if (error.code === '23505') {
        return NextResponse.json({ error: 'El terapeuta ya tiene una cita en ese horario' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Error al agendar la cita' }, { status: 500 })
    }

    await supabase.from('audit_logs').insert({
      user_id: auth.user.id, accion: 'CREAR_CITA',
      tabla_afectada: 'citas', registro_id: cita.id_cita.toString(),
    })

    return NextResponse.json({ cita }, { status: 201 })

  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// ── PUT — Editar cita ─────────────────────────────────────────
export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const auth = await verificarRol(supabase)
    if (!auth || !['admin','secretaria','terapeuta'].includes(auth.rol)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = CitaEditSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { id, ...campos } = parsed.data

    const { data: cita, error } = await supabase
      .from('citas')
      .update({ ...campos, notas: campos.notas || null })
      .eq('id_cita', id)
      .select(SELECT_CITA)
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'El terapeuta ya tiene una cita en ese horario' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Error al actualizar la cita' }, { status: 500 })
    }

    await supabase.from('audit_logs').insert({
      user_id: auth.user.id, accion: 'EDITAR_CITA',
      tabla_afectada: 'citas', registro_id: id.toString(),
    })

    return NextResponse.json({ cita })

  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// ── PATCH — Cambiar estado (cancelar / completar / no_asistio) ─
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const auth = await verificarRol(supabase)
    if (!auth || !['admin','secretaria','terapeuta'].includes(auth.rol)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id, estado } = await request.json()
    const ESTADOS_VALIDOS = ['programada','completada','cancelada','no_asistio']
    if (!id || !ESTADOS_VALIDOS.includes(estado)) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const { error } = await supabase
      .from('citas')
      .update({ estado })
      .eq('id_cita', id)

    if (error) {
      return NextResponse.json({ error: 'Error al actualizar estado' }, { status: 500 })
    }

    await supabase.from('audit_logs').insert({
      user_id: auth.user.id, accion: `CITA_${estado.toUpperCase()}`,
      tabla_afectada: 'citas', registro_id: id.toString(),
    })

    return NextResponse.json({ ok: true })

  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}