/**
 * lib/supabase/client.ts
 * ─────────────────────────────────────────────────────────────
 * Cliente de Supabase para uso en componentes 'use client'
 * (navegador). Si ya tienes este archivo en tu proyecto, IGNORA
 * este — no lo sobreescribas si el tuyo ya funciona.
 */

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
