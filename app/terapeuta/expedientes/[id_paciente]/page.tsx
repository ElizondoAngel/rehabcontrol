import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ExpedienteClient from './ExpedienteClient'

export default async function ExpedientePage({
  params,
}: {
  params: Promise<{ id_paciente: string }>
}) {
  const { id_paciente } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verificar rol en servidor (seguridad doble capa)
  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, nombre_completo')
    .eq('id', user.id)
    .single()

  if (profile?.rol !== 'terapeuta' && profile?.rol !== 'admin') {
    redirect('/unauthorized')
  }

  const esAdmin = profile?.rol === 'admin'

  // El paciente debe existir. Si es terapeuta, además debe estar asignado a él.
  // Si es admin, puede ver cualquier paciente (vista global, sin restricción
  // de terapeuta_id — el admin no es terapeuta de nadie).
  let pacienteQuery = supabase
    .from('pacientes')
    .select('id_paciente, nombre_completo, curp, fecha_nacimiento, telefono, activo, terapeuta_id')
    .eq('id_paciente', id_paciente)

  if (!esAdmin) {
    pacienteQuery = pacienteQuery.eq('terapeuta_id', user.id)
  }

  const { data: paciente } = await pacienteQuery.single()

  if (!paciente) notFound()

  // El expediente puede no existir todavía — eso está bien, se crea desde el form
  const { data: expediente } = await supabase
    .from('expedientes')
    .select('*')
    .eq('paciente_id', id_paciente)
    .maybeSingle()

  return (
    <ExpedienteClient
      paciente={paciente}
      expedienteInicial={expediente ?? null}
      terapeutaId={user.id}
      userNombre={profile?.nombre_completo ?? ''}
    />
  )
}
