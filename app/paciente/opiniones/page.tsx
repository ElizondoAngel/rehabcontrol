import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OpinionesClient from './OpinionesClient'

export default async function PacienteOpinionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, nombre_completo')
    .eq('id', user.id)
    .single()

  if (profile?.rol !== 'paciente') redirect('/unauthorized')

  const { data: paciente } = await supabase
    .from('pacientes')
    .select('id_paciente, terapeuta_id, profiles!pacientes_terapeuta_id_fkey(nombre_completo)')
    .eq('profile_id', user.id)
    .single()

  const terapeutaInfo: any = Array.isArray(paciente?.profiles) ? paciente?.profiles[0] : paciente?.profiles

  const { data: opinionesPrevias } = await supabase
    .from('opiniones')
    .select('id_opinion, calificacion, comentario, estado, created_at')
    .eq('paciente_id', paciente?.id_paciente ?? -1)
    .order('created_at', { ascending: false })

  return (
    <OpinionesClient
      profile={profile}
      terapeutaNombre={terapeutaInfo?.nombre_completo ?? null}
      opinionesPrevias={opinionesPrevias ?? []}
      userId={user.id}
    />
  )
}
