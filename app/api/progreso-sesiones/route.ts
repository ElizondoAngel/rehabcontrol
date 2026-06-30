import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Esta ruta es deliberadamente INSERT-ONLY: solo expone POST.
 * No existen PUT/PATCH/DELETE — un registro de progreso de sesión
 * es un hecho clínico histórico y no debe modificarse después de
 * creado, ni siquiera por el propio terapeuta. Esto incluye tanto
 * los archivos (fotos/videos) como la lista de ejercicios: ambos
 * se capturan en el mismo momento que se crea el registro.
 *
 * `ejercicios` reemplaza al antiguo campo de texto libre
 * `ejercicios_completados`. Es un array jsonb de objetos:
 *   [{ "ejercicio": "Sentadillas", "repeticiones": 15 }, ...]
 */

const BUCKET = 'progreso-archivos'
const TIPOS_PERMITIDOS = [
  'image/jpeg', 'image/jpg', 'image/png',
  'video/mp4', 'video/quicktime', 'video/webm',
]
const TAMANO_MAX = 50 * 1024 * 1024 // 50 MB

interface EjercicioInput {
  ejercicio: string
  repeticiones: number
}

function parsearEjercicios(raw: string | null): { ejercicios: EjercicioInput[] | null; error: string | null } {
  if (!raw || raw.trim() === '') return { ejercicios: [], error: null }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ejercicios: null, error: 'Formato de ejercicios inválido' }
  }
  if (!Array.isArray(parsed)) return { ejercicios: null, error: 'Formato de ejercicios inválido' }

  const limpios: EjercicioInput[] = []
  for (const item of parsed) {
    if (typeof item !== 'object' || item === null) continue
    const nombre = String((item as any).ejercicio ?? '').trim()
    const repsRaw = (item as any).repeticiones
    const reps = Number(repsRaw)
    if (!nombre) continue // ignora filas vacías que el usuario no llenó
    if (Number.isNaN(reps) || reps < 0) {
      return { ejercicios: null, error: `Repeticiones inválidas para "${nombre}"` }
    }
    limpios.push({ ejercicio: nombre, repeticiones: Math.round(reps) })
  }
  return { ejercicios: limpios, error: null }
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (profile?.rol !== 'terapeuta' && profile?.rol !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const formData = await req.formData()
  const citaId = formData.get('cita_id') as string | null
  const pacienteId = formData.get('paciente_id') as string | null
  const nivelDolor = formData.get('nivel_dolor') as string | null
  const movilidad = formData.get('movilidad') as string | null
  const ejerciciosRaw = formData.get('ejercicios') as string | null // JSON.stringify del array
  const observaciones = formData.get('observaciones') as string | null
  const archivosFiles = formData.getAll('archivos') as File[]

  if (!citaId || !pacienteId) {
    return NextResponse.json({ error: 'Faltan datos (cita_id, paciente_id)' }, { status: 400 })
  }
  const nivelDolorNum = Number(nivelDolor)
  const movilidadNum = Number(movilidad)
  if (nivelDolor == null || Number.isNaN(nivelDolorNum) || nivelDolorNum < 0 || nivelDolorNum > 10) {
    return NextResponse.json({ error: 'Nivel de dolor inválido (0-10)' }, { status: 400 })
  }
  if (movilidad == null || Number.isNaN(movilidadNum) || movilidadNum < 0 || movilidadNum > 10) {
    return NextResponse.json({ error: 'Movilidad inválida (0-10)' }, { status: 400 })
  }

  const { ejercicios, error: errorEjercicios } = parsearEjercicios(ejerciciosRaw)
  if (errorEjercicios) {
    return NextResponse.json({ error: errorEjercicios }, { status: 400 })
  }

  for (const file of archivosFiles) {
    if (file.size === 0) continue
    if (!TIPOS_PERMITIDOS.includes(file.type)) {
      return NextResponse.json({ error: `Tipo de archivo no permitido: ${file.name}. Solo JPG, PNG, MP4, MOV o WEBM.` }, { status: 400 })
    }
    if (file.size > TAMANO_MAX) {
      return NextResponse.json({ error: `El archivo "${file.name}" supera el límite de 50 MB` }, { status: 400 })
    }
  }

  const { data: cita } = await supabase
    .from('citas')
    .select('id_cita, paciente_id, terapeuta_id, estado')
    .eq('id_cita', citaId)
    .eq('terapeuta_id', user.id)
    .eq('paciente_id', pacienteId)
    .single()

  if (!cita) {
    return NextResponse.json({ error: 'Cita no encontrada o no autorizada' }, { status: 403 })
  }
  if (cita.estado !== 'completada') {
    return NextResponse.json({ error: 'Solo se puede registrar progreso de citas completadas' }, { status: 409 })
  }

  const { data: existente } = await supabase
    .from('progreso_sesiones')
    .select('id_progreso_sesion')
    .eq('cita_id', citaId)
    .maybeSingle()

  if (existente) {
    return NextResponse.json({ error: 'Ya existe un registro de progreso para esta cita' }, { status: 409 })
  }

  // ── Subir archivos ANTES de insertar el registro ──
  const archivosSubidos: Array<{ path: string; nombre: string; tipo: string; tamano: number }> = []

  for (const file of archivosFiles) {
    if (file.size === 0) continue
    const nombreSeguro = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${user.id}/${pacienteId}/${citaId}/${Date.now()}_${nombreSeguro}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false })

    if (uploadError) {
      if (archivosSubidos.length > 0) {
        await supabase.storage.from(BUCKET).remove(archivosSubidos.map(a => a.path))
      }
      return NextResponse.json({ error: `Error al subir "${file.name}": ${uploadError.message}` }, { status: 400 })
    }

    archivosSubidos.push({ path, nombre: file.name, tipo: file.type, tamano: file.size })
  }

  const archivosConFecha = archivosSubidos.map(a => ({ ...a, subido_en: new Date().toISOString() }))

  const { data, error } = await supabase
    .from('progreso_sesiones')
    .insert({
      cita_id: citaId,
      paciente_id: pacienteId,
      nivel_dolor: nivelDolorNum,
      movilidad: movilidadNum,
      ejercicios: ejercicios ?? [],
      observaciones: observaciones || null,
      archivos: archivosConFecha,
      fecha_registro: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    if (archivosSubidos.length > 0) {
      await supabase.storage.from(BUCKET).remove(archivosSubidos.map(a => a.path))
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const archivosConUrl = await Promise.all(
    archivosConFecha.map(async (a) => {
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(a.path, 60 * 60)
      return { ...a, url: signed?.signedUrl ?? null }
    })
  )

  return NextResponse.json({ sesion: { ...data, archivos: archivosConUrl } })
}