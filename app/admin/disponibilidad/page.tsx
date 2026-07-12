import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DisponibilidadClient from '@/app/secretaria/disponibilidad/DisponibilidadClient'

export default async function AdminDisponibilidadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, nombre_completo')
    .eq('id', user.id)
    .single()

  if (profile?.rol !== 'admin') redirect('/unauthorized')

  const { data: terapeutas } = await supabase
    .from('profiles')
    .select('id, nombre_completo')
    .eq('rol', 'terapeuta')
    .eq('activo', true)
    .order('nombre_completo')

  return (
    <DisponibilidadClient
      terapeutas={terapeutas ?? []}
      userId={user.id}
      nombre={profile?.nombre_completo ?? ''}
      rol="admin"
    />
  )
}
