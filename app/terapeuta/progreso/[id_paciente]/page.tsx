import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ProgresoDetalleClient from './ProgresoDetalleClient'

export default async function ProgresoDetallePage({
  params,
}: {
  params: Promise<{ id_paciente: string }>
}) {
  const { id_paciente } = await params
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

  // El paciente debe existir y estar asignado a este terapeuta
  const { data: paciente } = await supabase
    .from('pacientes')
    .select('id_paciente, nombre_completo, curp, fecha_nacimiento, activo, terapeuta_id')
    .eq('id_paciente', id_paciente)
    .eq('terapeuta_id', user.id)
    .single()

  if (!paciente) notFound()

  // Historial completo de sesiones de este paciente (insert-only, nunca se edita)
  const { data: sesiones } = await supabase
    .from('progreso_sesiones')
    .select('*')
    .eq('paciente_id', id_paciente)
    .order('fecha_registro', { ascending: false })

  // Citas COMPLETADAS de este paciente con este terapeuta
  const { data: citasCompletadas } = await supabase
    .from('citas')
    .select('id_cita, fecha_hora, duracion_min')
    .eq('paciente_id', id_paciente)
    .eq('terapeuta_id', user.id)
    .eq('estado', 'completada')
    .order('fecha_hora', { ascending: false })

  // De esas, solo las que TODAVÍA NO tienen un registro de progreso asociado
  const idsConProgreso = new Set((sesiones ?? []).map(s => s.cita_id))
  const citasDisponibles = (citasCompletadas ?? []).filter(c => !idsConProgreso.has(c.id_cita))

  return (
    <ProgresoDetalleClient
      paciente={paciente}
      sesionesIniciales={sesiones ?? []}
      citasDisponibles={citasDisponibles}
      userNombre={profile?.nombre_completo ?? ''}
      userId={user.id}
    />
  )
}