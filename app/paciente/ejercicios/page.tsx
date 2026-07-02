import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EjerciciosClient from './EjerciciosClient'
export const dynamic = 'force-dynamic'

export default async function PacienteEjercicios() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, nombre_completo')
    .eq('id', user.id)
    .single()

  if (profile?.rol !== 'paciente') redirect('/unauthorized')

  const { data: paciente } = await supabase
    .from('pacientes')
    .select('id_paciente, nombre_completo')
    .eq('profile_id', user.id)
    .single()

  const idPaciente = paciente?.id_paciente ?? -1

  // Misma tabla que ya llena el terapeuta en ProgresoDetalleClient.tsx —
  // no se crea nada nuevo, solo se lee.
  const { data: sesiones } = await supabase
    .from('progreso_sesiones')
    .select('id_progreso_sesion, nivel_dolor, movilidad, ejercicios, observaciones, archivos, fecha_registro')
    .eq('paciente_id', idPaciente)
    .order('fecha_registro', { ascending: false })

  // Signed URLs para los archivos (bucket privado 'progreso-archivos').
  // Requiere la policy progreso_archivos_select_paciente de la migración.
  const sesionesConUrls = await Promise.all(
    (sesiones ?? []).map(async (s) => {
      const archivos = Array.isArray(s.archivos) ? s.archivos : []
      const archivosConUrl = await Promise.all(
        archivos.map(async (a: any) => {
          const { data: signed } = await supabase.storage
            .from('progreso-archivos')
            .createSignedUrl(a.path, 60 * 60) // 1 hora
          return { ...a, url: signed?.signedUrl ?? null }
        })
      )
      return { ...s, archivos: archivosConUrl }
    })
  )

  return (
    <EjerciciosClient
      profile={profile}
      sesiones={sesionesConUrls}
      userId={user.id}
    />
  )
}