/**
 * /api/opiniones/route.ts
 * POST — el paciente envía una opinión sobre su terapeuta/servicio.
 *        Nace SIEMPRE en estado 'pendiente' (RLS también lo exige).
 * GET  — el paciente ve el historial de SUS propias opiniones.
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const BodySchema = z.object({
  calificacion: z.number().int().min(1).max(5),
  comentario: z.string().min(10, 'Cuéntanos un poco más — mínimo 10 caracteres').max(1000),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
    if (profile?.rol !== 'paciente') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const body = await request.json()
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }
    const { calificacion, comentario } = parsed.data

    const { data: paciente } = await supabase
      .from('pacientes')
      .select('id_paciente, terapeuta_id')
      .eq('profile_id', user.id)
      .single()

    if (!paciente?.terapeuta_id) {
      return NextResponse.json({ error: 'Aún no tienes un terapeuta asignado' }, { status: 400 })
    }

    const { data: opinion, error } = await supabase
      .from('opiniones')
      .insert({
        paciente_id: paciente.id_paciente,
        terapeuta_id: paciente.terapeuta_id,
        calificacion,
        comentario,
        estado: 'pendiente',
      })
      .select()
      .single()

    if (error) {
      console.error('Error al crear opinión:', JSON.stringify(error, null, 2))
      return NextResponse.json({ error: 'No se pudo enviar tu opinión' }, { status: 500 })
    }

    return NextResponse.json({ opinion }, { status: 201 })
  } catch (err) {
    console.error('Error interno POST /api/opiniones:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// GET — historial de opiniones del propio paciente
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: paciente } = await supabase
      .from('pacientes')
      .select('id_paciente')
      .eq('profile_id', user.id)
      .single()

    if (!paciente) return NextResponse.json({ opiniones: [] })

    const { data, error } = await supabase
      .from('opiniones')
      .select('id_opinion, calificacion, comentario, estado, created_at')
      .eq('paciente_id', paciente.id_paciente)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error al listar opiniones del paciente:', JSON.stringify(error, null, 2))
      return NextResponse.json({ error: 'Error al consultar tus opiniones' }, { status: 500 })
    }

    return NextResponse.json({ opiniones: data ?? [] })
  } catch (err) {
    console.error('Error interno GET /api/opiniones:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
