import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProgresoClient from './ProgresoClient'

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

  const { data: progreso } = await supabase
    .from('progreso_sesiones')
    .select('id, fecha_sesion, nivel_dolor, movilidad, ejercicios_completados, notas')
    .eq('paciente_id', user.id)
    .order('fecha_sesion', { ascending: true })

  const { data: contrato } = await supabase
    .from('contratos_paciente')
    .select('sesiones_totales, sesiones_usadas')
    .eq('paciente_id', user.id)
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