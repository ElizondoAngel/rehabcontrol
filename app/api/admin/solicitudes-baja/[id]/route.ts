import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  estado: z.enum(['aprobada', 'rechazada']),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idParam } = await params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'secretaria'].includes(profile.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }

  const id = parseInt(idParam, 10)
  if (isNaN(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  const { error } = await supabase
    .from('solicitudes_baja')
    .update({
      estado         : parsed.data.estado,
      revisado_por   : user.id,
      fecha_revision : new Date().toISOString(),
    })
    .eq('id', id)
    .eq('estado', 'pendiente')

  if (error) {
    console.error('[admin/solicitudes-baja PATCH]', error.message)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }

  await supabase.from('audit_logs').insert({
    user_id        : user.id,
    accion         : parsed.data.estado === 'aprobada' ? 'BAJA_PACIENTE' : 'REACTIVAR_PACIENTE',
    tabla_afectada : 'solicitudes_baja',
    registro_id    : null,
  }).then(({ error: e }) => {
    if (e) console.warn('[solicitudes-baja] audit warn:', e.message)
  })

  return NextResponse.json({ ok: true })
}