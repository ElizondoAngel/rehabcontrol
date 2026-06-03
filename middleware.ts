import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rutas que cada rol puede acceder
const ROLE_ROUTES: Record<string, string[]> = {
  admin: ['/admin'],
  terapeuta: ['/terapeuta'],
  secretaria: ['/secretaria'],
  paciente: ['/paciente'],
}

// Rutas comunes para todos los roles autenticados
const COMMON_ROUTES = ['/perfil', '/chatbot']

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

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Si no hay sesión y la ruta no es login → redirigir al login
  if (!user && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Si hay sesión y está en login → redirigir al dashboard del rol
  if (user && pathname === '/login') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    const rol = profile?.rol ?? 'paciente'
    return NextResponse.redirect(new URL(`/${rol}/dashboard`, request.url))
  }

  // Verificar acceso por rol a rutas protegidas
  if (user) {
    const isCommon = COMMON_ROUTES.some(r => pathname.startsWith(r))
    if (!isCommon) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('rol')
        .eq('id', user.id)
        .single()

      const rol = profile?.rol ?? ''
      const allowedPrefixes = ROLE_ROUTES[rol] ?? []
      const allowed = allowedPrefixes.some(prefix => pathname.startsWith(prefix))

      if (!allowed) {
        return NextResponse.redirect(new URL('/unauthorized', request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
