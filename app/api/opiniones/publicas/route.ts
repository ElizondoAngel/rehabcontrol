/**
 * /api/opiniones/publicas/route.ts
 * GET — opiniones APROBADAS para mostrar en el landing público.
 * No requiere sesión (usa el cliente normal de Supabase; RLS ya
 * tiene la policy 'opiniones_publico_aprobadas' que solo deja leer
 * las de estado='aprobada' al rol 'anon').
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('opiniones')
      .select(`
        id_opinion, calificacion, comentario, created_at,
        pacientes(nombre_completo),
        profiles!opiniones_terapeuta_id_fkey(nombre_completo)
      `)
      .eq('estado', 'aprobada')
      .order('created_at', { ascending: false })
      .limit(12)

    if (error) {
      console.error('Error al listar opiniones públicas:', JSON.stringify(error, null, 2))
      return NextResponse.json({ opiniones: [] })
    }

    const normalizadas = (data ?? []).map((o: any) => ({
      calificacion: o.calificacion,
      comentario: o.comentario,
      paciente_nombre: (Array.isArray(o.pacientes) ? o.pacientes[0] : o.pacientes)?.nombre_completo ?? 'Paciente',
      terapeuta_nombre: (Array.isArray(o.profiles) ? o.profiles[0] : o.profiles)?.nombre_completo ?? null,
    }))

    return NextResponse.json({ opiniones: normalizadas })
  } catch (err) {
    console.error('Error interno GET /api/opiniones/publicas:', err)
    return NextResponse.json({ opiniones: [] })
  }
}
