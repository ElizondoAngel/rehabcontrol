'use client'

/**
 * components/TopbarActions.tsx
 * Wrapper client component que incluye solo NotifBell.
 * El Chatbot se maneja por separado en cada dashboard.
 *
 * USO en server components:
 *   import TopbarActions from '@/app/components/TopbarActions'
 *   <TopbarActions userId={user.id} rol={profile.rol} nombre={profile.nombre_completo} />
 */

import NotifBell from './NotifBell'

interface Props {
  userId: string
  rol: string
  nombre?: string
}

export default function TopbarActions({ userId, rol, nombre }: Props) {
  return (
    <NotifBell
      userId={userId}
      rol={rol}
      esAdmin={rol === 'admin'}
    />
  )
}
