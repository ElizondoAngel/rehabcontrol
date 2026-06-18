import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  telefono: z.string().regex(/^\d{10}$/, 'Teléfono inválido'),
  domicilio: z.string().min(5).max(200),
})

export async function PATCH(req: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (profile?.rol !== 'paciente') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const { error } = await supabase
    .from('pacientes')
    .update({
      telefono: parsed.data.telefono,
      domicilio: parsed.data.domicilio,
    })
    .eq('profile_id', user.id)

  if (error) return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })

  await supabase.from('audit_logs').insert({
    user_id: user.id,
    accion: 'UPDATE_PERFIL_PACIENTE',
    tabla_afectada: 'pacientes',
  })

  return NextResponse.json({ ok: true })
}