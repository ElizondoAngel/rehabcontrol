/**
 * app/layout.tsx
 * ─────────────────────────────────────────────────────────────
 * Layout raíz de RehabControl.
 *
 * Usa next/font para cargar Inter localmente — sin depender de
 * Google CDN en runtime. La fuente se descarga una sola vez al
 * hacer npm run dev o npm run build, y se sirve desde tu propio
 * servidor. Funciona igual con o sin internet.
 */

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'RehabControl',
  description: 'Sistema de gestión clínica para rehabilitación física',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body style={{ fontFamily: 'var(--font-inter), Inter, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}