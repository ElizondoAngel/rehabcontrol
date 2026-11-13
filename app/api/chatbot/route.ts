/**
 * app/api/chatbot/route.ts
 * RehabControl AI v6 — Gemini 2.5 Flash + Google Search + Function Calling + Historial
 * + Prompt Firewall + Validación de mensaje + Logs de seguridad
 * + Manejo de rate limit (429) y alta demanda (503) con reintentos y fallback de modelo
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  normalizarNombreEjercicioIA,
  extraerRutinaDeIndicaciones,
  empaquetarRutinaEnIndicaciones,
  type EjercicioAsignadoIA,
} from '@/lib/rutina-ia'

interface GeminiPart {
  text?: string
  inline_data?: { mime_type: string; data: string }
  functionCall?: { name: string; args: Record<string, any> }
  functionResponse?: { name: string; response: any }
}
interface GeminiMsg { role: 'user' | 'model' | 'function'; parts: GeminiPart[] }

// ────────────────────────────────────────────────────────────────
// Funciones que el chatbot puede ejecutar de verdad (function calling)
// ────────────────────────────────────────────────────────────────
const FUNCTION_DECLARATIONS = [
  {
    name: 'buscar_paciente',
    description:
      'Busca un paciente por nombre o parte del nombre. Úsala cuando el terapeuta o secretaria mencionen un nombre y necesites el id_paciente para agendar.',
    parameters: {
      type: 'OBJECT',
      properties: { nombre: { type: 'STRING', description: 'Nombre o parte del nombre del paciente' } },
      required: ['nombre'],
    },
  },
  {
    name: 'buscar_terapeuta',
    description:
      'Busca un terapeuta por nombre o parte del nombre, para obtener su terapeuta_id. Úsala SIEMPRE que necesites ese ID y no lo tengas ya. Nunca pidas el ID directamente al usuario.',
    parameters: {
      type: 'OBJECT',
      properties: { nombre: { type: 'STRING', description: 'Nombre o parte del nombre del terapeuta' } },
      required: ['nombre'],
    },
  },
  {
    name: 'ver_horarios_ocupados',
    description: 'Consulta los horarios ya ocupados de un terapeuta en una fecha, para saber qué horas están libres.',
    parameters: {
      type: 'OBJECT',
      properties: {
        terapeuta_id: { type: 'STRING', description: 'UUID del terapeuta' },
        fecha: { type: 'STRING', description: 'Fecha en formato YYYY-MM-DD' },
      },
      required: ['terapeuta_id', 'fecha'],
    },
  },
  {
    name: 'agendar_cita',
    description:
      'Agenda una cita real en el sistema entre un paciente y un terapeuta. Solo úsala cuando ya tengas paciente_id, terapeuta_id y fecha_hora confirmados explícitamente por el usuario. Los IDs SIEMPRE se obtienen con buscar_paciente / buscar_terapeuta, nunca se piden al usuario. Siempre pregunta antes si desean registrar el pago de la sesión en ese momento (igual que el checkbox "Registrar pago de esta sesión ahora" del formulario manual); si dicen que sí, pide monto y método de pago antes de llamar a esta función.',
    parameters: {
      type: 'OBJECT',
      properties: {
        paciente_id: { type: 'NUMBER', description: 'ID numérico del paciente' },
        terapeuta_id: { type: 'STRING', description: 'UUID del terapeuta' },
        fecha_hora: { type: 'STRING', description: 'Fecha y hora en formato ISO 8601 CON offset de zona horaria obligatorio: YYYY-MM-DDTHH:mm:ss-06:00 (zona horaria de Ciudad de México, UTC-6). NUNCA generes la fecha sin el sufijo "-06:00" al final, incluso si el usuario no menciona la zona horaria — siempre asume que habla en hora de Ciudad de México. Ejemplo correcto: 2026-07-05T13:00:00-06:00' },
        duracion_min: { type: 'NUMBER', description: 'Duración en minutos, por defecto 60' },
        notas: { type: 'STRING', description: 'Notas opcionales' },
        registrar_pago: { type: 'BOOLEAN', description: 'true si el usuario confirmó que quiere registrar el pago de esta sesión ahora' },
        monto: { type: 'NUMBER', description: 'Monto del pago. Requerido si registrar_pago es true' },
        metodo_pago: { type: 'STRING', description: 'Uno de: efectivo, transferencia, tarjeta, aseguradora. Requerido si registrar_pago es true' },
        estado_pago: { type: 'STRING', description: 'Uno de: pendiente, pagado, reembolsado. Por defecto "pagado" si registrar_pago es true (ej. "Pagado ahora"). Usa "pendiente" si el usuario dice que pagará después.' },
      },
      required: ['paciente_id', 'terapeuta_id', 'fecha_hora'],
    },
  },
  {
    name: 'guardar_reporte_sintomas',
    description:
      'Guarda el reporte de síntomas del PACIENTE para que su terapeuta lo revise antes de la consulta. Úsala SOLO cuando ya recopilaste: zona del dolor, tipo de dolor, intensidad (0-10), cuándo empezó, qué lo mejora/empeora. El paciente nunca puede ver este reporte después, solo el terapeuta.',
    parameters: {
      type: 'OBJECT',
      properties: {
        zona_dolor: { type: 'STRING' },
        tipo_dolor: { type: 'STRING', description: 'punzante, ardor, presión, etc.' },
        intensidad: { type: 'NUMBER', description: '0 a 10' },
        inicio_sintomas: { type: 'STRING' },
        factores_agravantes: { type: 'STRING' },
        factores_mejora: { type: 'STRING' },
        sintomas_adicionales: { type: 'STRING' },
        resumen_ia: { type: 'STRING', description: 'Resumen clínico breve del caso para el terapeuta' },
      },
      required: ['zona_dolor', 'intensidad', 'resumen_ia'],
    },
  },
  {
    name: 'ver_reportes_pacientes',
    description:
      'Lista los reportes de síntomas pendientes (no leídos) de los pacientes del TERAPEUTA que está usando el chat. Úsala cuando el terapeuta pida ver reportes de síntomas.',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'registrar_pago_paciente',
    description:
      'Registra un pago para un paciente (exclusivo de SECRETARIA). Primero obtén paciente_id con buscar_paciente si solo tienes el nombre. Nunca pidas el ID al usuario.',
    parameters: {
      type: 'OBJECT',
      properties: {
        paciente_id: { type: 'NUMBER', description: 'ID numérico del paciente obtenido con buscar_paciente' },
        monto: { type: 'NUMBER', description: 'Monto del pago en MXN (mayor a 0)' },
        metodo_pago: { type: 'STRING', description: 'Uno de: efectivo, transferencia, tarjeta, aseguradora' },
        estado_pago: { type: 'STRING', description: 'Uno de: pagado, pendiente. Por defecto pagado.' },
      },
      required: ['paciente_id', 'monto', 'metodo_pago'],
    },
  },
  {
    name: 'consultar_adeudos_paciente',
    description:
      'Consulta los pagos pendientes (adeudos) y el historial reciente de pagos de un paciente (exclusivo de SECRETARIA). Primero obtén paciente_id con buscar_paciente.',
    parameters: {
      type: 'OBJECT',
      properties: {
        paciente_id: { type: 'NUMBER', description: 'ID numérico del paciente obtenido con buscar_paciente' },
      },
      required: ['paciente_id'],
    },
  },
  {
    name: 'actualizar_expediente_ejercicios',
    description:
      'Asigna ejercicios terapéuticos, indicaciones o actualiza las notas clínicas en el expediente de un paciente asignado al TERAPEUTA, y registra los ejercicios en progreso_sesiones para que el PACIENTE los vea inmediatamente en su apartado "Mis Ejercicios". Primero obtén paciente_id con buscar_paciente.',
    parameters: {
      type: 'OBJECT',
      properties: {
        paciente_id: { type: 'NUMBER', description: 'ID numérico del paciente obtenido con buscar_paciente' },
        zona_enfocada: { type: 'STRING', description: 'Zona anatómica o área tratada (ej. Rodilla, Lumbar, Hombro, Cervical, Tobillo)' },
        ejercicios_asignados: { type: 'STRING', description: 'Lista de ejercicios terapéuticos separados por coma (ej. "Cuádriceps arco corto (3x15), Sentadilla TRX (3x12)")' },
        observaciones_clinicas: { type: 'STRING', description: 'Notas del terapeuta / indicaciones para el paciente y el expediente' },
        nivel_dolor: { type: 'NUMBER', description: 'Nivel de dolor de la sesión de 0 a 10 (por defecto 5)' },
        movilidad: { type: 'NUMBER', description: 'Nivel de movilidad de la sesión de 0 a 10 (por defecto 8)' },
      },
      required: ['paciente_id'],
    },
  },
]

// Qué función puede usar cada rol — el paciente SOLO reporta síntomas,
// agendar citas es exclusivo de secretaria/terapeuta. El admin es solo lectura/orientación.
const FUNCIONES_POR_ROL: Record<string, string[]> = {
  paciente:   ['guardar_reporte_sintomas'],
  secretaria: [
    'buscar_paciente',
    'buscar_terapeuta',
    'ver_horarios_ocupados',
    'agendar_cita',
    'registrar_pago_paciente',
    'consultar_adeudos_paciente',
  ],
  terapeuta: [
    'buscar_paciente',
    'ver_horarios_ocupados',
    'agendar_cita',
    'ver_reportes_pacientes',
    'actualizar_expediente_ejercicios',
  ],
  admin:      [],
}

function declaracionesParaRol(rol: string) {
  const permitidas = FUNCIONES_POR_ROL[rol] ?? []
  return FUNCTION_DECLARATIONS.filter(f => permitidas.includes(f.name))
}

// ── Ejecuta la función real contra Supabase ────────────────────────
async function ejecutarFuncion(
  supabase: any,
  name: string,
  args: any,
  userId: string,
  rol: string
) {
  switch (name) {
    case 'buscar_paciente': {
      const { data, error } = await supabase.rpc('buscar_paciente_por_nombre', { p_nombre: args.nombre })
      if (error) return { error: error.message }
      return { resultados: data }
    }
    case 'buscar_terapeuta': {
      const { data, error } = await supabase.rpc('buscar_terapeuta_por_nombre', { p_nombre: args.nombre })
      if (error) return { error: error.message }
      return { resultados: data }
    }
    case 'ver_horarios_ocupados': {
      const { data, error } = await supabase.rpc('horarios_ocupados_terapeuta', {
        p_terapeuta_id: args.terapeuta_id,
        p_fecha: args.fecha,
      })
      if (error) return { error: error.message }
      return { ocupados: data }
    }
    case 'agendar_cita': {
      if (rol === 'paciente' || rol === 'admin') {
        return { error: 'Este rol no tiene permiso para agendar citas desde el chat.' }
      }
      // El terapeuta agenda para sí mismo: su terapeuta_id es su propio userId,
      // nunca se le pide ni se le hace buscarse a sí mismo.
      const terapeutaId = rol === 'terapeuta' ? userId : args.terapeuta_id
      if (!terapeutaId) {
        return { error: 'Falta identificar al terapeuta. Usa buscar_terapeuta primero.' }
      }
      const registrarPago = args.registrar_pago === true
      const { data, error } = await supabase.rpc('agendar_cita_chatbot', {
        p_paciente_id: args.paciente_id,
        p_terapeuta_id: terapeutaId,
        p_fecha_hora: args.fecha_hora,
        p_duracion_min: args.duracion_min ?? 60,
        p_notas: args.notas ?? null,
        p_created_by: userId,
        p_registrar_pago: registrarPago,
        p_monto: registrarPago ? args.monto ?? null : null,
        p_metodo_pago: registrarPago ? args.metodo_pago ?? null : null,
        p_estado_pago: registrarPago ? (args.estado_pago ?? 'pagado') : 'pendiente',
      })
      if (error) return { error: error.message }
      return data
    }
    case 'guardar_reporte_sintomas': {
      if (rol !== 'paciente') {
        return { error: 'Solo el paciente puede reportar sus propios síntomas.' }
      }

      const { data: miPaciente, error: errPaciente } = await supabase
        .from('pacientes')
        .select('id_paciente, terapeuta_id')
        .eq('profile_id', userId)
        .single()

      console.log('🔍 [reporte] userId:', userId)
      console.log('🔍 [reporte] miPaciente:', JSON.stringify(miPaciente))
      if (errPaciente) console.error('❌ [reporte] errPaciente:', JSON.stringify(errPaciente))

      if (errPaciente || !miPaciente) {
        return {
          error: `No se encontró el expediente del paciente. userId=${userId} | supabaseError=${errPaciente?.message ?? 'registro no encontrado'}`,
        }
      }

      const insertData = {
        paciente_id:          miPaciente.id_paciente,
        terapeuta_id:         miPaciente.terapeuta_id,
        zona_dolor:           args.zona_dolor,
        tipo_dolor:           args.tipo_dolor ?? null,
        intensidad:           args.intensidad,
        inicio_sintomas:      args.inicio_sintomas ?? null,
        factores_agravantes:  args.factores_agravantes ?? null,
        factores_mejora:      args.factores_mejora ?? null,
        sintomas_adicionales: args.sintomas_adicionales ?? null,
        resumen_ia:           args.resumen_ia,
      }

      console.log('🔍 [reporte] insertData:', JSON.stringify(insertData))

      const { error: errInsert } = await supabase
        .from('reportes_sintomas')
        .insert(insertData)

      if (errInsert) {
        console.error('❌ [reporte] errInsert:', JSON.stringify(errInsert))
        return {
          error: `Error al guardar reporte: ${errInsert.message} | code: ${errInsert.code} | details: ${errInsert.details ?? 'sin detalles'}`,
        }
      }

      console.log('✅ [reporte] Reporte guardado exitosamente')
      return {
        exito: true,
        mensaje: 'Reporte guardado. Tu terapeuta lo revisará antes de tu próxima consulta.',
      }
    }
    case 'ver_reportes_pacientes': {
      if (rol !== 'terapeuta') return { error: 'Solo el terapeuta puede ver estos reportes.' }
      const { data, error } = await supabase
        .from('reportes_sintomas')
        .select('id_reporte, paciente_id, zona_dolor, tipo_dolor, intensidad, inicio_sintomas, factores_agravantes, factores_mejora, sintomas_adicionales, resumen_ia, leido_por_terapeuta, created_at, pacientes(nombre_completo)')
        .eq('terapeuta_id', userId)
        .order('created_at', { ascending: false })
        .limit(15)
      if (error) return { error: error.message }
      return { reportes: data }
    }
    case 'registrar_pago_paciente': {
      if (rol !== 'secretaria') {
        return { error: 'Solo la secretaria puede registrar pagos desde el chatbot.' }
      }
      const monto = Number(args.monto)
      if (!args.paciente_id || isNaN(monto) || monto <= 0) {
        return { error: 'Datos de pago inválidos: se requiere paciente_id y un monto mayor a 0.' }
      }
      const metodosValidos = ['efectivo', 'transferencia', 'tarjeta', 'aseguradora']
      const metodo = metodosValidos.includes(args.metodo_pago) ? args.metodo_pago : 'efectivo'
      const estado = args.estado_pago === 'pendiente' ? 'pendiente' : 'pagado'

      const { data: pago, error } = await supabase
        .from('pagos')
        .insert({
          paciente_id: args.paciente_id,
          monto,
          metodo_pago: metodo,
          estado_pago: estado,
          fecha_pago: new Date().toISOString(),
          registrado_por: userId,
        })
        .select('id_pago, monto, metodo_pago, estado_pago, fecha_pago')
        .single()

      if (error) return { error: `Error al registrar pago: ${error.message}` }

      try {
        await supabase.from('audit_logs').insert({
          user_id: userId,
          accion: `REGISTRAR_PAGO_CHATBOT_#${pago.id_pago}`,
          tabla_afectada: 'pagos',
        })
      } catch {}

      return {
        exito: true,
        pago,
        mensaje: `Pago #${pago.id_pago} por $${monto.toFixed(2)} MXN (${metodo}, ${estado}) registrado correctamente.`,
      }
    }
    case 'consultar_adeudos_paciente': {
      if (rol !== 'secretaria') {
        return { error: 'Solo la secretaria puede consultar adeudos detallados desde aquí.' }
      }
      const { data: pagos, error } = await supabase
        .from('pagos')
        .select('id_pago, monto, estado_pago, metodo_pago, fecha_pago, pacientes(nombre_completo)')
        .eq('paciente_id', args.paciente_id)
        .order('fecha_pago', { ascending: false })
        .limit(15)

      if (error) return { error: `Error consultando adeudos: ${error.message}` }

      const lista = pagos ?? []
      const totalAdeudo = lista
        .filter((p: any) => p.estado_pago === 'pendiente')
        .reduce((acc: number, p: any) => acc + Number(p.monto), 0)
      const totalPagado = lista
        .filter((p: any) => p.estado_pago === 'pagado')
        .reduce((acc: number, p: any) => acc + Number(p.monto), 0)

      return {
        total_adeudo_pendiente: totalAdeudo,
        total_pagado_reciente: totalPagado,
        cantidad_pendientes: lista.filter((p: any) => p.estado_pago === 'pendiente').length,
        historial_reciente: lista,
      }
    }
    case 'actualizar_expediente_ejercicios': {
      if (rol !== 'terapeuta') {
        return { error: 'Solo el terapeuta puede asignar ejercicios o actualizar el expediente clínico.' }
      }
      // Verificar que el paciente pertenezca a este terapeuta
      const { data: paciente, error: errPac } = await supabase
        .from('pacientes')
        .select('id_paciente, nombre_completo')
        .eq('id_paciente', args.paciente_id)
        .eq('terapeuta_id', userId)
        .single()

      if (errPac || !paciente) {
        return { error: 'Paciente no encontrado o no está asignado a tu cuenta de terapeuta.' }
      }

      const fechaStr = new Date().toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' })
      const itemsRaw = args.ejercicios_asignados
        ? String(args.ejercicios_asignados).split(',').map(s => s.trim()).filter(Boolean)
        : []

      const rutinaFijaAsignada: EjercicioAsignadoIA[] = itemsRaw
        .map((item) => {
          const matchReps = item.match(/[x×]\s*(\d+)/i) || item.match(/\((\d+)\s*(?:min|seg|rep|series)?\)/i)
          const repeticiones = matchReps ? Math.max(1, parseInt(matchReps[1], 10)) : 10
          const nombreLimpio = item.replace(/\s*\([^)]*\)\s*/g, '').replace(/\s*[x×]\s*\d+/gi, '').trim() || item
          const oficial = normalizarNombreEjercicioIA(nombreLimpio)
          if (!oficial) return null
          return { ejercicio: oficial, repeticiones, modo_adaptado: false }
        })
        .filter((x): x is EjercicioAsignadoIA => x !== null)

      const textoEjerciciosLimpio = rutinaFijaAsignada.length > 0
        ? rutinaFijaAsignada.map(r => `${r.ejercicio} ×${r.repeticiones}`).join(', ')
        : args.ejercicios_asignados

      const bloqueEjercicios = textoEjerciciosLimpio
        ? `[${fechaStr}${args.zona_enfocada ? ` · ${args.zona_enfocada}` : ''}] Ejercicios: ${textoEjerciciosLimpio}`
        : null
      const bloqueNotas = args.observaciones_clinicas
        ? `[${fechaStr}${args.zona_enfocada ? ` · ${args.zona_enfocada}` : ''}] ${args.observaciones_clinicas}`
        : null

      // 1. Actualizar o crear en la tabla `expedientes` (archivo clínico del terapeuta/admin)
      const { data: expExistente } = await supabase
        .from('expedientes')
        .select('id_expediente, indicaciones, observaciones_clinicas, plan_tratamiento')
        .eq('paciente_id', args.paciente_id)
        .maybeSingle()

      if (expExistente) {
        const { indicacionesLimpias, rutinaAsignada: rutinaPrevia } = extraerRutinaDeIndicaciones(expExistente.indicaciones)
        const baseIndicaciones = bloqueEjercicios
          ? [indicacionesLimpias, bloqueEjercicios].filter(Boolean).join('\n')
          : indicacionesLimpias
        const nuevasIndicaciones = empaquetarRutinaEnIndicaciones(
          baseIndicaciones,
          rutinaFijaAsignada.length > 0 ? rutinaFijaAsignada : rutinaPrevia
        )
        const nuevasObservaciones = bloqueNotas
          ? [expExistente.observaciones_clinicas, bloqueNotas].filter(Boolean).join('\n')
          : expExistente.observaciones_clinicas

        const { error: errUpd } = await supabase
          .from('expedientes')
          .update({
            indicaciones: nuevasIndicaciones,
            observaciones_clinicas: nuevasObservaciones,
            updated_at: new Date().toISOString(),
          })
          .eq('id_expediente', expExistente.id_expediente)

        if (errUpd) return { error: `Error al actualizar expediente: ${errUpd.message}` }
      } else {
        const nuevasIndicaciones = empaquetarRutinaEnIndicaciones(bloqueEjercicios ?? '', rutinaFijaAsignada)
        const { error: errIns } = await supabase
          .from('expedientes')
          .insert({
            paciente_id: args.paciente_id,
            terapeuta_id: userId,
            diagnostico: args.zona_enfocada ? `Valoración y rehabilitación de ${args.zona_enfocada}` : 'En valoración fisioterapéutica',
            motivo_consulta: args.observaciones_clinicas || `Rehabilitación física (${args.zona_enfocada || 'General'})`,
            indicaciones: nuevasIndicaciones,
            observaciones_clinicas: bloqueNotas,
            estado: 'activo',
            fecha_apertura: new Date().toISOString(),
          })

        if (errIns) return { error: `Error al crear expediente inicial: ${errIns.message}` }
      }

      // 2. Si se asignaron ejercicios, registrarlos en `progreso_sesiones` para que el PACIENTE
      //    pueda verlos inmediatamente en su apartado `/paciente/ejercicios` ("Mis Ejercicios")
      let visibleEnPortalPaciente = false
      if (rutinaFijaAsignada.length > 0) {
        const ejerciciosJson = rutinaFijaAsignada.map(r => ({
          ejercicio: r.ejercicio,
          repeticiones: r.repeticiones,
          modo_adaptado: r.modo_adaptado ?? false,
        }))

        // Buscar una cita completada sin progreso previo, o la cita más reciente del paciente
        const { data: sesionesPrevias } = await supabase
          .from('progreso_sesiones')
          .select('cita_id')
          .eq('paciente_id', args.paciente_id)
        const citasUsadas = new Set((sesionesPrevias ?? []).map((s: any) => s.cita_id))

        const { data: citasPac } = await supabase
          .from('citas')
          .select('id_cita, estado')
          .eq('paciente_id', args.paciente_id)
          .eq('terapeuta_id', userId)
          .order('fecha_hora', { ascending: false })
          .limit(10)

        let citaIdParaSesion: number | null = null
        const citaLibre = (citasPac ?? []).find((c: any) => !citasUsadas.has(c.id_cita))
        if (citaLibre) {
          citaIdParaSesion = citaLibre.id_cita
          if (citaLibre.estado !== 'completada') {
            await supabase.from('citas').update({ estado: 'completada' }).eq('id_cita', citaLibre.id_cita)
          }
        } else {
          // Si no tiene cita disponible, creamos un registro de sesión completada en `citas` para vincular los ejercicios
          const { data: nuevaCita } = await supabase
            .from('citas')
            .insert({
              paciente_id: args.paciente_id,
              terapeuta_id: userId,
              created_by: userId,
              fecha_hora: new Date().toISOString(),
              duracion_min: 60,
              estado: 'completada',
              notas: `Asignación de ejercicios (${args.zona_enfocada || 'General'})`,
            })
            .select('id_cita')
            .single()
          if (nuevaCita) citaIdParaSesion = nuevaCita.id_cita
        }

        if (citaIdParaSesion) {
          const dolorNum = Math.min(10, Math.max(0, Number(args.nivel_dolor ?? 4)))
          const movNum = Math.min(10, Math.max(0, Number(args.movilidad ?? 8)))
          const { error: errProg } = await supabase
            .from('progreso_sesiones')
            .insert({
              cita_id: citaIdParaSesion,
              paciente_id: args.paciente_id,
              nivel_dolor: Number.isNaN(dolorNum) ? 4 : dolorNum,
              movilidad: Number.isNaN(movNum) ? 8 : movNum,
              ejercicios: ejerciciosJson,
              observaciones: args.observaciones_clinicas || `Rutina enfocada en ${args.zona_enfocada || 'rehabilitación'}`,
              archivos: [],
              fecha_registro: new Date().toISOString(),
            })
          if (!errProg) visibleEnPortalPaciente = true
        }
      }

      return {
        exito: true,
        paciente: paciente.nombre_completo,
        visible_en_mis_ejercicios_paciente: visibleEnPortalPaciente,
        mensaje: visibleEnPortalPaciente
          ? `Expediente actualizado y ejercicios publicados en el apartado "Mis Ejercicios" de ${paciente.nombre_completo}.`
          : `Expediente clínico de ${paciente.nombre_completo} actualizado correctamente.`,
      }
    }
    default:
      return { error: 'Función no reconocida' }
  }
}

// ── Contexto dinámico desde Supabase ───────────────────────────────
async function obtenerContexto(supabase: any, userId: string, rol: string) {
  // Se usa 'en-CA' porque ese locale formatea la fecha como YYYY-MM-DD,
  // y se fija timeZone a México para que "hoy" sea el día correcto en
  // horario local, no en UTC (evita que las citas de la tarde/noche
  // se cuenten como "de mañana").
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
  let ctx = ''
  try {
    if (rol === 'admin') {
      const [{ count: totalPacientes }, { count: citasHoy }, { data: pagsPendientes }] = await Promise.all([
        supabase.from('pacientes').select('*', { count: 'exact', head: true }).eq('activo', true),
        supabase.from('citas').select('*', { count: 'exact', head: true })
          .gte('fecha_hora', `${hoy}T00:00:00`).lte('fecha_hora', `${hoy}T23:59:59`),
        supabase.from('pagos').select('monto').eq('estado_pago', 'pendiente'),
      ])
      const totalAdeudos = (pagsPendientes ?? []).reduce((s: number, p: any) => s + Number(p.monto), 0)
      ctx = `DATOS EN TIEMPO REAL (hoy ${hoy}):
- Pacientes activos: ${totalPacientes ?? 0}
- Citas hoy: ${citasHoy ?? 0}
- Adeudos pendientes: $${totalAdeudos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
    } else if (rol === 'secretaria') {
      const { data: citasData } = await supabase
        .from('citas').select('fecha_hora, estado, pacientes(nombre_completo)')
        .gte('fecha_hora', `${hoy}T00:00:00`).lte('fecha_hora', `${hoy}T23:59:59`).order('fecha_hora')
      const { count: pagsPend } = await supabase
        .from('pagos').select('*', { count: 'exact', head: true }).eq('estado_pago', 'pendiente')
      ctx = `DATOS HOY (${hoy}):
- Citas del día: ${(citasData ?? []).length}
${(citasData ?? []).map((c: any) =>
  `  • ${new Date(c.fecha_hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Mexico_City' })} — ${c.pacientes?.nombre_completo ?? 'Paciente'} (${c.estado})`
).join('\n')}
- Pagos pendientes: ${pagsPend ?? 0}`
    } else if (rol === 'terapeuta') {
      const { data: misPacientes } = await supabase
        .from('pacientes').select('nombre_completo').eq('terapeuta_id', userId).eq('activo', true).limit(20)
      const { data: citasData } = await supabase
        .from('citas').select('fecha_hora, estado, pacientes(nombre_completo)')
        .eq('terapeuta_id', userId)
        .gte('fecha_hora', `${hoy}T00:00:00`).lte('fecha_hora', `${hoy}T23:59:59`).order('fecha_hora')
      const { count: reportesPendientes } = await supabase
        .from('reportes_sintomas').select('*', { count: 'exact', head: true })
        .eq('terapeuta_id', userId).eq('leido_por_terapeuta', false)
      ctx = `MIS DATOS HOY:
- Pacientes activos (${(misPacientes ?? []).length}): ${(misPacientes ?? []).map((p: any) => p.nombre_completo).join(', ') || 'ninguno'}
- Citas hoy: ${(citasData ?? []).length === 0 ? 'Sin citas' : (citasData ?? []).map((c: any) =>
  `${new Date(c.fecha_hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Mexico_City' })} — ${c.pacientes?.nombre_completo} (${c.estado})`
).join(' | ')}
- Reportes de síntomas sin leer: ${reportesPendientes ?? 0} (usa ver_reportes_pacientes si te los piden)`
    } else if (rol === 'paciente') {
      const { data: miPaciente } = await supabase
        .from('pacientes').select('id_paciente, nombre_completo').eq('profile_id', userId).single()
      if (miPaciente) {
        const [{ data: citas }, { data: pagos }, { data: progreso }] = await Promise.all([
          supabase.from('citas').select('fecha_hora, estado')
            .eq('paciente_id', miPaciente.id_paciente).gte('fecha_hora', new Date().toISOString())
            .order('fecha_hora').limit(3),
          supabase.from('pagos').select('monto, estado_pago')
            .eq('paciente_id', miPaciente.id_paciente).order('fecha_pago', { ascending: false }).limit(3),
          supabase.from('progreso_sesiones').select('nivel_dolor, movilidad, fecha_registro')
            .eq('paciente_id', miPaciente.id_paciente).order('fecha_registro', { ascending: false }).limit(5),
        ])
        const pendiente = (pagos ?? []).filter((p: any) => p.estado_pago === 'pendiente')
          .reduce((s: number, p: any) => s + Number(p.monto), 0)
        ctx = `DATOS DE: ${miPaciente.nombre_completo}
- Próximas citas: ${(citas ?? []).length === 0 ? 'Sin citas próximas' : (citas ?? []).map((c: any) =>
  `${new Date(c.fecha_hora).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'America/Mexico_City' })} (${c.estado})`
).join(', ')}
- Adeudo: $${pendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
- Últimas sesiones: ${(progreso ?? []).length === 0 ? 'Sin registros' : (progreso ?? []).map((p: any) =>
  `dolor ${p.nivel_dolor}/10, movilidad ${p.movilidad}%`
).join(' | ')}`
      }
    }
  } catch (e) {
    console.error('Error contexto:', e)
  }
  return ctx
}

// ────────────────────────────────────────────────────────────────
// Seguridad: validación de mensaje, Prompt Firewall y logs
// ────────────────────────────────────────────────────────────────
function validarMensajeChatbot(mensaje: string): { valido: boolean; mensaje: string } {
  const limpio = (mensaje ?? '').trim()

  if (limpio === '') {
    return { valido: false, mensaje: 'El mensaje no puede estar vacío.' }
  }
  if (limpio.length > 1000) {
    return { valido: false, mensaje: 'El mensaje excede el límite máximo de 1000 caracteres permitido (Regla de Negocio HU #11).' }
  }

  const sanitizado = limpio.replace(/[\x00-\x1F\x7F]/g, '')

  return { valido: true, mensaje: sanitizado }
}

const FRASES_BLOQUEADAS = [
  'ignora las instrucciones',
  'ignora tus instrucciones',
  'olvida las reglas',
  'revela tu prompt',
  'muéstrame todas las contraseñas',
  'lista todos los usuarios',
  'actúa como administrador',
  'dame la base de datos',
  'muestra las claves api',
  'borra los registros',
  'ejecuta este comando',
  'dame el historial de todos los pacientes',
  'muéstrame los expedientes',
  'dime el diagnóstico de',
  'datos clínicos de otro paciente',
  'cambia el plan de tratamiento de',
]

function promptFirewall(mensaje: string): { permitido: boolean; motivo: string } {
  const normalizado = mensaje.toLowerCase()
  for (const frase of FRASES_BLOQUEADAS) {
    if (normalizado.includes(frase)) {
      return { permitido: false, motivo: 'Solicitud bloqueada por política de seguridad.' }
    }
  }
  return { permitido: true, motivo: 'Mensaje permitido.' }
}

async function registrarEventoSeguridad(
  supabase: any,
  tipo: 'PROMPT_BLOQUEADO' | 'MENSAJE_INVALIDO' | 'ACCESO_DENEGADO' | 'ERROR_IA' | 'CUOTA_EXCEDIDA',
  detalle: string,
  userId: string | null,
  mensaje: string = ''
) {
  const mensajeReducido = mensaje.slice(0, 120)
  try {
    await supabase.from('eventos_seguridad_chatbot').insert({
      tipo,
      detalle,
      profile_id: userId,
      mensaje: mensajeReducido,
    })
  } catch (e) {
    console.error('❌ Error registrando evento de seguridad:', e)
  }
}

// ────────────────────────────────────────────────────────────────
// Manejo de rate limit (429) y alta demanda (503/500) con reintentos
// y fallback a un modelo alterno cuando el principal sigue saturado
// ────────────────────────────────────────────────────────────────
const MAX_REINTENTOS_429 = 2

function esperar(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function extraerRetryDelayMs(errBody: string): number {
  try {
    const parsed = JSON.parse(errBody)
    const detalle = parsed?.error?.details?.find((d: any) => d['@type']?.includes('RetryInfo'))
    const retryDelay: string | undefined = detalle?.retryDelay
    if (retryDelay) {
      const segundos = parseFloat(retryDelay.replace('s', ''))
      if (!isNaN(segundos)) return Math.min(segundos * 1000, 15000)
    }
  } catch {
    // ignorar, usamos default
  }
  return 3000
}

async function fetchGeminiConReintento(url: string, body: any): Promise<
  { ok: true; data: any } | { ok: false; cuotaExcedida: boolean; errorTexto: string }
> {
  let intento = 0
  while (intento <= MAX_REINTENTOS_429) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      return { ok: true, data: await res.json() }
    }

    const errTexto = await res.text()
    const esRateLimit = res.status === 429
    const esServidorSaturado = res.status === 503 || res.status === 500

    if ((esRateLimit || esServidorSaturado) && intento < MAX_REINTENTOS_429) {
      const delayMs = esRateLimit ? extraerRetryDelayMs(errTexto) : 1500 * (intento + 1)
      console.warn(`⚠️ Gemini ${res.status} (intento ${intento + 1}/${MAX_REINTENTOS_429}). Reintentando en ${delayMs}ms...`)
      await esperar(delayMs)
      intento++
      continue
    }

    console.error('❌ Gemini error:', errTexto)
    return { ok: false, cuotaExcedida: esRateLimit || esServidorSaturado, errorTexto: errTexto }
  }

  return { ok: false, cuotaExcedida: true, errorTexto: 'Reintentos agotados' }
}
// Si tras los reintentos normales el modelo principal sigue saturado (503/429),
// probamos UNA vez con un modelo alterno menos demandado antes de rendirnos.
async function fetchGeminiConFallback(url: string, body: any) {
  const resultado = await fetchGeminiConReintento(url, body)
  if (resultado.ok) return resultado

  if (resultado.cuotaExcedida && url.includes('gemini-2.5-flash')) {
    console.warn('⚠️ gemini-2.5-flash sigue saturado, probando con gemini-2.0-flash...')
    const urlFallback = url.replace('gemini-2.5-flash', 'gemini-2.0-flash')
    const resultadoFallback = await fetchGeminiConReintento(urlFallback, body)
    if (resultadoFallback.ok) return resultadoFallback
  }

  return resultado
}

// ── Prompts ─────────────────────────────────────────────────────────
const BASE_PROMPT = `
IDENTIDAD
Eres RehabControl AI, el asistente oficial de la clínica Rehabilitandomed.

IMPORTANTE — NO ERES ESPECIALISTA:
No eres médico ni fisioterapeuta titulado. Puedes orientar, dar información general y
buscar en internet protocolos o información relevante, pero SIEMPRE deja claro que:
- No sustituyes una valoración profesional.
- Si el usuario quiere información médica más profunda o tiene dudas serias sobre su
  condición, debes recomendarle explícitamente que lo consulte con su terapeuta o un especialista.
- Ante dolor intenso (7/10 o más) o señales de alarma, indícale contactar a la clínica de inmediato.

CAPACIDADES REALES (function calling) — varían según el rol:
- agendar_cita / buscar_paciente / buscar_terapeuta / ver_horarios_ocupados: SOLO secretaria y terapeuta.
  El paciente NO puede agendar citas por el chat; si pide una cita, indícale que la
  secretaria la confirma (puede llamar o ir al módulo de citas).
  El admin tampoco agenda citas desde el chat: solo tiene visión de datos y orientación.
- registrar_pago_paciente / consultar_adeudos_paciente: SOLO secretaria, permite registrar pagos y consultar adeudos de un paciente.
- actualizar_expediente_ejercicios: SOLO terapeuta, permite asignar ejercicios/indicaciones y actualizar notas clínicas en el expediente de su paciente.
- guardar_reporte_sintomas: SOLO paciente, guarda su reporte para el terapeuta.
- ver_reportes_pacientes: SOLO terapeuta, lista los reportes de sus pacientes.

OBTENCIÓN DE IDs (paciente_id, terapeuta_id):
NUNCA pidas un ID directamente al usuario. Esos datos SOLO se obtienen ejecutando
buscar_paciente o buscar_terapeuta con el nombre que te den. Si la búsqueda no encuentra
resultados, pide el nombre completo o el apellido (nunca el ID). Si hay varios resultados,
muéstralos y pregunta cuál es el correcto antes de continuar.

MANEJO DE SÍNTOMAS DEL PACIENTE (rol paciente — su única acción real en el chat):
IMPORTANTE — AHORRO DE LLAMADAS A LA IA: NUNCA hagas las preguntas una por una.
En cuanto el paciente mencione que tiene dolor o molestia, responde UNA sola vez con
un mensaje que pida TODOS los datos juntos, en formato de lista, por ejemplo:

"Para registrar tu reporte, cuéntame en un solo mensaje:
1) Zona exacta del dolor
2) Tipo de dolor (punzante, ardor, presión, etc.)
3) Intensidad del 0 al 10
4) Cuándo empezó
5) Qué lo mejora o empeora
6) Otros síntomas que notes"

Si el paciente responde con TODO en un solo mensaje, llama a guardar_reporte_sintomas
inmediatamente, sin más rondas. Si le faltó UN solo dato importante (ej. no dio
intensidad), pide SOLO ese dato faltante en un mensaje corto — nunca repitas la lista
completa ni vuelvas a preguntar lo que ya contestó. Cuando tengas lo esencial (zona,
intensidad, resumen), guarda el reporte aunque algún campo opcional quede vacío.
Después dile: "Gracias por compartir esto. Tu terapeuta lo revisará antes de tu próxima
consulta." NUNCA le des un diagnóstico ni le digas qué podría tener — eso es solo para el
reporte del terapeuta. El paciente NO puede ver este reporte después.

RESTRICCIONES:
- No dar diagnósticos médicos al paciente.
- No prescribir medicamentos.
- No ejecutar acciones (citas, reportes) sin confirmación o sin la información necesaria.
- No acceder a datos de otros roles.
- NUNCA pidas un ID (paciente_id, terapeuta_id, UUID) directamente al usuario.

FORMATO Y ESTILO DE RESPUESTA:
Escribe como un asistente humano, cálido y profesional — no como un robot listando instrucciones.

Estructura visual atractiva:
- Usa emojis relevantes al inicio de secciones para dar vida al mensaje (🩺 salud, 📅 citas, 💳 pagos, ✅ éxito, ⚠️ advertencia, 💡 tip, 📋 info).
- Para procesos, usa pasos numerados con descripción corta y clara:
  1️⃣ Primero haz esto
  2️⃣ Luego esto otro
- Para listas informativas, usa bullets con espacio:
  • Elemento uno
  • Elemento dos
- Separa secciones con una línea en blanco para dar aire al texto.
- Resalta lo importante en MAYÚSCULAS o con un emoji — nunca con asteriscos de markdown.

Tono:
- Habla de tú, cercano pero profesional.
- Usa frases cortas. Nada de párrafos de 5 líneas seguidas.
- Si das buenas noticias (cita agendada, reporte guardado), celébalo: "¡Listo! ✅"
- Si hay un problema, sé directo pero empático: "Ups, parece que..."
- Cierra siempre con una línea de apoyo o siguiente paso sugerido.
- Máximo 4 bloques de contenido por respuesta.

Responde siempre en español.
`

const ROL_CONTEXTO: Record<string, string> = {
  admin: `
ROL: ADMIN — Acceso total de SOLO LECTURA y orientación en Rehabilitandomed. No ejecutas acciones de citas ni de ningún otro tipo desde el chat.
Módulos: /admin/dashboard · /admin/usuarios · /admin/expedientes · /admin/finanzas · /admin/reportes · /admin/logs · /admin/configuracion · /admin/opiniones
CITAS — NO ES TU FUNCIÓN: si te piden agendar, modificar o cancelar una cita, explica que
debe hacerse desde el módulo /admin/... correspondiente o que la secretaria la gestione.
Tú no tienes ninguna función ejecutable: solo orientas con los datos en tiempo real y
conocimiento clínico general.
ORIENTACIÓN CLÍNICA GENERAL (no diagnóstico):
- Lumbar: hernia discal, sobrecarga muscular, escoliosis, sedentarismo.
- Rodilla: meniscopatía, LCA/LCP, condromalacia, artritis.
- Hombro: manguito rotador, capsulitis adhesiva, impingement.
- Cervical: contractura, hernia C5-C6, síndrome de oficina.
`,
  secretaria: `
ROL: SECRETARIA — Gestión operativa de Rehabilitandomed.
Módulos: /secretaria/dashboard · /secretaria/pacientes · /secretaria/citas · /secretaria/pagos

ACCIONES DISPONIBLES:
✅ agendar_cita / buscar_paciente / buscar_terapeuta / ver_horarios_ocupados
✅ registrar_pago_paciente → registra un pago para un paciente
✅ consultar_adeudos_paciente → consulta el saldo pendiente e historial de pagos de un paciente

FLUJO PARA AGENDAR CITA (pide todo junto, sin rondas innecesarias):
En cuanto detectes intención de agendar una cita, responde UNA sola vez pidiendo todo de golpe:

"Para agendar la cita dime en un solo mensaje:
1) Nombre del paciente
2) Nombre del terapeuta
3) Fecha y hora deseada
4) ¿Deseas registrar el pago de esta sesión ahora? Si sí, incluye monto y método de pago
   (efectivo, transferencia, tarjeta o aseguradora), y si quedó pagado o pendiente."

Cuando el usuario responda con esos datos, en la MISMA ronda llama a buscar_paciente
Y buscar_terapeuta juntos (puedes devolver varias function calls en un solo turno).
NUNCA pidas un ID (paciente_id, terapeuta_id, UUID) directamente al usuario — esos
SIEMPRE se obtienen con buscar_paciente / buscar_terapeuta.

Con los resultados de esas búsquedas:
- Si alguna búsqueda no encontró nada: pide SOLO el nombre completo o apellido de esa
  persona en un mensaje corto, nunca pidas el ID ni repitas los demás datos ya confirmados.
- Si alguna búsqueda tiene varios resultados: muéstralos y pregunta cuál es el correcto,
  sin volver a pedir lo demás.
- Si necesitas verificar disponibilidad, usa ver_horarios_ocupados con el terapeuta_id
  ya obtenido en la misma ronda si es posible.
- Si paciente_id, terapeuta_id, fecha/hora y (si aplica) los datos de pago ya están
  claros y confirmados, llama a agendar_cita en esa misma respuesta — no hagas una
  ronda extra solo para "confirmar" si el usuario ya dio todo explícitamente.

FLUJO PARA REGISTRAR UN PAGO O CONSULTAR ADEUDOS:
- Si piden registrar un pago y aún no dan los datos, pide en una sola lista:
  "Para registrar el pago dime en un solo mensaje:
  1) Nombre del paciente
  2) Monto del pago
  3) Método de pago (efectivo, transferencia, tarjeta o aseguradora)
  4) Estado del pago (pagado o pendiente)"
- Si ya te dieron todos los datos del pago (o enviaron la tarjeta interactiva), busca primero
  al paciente con buscar_paciente y en seguida llama a registrar_pago_paciente.
- Si piden consultar adeudos de un paciente por nombre, usa buscar_paciente y luego
  consultar_adeudos_paciente para mostrar el total pendiente, total pagado y el desglose.
`,
  terapeuta: `
ROL: TERAPEUTA — Gestión clínica de pacientes asignados.
Módulos: /terapeuta/dashboard · /terapeuta/pacientes · /terapeuta/expedientes · /terapeuta/progreso · /terapeuta/citas · /terapeuta/ejercicios
ACCIONES DISPONIBLES:
✅ ver_reportes_pacientes → reportes de síntomas que tus pacientes llenaron en el chat.
✅ agendar_cita / buscar_paciente / ver_horarios_ocupados.
✅ actualizar_expediente_ejercicios → asigna ejercicios/indicaciones o actualiza notas clínicas en el expediente de tu paciente.
NOTA: cuando agendas una cita, el terapeuta_id eres tú mismo automáticamente — no necesitas
buscarte ni dar tu propio ID, solo resuelve el paciente_id con buscar_paciente.

FLUJO PARA AGENDAR CITA (pide todo junto, sin rondas innecesarias):
En cuanto detectes intención de agendar, responde UNA sola vez pidiendo todo de golpe:

"Para agendar la cita dime en un solo mensaje:
1) Nombre del paciente
2) Fecha y hora deseada
3) ¿Deseas registrar el pago de esta sesión ahora? Si sí, incluye monto y método de pago
   (efectivo, transferencia, tarjeta o aseguradora), y si quedó pagado o pendiente."

Cuando el usuario responda, en esa MISMA ronda llama a buscar_paciente con el nombre dado.
NUNCA pidas un ID directamente — se obtiene solo con buscar_paciente.
- Si no hay resultados: pide nombre completo o apellido en un mensaje corto, sin repetir
  los demás datos ya confirmados.
- Si hay varios resultados: muéstralos y pregunta cuál es el correcto.
- Si necesitas confirmar disponibilidad, usa ver_horarios_ocupados (tu propio terapeuta_id
  ya está disponible, no necesitas buscarlo).
- Si paciente_id, fecha/hora y (si aplica) datos de pago ya están claros y confirmados,
  llama a agendar_cita en esa misma respuesta, sin una ronda extra solo para confirmar.

FLUJO PARA ASIGNAR EJERCICIOS O ACTUALIZAR NOTAS EN EL EXPEDIENTE:
- Si el terapeuta pide asignar ejercicios o actualizar el expediente sin dar los datos, responde en una sola lista:
  "Para asignar ejercicios o actualizar el expediente dime en un solo mensaje:
  1) Nombre del paciente
  2) Zona o área enfocada (ej. Rodilla, Lumbar, Hombro, Cervical, Tobillo)
  3) Ejercicios asignados y/o notas clínicas para el expediente"
- En cuanto recibas los datos (o la tarjeta interactiva completa), llama a buscar_paciente y en seguida a actualizar_expediente_ejercicios para guardarlo en el expediente real.

CATÁLOGO DE EJERCICIOS:
RODILLA: cuádriceps arco corto, prensa unilateral, sentadilla TRX, bicicleta, step up/down.
LUMBAR: bird-dog, puente glúteo, plancha, McKenzie, estiramiento piriforme.
HOMBRO: péndulos Codman, rotación con banda, elevación frontal/lateral, remo con banda.
CERVICAL: chin tuck, flexión isométrica, estiramiento trapecio, movilización activa.
TOBILLO: alfabeto con tobillo, elevaciones de talón, tabla de equilibrio, estiramiento fascia.
`,
  paciente: `
ROL: PACIENTE — Portal personal Rehabilitandomed. Todo es de SOLO LECTURA, excepto el perfil.
Módulos: /paciente/dashboard · /paciente/citas · /paciente/progreso · /paciente/ejercicios · /paciente/pagos · /paciente/perfil

ACCIÓN DISPONIBLE (la única real vía función):
✅ guardar_reporte_sintomas → cuéntame tus dolores, te haré preguntas y guardaré el reporte
   para tu terapeuta (tú no podrás verlo después, solo él/ella).

CITAS — NO ES TU FUNCIÓN:
No tienes ninguna capacidad de agendar, modificar ni cancelar citas desde el chat, ni la
tendrás aunque insistas. Si preguntan por agendar, explica amablemente que deben solicitarla
con la secretaria (módulo /paciente/citas o contactando directamente a la clínica). No ofrezcas
alternativas como "puedo intentarlo" — simplemente no es posible desde aquí.

PAGOS Y PROGRESO — SOLO ORIENTACIÓN:
Los datos de pagos y progreso que ves en el contexto son informativos. Tu trabajo es explicar
qué significan (p. ej. qué es un adeudo pendiente, qué indica su nivel de dolor o movilidad),
nunca procesar pagos, generar comprobantes ni modificar registros — eso no existe como acción tuya.

INTERPRETACIÓN DE PROGRESO (informativa, no diagnóstico):
Dolor: 0-2 mínimo ✅ · 3-4 leve · 5-6 moderado ⚠️ avisa a tu terapeuta · 7-10 intenso 🔴 contacta la clínica ya.
Movilidad: 90-100% óptima · 70-89% buena · 50-69% moderada · <50% limitada.
`,
}

// ── Helper: ejecuta Gemini con loop de function calling ────────────
async function llamarGeminiConFunciones(
  systemPrompt: string,
  contents: GeminiMsg[],
  supabase: any,
  userId: string,
  rol: string,
  apiKey: string
): Promise<{ texto: string; reportesPacientes?: any[] }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
  let turnos = [...contents]
  let intentos = 0
  let huboFuncion = false
  let reportesCapturados: any[] | undefined = undefined
  const funcionesPermitidas = declaracionesParaRol(rol)

  // ── Fase 1: solo function calling (acciones reales) ────────────
  // Gemini NO permite combinar google_search con function_declarations
  // en la misma llamada, así que primero resolvemos acciones.
  while (intentos < 3) {
    const body: any = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: turnos,
      generation_config: { temperature: 0.3, max_output_tokens: 800 },
    }
    if (funcionesPermitidas.length > 0) {
      body.tools = [{ function_declarations: funcionesPermitidas }]
    }

    const resultado = await fetchGeminiConFallback(url, body)

    if (!resultado.ok) {
      if (resultado.cuotaExcedida) {
        await registrarEventoSeguridad(
          supabase, 'CUOTA_EXCEDIDA',
          'Límite de cuota o alta demanda en Gemini (function calling)',
          userId
        )
        return { texto: 'El asistente está saturado o esta en actualiuzación por favor intenta más tarde 🙏', reportesPacientes: reportesCapturados }
      }
      await registrarEventoSeguridad(supabase, 'ERROR_IA', resultado.errorTexto.slice(0, 200), userId)
      return { texto: 'Tuve un problema procesando tu mensaje. Intenta de nuevo en un momento.', reportesPacientes: reportesCapturados }
    }

    const data = resultado.data
    const parts: GeminiPart[] = data.candidates?.[0]?.content?.parts ?? []
    const funcCalls = parts.filter(p => p.functionCall)

    if (funcCalls.length === 0) {
      const texto = parts.filter(p => p.text).map(p => p.text).join('')

      // AHORRO DE CUOTA: solo gastamos una segunda llamada a Gemini (con
      // búsqueda web) si el último mensaje del usuario realmente parece
      // pedir información externa. Para saludos, agradecimientos o
      // preguntas ya resueltas con el texto normal, no vale la pena.
      const ultimoMensajeUsuario =
        turnos[turnos.length - 1]?.parts?.find(p => p.text)?.text ?? ''
      const pareceNecesitarBusqueda = /ejercicio|protocolo|qué es|que es|información sobre|informacion sobre|tratamiento para|síntomas de|sintomas de|causas de|cómo se trata|como se trata|recomendación|recomendaciones/i.test(
        ultimoMensajeUsuario
      )

      if (!huboFuncion && pareceNecesitarBusqueda) {
        const conBusqueda = await llamarGeminiConBusqueda(systemPrompt, turnos, apiKey)
        if (conBusqueda) return { texto: conBusqueda, reportesPacientes: reportesCapturados }
      }

      return { texto: texto || 'No pude generar una respuesta.', reportesPacientes: reportesCapturados }
    }

    huboFuncion = true
    turnos.push({ role: 'model', parts })

    const responseParts: GeminiPart[] = []
    for (const fc of funcCalls) {
      const { name, args } = fc.functionCall!
      const resultadoFn = await ejecutarFuncion(supabase, name, args, userId, rol)
      if (name === 'ver_reportes_pacientes' && Array.isArray((resultadoFn as any)?.reportes)) {
        reportesCapturados = (resultadoFn as any).reportes
      }
      responseParts.push({ functionResponse: { name, response: resultadoFn } })
    }
    turnos.push({ role: 'function', parts: responseParts })

    intentos++
  }

  return { texto: 'No pude completar la acción, intenta reformular tu solicitud.', reportesPacientes: reportesCapturados }
}

// ── Fase 2 (opcional): solo búsqueda web, sin function calling ─────
async function llamarGeminiConBusqueda(
  systemPrompt: string,
  contents: GeminiMsg[],
  apiKey: string
): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    tools: [{ google_search: {} }],
    generation_config: { temperature: 0.3, max_output_tokens: 800 },
  }

  const resultado = await fetchGeminiConFallback(url, body)

  if (!resultado.ok) {
    // Si la fase 2 falla, no truena el flujo: llamarGeminiConFunciones
    // devuelve el texto de la fase 1 (si lo hubo) o un mensaje genérico.
    console.error('❌ Gemini (búsqueda) falló:', resultado.errorTexto)
    return null
  }

  const parts: GeminiPart[] = resultado.data.candidates?.[0]?.content?.parts ?? []
  return parts.filter(p => p.text).map(p => p.text).join('') || null
}

// ── GET: cargar historial guardado del usuario (se limpia por día) ──
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) console.error('❌ GET auth error:', authError.message)
    if (!user) {
      await registrarEventoSeguridad(supabase, 'ACCESO_DENEGADO', 'GET historial sin sesión', null)
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Inicio del día actual en Ciudad de México (UTC-6)
    const hoyMexico = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
    const inicioHoyISO = `${hoyMexico}T00:00:00-06:00`

    // Borrar automáticamente el historial de días anteriores para este usuario
    try {
      await supabase
        .from('chatbot_historial')
        .delete()
        .eq('profile_id', user.id)
        .lt('created_at', inicioHoyISO)
    } catch (e) {
      console.warn('⚠️ Aviso al limpiar historial de días anteriores:', e)
    }

    const { data, error } = await supabase
      .from('chatbot_historial')
      .select('role, content, created_at, modulo')
      .eq('profile_id', user.id)
      .gte('created_at', inicioHoyISO)
      .order('created_at', { ascending: true })
      .limit(80)

    if (error) {
      console.error('❌ GET historial — error de Supabase:', error.message, error.details, error.hint)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Si es terapeuta, también devolvemos los reportes de síntomas separados por paciente
    let reportesPacientes: any[] = []
    try {
      const { data: reps } = await supabase
        .from('reportes_sintomas')
        .select('id_reporte, paciente_id, zona_dolor, tipo_dolor, intensidad, inicio_sintomas, factores_agravantes, factores_mejora, sintomas_adicionales, resumen_ia, leido_por_terapeuta, created_at, pacientes(nombre_completo)')
        .eq('terapeuta_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      if (reps) reportesPacientes = reps
    } catch {}

    return NextResponse.json({ historial: data ?? [], fecha_dia: hoyMexico, reportesPacientes })
  } catch (err: any) {
    console.error('❌ GET historial — error inesperado:', err?.message ?? err)
    return NextResponse.json({ error: err?.message ?? 'Error interno' }, { status: 500 })
  }
}

// ── DELETE: borrar manualmente el historial del día del usuario ──────
export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { error } = await supabase
      .from('chatbot_historial')
      .delete()
      .eq('profile_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Error interno' }, { status: 500 })
  }
}

// ── POST: enviar mensaje ─────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      await registrarEventoSeguridad(supabase, 'ACCESO_DENEGADO', 'POST chatbot sin sesión', null)
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: profile } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
    const rol = profile?.rol ?? 'paciente'

    const body = await request.json()
    const mensajes: { role: 'user' | 'assistant'; content: string }[] =
      body.messages?.length
        ? body.messages
        : [
            ...(body.history ?? []).map((m: any) => ({
              role: m.role === 'model' ? 'assistant' : 'user' as const,
              content: m.parts?.[0]?.text ?? '',
            })),
            ...(body.message ? [{ role: 'user' as const, content: body.message }] : []),
          ]

    if (!mensajes.length && !body.file) {
      return NextResponse.json({ error: 'Mensajes requeridos' }, { status: 400 })
    }

    const ultimoTextoOriginal = mensajes[mensajes.length - 1]?.content ?? ''

    if (!body.file) {
      const validacion = validarMensajeChatbot(ultimoTextoOriginal)
      if (!validacion.valido) {
        await registrarEventoSeguridad(supabase, 'MENSAJE_INVALIDO', validacion.mensaje, user.id, ultimoTextoOriginal)
        return NextResponse.json({ error: validacion.mensaje }, { status: 400 })
      }
    }

    const revisionFirewall = promptFirewall(ultimoTextoOriginal)
    if (!revisionFirewall.permitido) {
      await registrarEventoSeguridad(supabase, 'PROMPT_BLOQUEADO', revisionFirewall.motivo, user.id, ultimoTextoOriginal)
      const respuestaBloqueo = 'Tu solicitud no puede procesarse por políticas de seguridad.'
      try {
        await supabase.from('chatbot_historial').insert([
          { profile_id: user.id, role: 'user', content: ultimoTextoOriginal, modulo: body.modulo ?? null },
          { profile_id: user.id, role: 'assistant', content: respuestaBloqueo, modulo: body.modulo ?? null },
        ])
      } catch (e) {
        console.error('Error guardando historial (bloqueo):', e)
      }
      return NextResponse.json({ reply: respuestaBloqueo, rol }, { status: 200 })
    }

    const GEMINI_KEY = process.env.GEMINI_API_KEY
    if (!GEMINI_KEY) return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 })

    const contexto = await obtenerContexto(supabase, user.id, rol)
    const systemPrompt = `${BASE_PROMPT}
${ROL_CONTEXTO[rol] ?? ''}
MÓDULO ACTUAL: ${body.modulo ?? 'DASHBOARD'}
${contexto ? `\nCONTEXTO EN TIEMPO REAL:\n${contexto}` : ''}`

    const geminiHistory: GeminiMsg[] = mensajes.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const ultimoTexto = ultimoTextoOriginal
    const lastParts: GeminiPart[] = []

    if (body.file?.base64 && body.file?.mimeType) {
      const { base64, mimeType, name } = body.file
      if (mimeType.startsWith('image/') || mimeType === 'application/pdf') {
        lastParts.push({ inline_data: { mime_type: mimeType, data: base64 } })
      } else {
        try {
          const decoded = Buffer.from(base64, 'base64').toString('utf-8')
          lastParts.push({ text: `Archivo "${name}":\n\n${decoded}` })
        } catch {
          lastParts.push({ text: `El usuario adjuntó: ${name}` })
        }
      }
    }
    lastParts.push({ text: ultimoTexto.trim() || 'Analiza este archivo.' })
    const lastMsg: GeminiMsg = { role: 'user', parts: lastParts }

    const respuesta = await llamarGeminiConFunciones(
      systemPrompt,
      [...geminiHistory, lastMsg],
      supabase,
      user.id,
      rol,
      GEMINI_KEY
    )

    try {
      await supabase.from('chatbot_historial').insert([
        { profile_id: user.id, role: 'user', content: ultimoTexto || `📎 ${body.file?.name ?? 'archivo'}`, modulo: body.modulo ?? null },
        { profile_id: user.id, role: 'assistant', content: respuesta.texto, modulo: body.modulo ?? null },
      ])
    } catch (e) {
      console.error('Error guardando historial:', e)
    }

    return NextResponse.json({
      reply: respuesta.texto,
      reportesPacientes: respuesta.reportesPacientes,
      rol,
    })
  } catch (err) {
    console.error('❌ Chatbot error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}