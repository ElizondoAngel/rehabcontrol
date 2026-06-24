import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CitasClient from './CitasClient'
export const dynamic = 'force-dynamic'

export default async function MisCitasPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, nombre_completo')
    .eq('id', user.id)
    .single()

  if (profile?.rol !== 'paciente') redirect('/unauthorized')

  // 1. Obtener el id_paciente real
  const { data: paciente } = await supabase
    .from('pacientes')
    .select('id_paciente')
    .eq('profile_id', user.id)
    .single()

  const idPaciente = paciente?.id_paciente ?? -1

  // 2. Citas con columnas reales
  const { data: citas } = await supabase
    .from('citas')
    .select('id_cita, fecha_hora, duracion_min, estado, notas')
    .eq('paciente_id', idPaciente)
    .order('fecha_hora', { ascending: false })

  return (
    <CitasClient
      profile={profile}
      citas={citas ?? []}
    />
  )
}