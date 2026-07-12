import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OpinionesAdminClient from './OpinionesAdminClient'

export default async function AdminOpinionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, nombre_completo')
    .eq('id', user.id)
    .single()

  if (profile?.rol !== 'admin') redirect('/unauthorized')

  return (
    <OpinionesAdminClient
      userId={user.id}
      nombre={profile?.nombre_completo ?? ''}
    />
  )
}
