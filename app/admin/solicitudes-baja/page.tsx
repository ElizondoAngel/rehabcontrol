import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SolicitudesBajaClient from './SolicitudesBajaClient'

export default async function SolicitudesBajaPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, nombre_completo')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'secretaria'].includes(profile.rol)) {
    redirect('/unauthorized')
  }

  const { data: solicitudes } = await supabase
    .from('solicitudes_baja')
    .select(
      'id, nombre, email, estado, motivo, created_at, fecha_revision, paciente_id'
    )
    .order('created_at', { ascending: false })

  return (
    <SolicitudesBajaClient
      solicitudesIniciales={solicitudes ?? []}
      adminNombre={profile.nombre_completo}
      currentUserId={user.id}
    />
  )
}