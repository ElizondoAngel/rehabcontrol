export type NombreEjercicioFijoIA =
  | 'Sentadilla'
  | 'Desplante de Pierna'
  | 'Levantar Brazo al Costado'
  | 'Doblar y Estirar Codo'
  | 'Elevación de Pierna'
  | 'Inclinación de Tronco'

export interface EjercicioAsignadoIA {
  ejercicio: NombreEjercicioFijoIA
  repeticiones: number
  modo_adaptado: boolean
}

export const NOMBRES_EJERCICIOS_FIJOS_IA: NombreEjercicioFijoIA[] = [
  'Sentadilla',
  'Desplante de Pierna',
  'Levantar Brazo al Costado',
  'Doblar y Estirar Codo',
  'Elevación de Pierna',
  'Inclinación de Tronco',
]

export function normalizarNombreEjercicioIA(nombre?: string | null): NombreEjercicioFijoIA | null {
  if (!nombre) return null
  const limpio = nombre
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  for (const fijo of NOMBRES_EJERCICIOS_FIJOS_IA) {
    const fijoNorm = fijo
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    if (fijoNorm === limpio) return fijo
  }

  if (limpio.includes('sentadilla')) return 'Sentadilla'
  if (limpio.includes('desplante')) return 'Desplante de Pierna'
  if (limpio.includes('brazo') || limpio.includes('costado') || limpio.includes('abduccion') || limpio.includes('hombro')) {
    return 'Levantar Brazo al Costado'
  }
  if (limpio.includes('codo') || limpio.includes('biceps')) {
    return 'Doblar y Estirar Codo'
  }
  if (limpio.includes('elevacion de pierna') || limpio.includes('pierna')) {
    return 'Elevación de Pierna'
  }
  if (limpio.includes('tronco') || limpio.includes('inclinacion') || limpio.includes('lumbar')) {
    return 'Inclinación de Tronco'
  }
  return null
}

const MARCADOR_INICIO = '[[RUTINA_IA_JSON:'
const MARCADOR_FIN = ']]'

/**
 * Extrae ejercicios de texto libre si el terapeuta los escribió en indicaciones
 * o desde el Chatbot sin el marcador JSON.
 */
export function extraerRutinaDeTextoLibre(texto?: string | null): EjercicioAsignadoIA[] {
  if (!texto) return []
  const resultado: EjercicioAsignadoIA[] = []
  const yaIncluidos = new Set<NombreEjercicioFijoIA>()

  const patrones: Array<{ regex: RegExp; ejercicio: NombreEjercicioFijoIA }> = [
    { regex: /(?:(\d+)\s*(?:rep(?:eticiones)?|veces|series)?\s*(?:de\s+)?)?sentadillas?(?:\s*[x×:]?\s*(\d+))?/gi, ejercicio: 'Sentadilla' },
    { regex: /(?:(\d+)\s*(?:rep(?:eticiones)?|veces|series)?\s*(?:de\s+)?)?desplantes?(?:\s+de\s+pierna)?(?:\s*[x×:]?\s*(\d+))?/gi, ejercicio: 'Desplante de Pierna' },
    { regex: /(?:(\d+)\s*(?:rep(?:eticiones)?|veces|series)?\s*(?:de\s+)?)?(?:levantar\s+brazos?(?:\s+al\s+costado)?|elevaci[oó]n\s+lateral|costado)(?:\s*[x×:]?\s*(\d+))?/gi, ejercicio: 'Levantar Brazo al Costado' },
    { regex: /(?:(\d+)\s*(?:rep(?:eticiones)?|veces|series)?\s*(?:de\s+)?)?(?:doblar\s+y\s+estirar\s+codos?|flexi[oó]n\s+de\s+codo|codos?)(?:\s*[x×:]?\s*(\d+))?/gi, ejercicio: 'Doblar y Estirar Codo' },
    { regex: /(?:(\d+)\s*(?:rep(?:eticiones)?|veces|series)?\s*(?:de\s+)?)?elevaci[oó]n\s+de\s+piernas?(?:\s*[x×:]?\s*(\d+))?/gi, ejercicio: 'Elevación de Pierna' },
    { regex: /(?:(\d+)\s*(?:rep(?:eticiones)?|veces|series)?\s*(?:de\s+)?)?inclinaci[oó]n\s+de\s+tronco(?:\s*[x×:]?\s*(\d+))?/gi, ejercicio: 'Inclinación de Tronco' },
  ]

  for (const { regex, ejercicio } of patrones) {
    let match: RegExpExecArray | null
    while ((match = regex.exec(texto)) !== null) {
      if (yaIncluidos.has(ejercicio)) continue
      const numAntes = match[1] ? parseInt(match[1], 10) : null
      const numDespues = match[2] ? parseInt(match[2], 10) : null
      const reps = numDespues || numAntes || 5
      yaIncluidos.add(ejercicio)
      resultado.push({
        ejercicio,
        repeticiones: Math.max(1, Math.min(100, reps)),
        modo_adaptado: false,
      })
    }
  }

  return resultado
}

/**
 * Extrae la lista estructurada de ejercicios asignados (solo de los 6 fijos)
 * y el texto libre de indicaciones sin el bloque técnico.
 */
export function extraerRutinaDeIndicaciones(indicacionesRaw?: string | null): {
  indicacionesLimpias: string
  rutinaAsignada: EjercicioAsignadoIA[]
} {
  if (!indicacionesRaw) {
    return { indicacionesLimpias: '', rutinaAsignada: [] }
  }

  const idxIni = indicacionesRaw.indexOf(MARCADOR_INICIO)
  if (idxIni === -1) {
    const limpias = indicacionesRaw.trim()
    return {
      indicacionesLimpias: limpias,
      rutinaAsignada: extraerRutinaDeTextoLibre(limpias),
    }
  }

  const idxFin = indicacionesRaw.indexOf(MARCADOR_FIN, idxIni + MARCADOR_INICIO.length)
  if (idxFin === -1) {
    const limpias = indicacionesRaw.trim()
    return {
      indicacionesLimpias: limpias,
      rutinaAsignada: extraerRutinaDeTextoLibre(limpias),
    }
  }

  const jsonStr = indicacionesRaw.slice(idxIni + MARCADOR_INICIO.length, idxFin).trim()
  const antes = indicacionesRaw.slice(0, idxIni).trim()
  const despues = indicacionesRaw.slice(idxFin + MARCADOR_FIN.length).trim()
  const indicacionesLimpias = [antes, despues].filter(Boolean).join('\n').trim()

  try {
    const parsed = JSON.parse(jsonStr)
    if (!Array.isArray(parsed)) {
      return { indicacionesLimpias, rutinaAsignada: extraerRutinaDeTextoLibre(indicacionesLimpias) }
    }
    const validos: EjercicioAsignadoIA[] = []
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const oficial = normalizarNombreEjercicioIA(item.ejercicio)
      if (oficial && Number(item.repeticiones) > 0) {
        validos.push({
          ejercicio: oficial,
          repeticiones: Math.max(1, Math.round(Number(item.repeticiones))),
          modo_adaptado: Boolean(item.modo_adaptado),
        })
      }
    }
    if (validos.length > 0) {
      return { indicacionesLimpias, rutinaAsignada: validos }
    }
    return { indicacionesLimpias, rutinaAsignada: extraerRutinaDeTextoLibre(indicacionesLimpias) }
  } catch {
    return { indicacionesLimpias, rutinaAsignada: extraerRutinaDeTextoLibre(indicacionesLimpias) }
  }
}

/**
 * Combina las indicaciones escritas por el terapeuta con la rutina estructurada de los 6 ejercicios fijos.
 */
export function empaquetarRutinaEnIndicaciones(
  indicacionesTexto: string,
  rutinaAsignada: EjercicioAsignadoIA[]
): string {
  const baseLimpia = extraerRutinaDeIndicaciones(indicacionesTexto).indicacionesLimpias
  const filtrada = rutinaAsignada.filter(
    r => NOMBRES_EJERCICIOS_FIJOS_IA.includes(r.ejercicio) && r.repeticiones > 0
  )

  if (filtrada.length === 0) {
    return baseLimpia
  }

  const bloqueJson = `${MARCADOR_INICIO}${JSON.stringify(filtrada)}${MARCADOR_FIN}`
  return [baseLimpia, bloqueJson].filter(Boolean).join('\n\n')
}

export async function sincronizarRutinaConPaciente(
  supabase: any,
  terapeutaId: string,
  pacienteId: number,
  indicacionesNuevas?: string | null,
  planTratamiento?: string | null
) {
  let { rutinaAsignada, indicacionesLimpias } = extraerRutinaDeIndicaciones(indicacionesNuevas)
  if (rutinaAsignada.length === 0 && planTratamiento) {
    rutinaAsignada = extraerRutinaDeTextoLibre(planTratamiento)
  }
  if (rutinaAsignada.length === 0) return

  const notaConMarcador = empaquetarRutinaEnIndicaciones(
    indicacionesLimpias
      ? `📋 Rutina asignada por tu terapeuta en Expediente: ${indicacionesLimpias}`
      : '📋 Rutina de ejercicios asignada por tu fisioterapeuta para realizar con Cámara IA.',
    rutinaAsignada
  )

  const { data: sesionesPrev } = await supabase
    .from('progreso_sesiones')
    .select('id_progreso_sesion, cita_id, ejercicios, observaciones')
    .eq('paciente_id', pacienteId)
    .order('id_progreso_sesion', { ascending: false })

  const ultimaSesion = sesionesPrev?.[0]
  if (ultimaSesion) {
    const rutinaEnUltima = extraerRutinaDeIndicaciones(ultimaSesion.observaciones).rutinaAsignada
    const listaEjUltima = Array.isArray(ultimaSesion.ejercicios)
      ? ultimaSesion.ejercicios.map((e: any) => ({
          ejercicio: e.ejercicio,
          repeticiones: Number(e.repeticiones_meta ?? e.repeticiones ?? 5),
          modo_adaptado: Boolean(e.modo_adaptado),
        }))
      : []

    if (
      JSON.stringify(rutinaEnUltima) === JSON.stringify(rutinaAsignada) ||
      JSON.stringify(listaEjUltima) === JSON.stringify(rutinaAsignada)
    ) {
      await supabase
        .from('citas')
        .update({ notas: notaConMarcador })
        .eq('id_cita', ultimaSesion.cita_id)
      return
    }
  }

  const citasUsadas = new Set((sesionesPrev ?? []).map((s: any) => s.cita_id))

  const { data: citasPac } = await supabase
    .from('citas')
    .select('id_cita, estado, notas')
    .eq('paciente_id', pacienteId)
    .neq('estado', 'cancelada')
    .order('id_cita', { ascending: false })
    .limit(15)

  let citaId: number | null = null
  const libre = (citasPac ?? []).find((c: any) => !citasUsadas.has(c.id_cita))

  if (libre) {
    citaId = libre.id_cita
    await supabase
      .from('citas')
      .update({
        estado: 'completada',
        notas: notaConMarcador,
      })
      .eq('id_cita', libre.id_cita)
  } else {
    const fechaUnica = new Date(Date.now() - Math.floor(Math.random() * 50000) - 1000).toISOString()
    const { data: nuevaCita } = await supabase
      .from('citas')
      .insert({
        paciente_id: pacienteId,
        terapeuta_id: terapeutaId,
        created_by: terapeutaId,
        fecha_hora: fechaUnica,
        duracion_min: 45,
        estado: 'completada',
        notas: notaConMarcador,
      })
      .select('id_cita')
      .maybeSingle()

    if (nuevaCita?.id_cita) {
      citaId = nuevaCita.id_cita
    } else if (citasPac && citasPac.length > 0) {
      await supabase
        .from('citas')
        .update({ notas: notaConMarcador })
        .eq('id_cita', citasPac[0].id_cita)
    }
  }

  if (citaId) {
    const { error: errProg } = await supabase.from('progreso_sesiones').insert({
      cita_id: citaId,
      paciente_id: pacienteId,
      nivel_dolor: 3,
      movilidad: 8,
      ejercicios: rutinaAsignada.map(r => ({
        ejercicio: r.ejercicio,
        repeticiones: r.repeticiones,
        repeticiones_meta: r.repeticiones,
        modo_adaptado: r.modo_adaptado,
        asignado_por_terapeuta: true,
      })),
      observaciones: notaConMarcador,
      archivos: [],
      fecha_registro: new Date().toISOString(),
    })

    if (errProg) {
      console.warn('[sincronizarRutinaConPaciente] Aviso al insertar en progreso_sesiones:', errProg.message)
    }
  }
}
