import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PagosClient from './PagosClient'

export default async function MisPagosPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, nombre_completo')
    .eq('id', user.id)
    .single()

  if (profile?.rol !== 'paciente') redirect('/unauthorized')

  const { data: pagos } = await supabase
    .from('pagos')
    .select('id, monto, estado, fecha, concepto')
    .eq('paciente_id', user.id)
    .order('fecha', { ascending: false })

  return (
    <PagosClient
      profile={profile}
      pagos={pagos ?? []}
    />
  )
}