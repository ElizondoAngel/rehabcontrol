import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ExpedientesClient from './ExpedientesClient'

export default async function ExpedientesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('rol, nombre_completo').eq('id', user.id).single()
  if (!['admin', 'secretaria'].includes(profile?.rol ?? '')) redirect('/unauthorized')

  // Pacientes con su expediente (si tienen) y métricas básicas.
  // NOTA: 'pacientes' tiene DOS llaves foráneas hacia 'profiles'
  // (profile_id y terapeuta_id), así que hay que indicar explícitamente
  // cuál usar con la sintaxis profiles!nombre_constraint(...) — si no,
  // Supabase no puede resolver la ambigüedad y la query entera falla.
  const { data: pacientes } = await supabase
    .from('pacientes')
    .select(`
      id_paciente, nombre_completo, fecha_nacimiento, telefono, activo, created_at,
      profiles!pacientes_profile_id_fkey(nombre_completo),
      expedientes(id_expediente, diagnostico, estado, fecha_apertura),
      citas(id_cita, estado),
      pagos(id_pago, estado_pago, monto)
    `)
    .order('nombre_completo', { ascending: true })

  const pacientesIniciales = (pacientes ?? []).map((paciente: any) => ({
    ...paciente,
    profiles: paciente.profiles?.[0] ?? { nombre_completo: '' },
  }))

  return (
    <ExpedientesClient
      pacientesIniciales={pacientesIniciales}
      currentUserRol={profile?.rol ?? ''}
      userId={user.id}
      nombre={profile?.nombre_completo ?? ''}
    />
  )
}
