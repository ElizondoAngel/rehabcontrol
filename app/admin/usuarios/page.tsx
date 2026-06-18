import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UsuariosClient from './UsuariosClient'

export default async function UsuariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (profile?.rol !== 'admin') {
    redirect('/unauthorized')
  }

  const { data: usuarios } = await supabase
    .from('profiles')
    .select('id, nombre_completo, email, rol, telefono, activo, created_at')
    .order('created_at', { ascending: false })

  // ── Pacientes SIN cuenta vinculada — para los selectores de vinculación ──
  const { data: pacientesSinCuenta } = await supabase
    .from('pacientes')
    .select('id_paciente, nombre_completo, curp')
    .is('profile_id', null)
    .eq('activo', true)
    .order('nombre_completo', { ascending: true })

  // ── Mapa profile_id -> paciente vinculado, para mostrar el vínculo en la tabla ──
  const { data: vinculos } = await supabase
    .from('pacientes')
    .select('id_paciente, nombre_completo, profile_id')
    .not('profile_id', 'is', null)

  return (
    <UsuariosClient
      usuariosIniciales={usuarios ?? []}
      currentUserId={user.id}
      pacientesSinCuenta={pacientesSinCuenta ?? []}
      vinculos={vinculos ?? []}
    />
  )
}