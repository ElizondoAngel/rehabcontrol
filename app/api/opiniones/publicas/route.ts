/**
 * /api/opiniones/publicas/route.ts
 * GET — opiniones APROBADAS para mostrar en el landing público.
 *
 * Usa la función SQL `get_opiniones_publicas()` (SECURITY DEFINER)
 * en vez de un select con embeds a pacientes/profiles: los embeds
 * disparaban el RLS de esas tablas, que a su vez referenciaba a
 * `opiniones`, causando "infinite recursion detected in policy".
 * La función bypassea ese ciclo y solo expone los 4 campos públicos.
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('get_opiniones_publicas')

    if (error) {
      console.error('Error al listar opiniones públicas:', JSON.stringify(error, null, 2))
      return NextResponse.json({ opiniones: [] })
    }

    const normalizadas = (data ?? []).map((o: any) => ({
      calificacion: o.calificacion,
      comentario: o.comentario,
      paciente_nombre: o.paciente_nombre ?? 'Paciente',
      terapeuta_nombre: o.terapeuta_nombre ?? null,
    }))

    return NextResponse.json({ opiniones: normalizadas })
  } catch (err) {
    console.error('Error interno GET /api/opiniones/publicas:', err)
    return NextResponse.json({ opiniones: [] })
  }
}
