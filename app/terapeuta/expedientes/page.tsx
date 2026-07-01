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

  const esAdmin = profile?.rol === 'admin'

  // Terapeuta: solo SUS pacientes asignados.
  // Admin: TODOS los pacientes (vista global, sin filtrar por terapeuta_id,
  // ya que el admin no es terapeuta de nadie y ese filtro le dejaba todo vacío).
  let pacientesQuery = supabase
    .from('pacientes')
    .select('id_paciente, nombre_completo, curp, telefono, activo')
    .order('nombre_completo', { ascending: true })

  if (!esAdmin) {
    pacientesQuery = pacientesQuery.eq('terapeuta_id', user.id)
  }

  const { data: pacientes } = await pacientesQuery

  // Mismo criterio para expedientes
  let expedientesQuery = supabase
    .from('expedientes')
    .select('id_expediente, paciente_id, estado, updated_at, fecha_apertura')

  if (!esAdmin) {
    expedientesQuery = expedientesQuery.eq('terapeuta_id', user.id)
  }

  const { data: expedientes } = await expedientesQuery

  return (
    <ExpedientesIndexClient
      pacientes={pacientes ?? []}
      expedientes={expedientes ?? []}
      userNombre={profile?.nombre_completo ?? ''}
      userId={user.id}
    />
  )
}
