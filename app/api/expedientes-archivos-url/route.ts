import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const BUCKET = 'expedientes-archivos'

// POST en vez de GET porque necesitamos verificar pertenencia del expediente
// antes de generar la URL — un GET con query params sería más fácil de
// manipular para acceder a archivos de otros terapeutas.
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json()
  const { id_expediente, path } = body
  if (!id_expediente || !path) {
    return NextResponse.json({ error: 'Faltan datos (id_expediente, path)' }, { status: 400 })
  }

  // Verificar que el expediente sea de este terapeuta y que el archivo le pertenezca
  const { data: expediente } = await supabase
    .from('expedientes')
    .select('id_expediente, terapeuta_id, archivos')
    .eq('id_expediente', id_expediente)
    .eq('terapeuta_id', user.id)
    .single()

  if (!expediente) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const archivos = Array.isArray(expediente.archivos) ? expediente.archivos : []
  const existe = archivos.some((a: any) => a.path === path)
  if (!existe) {
    return NextResponse.json({ error: 'Archivo no encontrado en este expediente' }, { status: 404 })
  }

  const { data: signed, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60) // 1 hora

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ url: signed.signedUrl })
}