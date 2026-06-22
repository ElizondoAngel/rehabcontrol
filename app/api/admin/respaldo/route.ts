/**
 * /api/admin/respaldo/route.ts
 * GET — genera un respaldo completo del sistema en JSON
 *
 * SEGURIDAD:
 *   • Solo admin autenticado
 *   • Excluye encrypted_password y datos sensibles de auth
 *   • Queda registrado en audit_logs
 *   • El archivo se descarga directo al navegador (no se guarda en servidor)
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function verificarAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
  if (profile?.rol !== 'admin') return null
  return user
}

export async function GET() {
  try {
    const supabase = await createClient()
    const user = await verificarAdmin(supabase)
    if (!user) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    // ── Recolectar todos los datos en paralelo ───────────────
    const [
      { data: pacientes },
      { data: perfiles },
      { data: citas },
      { data: pagos },
      { data: expedientes },
      { data: progreso },
      { data: contratos },
      { data: paquetes },
      { data: logs },
    ] = await Promise.all([
      supabase.from('pacientes').select('*').order('id_paciente'),
      supabase.from('profiles').select('id, nombre_completo, email, rol, telefono, activo, created_at').order('created_at'),
      supabase.from('citas').select('*').order('fecha_hora', { ascending: false }),
      supabase.from('pagos').select('*').order('fecha_pago', { ascending: false }),
      supabase.from('expedientes').select('*').order('id_expediente'),
      supabase.from('progreso_sesiones').select('*').order('fecha_registro', { ascending: false }),
      supabase.from('contratos_paciente').select('*').order('id_contrato_paciente'),
      supabase.from('paquetes').select('*').order('id_paquete'),
      supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(1000),
    ])

    const respaldo = {
      meta: {
        version: '2.1.0',
        sistema: 'RehabControl',
        generado_por: user.id,
        fecha_generacion: new Date().toISOString(),
        tablas_incluidas: ['pacientes','profiles','citas','pagos','expedientes','progreso_sesiones','contratos_paciente','paquetes','audit_logs'],
        nota: 'Respaldo generado desde RehabControl. No incluye contraseñas ni datos de auth.users.',
      },
      datos: {
        pacientes:           pacientes ?? [],
        usuarios:            perfiles  ?? [],
        citas:               citas     ?? [],
        pagos:               pagos     ?? [],
        expedientes:         expedientes ?? [],
        progreso_sesiones:   progreso  ?? [],
        contratos_paciente:  contratos ?? [],
        paquetes:            paquetes  ?? [],
        audit_logs:          logs      ?? [],
      },
      resumen: {
        total_pacientes:  (pacientes  ?? []).length,
        total_usuarios:   (perfiles   ?? []).length,
        total_citas:      (citas      ?? []).length,
        total_pagos:      (pagos      ?? []).length,
        total_expedientes:(expedientes?? []).length,
        total_logs:       (logs       ?? []).length,
      },
    }

    // ── Audit log del respaldo ───────────────────────────────
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      accion: 'GENERAR_RESPALDO',
      tabla_afectada: 'sistema',
      registro_id: new Date().toISOString().split('T')[0],
    })

    // ── Responder como JSON puro — el cliente decide el formato ─
    return NextResponse.json(respaldo)

  } catch (err) {
    console.error('Error generando respaldo:', err)
    return NextResponse.json({ error: 'Error al generar el respaldo' }, { status: 500 })
  }
}
