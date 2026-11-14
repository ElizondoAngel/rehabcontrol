import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname

  // ── APIs públicas (el resto de /api exige sesión válida) ──
  const API_PUBLICAS = ['/api/auth/login', '/api/contacto', '/api/opiniones/publicas']
  const esApi = pathname.startsWith('/api')
  const esApiPublica = API_PUBLICAS.some(r => pathname === r || pathname.startsWith(r + '/'))

  // ── Rutas siempre públicas — salir ANTES de verificar sesión ──
  // Esto evita que visitantes nuevos queden atrapados en el login.
  // /auth/establecer-contrasena se carga SIN sesión todavía — la sesión
  // solo se crea cuando el usuario invitado da click en "Aceptar invitación"
  // (verifyOtp), así que esta ruta debe ser pública para que llegue ahí.
  if (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/unauthorized' ||
    pathname === '/auth/establecer-contrasena' ||
    esApiPublica ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return supabaseResponse
  }

  // ── Verificar sesión para rutas protegidas ───────────────
  // SEGURIDAD: getSession() no valida el JWT contra el servidor, por eso solo se
  // permite en desarrollo local. En producción SIEMPRE se usa getUser().
  let user = null
  if (process.env.NEXT_PUBLIC_OFFLINE_DEV === 'true' && process.env.NODE_ENV !== 'production') {
    const { data: { session } } = await supabase.auth.getSession()
    user = session?.user ?? null
  } else {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    user = authUser
  }

  // Sin sesión → API responde 401, páginas redirigen al login
  if (!user) {
    if (esApi) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ── Control de acceso por ROL en rutas de páginas (capa 1 de 3) ──
  const RUTAS_POR_ROL: Array<{ prefijo: string; roles: string[] }> = [
    { prefijo: '/admin', roles: ['admin'] },
    { prefijo: '/secretaria', roles: ['secretaria', 'admin'] },
    { prefijo: '/terapeuta', roles: ['terapeuta', 'admin'] },
    { prefijo: '/paciente', roles: ['paciente', 'admin'] },
  ]
  const regla = RUTAS_POR_ROL.find(
    r => pathname === r.prefijo || pathname.startsWith(r.prefijo + '/')
  )

  if (regla && !esApi) {
    const { data: perfil } = await supabase
      .from('profiles')
      .select('rol, activo')
      .eq('id', user.id)
      .single()

    // Cuenta inexistente o desactivada → fuera
    if (!perfil || perfil.activo === false) {
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Rol sin permiso para esta sección
    if (!regla.roles.includes(perfil.rol)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
