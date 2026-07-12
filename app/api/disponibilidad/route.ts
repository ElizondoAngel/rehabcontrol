/**
 * /api/disponibilidad/route.ts
 * GET ?terapeuta_id=X — trae el horario semanal configurado
 * PUT  — reemplaza TODO el horario de un terapeuta (borra lo anterior
 *        y crea los bloques nuevos que se manden). Más simple que
 *        diffear día por día, y evita dejar bloques huérfanos.
 * Accesible a admin y secretaria.
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const BloqueSchema = z.object({
  dia_semana: z.number().int().min(0).max(6),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/),
  hora_fin: z.string().regex(/^\d{2}:\d{2}$/),
})
const BodySchema = z.object({
  terapeuta_id: z.string().uuid(),
  bloques: z.array(BloqueSchema),
})

async function verificarAcceso(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
  if (!['admin', 'secretaria'].includes(profile?.rol ?? '')) return null
  return user
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const user = await verificarAcceso(supabase)
    if (!user) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const terapeutaId = searchParams.get('terapeuta_id')
    if (!terapeutaId) return NextResponse.json({ error: 'terapeuta_id requerido' }, { status: 400 })

    const { data, error } = await supabase
      .from('disponibilidad_terapeuta')
      .select('dia_semana, hora_inicio, hora_fin')
      .eq('terapeuta_id', terapeutaId)
      .eq('activo', true)
      .order('dia_semana', { ascending: true })

    if (error) {
      console.error('Error al leer disponibilidad:', error)
      return NextResponse.json({ error: 'Error al leer disponibilidad' }, { status: 500 })
    }

    return NextResponse.json({ bloques: data ?? [] })
  } catch (err) {
    console.error('Error en GET /api/disponibilidad:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const user = await verificarAcceso(supabase)
    if (!user) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const body = await request.json()
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }
    const { terapeuta_id, bloques } = parsed.data

    for (const b of bloques) {
      if (b.hora_fin <= b.hora_inicio) {
        return NextResponse.json({ error: `La hora de fin debe ser posterior a la de inicio (día ${b.dia_semana})` }, { status: 400 })
      }
    }

    // Reemplazo completo: borra todo lo anterior de este terapeuta y
    // vuelve a insertar los bloques que mandó el formulario.
    const { error: errorBorrar } = await supabase
      .from('disponibilidad_terapeuta')
      .delete()
      .eq('terapeuta_id', terapeuta_id)

    if (errorBorrar) {
      console.error('Error al limpiar disponibilidad previa:', errorBorrar)
      return NextResponse.json({ error: 'No se pudo actualizar la disponibilidad' }, { status: 500 })
    }

    if (bloques.length > 0) {
      const { error: errorInsertar } = await supabase
        .from('disponibilidad_terapeuta')
        .insert(bloques.map(b => ({ ...b, terapeuta_id, activo: true })))

      if (errorInsertar) {
        console.error('Error al guardar nueva disponibilidad:', errorInsertar)
        return NextResponse.json({ error: 'No se pudo guardar la disponibilidad' }, { status: 500 })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error en PUT /api/disponibilidad:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
