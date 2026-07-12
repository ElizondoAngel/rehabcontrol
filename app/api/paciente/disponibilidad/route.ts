/**
 * /api/paciente/disponibilidad/route.ts
 * ─────────────────────────────────────────────────────────────
 * GET ?fecha=YYYY-MM-DD
 *
 * Calcula los bloques disponibles para que el paciente agende con SU
 * terapeuta asignado (pacientes.terapeuta_id), en la fecha pedida.
 *
 * Cruza:
 *   1. disponibilidad_terapeuta  → ventanas de horario ese día de semana
 *   2. citas ya existentes       → intervalos ocupados (cualquier estado
 *                                   distinto de 'cancelada')
 *   3. paquete activo del paciente → duración de sesión (tamaño del bloque)
 *
 * Devuelve bloques con paso fijo = duración de sesión, marcando cada uno
 * como disponible u ocupado. No agenda nada — solo informa.
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function hhmmToMinutos(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
function minutosToHHMM(min: number) {
  const h = Math.floor(min / 60).toString().padStart(2, '0')
  const m = (min % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}
function formatoFechaLocal(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
    if (profile?.rol !== 'paciente') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const fechaStr = searchParams.get('fecha') // 'YYYY-MM-DD'
    if (!fechaStr || !/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
      return NextResponse.json({ error: 'Parámetro fecha inválido (usa YYYY-MM-DD)' }, { status: 400 })
    }

    // 1. Datos del paciente: terapeuta asignado
    const { data: paciente } = await supabase
      .from('pacientes')
      .select('id_paciente, terapeuta_id')
      .eq('profile_id', user.id)
      .single()

    if (!paciente?.terapeuta_id) {
      return NextResponse.json({ error: 'Aún no tienes un terapeuta asignado' }, { status: 400 })
    }

    // 2. Duración de sesión: viene del paquete de su contrato activo
    const { data: contrato, error: errorContrato } = await supabase
      .from('contratos_paciente')
      .select('paquete_id, paquetes(duracion_sesion_min, nombre)')
      .eq('paciente_id', paciente.id_paciente)
      .eq('estado', 'activo')
      .gte('fecha_vencimiento', formatoFechaLocal(new Date())) // bloquea aunque 'estado' no se haya actualizado solo
      .order('fecha_inicio', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (errorContrato) {
      console.error('Error consultando contrato/paquete del paciente:', errorContrato)
    }

    const paqueteInfo: any = Array.isArray(contrato?.paquetes) ? contrato?.paquetes[0] : contrato?.paquetes
    const duracionMin = paqueteInfo?.duracion_sesion_min ?? null

    if (!duracionMin) {
      return NextResponse.json({
        error: errorContrato
          ? 'Error al consultar tu paquete — revisa los logs del servidor'
          : 'No tienes un paquete activo con duración de sesión definida',
      }, { status: 400 })
    }

    // 3. Día de la semana (0=domingo ... 6=sábado), en horario local de México
    const fecha = new Date(`${fechaStr}T00:00:00`)
    const diaSemana = fecha.getDay()

    // 4. Ventanas de disponibilidad del terapeuta ese día
    const { data: ventanas, error: errorVentanas } = await supabase
      .from('disponibilidad_terapeuta')
      .select('hora_inicio, hora_fin')
      .eq('terapeuta_id', paciente.terapeuta_id)
      .eq('dia_semana', diaSemana)
      .eq('activo', true)

    // DEBUG TEMPORAL — quitar una vez encontrada la causa
    console.log('DEBUG disponibilidad:', {
      fechaStr, diaSemana, terapeuta_id: paciente.terapeuta_id,
      ventanas, errorVentanas,
    })

    if (!ventanas || ventanas.length === 0) {
      return NextResponse.json({ duracion_min: duracionMin, bloques: [] })
    }

    // 5. Citas ya ocupadas de ese terapeuta, ese día (cualquier estado
    //    excepto cancelada bloquea el horario)
    const inicioDia = `${fechaStr}T00:00:00`
    const finDia = `${fechaStr}T23:59:59`
    const { data: citasDelDia } = await supabase
      .from('citas')
      .select('fecha_hora, duracion_min, estado')
      .eq('terapeuta_id', paciente.terapeuta_id)
      .gte('fecha_hora', inicioDia)
      .lte('fecha_hora', finDia)
      .neq('estado', 'cancelada')

    const ocupados = (citasDelDia ?? []).map(c => {
      const inicio = new Date(c.fecha_hora)
      const inicioMin = inicio.getHours() * 60 + inicio.getMinutes()
      return { inicio: inicioMin, fin: inicioMin + c.duracion_min }
    })

    // 6. Generar bloques de tamaño `duracionMin` dentro de cada ventana,
    //    marcando disponible/ocupado
    const ahora = new Date()
    const esHoy = fechaStr === formatoFechaLocal(ahora)
    const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes()

    const bloques: { hora: string; disponible: boolean }[] = []

    for (const v of ventanas) {
      let cursor = hhmmToMinutos(v.hora_inicio.slice(0, 5))
      const finVentana = hhmmToMinutos(v.hora_fin.slice(0, 5))

      while (cursor + duracionMin <= finVentana) {
        const finBloque = cursor + duracionMin
        const seTraslapa = ocupados.some(o => cursor < o.fin && finBloque > o.inicio)
        const yaPaso = esHoy && cursor <= minutosAhora

        bloques.push({
          hora: minutosToHHMM(cursor),
          disponible: !seTraslapa && !yaPaso,
        })
        cursor += duracionMin
      }
    }

    bloques.sort((a, b) => a.hora.localeCompare(b.hora))

    return NextResponse.json({
      duracion_min: duracionMin,
      terapeuta_id: paciente.terapeuta_id,
      bloques,
    })

  } catch (err) {
    console.error('Error en /api/paciente/disponibilidad:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
