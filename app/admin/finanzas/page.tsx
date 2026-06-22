import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FinanzasClient from './FinanzasClient'

export default async function FinanzasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('rol').eq('id', user.id).single()
  if (!['admin'].includes(profile?.rol ?? '')) redirect('/unauthorized')

  // ── Métricas generales ────────────────────────────────────
  const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0,0,0,0)
  const inicioMesAnterior = new Date(inicioMes); inicioMesAnterior.setMonth(inicioMesAnterior.getMonth() - 1)

  const { data: pagosMes } = await supabase
    .from('pagos').select('monto, estado_pago, metodo_pago, fecha_pago')
    .gte('fecha_pago', inicioMes.toISOString())

  const { data: pagosAnterior } = await supabase
    .from('pagos').select('monto, estado_pago')
    .gte('fecha_pago', inicioMesAnterior.toISOString())
    .lt('fecha_pago', inicioMes.toISOString())

  // ── Todos los pagos con detalle ───────────────────────────
  const { data: todosLosPagos } = await supabase
    .from('pagos')
    .select(`
      id_pago, monto, estado_pago, metodo_pago, fecha_pago, motivo_reembolso,
      pacientes(nombre_completo),
      registrado_por:profiles(nombre_completo)
    `)
    .order('fecha_pago', { ascending: false })
    .limit(200)

  // ── Ingresos por mes (últimos 6 meses) ───────────────────
  const { data: ingresosPorMes } = await supabase.rpc('ingresos_por_mes')
    .limit(6)

  // ── Paquetes activos ──────────────────────────────────────
  const { data: paquetes } = await supabase
    .from('paquetes').select('*').eq('activo', true).order('precio_total')

  // ── Contratos activos ─────────────────────────────────────
  const { data: contratos } = await supabase
    .from('contratos_paciente')
    .select(`
      id_contrato_paciente, sesiones_totales, sesiones_usadas, sesiones_restantes,
      monto_pagado, fecha_vencimiento, estado,
      pacientes(nombre_completo),
      paquetes(nombre, precio_total)
    `)
    .order('fecha_vencimiento', { ascending: true })
    .limit(50)

  const normalizedTodosLosPagos = (todosLosPagos ?? []).map((pago) => ({
    ...pago,
    pacientes: Array.isArray(pago.pacientes) ? pago.pacientes[0] ?? null : pago.pacientes,
    registrado_por: Array.isArray(pago.registrado_por) ? pago.registrado_por[0] ?? null : pago.registrado_por,
  }))

  const normalizedContratos = (contratos ?? []).map((contrato) => ({
    ...contrato,
    pacientes: Array.isArray(contrato.pacientes) ? contrato.pacientes[0] ?? null : contrato.pacientes,
    paquetes: Array.isArray(contrato.paquetes) ? contrato.paquetes[0] ?? null : contrato.paquetes,
  }))

  return (
    <FinanzasClient
      pagosMes={pagosMes ?? []}
      pagosAnterior={pagosAnterior ?? []}
      todosLosPagos={normalizedTodosLosPagos}
      ingresosPorMes={ingresosPorMes ?? []}
      paquetes={paquetes ?? []}
      contratos={normalizedContratos}
    />
  )
}

