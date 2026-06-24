/**
 * /api/usuarios/buscar/route.ts
 * GET ?q=texto — busca usuarios por nombre (solo admin)
 * Usado por NotifBell para destino individual de notificaciones
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('rol').eq('id', user.id).single()
    if (profile?.rol !== 'admin') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim() ?? ''
    if (q.length < 2) return NextResponse.json({ usuarios: [] })

    const { data, error } = await supabase
      .from('profiles')
      .select('id, nombre_completo, rol')
      .ilike('nombre_completo', `%${q}%`)
      .eq('activo', true)
      .neq('id', user.id)
      .order('nombre_completo')
      .limit(8)

    if (error) return NextResponse.json({ error: 'Error en búsqueda' }, { status: 500 })

    return NextResponse.json({ usuarios: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
