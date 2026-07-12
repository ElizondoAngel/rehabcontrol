/**
 * /api/admin/opiniones/route.ts
 * GET   ?estado=pendiente|aprobada|rechazada|todas — lista para moderar
 * PATCH — aprueba o rechaza una opinión
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

async function verificarAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
  if (profile?.rol !== 'admin') return null
  return user
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const user = await verificarAdmin(supabase)
    if (!user) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const estado = searchParams.get('estado') ?? 'pendiente'

    let query = supabase
      .from('opiniones')
      .select(`
        id_opinion, calificacion, comentario, estado, created_at,
        pacientes(nombre_completo),
        profiles!opiniones_terapeuta_id_fkey(nombre_completo)
      `)
      .order('created_at', { ascending: false })

    if (estado !== 'todas') {
      query = query.eq('estado', estado)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error al listar opiniones (admin):', JSON.stringify(error, null, 2))
      return NextResponse.json({ error: 'Error al consultar opiniones' }, { status: 500 })
    }

    const normalizadas = (data ?? []).map((o: any) => ({
      ...o,
      pacientes: Array.isArray(o.pacientes) ? o.pacientes[0] ?? null : o.pacientes,
      profiles: Array.isArray(o.profiles) ? o.profiles[0] ?? null : o.profiles,
    }))

    return NextResponse.json({ opiniones: normalizadas })
  } catch (err) {
    console.error('Error interno GET /api/admin/opiniones:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

const PatchSchema = z.object({
  id_opinion: z.number().int().positive(),
  accion: z.enum(['aprobar', 'rechazar']),
})

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const user = await verificarAdmin(supabase)
    if (!user) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const body = await request.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }
    const { id_opinion, accion } = parsed.data
    const nuevoEstado = accion === 'aprobar' ? 'aprobada' : 'rechazada'

    const { data, error } = await supabase
      .from('opiniones')
      .update({ estado: nuevoEstado, revisado_por: user.id, revisado_en: new Date().toISOString() })
      .eq('id_opinion', id_opinion)
      .eq('estado', 'pendiente') // solo si sigue pendiente — evita doble procesamiento
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'La opinión ya no está pendiente o no existe' }, { status: 409 })
    }

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      accion: accion === 'aprobar' ? 'APROBAR_OPINION' : 'RECHAZAR_OPINION',
      tabla_afectada: 'opiniones',
      registro_id: id_opinion.toString(),
    })

    return NextResponse.json({ opinion: data })
  } catch (err) {
    console.error('Error interno PATCH /api/admin/opiniones:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
