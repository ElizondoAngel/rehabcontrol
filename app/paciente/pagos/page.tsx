import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PagosClient from './PagosClient'
export const dynamic = 'force-dynamic'

export default async function MisPagosPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, nombre_completo')
    .eq('id', user.id)
    .single()

  if (profile?.rol !== 'paciente') redirect('/unauthorized')

  // 1. Obtener el id_paciente real
  const { data: paciente } = await supabase
    .from('pacientes')
    .select('id_paciente')
    .eq('profile_id', user.id)
    .single()

  const idPaciente = paciente?.id_paciente ?? -1

  // 2. Pagos con columnas reales
  const { data: pagos } = await supabase
    .from('pagos')
    .select('id_pago, monto, estado_pago, metodo_pago, fecha_pago')
    .eq('paciente_id', idPaciente)
    .order('fecha_pago', { ascending: false })

  // 3. Contrato activo — para la tarjeta de estado del paquete
  const { data: contratoRaw } = await supabase
    .from('contratos_paciente')
    .select('sesiones_totales, sesiones_usadas, sesiones_restantes, monto_pagado, fecha_vencimiento, estado, paquetes(nombre, precio_total)')
    .eq('paciente_id', idPaciente)
    .eq('estado', 'activo')
    .gte('fecha_vencimiento', new Date().toLocaleDateString('en-CA')) // en-CA = formato YYYY-MM-DD
    .order('fecha_inicio', { ascending: false })
    .limit(1)
    .maybeSingle()

  const contrato = contratoRaw ? {
    ...contratoRaw,
    paquetes: Array.isArray(contratoRaw.paquetes) ? contratoRaw.paquetes[0] ?? null : contratoRaw.paquetes,
  } : null

  return (
    <PagosClient
      profile={profile}
      pagos={pagos ?? []}
      contrato={contrato}
      userId={user.id}
    />
  )
}
