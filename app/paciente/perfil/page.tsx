import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PerfilClient from './PerfilClient'

export default async function MiPerfilPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, nombre_completo')
    .eq('id', user.id)
    .single()

  if (profile?.rol !== 'paciente') redirect('/unauthorized')

  const { data: paciente } = await supabase
    .from('pacientes')
    .select('telefono, domicilio, correo')
    .eq('profile_id', user.id)
    .single()

  return (
    <PerfilClient
      profile={profile}
      paciente={paciente ?? null}
      userId={user.id}
    />
  )
}