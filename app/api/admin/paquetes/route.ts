/**
 * /api/admin/paquetes/route.ts
 * GET    — listar paquetes
 * POST   — crear paquete
 * PATCH  — editar paquete
 * DELETE — eliminar (desactivar) paquete
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const PaqueteSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  tipo: z.enum(['individual', 'contado', 'aseguradora']),
  num_sesiones: z.coerce.number().int().positive('Debe tener al menos 1 sesión'),
  precio_total: z.coerce.number().positive('El precio debe ser mayor a 0'),
})

async function verificarAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
  if (profile?.rol !== 'admin') return null
  return user
}

// GET — listar todos los paquetes (activos e inactivos)
export async function GET() {
  try {
    const supabase = await createClient()
    const user = await verificarAdmin(supabase)
    if (!user) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { data, error } = await supabase
      .from('paquetes')
      .select('*')
      .order('activo', { ascending: false })
      .order('precio_total', { ascending: true })

    if (error) return NextResponse.json({ error: 'Error al obtener paquetes' }, { status: 500 })
    return NextResponse.json({ paquetes: data })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// POST — crear paquete nuevo
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const user = await verificarAdmin(supabase)
    if (!user) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const body = await request.json()
    const parsed = PaqueteSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

    const { nombre, tipo, num_sesiones, precio_total } = parsed.data
    const precio_por_sesion = Number((precio_total / num_sesiones).toFixed(2))

    const { data, error } = await supabase
      .from('paquetes')
      .insert({ nombre, tipo, num_sesiones, precio_total, precio_por_sesion, activo: true })
      .select().single()

    if (error) return NextResponse.json({ error: 'Error al crear paquete' }, { status: 500 })

    await supabase.from('audit_logs').insert({
      user_id: user.id, accion: 'CREAR_PAQUETE',
      tabla_afectada: 'paquetes', registro_id: data.id_paquete.toString(),
    })

    return NextResponse.json({ paquete: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// PATCH — editar paquete existente
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const user = await verificarAdmin(supabase)
    if (!user) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const body = await request.json()
    const { id_paquete, ...resto } = body
    if (!id_paquete) return NextResponse.json({ error: 'id_paquete requerido' }, { status: 400 })

    const parsed = PaqueteSchema.safeParse(resto)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

    const { nombre, tipo, num_sesiones, precio_total } = parsed.data
    const precio_por_sesion = Number((precio_total / num_sesiones).toFixed(2))

    const { data, error } = await supabase
      .from('paquetes')
      .update({ nombre, tipo, num_sesiones, precio_total, precio_por_sesion })
      .eq('id_paquete', id_paquete)
      .select().single()

    if (error) return NextResponse.json({ error: 'Error al actualizar paquete' }, { status: 500 })

    await supabase.from('audit_logs').insert({
      user_id: user.id, accion: 'EDITAR_PAQUETE',
      tabla_afectada: 'paquetes', registro_id: id_paquete.toString(),
    })

    return NextResponse.json({ paquete: data })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// DELETE — desactivar paquete (baja lógica, no hard delete)
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const user = await verificarAdmin(supabase)
    if (!user) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

    // Verificar que no haya contratos activos usando este paquete
    const { count } = await supabase
      .from('contratos_paciente')
      .select('*', { count: 'exact', head: true })
      .eq('paquete_id', id)
      .eq('estado', 'activo')

    if ((count ?? 0) > 0) {
      return NextResponse.json({
        error: `No se puede desactivar: hay ${count} contrato(s) activo(s) usando este paquete`
      }, { status: 409 })
    }

    const { error } = await supabase
      .from('paquetes')
      .update({ activo: false })
      .eq('id_paquete', id)

    if (error) return NextResponse.json({ error: 'Error al desactivar paquete' }, { status: 500 })

    await supabase.from('audit_logs').insert({
      user_id: user.id, accion: 'DESACTIVAR_PAQUETE',
      tabla_afectada: 'paquetes', registro_id: id,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
