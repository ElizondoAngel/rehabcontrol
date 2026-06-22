import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReportesClient from './ReportesClient'

export default async function ReportesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('rol').eq('id', user.id).single()
  if (profile?.rol !== 'admin') redirect('/unauthorized')

  // ── RPCs ────────────────────────────────────────────────
  const [
    { data: resumen },
    { data: citasPorMes },
    { data: pacientesPorTerapeuta },
  ] = await Promise.all([
    supabase.rpc('reporte_resumen_general').single(),
    supabase.rpc('reporte_citas_por_mes'),
    supabase.rpc('reporte_pacientes_por_terapeuta'),
  ])

  // ── Distribución de citas por estado ────────────────────
  const { data: citasPorEstado } = await supabase
    .from('citas')
    .select('estado')

  const estadoCount: Record<string,number> = {}
  ;(citasPorEstado ?? []).forEach(c => {
    estadoCount[c.estado] = (estadoCount[c.estado] ?? 0) + 1
  })

  // ── Últimos pagos para tabla ─────────────────────────────
  const { data: ultimosPagosRaw } = await supabase
    .from('pagos')
    .select(`
      id_pago, monto, estado_pago, metodo_pago, fecha_pago,
      paciente:pacientes!pagos_paciente_id_fkey(nombre_completo)
    `)
    .eq('estado_pago', 'pagado')
    .order('fecha_pago', { ascending: false })
    .limit(10)

  const ultimosPagos = (ultimosPagosRaw ?? []).map((p: any) => ({
    ...p,
    paciente: Array.isArray(p.paciente) ? p.paciente[0] ?? { nombre_completo: '' } : p.paciente,
  }))

  return (
    <ReportesClient
      resumen={resumen ?? {}}
      citasPorMes={citasPorMes ?? []}
      pacientesPorTerapeuta={pacientesPorTerapeuta ?? []}
      citasPorEstado={estadoCount}
      ultimosPagos={ultimosPagos}
    />
  )
}
