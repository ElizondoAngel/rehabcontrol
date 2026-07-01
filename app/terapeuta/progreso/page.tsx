import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProgresoIndexClient from './ProgresoIndexClient'

export default async function ProgresoIndexPage() {
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

  // Pacientes asignados a este terapeuta
  const { data: pacientesData, error: errorPacientes } = await supabase
    .from('pacientes')
    .select('id_paciente, nombre_completo, curp, activo')
    .eq('terapeuta_id', user.id)
    .order('nombre_completo', { ascending: true })

  if (errorPacientes) {
    console.error('Error cargando pacientes:', errorPacientes.message)
  }
  const pacientes = pacientesData ?? []

  // Historial COMPLETO de sesiones (no solo la última) — necesario para los sparklines
  // Se ordena ascendente por fecha para que el gráfico se dibuje en orden cronológico
  const idsPacientes = pacientes.map(p => p.id_paciente)

  let sesiones: any[] = []
  if (idsPacientes.length > 0) {
    const { data: sesionesData, error: errorSesiones } = await supabase
      .from('progreso_sesiones')
      .select('id_progreso_sesion, paciente_id, nivel_dolor, movilidad, fecha_registro')
      .in('paciente_id', idsPacientes)
      .order('fecha_registro', { ascending: true })

    if (errorSesiones) {
      console.error('Error cargando sesiones de progreso:', errorSesiones.message)
    }
    sesiones = sesionesData ?? []
  }

  return (
    <ProgresoIndexClient
      pacientes={pacientes}
      sesiones={sesiones}
      userNombre={profile?.nombre_completo ?? ''}
      userId={user.id}
    />
  )
}
