import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ContratosClient from './ContratosClient'

export default async function SecretariaContratosPage() {
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

  const { data: paquetes } = await supabase
    .from('paquetes')
    .select('*')
    .eq('activo', true)
    .order('precio_total')

  const { data: contratosRaw } = await supabase
    .from('contratos_paciente')
    .select('*, pacientes(nombre_completo), paquetes(nombre, precio_total)')
    .order('fecha_inicio', { ascending: false })

  const contratos = (contratosRaw ?? []).map((c: any) => ({
    ...c,
    pacientes: Array.isArray(c.pacientes) ? c.pacientes[0] ?? null : c.pacientes,
    paquetes: Array.isArray(c.paquetes) ? c.paquetes[0] ?? null : c.paquetes,
  }))

  return (
    <ContratosClient
      paquetes={paquetes ?? []}
      contratosIniciales={contratos}
      userId={user.id}
      nombre={profile?.nombre_completo ?? ''}
    />
  )
}
