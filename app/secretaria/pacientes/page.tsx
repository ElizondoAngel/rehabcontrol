import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PacientesClient from './PacientesClient'

export default async function PacientesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verificar rol en servidor (seguridad doble capa)
  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, nombre_completo')
    .eq('id', user.id)
    .single()

  if (profile?.rol !== 'secretaria' && profile?.rol !== 'admin') {
    redirect('/unauthorized')
  }

  // Cargar terapeutas para el selector del formulario
  const { data: terapeutas } = await supabase
    .from('profiles')
    .select('id, nombre_completo')
    .eq('rol', 'terapeuta')
    .eq('activo', true)

  // Cargar pacientes iniciales desde servidor
  const { data: pacientes } = await supabase
    .from('pacientes')
    .select('*, profiles!pacientes_terapeuta_id_fkey(nombre_completo)')
    .order('created_at', { ascending: false })

  return (
    <PacientesClient
      terapeutas={terapeutas ?? []}
      pacientesIniciales={pacientes ?? []}
      userNombre={profile?.nombre_completo ?? ''} currentUserId={'user.id'}    />
  )
}
