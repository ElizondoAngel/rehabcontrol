/**
 * /api/chatbot/route.ts
 * POST — chatbot de RehabControl con contexto dinámico por rol
 *
 * Cada rol recibe un system prompt diferente:
 *   - admin:      acceso a métricas globales, puede preguntar sobre cualquier módulo
 *   - secretaria: agenda, citas del día, pagos pendientes
 *   - terapeuta:  sus pacientes, progreso de sesiones, expedientes
 *   - paciente:   sus propias citas, pagos y progreso
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function obtenerContexto(supabase: any, userId: string, rol: string) {
  const hoy = new Date().toISOString().split('T')[0]
  let contexto = ''

  if (rol === 'admin') {
    const [
      { count: totalPacientes },
      { count: citasHoy },
      { data: pagsPendientes },
    ] = await Promise.all([
      supabase.from('pacientes').select('*', { count:'exact', head:true }).eq('activo', true),
      supabase.from('citas').select('*', { count:'exact', head:true }).gte('fecha_hora', `${hoy}T00:00:00`).lte('fecha_hora', `${hoy}T23:59:59`),
      supabase.from('pagos').select('monto').eq('estado_pago', 'pendiente'),
    ])
    const totalAdeudos = (pagsPendientes ?? []).reduce((s: number, p: any) => s + Number(p.monto), 0)
    contexto = `Contexto actual del sistema:
- Pacientes activos: ${totalPacientes ?? 0}
- Citas programadas hoy: ${citasHoy ?? 0}
- Adeudos pendientes totales: $${totalAdeudos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

  } else if (rol === 'secretaria') {
    const { data: citasHoyData } = await supabase
      .from('citas')
      .select('id_cita, fecha_hora, estado, pacientes(nombre_completo)')
      .gte('fecha_hora', `${hoy}T00:00:00`)
      .lte('fecha_hora', `${hoy}T23:59:59`)
      .order('fecha_hora')
    const { count: pagsPend } = await supabase
      .from('pagos').select('*', { count:'exact', head:true }).eq('estado_pago', 'pendiente')
    contexto = `Contexto de hoy (${hoy}):
- Citas del día: ${(citasHoyData ?? []).length}
${(citasHoyData ?? []).map((c: any) => `  • ${new Date(c.fecha_hora).toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit', hour12:true })} — ${c.pacientes?.nombre_completo ?? 'Paciente'} (${c.estado})`).join('\n')}
- Pagos pendientes en el sistema: ${pagsPend ?? 0}`

  } else if (rol === 'terapeuta') {
    const { data: misPacientes } = await supabase
      .from('pacientes')
      .select('id_paciente, nombre_completo, activo')
      .eq('terapeuta_id', userId)
      .eq('activo', true)
      .limit(20)
    const { data: citasHoyData } = await supabase
      .from('citas')
      .select('id_cita, fecha_hora, estado, pacientes(nombre_completo)')
      .eq('terapeuta_id', userId)
      .gte('fecha_hora', `${hoy}T00:00:00`)
      .lte('fecha_hora', `${hoy}T23:59:59`)
      .order('fecha_hora')
    contexto = `Tus pacientes activos (${(misPacientes ?? []).length}):
${(misPacientes ?? []).map((p: any) => `  • ${p.nombre_completo}`).join('\n')}

Tus citas de hoy:
${(citasHoyData ?? []).length === 0 ? '  Sin citas programadas para hoy' : (citasHoyData ?? []).map((c: any) => `  • ${new Date(c.fecha_hora).toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit', hour12:true })} — ${c.pacientes?.nombre_completo ?? 'Paciente'} (${c.estado})`).join('\n')}`

  } else if (rol === 'paciente') {
    const { data: miPaciente } = await supabase
      .from('pacientes')
      .select('id_paciente, nombre_completo')
      .eq('profile_id', userId)
      .single()

    if (miPaciente) {
      const [{ data: proximasCitas }, { data: misPagos }, { data: miProgreso }] = await Promise.all([
        supabase.from('citas').select('fecha_hora, estado, notas').eq('paciente_id', miPaciente.id_paciente).gte('fecha_hora', new Date().toISOString()).order('fecha_hora').limit(3),
        supabase.from('pagos').select('monto, estado_pago, fecha_pago').eq('paciente_id', miPaciente.id_paciente).order('fecha_pago', { ascending: false }).limit(5),
        supabase.from('progreso_sesiones').select('nivel_dolor, movilidad, observaciones, fecha_registro').eq('paciente_id', miPaciente.id_paciente).order('fecha_registro', { ascending: false }).limit(3),
      ])
      const pagPendiente = (misPagos ?? []).filter((p: any) => p.estado_pago === 'pendiente').reduce((s: number, p: any) => s + Number(p.monto), 0)
      contexto = `Información del paciente: ${miPaciente.nombre_completo}

Próximas citas:
${(proximasCitas ?? []).length === 0 ? '  Sin citas próximas' : (proximasCitas ?? []).map((c: any) => `  • ${new Date(c.fecha_hora).toLocaleDateString('es-MX', { weekday:'long', day:'numeric', month:'long' })} a las ${new Date(c.fecha_hora).toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit', hour12:true })} (${c.estado})`).join('\n')}

Pagos pendientes: $${pagPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })}

Últimas sesiones de progreso:
${(miProgreso ?? []).length === 0 ? '  Sin progreso registrado' : (miProgreso ?? []).map((p: any) => `  • ${new Date(p.fecha_registro).toLocaleDateString('es-MX')} — Dolor: ${p.nivel_dolor}/10, Movilidad: ${p.movilidad}/10`).join('\n')}`
    }
  }

  return contexto
}

const SYSTEM_PROMPTS: Record<string, string> = {
  admin: `Eres el asistente de RehabControl para el administrador de la clínica Rehabilitandomed. Tienes acceso a información del sistema y puedes responder preguntas sobre pacientes, citas, pagos, usuarios y configuración. Responde siempre en español, de forma concisa y profesional. Si el administrador pregunta sobre datos específicos que no tienes, indícale en qué sección del sistema puede encontrarlos.`,

  secretaria: `Eres el asistente de RehabControl para la secretaria de la clínica Rehabilitandomed. Puedes ayudar con información sobre citas del día, pagos pendientes, registro de pacientes y operación general. Responde en español de forma clara y práctica. Si no tienes la información exacta, guía a la secretaria al módulo correspondiente del sistema.`,

  terapeuta: `Eres el asistente de RehabControl para un terapeuta de la clínica Rehabilitandomed. Puedes ayudar con información sobre sus pacientes asignados, citas del día, registro de progreso y expedientes clínicos. Responde en español de forma profesional y clínica. No inventes diagnósticos ni tratamientos — solo proporciona información del sistema.`,

  paciente: `Eres el asistente de Rehabilitandomed, una clínica de rehabilitación física. Estás hablando con un paciente que tiene acceso a su portal personal. Puedes ayudarle con información sobre sus próximas citas, el estado de sus pagos, su progreso de sesiones y preguntas generales sobre la clínica. Responde en español de forma amable, clara y empática. No proporciones consejos médicos — para dudas clínicas, indica que consulte directamente con su terapeuta.`,
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('rol').eq('id', user.id).single()
    const rol = profile?.rol ?? 'paciente'

    const body = await request.json()
    const { messages } = body // array de { role: 'user'|'assistant', content: string }

    if (!messages?.length) {
      return NextResponse.json({ error: 'Mensajes requeridos' }, { status: 400 })
    }

    // Obtener contexto dinámico del usuario
    const contexto = await obtenerContexto(supabase, user.id, rol)

    const systemPrompt = `${SYSTEM_PROMPTS[rol] ?? SYSTEM_PROMPTS.paciente}

${contexto ? `\n${contexto}\n` : ''}

Responde siempre en español. Sé conciso — máximo 3 párrafos por respuesta. No uses markdown extenso, prefiere texto simple y claro.`

    // Llamar a la API de Anthropic
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: systemPrompt,
        messages: messages.slice(-10), // últimos 10 mensajes para contexto
      }),
    })

    const data = await anthropicRes.json()

    if (!anthropicRes.ok) {
      console.error('Anthropic error:', data)
      return NextResponse.json({ error: 'Error al procesar tu pregunta' }, { status: 500 })
    }

    const respuesta = data.content?.[0]?.text ?? 'No pude generar una respuesta.'
    return NextResponse.json({ respuesta, rol })

  } catch (err) {
    console.error('Chatbot error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
