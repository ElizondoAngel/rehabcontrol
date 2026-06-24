import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PerfilClient from './PerfilClient'

export const dynamic = 'force-dynamic'

export default async function MiPerfilPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  console.log('🔍 USER ID ACTUAL:', user.id)  // ← DEBUG TEMPORAL

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, nombre_completo, email, created_at, activo')
    .eq('id', user.id)
    .single()

  if (profile?.rol !== 'paciente') redirect('/unauthorized')

  const { data: pacienteRaw, error: pacienteError } = await supabase
    .from('pacientes')
    .select(`
      id_paciente,
      telefono,
      domicilio,
      fecha_nacimiento,
      curp,
      contacto_emergencia,
      created_at,
      activo,
      terapeuta_id,
      terapeuta:profiles!pacientes_terapeuta_id_fkey (
        nombre_completo
      )
    `)
    .eq('profile_id', user.id)
    .single()

  console.log('🔍 PACIENTE ENCONTRADO:', pacienteRaw)       // ← DEBUG TEMPORAL
  console.log('🔍 ERROR AL BUSCAR PACIENTE:', pacienteError) // ← DEBUG TEMPORAL

  const paciente = pacienteRaw ? {
    ...pacienteRaw,
    terapeuta: Array.isArray(pacienteRaw.terapeuta)
      ? (pacienteRaw.terapeuta[0] ?? null)
      : (pacienteRaw.terapeuta ?? null),
  } : null

  let stats = {
    totalCitas:       0,
    citasCompletadas: 0,
    pagosPendientes:  0,
    proximaCita:      null as { fecha_hora: string; estado: string } | null,
  }

  let tieneBajaPendiente = false

  if (paciente?.id_paciente) {
    const [citasRes, pagosRes, proximaRes, bajaRes] = await Promise.all([
      supabase
        .from('citas')
        .select('estado', { count: 'exact' })
        .eq('paciente_id', paciente.id_paciente),

      supabase
        .from('pagos')
        .select('id_pago', { count: 'exact' })
        .eq('paciente_id', paciente.id_paciente)
        .eq('estado_pago', 'pendiente'),

      supabase
        .from('citas')
        .select('fecha_hora, estado')
        .eq('paciente_id', paciente.id_paciente)
        .eq('estado', 'programada')
        .gte('fecha_hora', new Date().toISOString())
        .order('fecha_hora', { ascending: true })
        .limit(1)
        .maybeSingle(),

      supabase
        .from('solicitudes_baja')
        .select('id')
        .eq('paciente_id', paciente.id_paciente)
        .eq('estado', 'pendiente')
        .maybeSingle(),
    ])

    const completadas = citasRes.data?.filter(c => c.estado === 'completada').length ?? 0

    stats = {
      totalCitas:       citasRes.count  ?? 0,
      citasCompletadas: completadas,
      pagosPendientes:  pagosRes.count  ?? 0,
      proximaCita:      proximaRes.data ?? null,
    }

    tieneBajaPendiente = !!bajaRes.data
  }

  return (
    <PerfilClient
      profile={profile}
      paciente={paciente}
      userId={user.id}
      email={user.email ?? profile?.email ?? ''}
      stats={stats}
      tieneBajaPendiente={tieneBajaPendiente}
    />
  )
}