import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProgresoClient from './ProgresoClient'
export const dynamic = 'force-dynamic'

export default async function MiProgresoPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, nombre_completo')
    .eq('id', user.id)
    .single()

  if (profile?.rol !== 'paciente') redirect('/unauthorized')

  // 1. Obtener el id_paciente real a partir del profile_id
  const { data: paciente } = await supabase
    .from('pacientes')
    .select('id_paciente')
    .eq('profile_id', user.id)
    .single()

  const idPaciente = paciente?.id_paciente ?? -1

  // 2. Progreso de sesiones — columnas reales de la tabla
  const { data: progreso } = await supabase
    .from('progreso_sesiones')
    .select('id_progreso_sesion, cita_id, nivel_dolor, movilidad, ejercicios_completados, observaciones, fecha_registro')
    .eq('paciente_id', idPaciente)
    .order('fecha_registro', { ascending: true })

  // 3. Contrato con id_paciente correcto
  const { data: contrato } = await supabase
    .from('contratos_paciente')
    .select('sesiones_totales, sesiones_usadas')
    .eq('paciente_id', idPaciente)
    .eq('activo', true)
    .single()

  return (
    <ProgresoClient
      profile={profile}
      progreso={progreso ?? []}
      contrato={contrato ?? null}
    />
  )
}