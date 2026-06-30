import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const BUCKET = 'expedientes-archivos'
const TIPOS_PERMITIDOS = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
const TAMANO_MAX = 10 * 1024 * 1024 // 10 MB

// ── POST: subir un archivo y agregarlo al array `archivos` del expediente ──
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
  const file = formData.get('file') as File | null
  const idExpediente = formData.get('id_expediente') as string | null
  const pacienteId = formData.get('paciente_id') as string | null

  if (!file || !idExpediente || !pacienteId) {
    return NextResponse.json({ error: 'Faltan datos (file, id_expediente, paciente_id)' }, { status: 400 })
  }

  if (!TIPOS_PERMITIDOS.includes(file.type)) {
    return NextResponse.json({ error: 'Solo se permiten archivos PDF, JPG o PNG' }, { status: 400 })
  }
  if (file.size > TAMANO_MAX) {
    return NextResponse.json({ error: 'El archivo no debe superar 10 MB' }, { status: 400 })
  }

  // Verificar que el expediente exista y sea de este terapeuta
  const { data: expediente } = await supabase
    .from('expedientes')
    .select('id_expediente, paciente_id, terapeuta_id, archivos')
    .eq('id_expediente', idExpediente)
    .eq('terapeuta_id', user.id)
    .single()

  if (!expediente) {
    return NextResponse.json({ error: 'Expediente no encontrado o no autorizado' }, { status: 403 })
  }

  // Ruta del archivo dentro del bucket: terapeuta/paciente/timestamp_nombre
  const extension = file.name.split('.').pop()
  const nombreSeguro = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${user.id}/${pacienteId}/${Date.now()}_${nombreSeguro}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: `Error al subir el archivo: ${uploadError.message}` }, { status: 400 })
  }

  // Actualizar el array `archivos` del expediente con la nueva entrada
  const nuevoArchivo = {
    path,
    nombre: file.name,
    tipo: file.type,
    tamano: file.size,
    subido_en: new Date().toISOString(),
  }
  const archivosActuales = Array.isArray(expediente.archivos) ? expediente.archivos : []
  const archivosNuevos = [...archivosActuales, nuevoArchivo]

  const { data: actualizado, error: updateError } = await supabase
    .from('expedientes')
    .update({ archivos: archivosNuevos, updated_at: new Date().toISOString() })
    .eq('id_expediente', idExpediente)
    .select('archivos')
    .single()

  if (updateError) {
    // Si falla el registro en BD, intentamos limpiar el archivo huérfano en storage
    await supabase.storage.from(BUCKET).remove([path])
    return NextResponse.json({ error: updateError.message }, { status: 400 })
  }

  // Generar URL firmada temporal para mostrarlo de inmediato en el cliente
  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60) // 1 hora

  return NextResponse.json({
    archivos: actualizado.archivos,
    nuevoArchivo: { ...nuevoArchivo, url: signed?.signedUrl ?? null },
  })
}

// ── DELETE: quitar un archivo del array y borrarlo de Storage ──
export async function DELETE(req: Request) {
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

  const body = await req.json()
  const { id_expediente, path } = body
  if (!id_expediente || !path) {
    return NextResponse.json({ error: 'Faltan datos (id_expediente, path)' }, { status: 400 })
  }

  const { data: expediente } = await supabase
    .from('expedientes')
    .select('id_expediente, terapeuta_id, archivos')
    .eq('id_expediente', id_expediente)
    .eq('terapeuta_id', user.id)
    .single()

  if (!expediente) {
    return NextResponse.json({ error: 'Expediente no encontrado o no autorizado' }, { status: 403 })
  }

  const archivosActuales = Array.isArray(expediente.archivos) ? expediente.archivos : []
  const archivosNuevos = archivosActuales.filter((a: any) => a.path !== path)

  const { error: updateError } = await supabase
    .from('expedientes')
    .update({ archivos: archivosNuevos, updated_at: new Date().toISOString() })
    .eq('id_expediente', id_expediente)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 })
  }

  await supabase.storage.from(BUCKET).remove([path])

  return NextResponse.json({ archivos: archivosNuevos })
}