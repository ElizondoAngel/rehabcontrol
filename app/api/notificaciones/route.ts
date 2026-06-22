/**
 * /api/notificaciones/route.ts
 * GET   — obtener notificaciones del usuario actual (con conteo de no leídas)
 * PATCH — marcar como leída(s)
 * POST  — crear notificación (solo admin/secretaria)
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const PostSchema = z.object({
  user_id:  z.string().uuid(),
  tipo:     z.enum(['cita_proxima','pago_pendiente','cuenta_creada','cita_cancelada','pago_realizado','expediente_actualizado','mensaje_admin','sistema']),
  titulo:   z.string().min(1).max(100),
  mensaje:  z.string().min(1).max(500),
  ref_tabla:z.string().optional(),
  ref_id:   z.string().optional(),
})

// GET — notificaciones del usuario actual
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const soloNoLeidas = searchParams.get('no_leidas') === 'true'

    let query = supabase
      .from('notificaciones')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)

    if (soloNoLeidas) query = query.eq('leida', false)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: 'Error al obtener notificaciones' }, { status: 500 })

    const noLeidas = (data ?? []).filter(n => !n.leida).length

    return NextResponse.json({ notificaciones: data ?? [], no_leidas: noLeidas })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// PATCH — marcar como leída(s)
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const body = await request.json()
    const { ids, todas } = body // ids: number[] | todas: boolean

    if (todas) {
      await supabase
        .from('notificaciones')
        .update({ leida: true })
        .eq('user_id', user.id)
        .eq('leida', false)
    } else if (ids?.length) {
      await supabase
        .from('notificaciones')
        .update({ leida: true })
        .in('id', ids)
        .eq('user_id', user.id)
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// POST — crear notificación (admin/secretaria)
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('rol').eq('id', user.id).single()
    if (!['admin', 'secretaria'].includes(profile?.rol ?? '')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json()

    // Si viene array de user_ids, notificar a todos
    if (body.user_ids && Array.isArray(body.user_ids)) {
      const inserts = body.user_ids.map((uid: string) => ({
        user_id:   uid,
        tipo:      body.tipo ?? 'mensaje_admin',
        titulo:    body.titulo,
        mensaje:   body.mensaje,
        ref_tabla: body.ref_tabla ?? null,
        ref_id:    body.ref_id ?? null,
      }))
      await supabase.from('notificaciones').insert(inserts)
      return NextResponse.json({ ok: true, count: inserts.length }, { status: 201 })
    }

    // Notificación individual
    const parsed = PostSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { error } = await supabase.from('notificaciones').insert(parsed.data)
    if (error) return NextResponse.json({ error: 'Error al crear notificación' }, { status: 500 })

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
