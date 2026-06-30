import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Estados que el TERAPEUTA puede asignar.
// Cancelar y reagendar siguen siendo exclusivos de secretaria/admin (vía /api/citas).
const ESTADOS_PERMITIDOS_TERAPEUTA = ['completada', 'no_asistio'] as const

export async function PATCH(req: Request) {
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
  const { id, estado } = body

  if (!id || !estado) {
    return NextResponse.json({ error: 'Faltan datos (id, estado)' }, { status: 400 })
  }

  if (!ESTADOS_PERMITIDOS_TERAPEUTA.includes(estado)) {
    return NextResponse.json(
      { error: 'El terapeuta solo puede marcar citas como completada o no_asistio' },
      { status: 403 }
    )
  }

  // Verificar que la cita sea de este terapeuta antes de tocarla
  const { data: citaActual } = await supabase
    .from('citas')
    .select('id_cita, terapeuta_id, estado')
    .eq('id_cita', id)
    .eq('terapeuta_id', user.id)
    .single()

  if (!citaActual) {
    return NextResponse.json({ error: 'Cita no encontrada o no asignada a tu cuenta' }, { status: 403 })
  }

  // Solo se puede cambiar el estado de una cita que esté programada
  if (citaActual.estado !== 'programada') {
    return NextResponse.json({ error: 'Solo se pueden actualizar citas en estado "programada"' }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('citas')
    .update({ estado })
    .eq('id_cita', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ cita: data })
}