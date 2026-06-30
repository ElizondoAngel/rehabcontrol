import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Genera una URL firmada (1 hora) para ver un archivo de un
 * registro de progreso ya existente. Solo lectura — no permite
 * subir, reemplazar ni borrar nada, en línea con el carácter
 * insert-only de progreso_sesiones.
 *
 * Verifica que el archivo pedido (por path) realmente pertenezca
 * al id_progreso_sesion indicado y que el terapeuta autenticado
 * sea el dueño de la cita asociada, antes de firmar la URL.
 */

const BUCKET = 'progreso-archivos'

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

  const body = await req.json().catch(() => null)
  const idProgresoSesion = body?.id_progreso_sesion
  const path = body?.path as string | undefined

  if (!idProgresoSesion || !path) {
    return NextResponse.json({ error: 'Faltan datos (id_progreso_sesion, path)' }, { status: 400 })
  }

  // Trae el registro de progreso junto con la cita asociada, para
  // confirmar que el terapeuta autenticado es dueño de esa cita
  // (o es admin) antes de firmar nada.
  const { data: sesion } = await supabase
    .from('progreso_sesiones')
    .select('id_progreso_sesion, archivos, cita_id, citas!inner(terapeuta_id)')
    .eq('id_progreso_sesion', idProgresoSesion)
    .single()

  if (!sesion) {
    return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
  }

  const terapeutaIdCita = (sesion as any).citas?.terapeuta_id
  if (profile.rol !== 'admin' && terapeutaIdCita !== user.id) {
    return NextResponse.json({ error: 'No autorizado para ver este archivo' }, { status: 403 })
  }

  const archivos = (sesion.archivos as Array<{ path: string }>) ?? []
  const archivoValido = archivos.some(a => a.path === path)
  if (!archivoValido) {
    return NextResponse.json({ error: 'El archivo no pertenece a este registro' }, { status: 403 })
  }

  const { data: signed, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60)

  if (error || !signed) {
    return NextResponse.json({ error: error?.message ?? 'No se pudo generar la URL' }, { status: 400 })
  }

  return NextResponse.json({ url: signed.signedUrl })
}