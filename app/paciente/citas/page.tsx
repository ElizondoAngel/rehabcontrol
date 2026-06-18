import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CitasClient from './CitasClient'

export default async function MisCitasPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, nombre_completo')
    .eq('id', user.id)
    .single()

  if (profile?.rol !== 'paciente') redirect('/unauthorized')

  const { data: citas } = await supabase
    .from('citas')
    .select('id, fecha, hora, estado')
    .eq('paciente_id', user.id)
    .order('fecha', { ascending: false })

  return (
    <CitasClient
      profile={profile}
      citas={citas ?? []}
    />
  )
}