import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ProgresoDetalleClient from './ProgresoDetalleClient'

export const dynamic = 'force-dynamic'

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

  // Historial completo de sesiones de este paciente
  const { data: sesiones } = await supabase
    .from('progreso_sesiones')
    .select('*')
    .eq('paciente_id', id_paciente)
    .order('id_progreso_sesion', { ascending: false })

  // Consultar también evaluaciones de Cámara IA guardadas por el paciente en `reportes_sintomas`
  const { data: reportesIA } = await supabase
    .from('reportes_sintomas')
    .select('id_reporte, intensidad, sintomas_adicionales, resumen_ia, conversacion_completa, created_at')
    .eq('paciente_id', id_paciente)
    .eq('tipo_dolor', 'EVALUACION_CAMARA_IA')
    .order('created_at', { ascending: false })
    .limit(10)

  const sesionesDesdeReportes: any[] = []
  for (let idx = 0; idx < (reportesIA ?? []).length; idx++) {
    const rep: any = reportesIA![idx]
    try {
      const parsed =
        rep.conversacion_completa && typeof rep.conversacion_completa === 'object'
          ? rep.conversacion_completa
          : rep.sintomas_adicionales
            ? JSON.parse(rep.sintomas_adicionales)
            : null
      if (!parsed || !parsed.es_evaluacion_camara_ia) continue
      sesionesDesdeReportes.push({
        id_progreso_sesion: 900000 + idx,
        cita_id: 0,
        paciente_id: Number(id_paciente),
        nivel_dolor: parsed.nivel_dolor ?? rep.intensidad ?? 2,
        movilidad: parsed.movilidad ?? 8,
        ejercicios: parsed.ejercicios ?? [],
        observaciones: parsed.observaciones ?? rep.resumen_ia,
        archivos: parsed.archivos ?? [],
        fecha_registro: parsed.fecha_registro ?? rep.created_at,
      })
    } catch {
      // Ignorar si no es JSON válido
    }
  }

  const vistasPorFecha = new Set<string>()
  const sesionesCombinadas: any[] = []
  for (const item of [...sesionesDesdeReportes, ...(sesiones ?? [])]) {
    const k = String(item.fecha_registro ?? '').slice(0, 19)
    if (k && vistasPorFecha.has(k)) continue
    if (k) vistasPorFecha.add(k)
    sesionesCombinadas.push(item)
  }

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
      sesionesIniciales={sesionesCombinadas}
      citasDisponibles={citasDisponibles}
      userNombre={profile?.nombre_completo ?? ''}
      userId={user.id}
    />
  )
}
