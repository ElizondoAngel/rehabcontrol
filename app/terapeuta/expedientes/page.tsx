import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ExpedientesIndexClient from './ExpedientesIndexClient'

export default async function ExpedientesIndexPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, nombre_completo')
    .eq('id', user.id)
    .single()

  if (profile?.rol !== 'terapeuta' && profile?.rol !== 'admin') {
    redirect('/unauthorized')
  }

  // Pacientes asignados a este terapeuta
  const { data: pacientes } = await supabase
    .from('pacientes')
    .select('id_paciente, nombre_completo, curp, telefono, activo')
    .eq('terapeuta_id', user.id)
    .order('nombre_completo', { ascending: true })

  // Expedientes de esos pacientes (para saber cuáles ya tienen y su estado)
  const { data: expedientes } = await supabase
    .from('expedientes')
    .select('id_expediente, paciente_id, estado, updated_at, fecha_apertura')
    .eq('terapeuta_id', user.id)

  return (
    <ExpedientesIndexClient
      pacientes={pacientes ?? []}
      expedientes={expedientes ?? []}
      userNombre={profile?.nombre_completo ?? ''}
    />
  )
}