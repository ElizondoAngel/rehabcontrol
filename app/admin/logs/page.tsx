import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogsClient from './LogsClient'

export default async function LogsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (profile?.rol !== 'admin') {
    redirect('/unauthorized')
  }

  // Últimos 200 registros — tabla append-only, solo lectura para admin
  const { data: logs } = await supabase
    .from('audit_logs')
    .select('id_logs, accion, tabla_afectada, registro_id, ip, timestamp, profiles(nombre_completo, rol)')
    .order('timestamp', { ascending: false })
    .limit(200)

  const logsNormalizados = (logs ?? []).map((l: any) => ({
    ...l,
    profiles: Array.isArray(l.profiles) ? (l.profiles[0] ?? null) : l.profiles,
  }))

  return <LogsClient logsIniciales={logsNormalizados} />
}