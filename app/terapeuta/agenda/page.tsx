import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CitasClient from './Citasclient'

export default async function TerapeutaCitasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, nombre_completo')
    .eq('id', user.id)
    .single()

  if (profile?.rol !== 'terapeuta' && profile?.rol !== 'admin') {
    redirect('/unauthorized')
  }

  // Solo las citas de este terapeuta (auth.uid())
  const { data: citas } = await supabase
    .from('citas')
    .select(`
      *,
      pacientes(nombre_completo)
    `)
    .eq('terapeuta_id', user.id)
    .order('fecha_hora', { ascending: true })

  return (
    <CitasClient
      citasIniciales={citas ?? []}
      userNombre={profile?.nombre_completo ?? ''}
    />
  )
}