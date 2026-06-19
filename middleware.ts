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

  // En desarrollo local sin internet, getUser() falla porque requiere
  // conectividad con Supabase. getSession() lee la cookie local y funciona
  // offline — menos seguro (no verifica revocación del token) pero suficiente
  // para desarrollo. En producción (Vercel) se usa getUser() siempre.
  let user = null
  if (process.env.NEXT_PUBLIC_OFFLINE_DEV === 'true') {
    const { data: { session } } = await supabase.auth.getSession()
    user = session?.user ?? null
  } else {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    user = authUser
  }

  const pathname = request.nextUrl.pathname

  // Rutas públicas — no redirigir
  if (pathname.startsWith('/api') || pathname === '/unauthorized') {
    return supabaseResponse
  }

  // Sin sesión → login
  if (!user && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}