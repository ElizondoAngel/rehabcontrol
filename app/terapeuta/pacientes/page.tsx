import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PacientesClient from './PacientesClient'

export default async function TerapeutaPacientesPage() {
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

  // Solo los pacientes asignados a este terapeuta (auth.uid())
  // A diferencia de la vista de secretaria, aquí SIEMPRE se filtra por terapeuta_id = user.id
  const { data: pacientes } = await supabase
    .from('pacientes')
    .select('*')
    .eq('terapeuta_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <PacientesClient
      pacientesIniciales={pacientes ?? []}
      userNombre={profile?.nombre_completo ?? ''}
    />
  )
}