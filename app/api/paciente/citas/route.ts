/**
 * /api/paciente/citas/route.ts
 * ─────────────────────────────────────────────────────────────
 * POST — el paciente SOLICITA una cita con su terapeuta asignado.
 *
 * SEGURIDAD:
 *   • La cita SIEMPRE nace en estado 'pendiente_aprobacion' y
 *     origen='paciente' — esto lo blinda también la policy de RLS
 *     (citas_paciente_solicitar), así que aunque alguien manipule el
 *     body del request, la base de datos rechaza cualquier intento
 *     de crear una cita ya 'programada' desde este endpoint.
 *   • Volvemos a validar disponibilidad en el servidor justo antes de
 *     insertar (por si alguien más agendó ese bloque mientras el
 *     paciente decidía) — evita traslapes por condición de carrera.
 *   • El pago se registra como "en clínica": no se crea ningún
 *     registro de pago aquí, la secretaria lo hace cuando el paciente
 *     llegue a pagar en persona.
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const BodySchema = z.object({
  fecha_hora: z.string().datetime({ message: 'fecha_hora debe ser ISO 8601' }),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
    if (profile?.rol !== 'paciente') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const body = await request.json()
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }
    const { fecha_hora } = parsed.data

    // 1. Paciente + terapeuta asignado
    const { data: paciente } = await supabase
      .from('pacientes')
      .select('id_paciente, terapeuta_id')
      .eq('profile_id', user.id)
      .single()

    if (!paciente?.terapeuta_id) {
      return NextResponse.json({ error: 'Aún no tienes un terapeuta asignado' }, { status: 400 })
    }

    // 2. Duración según su paquete activo
    const { data: contrato } = await supabase
      .from('contratos_paciente')
      .select('paquetes(duracion_sesion_min)')
      .eq('paciente_id', paciente.id_paciente)
      .eq('estado', 'activo')
      .gte('fecha_vencimiento', (() => {
        const h = new Date()
        return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`
      })()) // bloquea aunque 'estado' no se haya actualizado solo
      .order('fecha_inicio', { ascending: false })
      .limit(1)
      .maybeSingle()

    const paqueteInfo: any = Array.isArray(contrato?.paquetes) ? contrato?.paquetes[0] : contrato?.paquetes
    const duracionMin: number | undefined = paqueteInfo?.duracion_sesion_min
    if (!duracionMin) {
      return NextResponse.json({ error: 'No tienes un paquete activo con duración de sesión definida' }, { status: 400 })
    }

    // 3. Re-validar disponibilidad en el servidor (evita condición de carrera:
    //    que dos pacientes elijan el mismo bloque casi al mismo tiempo)
    const inicio = new Date(fecha_hora)
    const fin = new Date(inicio.getTime() + duracionMin * 60000)

    const diaStr = `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, '0')}-${String(inicio.getDate()).padStart(2, '0')}`
    const { data: ventanas } = await supabase
      .from('disponibilidad_terapeuta')
      .select('hora_inicio, hora_fin')
      .eq('terapeuta_id', paciente.terapeuta_id)
      .eq('dia_semana', inicio.getDay())
      .eq('activo', true)

    const horaInicioMin = inicio.getHours() * 60 + inicio.getMinutes()
    const horaFinMin = horaInicioMin + duracionMin
    const dentroDeVentana = (ventanas ?? []).some(v => {
      const [hi, mi] = v.hora_inicio.slice(0, 5).split(':').map(Number)
      const [hf, mf] = v.hora_fin.slice(0, 5).split(':').map(Number)
      const inicioVentana = hi * 60 + mi
      const finVentana = hf * 60 + mf
      return horaInicioMin >= inicioVentana && horaFinMin <= finVentana
    })

    if (!dentroDeVentana) {
      return NextResponse.json({ error: 'Ese horario está fuera de la disponibilidad del terapeuta' }, { status: 409 })
    }

    const { data: citasDelDia } = await supabase
      .from('citas')
      .select('fecha_hora, duracion_min')
      .eq('terapeuta_id', paciente.terapeuta_id)
      .gte('fecha_hora', `${diaStr}T00:00:00`)
      .lte('fecha_hora', `${diaStr}T23:59:59`)
      .neq('estado', 'cancelada')

    const hayTraslape = (citasDelDia ?? []).some(c => {
      const cInicio = new Date(c.fecha_hora)
      const cIni = cInicio.getHours() * 60 + cInicio.getMinutes()
      const cFin = cIni + c.duracion_min
      return horaInicioMin < cFin && horaFinMin > cIni
    })

    if (hayTraslape) {
      return NextResponse.json({ error: 'Ese horario ya no está disponible, elige otro bloque' }, { status: 409 })
    }

    // 4. Insertar — nace pendiente_aprobacion / origen paciente
    //    (la policy de RLS también lo exige, esto es defensa en profundidad)
    const { data: cita, error } = await supabase
      .from('citas')
      .insert({
        paciente_id: paciente.id_paciente,
        terapeuta_id: paciente.terapeuta_id,
        fecha_hora: inicio.toISOString(),
        duracion_min: duracionMin,
        estado: 'pendiente_aprobacion',
        origen: 'paciente',
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error al crear solicitud de cita:', error)
      return NextResponse.json({ error: 'No se pudo crear la solicitud' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, cita }, { status: 201 })

  } catch (err) {
    console.error('Error en POST /api/paciente/citas:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
