/**
 * /api/admin/pacientes-activos/route.ts
 * GET — lista ligera de pacientes activos (id + nombre) para usar en
 * selects/dropdowns (ej. al asignar un contrato). Accesible a admin y
 * secretaria.
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
    if (!['admin', 'secretaria'].includes(profile?.rol ?? '')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { data: pacientes, error } = await supabase
      .from('pacientes')
      .select('id_paciente, nombre_completo')
      .eq('activo', true)
      .order('nombre_completo', { ascending: true })

    if (error) {
      console.error('Error listando pacientes activos:', error)
      return NextResponse.json({ error: 'Error al listar pacientes' }, { status: 500 })
    }

    return NextResponse.json({ pacientes: pacientes ?? [] })
  } catch (err) {
    console.error('Error en /api/admin/pacientes-activos:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
