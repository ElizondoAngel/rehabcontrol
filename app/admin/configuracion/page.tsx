import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ConfiguracionClient from './ConfiguracionClient'

export default async function ConfiguracionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('rol, nombre_completo, email, telefono').eq('id', user.id).single()
  if (profile?.rol !== 'admin') redirect('/unauthorized')

  // Estadísticas del sistema para mostrar en Mantenimiento
  const [
    { count: totalPacientes },
    { count: totalCitas },
    { count: totalPagos },
    { count: totalLogs },
  ] = await Promise.all([
    supabase.from('pacientes').select('*', { count:'exact', head:true }),
    supabase.from('citas').select('*', { count:'exact', head:true }),
    supabase.from('pagos').select('*', { count:'exact', head:true }),
    supabase.from('audit_logs').select('*', { count:'exact', head:true }),
  ])

  return (
    <ConfiguracionClient
      adminProfile={profile ?? {}}
      stats={{ totalPacientes, totalCitas, totalPagos, totalLogs }}
    />
  )
}
