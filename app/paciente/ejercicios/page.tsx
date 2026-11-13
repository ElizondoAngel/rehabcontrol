import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import EjerciciosClient from './EjerciciosClient'
import {
  EjercicioAsignadoIA,
  extraerRutinaDeIndicaciones,
  extraerRutinaDeTextoLibre,
  normalizarNombreEjercicioIA,
} from '@/lib/rutina-ia'

export const dynamic = 'force-dynamic'

async function buscarExpedientePaciente(supabaseUser: any, idPaciente: number) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (url && serviceKey && serviceKey.trim().length > 20) {
    try {
      const adminClient = createAdminClient(url, serviceKey.trim(), {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const { data } = await adminClient
        .from('expedientes')
        .select('indicaciones, plan_tratamiento')
        .eq('paciente_id', idPaciente)
        .maybeSingle()
      if (data) return data
    } catch {
      // Fallback al cliente normal si la service key no es válida
    }
  }

  const { data } = await supabaseUser
    .from('expedientes')
    .select('indicaciones, plan_tratamiento')
    .eq('paciente_id', idPaciente)
    .maybeSingle()

  return data
}

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

  // 1. Obtener las sesiones registradas en progreso_sesiones (ordenadas por id_progreso_sesion DESC para que la más reciente siempre sea la primera)
  const { data: sesiones } = await supabase
    .from('progreso_sesiones')
    .select('id_progreso_sesion, nivel_dolor, movilidad, ejercicios, observaciones, archivos, fecha_registro')
    .eq('paciente_id', idPaciente)
    .order('id_progreso_sesion', { ascending: false })

  // 2. Extraer la rutina de ejercicios asignada por el terapeuta en el expediente del paciente
  const expData = await buscarExpedientePaciente(supabase, idPaciente)
  let { rutinaAsignada } = extraerRutinaDeIndicaciones(expData?.indicaciones)

  if (rutinaAsignada.length === 0 && expData?.plan_tratamiento) {
    rutinaAsignada = extraerRutinaDeTextoLibre(expData.plan_tratamiento)
  }

  // 3. Respaldo en `progreso_sesiones` (donde el paciente SIEMPRE tiene permiso SELECT por RLS)
  if (rutinaAsignada.length === 0 && sesiones && sesiones.length > 0) {
    // 3a. Primero revisar si alguna sesión tiene el marcador estructurado en observaciones o ejercicios asignados por terapeuta
    for (const s of sesiones) {
      const desdeObs = extraerRutinaDeIndicaciones(s.observaciones).rutinaAsignada
      if (desdeObs.length > 0) {
        rutinaAsignada = desdeObs
        break
      }

      const lista = Array.isArray(s.ejercicios) ? s.ejercicios : []
      const encontrados: EjercicioAsignadoIA[] = []
      for (const item of lista as any[]) {
        if (!item) continue
        const nombreOficial = normalizarNombreEjercicioIA(item.ejercicio)
        if (nombreOficial) {
          const repsMeta = Math.max(1, Number(item.repeticiones_meta ?? item.repeticiones ?? 5))
          if (!encontrados.some(e => e.ejercicio === nombreOficial)) {
            encontrados.push({
              ejercicio: nombreOficial,
              repeticiones: repsMeta,
              modo_adaptado: Boolean(item.modo_adaptado),
            })
          }
        }
      }
      if (encontrados.length > 0) {
        rutinaAsignada = encontrados
        break
      }
    }
  }

  // 4. Respaldo adicional en `citas.notas` (el paciente siempre puede leer sus citas por RLS)
  if (rutinaAsignada.length === 0) {
    const { data: citasPaciente } = await supabase
      .from('citas')
      .select('notas')
      .eq('paciente_id', idPaciente)
      .order('id_cita', { ascending: false })
      .limit(10)

    for (const c of citasPaciente ?? []) {
      const desdeCita = extraerRutinaDeIndicaciones(c.notas).rutinaAsignada
      if (desdeCita.length > 0) {
        rutinaAsignada = desdeCita
        break
      }
    }
  }

  // Signed URLs para los archivos (bucket privado 'progreso-archivos') y recuperar respaldos propios del paciente en `chatbot_historial` (`modulo = 'CAMARA_IA'`)
  const { data: respaldosCamaraIA } = await supabase
    .from('chatbot_historial')
    .select('content, created_at')
    .eq('profile_id', user.id)
    .eq('modulo', 'CAMARA_IA')
    .order('created_at', { ascending: false })
    .limit(10)

  const sesionesDesdeRespaldo: any[] = []
  for (let idx = 0; idx < (respaldosCamaraIA ?? []).length; idx++) {
    const item = respaldosCamaraIA![idx]
    try {
      const parsed = item.content ? JSON.parse(item.content) : null
      if (parsed && parsed.es_evaluacion_camara_ia) {
        sesionesDesdeRespaldo.push({
          id_progreso_sesion: 900000 + idx,
          nivel_dolor: parsed.nivel_dolor ?? 2,
          movilidad: parsed.movilidad ?? 8,
          ejercicios: parsed.ejercicios ?? [],
          observaciones: parsed.observaciones ?? '',
          archivos: parsed.archivos ?? [],
          fecha_registro: parsed.fecha_registro ?? item.created_at,
        })
      }
    } catch {
      // Ignorar si no es JSON válido
    }
  }

  const fechasVistas = new Set<string>()
  const todasLasSesiones: any[] = []
  for (const s of [...sesionesDesdeRespaldo, ...(sesiones ?? [])]) {
    const k = String(s.fecha_registro ?? '').slice(0, 19)
    if (k && fechasVistas.has(k)) continue
    if (k) fechasVistas.add(k)
    todasLasSesiones.push(s)
  }

  const sesionesConUrls = await Promise.all(
    todasLasSesiones.map(async (s) => {
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
      const obsLimpia = s.observaciones
        ? extraerRutinaDeIndicaciones(s.observaciones).indicacionesLimpias
        : s.observaciones
      return { ...s, observaciones: obsLimpia, archivos: archivosConUrl }
    })
  )

  return (
    <EjerciciosClient
      profile={profile}
      sesiones={sesionesConUrls}
      rutinaAsignada={rutinaAsignada}
      userId={user.id}
    />
  )
}
