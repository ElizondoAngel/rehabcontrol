```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // ─────────────────────────────────────────────
  // RUTAS PÚBLICAS
  // ─────────────────────────────────────────────
  const publicRoutes = [
    '/login',
    '/unauthorized',
  ]

  const isPublicRoute =
    publicRoutes.includes(pathname) ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next')

  if (isPublicRoute) {
    return NextResponse.next()
  }

  // ─────────────────────────────────────────────
  // SUPABASE
  // ─────────────────────────────────────────────
  let response = NextResponse.next({
    request,
  })

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

          response = NextResponse.next({
            request,
          })

          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // ─────────────────────────────────────────────
  // AUTH
  // ─────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // No autenticado
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```
