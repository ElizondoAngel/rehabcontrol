import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CitasClient from './CitasClient'

export default async function CitasPage() {
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

  const { data: terapeutas } = await supabase
    .from('profiles')
    .select('id, nombre_completo')
    .eq('rol', 'terapeuta')
    .eq('activo', true)

  const { data: pacientes } = await supabase
    .from('pacientes')
    .select('id_paciente, nombre_completo, terapeuta_id')
    .eq('activo', true)
    .order('nombre_completo')

  const { data: citas } = await supabase
    .from('citas')
    .select(`
      *,
      pacientes(nombre_completo),
      profiles!citas_terapeuta_id_fkey(nombre_completo),
      pagos(monto, metodo_pago, estado_pago)
    `)
    .order('fecha_hora', { ascending: true })

  return (
    <CitasClient
      terapeutas={terapeutas ?? []}
      pacientes={pacientes ?? []}
      citasIniciales={citas ?? []}
    />
  )
}
