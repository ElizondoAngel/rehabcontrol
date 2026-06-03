import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RehabControl',
  description: 'Sistema web seguro de gestión clínica para rehabilitación física',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  )
}
