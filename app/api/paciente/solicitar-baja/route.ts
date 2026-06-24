import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('rol, nombre_completo, email')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }
    if (profile.rol !== 'paciente') {
      return NextResponse.json({ error: 'Acceso no permitido' }, { status: 403 })
    }

    const { data: paciente, error: pacienteError } = await supabase
      .from('pacientes')
      .select('id_paciente, activo')
      .eq('profile_id', user.id)
      .maybeSingle()

    if (pacienteError) {
      console.error('[solicitar-baja] paciente query error:', pacienteError.message)
      return NextResponse.json({ error: 'Error al buscar el paciente' }, { status: 500 })
    }
    if (!paciente) {
      return NextResponse.json({ error: 'Registro de paciente no encontrado' }, { status: 404 })
    }

    const { data: duplicado, error: dupError } = await admin
      .from('solicitudes_baja')
      .select('id')
      .eq('profile_id', user.id)
      .eq('estado', 'pendiente')
      .maybeSingle()

    if (dupError) {
      console.error('[solicitar-baja] duplicado check error:', dupError.message)
      return NextResponse.json({ error: 'Error interno.' }, { status: 500 })
    }
    if (duplicado) {
      return NextResponse.json(
        { error: 'Ya tienes una solicitud de baja en proceso.' },
        { status: 409 }
      )
    }

    let motivo = null
    try {
      const body = await request.json()
      if (typeof body?.motivo === 'string' && body.motivo.trim().length > 0) {
        motivo = body.motivo.trim().slice(0, 500)
      }
    } catch { }

    const { error: insertError } = await admin
      .from('solicitudes_baja')
      .insert({
        paciente_id: paciente.id_paciente,
        profile_id: user.id,
        nombre: profile.nombre_completo,
        email: profile.email ?? user.email ?? '',
        estado: 'pendiente',
        motivo,
      })

    if (insertError) {
      console.error('[solicitar-baja] insert error:', insertError.message)
      return NextResponse.json({ error: 'No se pudo registrar la solicitud.' }, { status: 500 })
    }

    await admin.from('audit_logs').insert({
      user_id: user.id,
      accion: 'SOLICITUD_BAJA',
      tabla_afectada: 'solicitudes_baja',
    }).then(({ error }) => {
      if (error) console.warn('[solicitar-baja] audit_log warning:', error.message)
    })

    return NextResponse.json({ ok: true })

  } catch (err) {
    console.error('[solicitar-baja] unexpected error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}