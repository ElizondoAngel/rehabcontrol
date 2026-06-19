import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PacienteDashboardClient from './PacienteDashboardClient'

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

  // 3. Datos reales
  const { data: citas } = await supabase
    .from('citas')
    .select('id, fecha, hora, estado')
    .eq('paciente_id', user.id)
    .gte('fecha', new Date().toISOString().split('T')[0])
    .order('fecha', { ascending: true })
    .limit(3)

  const { data: pagos } = await supabase
    .from('pagos')
    .select('id, monto, estado, fecha, concepto')
    .eq('paciente_id', user.id)
    .order('fecha', { ascending: false })
    .limit(3)

  const { data: progreso } = await supabase
    .from('progreso_sesiones')
    .select('fecha_sesion, nivel_dolor, movilidad, ejercicios_completados')
    .eq('paciente_id', user.id)
    .order('fecha_sesion', { ascending: false })
    .limit(10)

  const { data: contrato } = await supabase
    .from('contratos_paciente')
    .select('sesiones_totales, sesiones_usadas')
    .eq('paciente_id', user.id)
    .eq('activo', true)
    .single()

  return (
    <PacienteDashboardClient
      profile={profile}
      proximasCitas={citas ?? []}
      ultimosPagos={pagos ?? []}
      progreso={progreso ?? []}
      contrato={contrato ?? null}
    />
  )
}