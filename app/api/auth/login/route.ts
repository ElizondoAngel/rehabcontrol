/**
 * /api/auth/login/route.ts
 * ─────────────────────────────────────────────────────────────
 * Inicio de sesión con verificación de cuenta activa.
 *
 * SEGURIDAD:
 *   • Autentica primero contra Supabase Auth (correo/contraseña)
 *   • Después de autenticar, verifica profiles.activo
 *   • Si la cuenta está desactivada: cierra la sesión recién creada
 *     inmediatamente (signOut) y responde con un mensaje claro,
 *     en vez de dejar al usuario "medio autenticado"
 *   • Devuelve el rol para que el cliente redirija al dashboard correcto
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const LoginSchema = z.object({
  email: z.string().email('Correo inválido').max(254),
  password: z.string().min(1, 'La contraseña es obligatoria').max(200),
})

// ── Anti fuerza bruta: máximo 5 intentos fallidos por IP+correo cada 15 min ──
const MAX_INTENTOS = 5
const VENTANA_MS = 15 * 60 * 1000
const intentosFallidos = new Map<string, { n: number; desde: number }>()

function claveIntento(request: Request, email: string) {
  const ip = (request.headers.get('x-forwarded-for') ?? 'local').split(',')[0].trim()
  return `${ip}|${email.toLowerCase()}`
}

function estaBloqueado(clave: string) {
  const r = intentosFallidos.get(clave)
  if (!r) return false
  if (Date.now() - r.desde > VENTANA_MS) {
    intentosFallidos.delete(clave)
    return false
  }
  return r.n >= MAX_INTENTOS
}

function registrarFallo(clave: string) {
  const r = intentosFallidos.get(clave)
  if (!r || Date.now() - r.desde > VENTANA_MS) {
    intentosFallidos.set(clave, { n: 1, desde: Date.now() })
  } else {
    r.n += 1
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = LoginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }
    const { email, password } = parsed.data

    const clave = claveIntento(request, email)
    if (estaBloqueado(clave)) {
      return NextResponse.json(
        { error: 'Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.' },
        { status: 429 }
      )
    }

    const supabase = await createClient()

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError || !authData.user) {
      registrarFallo(clave)
      return NextResponse.json({ error: 'Correo o contraseña incorrectos' }, { status: 401 })
    }
    intentosFallidos.delete(clave)

    // ── Verificar que la cuenta esté activa ──────────────────────
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('rol, activo')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !profile) {
      await supabase.auth.signOut()
      return NextResponse.json({ error: 'No se encontró un perfil asociado a esta cuenta' }, { status: 404 })
    }

    if (!profile.activo) {
      // Cuenta desactivada: no dejamos la sesión abierta
      await supabase.auth.signOut()
      return NextResponse.json({
        error: 'Tu cuenta ha sido desactivada. Por favor acude a tu clínica correspondiente para más información.',
      }, { status: 403 })
    }

    return NextResponse.json({ ok: true, rol: profile.rol })

  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}