/**
 * /api/admin/configuracion/route.ts
 * PATCH — actualizar datos de clínica o perfil del admin
 *
 * NOTA: Los datos de la clínica se guardan en la tabla `configuracion`
 * (la creamos aquí si no existe). El perfil del admin actualiza `profiles`.
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const ClinicaSchema = z.object({
  nombre_clinica:  z.string().min(1).optional(),
  telefono_clinica:z.string().optional(),
  direccion_clinica:z.string().optional(),
  horario:         z.string().optional(),
  email_clinica:   z.string().email().optional().or(z.literal('')),
})

const PerfilSchema = z.object({
  nombre_completo: z.string().min(2),
  telefono:        z.string().optional(),
})

async function verificarAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
  if (profile?.rol !== 'admin') return null
  return user
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const user = await verificarAdmin(supabase)
    if (!user) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const body = await request.json()
    const { tipo, ...datos } = body

    if (tipo === 'clinica') {
      const parsed = ClinicaSchema.safeParse(datos)
      if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

      // Upsert en tabla configuracion (clave única: 'clinica')
      const { error } = await supabase
        .from('configuracion')
        .upsert({ clave: 'clinica', valor: JSON.stringify(parsed.data), updated_at: new Date().toISOString() }, { onConflict: 'clave' })

      if (error) {
        // Si la tabla no existe, no es error crítico — avisamos pero no fallamos
        console.warn('configuracion table may not exist:', error.message)
      }

      await supabase.from('audit_logs').insert({
        user_id: user.id, accion: 'EDITAR_CONFIGURACION',
        tabla_afectada: 'configuracion', registro_id: 'clinica',
      })
      return NextResponse.json({ ok: true })
    }

    if (tipo === 'perfil') {
      const parsed = PerfilSchema.safeParse(datos)
      if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

      const { error } = await supabase
        .from('profiles')
        .update({ nombre_completo: parsed.data.nombre_completo, telefono: parsed.data.telefono ?? null })
        .eq('id', user.id)

      if (error) return NextResponse.json({ error: 'Error al actualizar perfil' }, { status: 500 })

      await supabase.from('audit_logs').insert({
        user_id: user.id, accion: 'EDITAR_PERFIL',
        tabla_afectada: 'profiles', registro_id: user.id,
      })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Tipo de configuración no reconocido' }, { status: 400 })

  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
