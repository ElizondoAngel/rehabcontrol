/**
 * /api/pacientes/route.ts
 * ─────────────────────────────────────────────────────────────
 * API Route para CRUD de pacientes
 *
 * SEGURIDAD (segunda capa — servidor):
 *   • Validación con Zod antes de cualquier operación en BD
 *   • Verificación de rol en servidor (no confiar solo en el cliente)
 *   • RLS de Supabase como tercera capa
 *   • Mensajes de error genéricos al cliente (no exponer stack traces)
 *   • Log de auditoría en cada operación sensible
 *
 * FUNCIONES ASÍNCRONAS:
 *   • Toda operación con BD usa async/await
 *   • Permite manejar errores con try/catch sin bloquear el hilo
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// ── ESQUEMA DE VALIDACIÓN ZOD (segunda capa) ──────────────────
const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/

const PacienteSchema = z.object({
  nombre_completo:     z.string().min(3, 'Nombre muy corto').max(120),
  fecha_nacimiento:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  curp:                z.string().regex(CURP_REGEX, 'CURP inválida'),
  telefono:            z.string().max(20).optional().or(z.literal('')),
  domicilio:           z.string().max(255).optional().or(z.literal('')),
  contacto_emergencia: z.string().max(120).optional().or(z.literal('')),
  terapeuta_id:        z.string().uuid('Terapeuta inválido'),
})

const PacienteEditSchema = PacienteSchema.extend({ id: z.number() })

// ── FUNCIÓN HELPER: verificar rol ────────────────────────────
async function verificarRol(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.rpc('auth_rol')
  return { user, rol: data as string }
}

// ── POST — Crear paciente ─────────────────────────────────────
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const auth = await verificarRol(supabase)

    // Verificar permisos en servidor
    if (!auth || !['admin','secretaria'].includes(auth.rol)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json()

    // Validación Zod — segunda capa
    const parsed = PacienteSchema.safeParse({ ...body, curp: body.curp?.toUpperCase() })
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { data: paciente, error } = await supabase
      .from('pacientes')
      .insert({
        ...parsed.data,
        telefono:            parsed.data.telefono || null,
        domicilio:           parsed.data.domicilio || null,
        contacto_emergencia: parsed.data.contacto_emergencia || null,
        activo:              true,
      })
      .select('*, profiles!pacientes_terapeuta_id_fkey(nombre_completo)')
      .single()

    if (error) {
      // Detectar CURP duplicada
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ya existe un paciente con esa CURP' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Error al registrar paciente' }, { status: 500 })
    }

    // Log de auditoría
    await supabase.from('audit_logs').insert({
      user_id:        auth.user.id,
      accion:         'CREAR_PACIENTE',
      tabla_afectada: 'pacientes',
      registro_id:    paciente.id_paciente.toString(),
    })

    return NextResponse.json({ paciente }, { status: 201 })

  } catch {
    // Nunca exponer detalles del error al cliente
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// ── PUT — Editar paciente ─────────────────────────────────────
export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const auth = await verificarRol(supabase)

    if (!auth || !['admin','secretaria'].includes(auth.rol)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = PacienteEditSchema.safeParse({ ...body, curp: body.curp?.toUpperCase() })
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { id, ...campos } = parsed.data

    const { error } = await supabase
      .from('pacientes')
      .update({
        ...campos,
        telefono:            campos.telefono || null,
        domicilio:           campos.domicilio || null,
        contacto_emergencia: campos.contacto_emergencia || null,
      })
      .eq('id_paciente', id)

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ya existe un paciente con esa CURP' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Error al actualizar paciente' }, { status: 500 })
    }

    // Log de auditoría
    await supabase.from('audit_logs').insert({
      user_id:        auth.user.id,
      accion:         'EDITAR_PACIENTE',
      tabla_afectada: 'pacientes',
      registro_id:    id.toString(),
    })

    return NextResponse.json({ ok: true })

  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// ── DELETE — Baja lógica (no elimina, desactiva) ──────────────
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const auth = await verificarRol(supabase)

    if (!auth || !['admin','secretaria'].includes(auth.rol)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id, activo } = await request.json()
    if (!id || typeof id !== 'number') {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }
    const nuevoEstado = activo === true // por defecto false (baja) si no se especifica

    // Baja/reactivación LÓGICA — nunca eliminar datos médicos
    const { error } = await supabase
      .from('pacientes')
      .update({ activo: nuevoEstado })
      .eq('id_paciente', id)

    if (error) {
      return NextResponse.json({ error: 'Error al actualizar estado' }, { status: 500 })
    }

    // Log de auditoría
    await supabase.from('audit_logs').insert({
      user_id:        auth.user.id,
      accion:         nuevoEstado ? 'REACTIVAR_PACIENTE' : 'BAJA_PACIENTE',
      tabla_afectada: 'pacientes',
      registro_id:    id.toString(),
    })

    return NextResponse.json({ ok: true })

  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
