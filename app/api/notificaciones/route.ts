/**
 * /api/notificaciones/route.ts
 * GET   — obtener notificaciones del usuario actual
 * PATCH — marcar como leída(s)
 * POST  — crear notificación (solo admin)
 *         Soporta:
 *           • destino_rol: 'paciente'|'terapeuta'|'secretaria'|'todos' → envía a todos los users de ese rol
 *           • user_id: string → envía a un usuario individual
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const TipoEnum = z.enum([
  'cita_proxima','pago_pendiente','cuenta_creada','cita_cancelada',
  'pago_realizado','expediente_actualizado','mensaje_admin','sistema'
])

const PostSchema = z.object({
  tipo:          TipoEnum.default('mensaje_admin'),
  titulo:        z.string().min(1).max(100),
  mensaje:       z.string().min(1).max(500),
  // Destino — uno de los dos es obligatorio
  user_id:       z.string().uuid().optional(),
  destino_rol:   z.enum(['paciente','terapeuta','secretaria','admin','todos']).optional(),
})

// ── GET — notificaciones del usuario actual ───────────────────
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

// ── PATCH — marcar como leída(s) ─────────────────────────────
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const body = await request.json()
    const { ids, todas } = body

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

// ── POST — crear notificación (solo admin) ───────────────────
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    // Solo admin puede enviar notificaciones personalizadas
    const { data: profile } = await supabase
      .from('profiles').select('rol').eq('id', user.id).single()
    if (profile?.rol !== 'admin') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = PostSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { tipo, titulo, mensaje, user_id, destino_rol } = parsed.data

    if (!user_id && !destino_rol) {
      return NextResponse.json({ error: 'Debes indicar un destinatario o un rol destino' }, { status: 400 })
    }

    // ── Destino por ROL ───────────────────────────────────────
    if (destino_rol) {
      // Obtener todos los usuarios del rol indicado (o todos si es 'todos')
      let query = supabase.from('profiles').select('id').eq('activo', true)
      if (destino_rol !== 'todos') query = query.eq('rol', destino_rol)

      const { data: destinatarios, error: errDest } = await query
      if (errDest || !destinatarios?.length) {
        return NextResponse.json({ error: 'No se encontraron usuarios con ese rol' }, { status: 404 })
      }

      const inserts = destinatarios.map((d: { id: string }) => ({
        user_id: d.id,
        tipo,
        titulo,
        mensaje,
      }))

      const { error } = await supabase.from('notificaciones').insert(inserts)
      if (error) return NextResponse.json({ error: 'Error al enviar notificaciones' }, { status: 500 })

      // Audit log
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        accion: 'ENVIAR_NOTIFICACION',
        tabla_afectada: 'notificaciones',
        registro_id: `rol:${destino_rol}`,
      })

      return NextResponse.json({ ok: true, enviadas: inserts.length }, { status: 201 })
    }

    // ── Destino INDIVIDUAL ────────────────────────────────────
    if (user_id) {
      // Verificar que el usuario existe
      const { data: dest } = await supabase
        .from('profiles').select('id, activo').eq('id', user_id).single()
      if (!dest) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

      const { error } = await supabase.from('notificaciones').insert({
        user_id,
        tipo,
        titulo,
        mensaje,
      })
      if (error) return NextResponse.json({ error: 'Error al enviar notificación' }, { status: 500 })

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        accion: 'ENVIAR_NOTIFICACION',
        tabla_afectada: 'notificaciones',
        registro_id: user_id,
      })

      return NextResponse.json({ ok: true, enviadas: 1 }, { status: 201 })
    }

  } catch (err) {
    console.error('Error en POST /api/notificaciones:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
