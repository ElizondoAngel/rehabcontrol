import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email, password } = await request.json()

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    return NextResponse.json(
      { error: 'Credenciales incorrectas. Verifica tu correo y contraseña.' },
      { status: 401 }
    )
  }

  // Usar auth_rol() que corre con SECURITY DEFINER — ignora RLS
  const { data: rolData } = await supabase
    .rpc('auth_rol')

  const rol = rolData ?? 'paciente'

  return NextResponse.json({ rol })
}