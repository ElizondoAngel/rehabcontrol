import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ExpedienteClient from './ExpedienteClient'
import { sincronizarRutinaConPaciente } from '@/lib/rutina-ia'

export const dynamic = 'force-dynamic'

export default async function ExpedientePage({
  params,
}: {
  params: Promise<{ id_paciente: string }>
}) {
  const { id_paciente } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verificar rol en servidor (seguridad doble capa)
  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, nombre_completo')
    .eq('id', user.id)
    .single()

  if (profile?.rol !== 'terapeuta' && profile?.rol !== 'admin') {
    redirect('/unauthorized')
  }

  const esAdmin = profile?.rol === 'admin'

  let pacienteQuery = supabase
    .from('pacientes')
    .select('id_paciente, nombre_completo, curp, fecha_nacimiento, telefono, activo, terapeuta_id')
    .eq('id_paciente', id_paciente)

  if (!esAdmin) {
    pacienteQuery = pacienteQuery.eq('terapeuta_id', user.id)
  }

  const { data: paciente } = await pacienteQuery.single()

  if (!paciente) notFound()

  let { data: expediente } = await supabase
    .from('expedientes')
    .select('*')
    .eq('paciente_id', id_paciente)
    .maybeSingle()

  if (expediente) {
    await sincronizarRutinaConPaciente(
      supabase,
      paciente.terapeuta_id ?? user.id,
      Number(id_paciente),
      expediente.indicaciones,
      expediente.plan_tratamiento
    )
  }

  // Obtener las sesiones existentes en progreso_sesiones
  const { data: sesionesRaw } = await supabase
    .from('progreso_sesiones')
    .select('id_progreso_sesion, cita_id, nivel_dolor, movilidad, ejercicios, observaciones, archivos, fecha_registro')
    .eq('paciente_id', id_paciente)
    .order('id_progreso_sesion', { ascending: false })
    .limit(15)

  // Consultar evaluaciones de Cámara IA guardadas por el paciente en `reportes_sintomas`
  const { data: reportesIA } = await supabase
    .from('reportes_sintomas')
    .select('id_reporte, intensidad, sintomas_adicionales, resumen_ia, conversacion_completa, created_at')
    .eq('paciente_id', id_paciente)
    .eq('tipo_dolor', 'EVALUACION_CAMARA_IA')
    .order('created_at', { ascending: false })
    .limit(10)

  const fechasYaEnProgreso = new Set(
    (sesionesRaw ?? []).map((s: any) => String(s.fecha_registro ?? '').slice(0, 19))
  )

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

      const fechaIso = parsed.fecha_registro ?? rep.created_at
      const claveFecha = String(fechaIso ?? '').slice(0, 19)

      // Si esta evaluación IA aún no está copiada en `progreso_sesiones`, el terapeuta (que sí tiene permiso INSERT por RLS) la sincroniza automáticamente
      if (!fechasYaEnProgreso.has(claveFecha)) {
        const fechaUnica = new Date(Date.now() - Math.floor(Math.random() * 90000) - (idx + 1) * 2000).toISOString()
        const { data: nuevaCita } = await supabase
          .from('citas')
          .insert({
            paciente_id: Number(id_paciente),
            terapeuta_id: paciente.terapeuta_id ?? user.id,
            created_by: user.id,
            fecha_hora: fechaUnica,
            duracion_min: 30,
            estado: 'completada',
            notas: 'Evaluación de Cámara IA realizada por el paciente',
          })
          .select('id_cita')
          .maybeSingle()

        if (nuevaCita?.id_cita) {
          const { data: progInsertado } = await supabase
            .from('progreso_sesiones')
            .insert({
              cita_id: nuevaCita.id_cita,
              paciente_id: Number(id_paciente),
              nivel_dolor: parsed.nivel_dolor ?? rep.intensidad ?? 2,
              movilidad: parsed.movilidad ?? 8,
              ejercicios: parsed.ejercicios ?? [],
              observaciones: parsed.observaciones ?? rep.resumen_ia,
              archivos: parsed.archivos ?? [],
              fecha_registro: fechaIso,
            })
            .select()
            .maybeSingle()

          if (progInsertado) {
            fechasYaEnProgreso.add(claveFecha)
          }
        }

        // Actualizar también `expedientes.postura_movilidad` con el aviso de cumplimiento si aún no está
        if (expediente) {
          const resumenEj = Array.isArray(parsed.ejercicios)
            ? parsed.ejercicios.map((e: any) => `${e.ejercicio} (${e.repeticiones ?? 0}/${e.repeticiones_meta ?? e.repeticiones ?? 0})`).join(', ')
            : 'Rutina IA'
          const fechaCorta = new Date(fechaIso).toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
          const lineaAviso = `✅ [${fechaCorta}] Paciente completó en Cámara IA: ${resumenEj} · Precisión: ${parsed.precision_promedio ?? 95}% · Dolor: ${parsed.nivel_dolor ?? rep.intensidad ?? 2}/10.`
          if (!(expediente.postura_movilidad ?? '').includes(lineaAviso)) {
            const nuevaPostura = [expediente.postura_movilidad, lineaAviso].filter(Boolean).join('\n')
            const { data: expUpd } = await supabase
              .from('expedientes')
              .update({ postura_movilidad: nuevaPostura, updated_at: new Date().toISOString() })
              .eq('id_expediente', expediente.id_expediente)
              .select('*')
              .maybeSingle()
            if (expUpd) expediente = expUpd
          }
        }
      }

      sesionesDesdeReportes.push({
        id_progreso_sesion: 900000 + idx,
        nivel_dolor: parsed.nivel_dolor ?? rep.intensidad ?? 2,
        movilidad: parsed.movilidad ?? 8,
        ejercicios: parsed.ejercicios ?? [],
        observaciones: parsed.observaciones ?? rep.resumen_ia,
        archivos: parsed.archivos ?? [],
        fecha_registro: fechaIso,
        es_evaluacion_ia: true,
      })
    } catch {
      // Ignorar si no es JSON válido
    }
  }

  // Filtrar en el expediente las filas que son meramente copias de asignación del terapeuta ("📋 Rutina asignada..."),
  // para que el terapeuta vea limpiamente las ejecuciones del paciente, sus posturas y videos
  const sesionesEjecutadas = (sesionesRaw ?? []).filter((s: any) => {
    const obs = String(s.observaciones ?? '')
    if (obs.startsWith('📋 Rutina')) return false
    const lista = Array.isArray(s.ejercicios) ? s.ejercicios : []
    if (lista.length > 0 && lista.every((e: any) => e.asignado_por_terapeuta === true && !e.evaluado_por_ia)) {
      return false
    }
    return true
  })

  // Unir evitando duplicados por fecha_registro
  const vistasPorFecha = new Set<string>()
  const sesionesCombinadas: any[] = []
  for (const item of [...sesionesDesdeReportes, ...sesionesEjecutadas]) {
    const k = String(item.fecha_registro ?? '').slice(0, 19)
    if (k && vistasPorFecha.has(k)) continue
    if (k) vistasPorFecha.add(k)
    sesionesCombinadas.push(item)
  }

  const sesionesRecientes = await Promise.all(
    sesionesCombinadas.slice(0, 6).map(async (s: any) => {
      const archivos = Array.isArray(s.archivos) ? s.archivos : []
      const archivosConUrl = await Promise.all(
        archivos.map(async (a: any) => {
          if (a.url && a.url.startsWith('data:')) {
            return a
          }
          const { data: signed } = await supabase.storage
            .from('progreso-archivos')
            .createSignedUrl(a.path, 60 * 60)
          return { ...a, url: signed?.signedUrl ?? a.url ?? null }
        })
      )
      return { ...s, archivos: archivosConUrl }
    })
  )

  return (
    <ExpedienteClient
      paciente={paciente}
      expedienteInicial={expediente ?? null}
      sesionesIA={sesionesRecientes}
      terapeutaId={user.id}
      userNombre={profile?.nombre_completo ?? ''}
    />
  )
}
