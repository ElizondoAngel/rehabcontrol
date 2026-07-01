import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PacienteDashboardClient from './PacienteDashboardClient'
export const dynamic = 'force-dynamic'

export default async function PacienteDashboard() {
  const supabase = await createClient()

  // 1. Verificar sesión
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Verificar rol en servidor
  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, nombre_completo')
    .eq('id', user.id)
    .single()

  if (profile?.rol !== 'paciente') redirect('/unauthorized')

  // 3. Obtener el id_paciente real a partir del profile_id
  const { data: paciente } = await supabase
    .from('pacientes')
    .select('id_paciente')
    .eq('profile_id', user.id)
    .single()

  const idPaciente = paciente?.id_paciente ?? -1

  // 4. Próximas citas (columnas reales: fecha_hora, estado)
  const { data: citas } = await supabase
    .from('citas')
    .select('id_cita, fecha_hora, duracion_min, estado')
    .eq('paciente_id', idPaciente)
    .gte('fecha_hora', new Date().toISOString())
    .order('fecha_hora', { ascending: true })
    .limit(3)

  // 5. Últimos pagos (columnas reales: monto, estado_pago, fecha_pago, metodo_pago)
  const { data: pagos } = await supabase
    .from('pagos')
    .select('id_pago, monto, estado_pago, fecha_pago, metodo_pago')
    .eq('paciente_id', idPaciente)
    .order('fecha_pago', { ascending: false })
    .limit(3)

  // 6. Progreso de sesiones (columnas reales: nivel_dolor, movilidad, ejercicios_completados, fecha_registro)
  const { data: progreso } = await supabase
    .from('progreso_sesiones')
    .select('nivel_dolor, movilidad, ejercicios_completados, fecha_registro')
    .eq('paciente_id', idPaciente)
    .order('fecha_registro', { ascending: false })
    .limit(10)

  // 7. Contrato activo
  const { data: contrato } = await supabase
    .from('contratos_paciente')
    .select('sesiones_totales, sesiones_usadas')
    .eq('paciente_id', idPaciente)
    .eq('activo', true)
    .single()

  return (
    <PacienteDashboardClient
      profile={profile}
      proximasCitas={citas ?? []}
      ultimosPagos={pagos ?? []}
      progreso={progreso ?? []}
      contrato={contrato ?? null}
      userId={user.id}
    />
  )
}
