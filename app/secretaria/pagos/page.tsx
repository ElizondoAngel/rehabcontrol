import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PagosClient from './PagosClient_notif'

export default async function PagosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, nombre_completo')
    .eq('id', user.id)
    .single()

  if (profile?.rol !== 'secretaria' && profile?.rol !== 'admin') {
    redirect('/unauthorized')
  }

  // Pagos con datos del paciente y, si existe, la cita relacionada
  const { data: pagos } = await supabase
    .from('pagos')
    .select(`
      *,
      pacientes(nombre_completo),
      citas(fecha_hora)
    `)
    .order('fecha_pago', { ascending: false })

  // Pacientes activos para registrar pagos manuales (sin cita)
  const { data: pacientes } = await supabase
    .from('pacientes')
    .select('id_paciente, nombre_completo')
    .eq('activo', true)
    .order('nombre_completo')

  return (
    <PagosClient
      pagosIniciales={pagos ?? []}
      pacientes={pacientes ?? []} currentUserId={''}    />
  )
}
