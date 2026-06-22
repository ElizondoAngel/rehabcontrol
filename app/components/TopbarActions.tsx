'use client'

/**
 * components/TopbarActions.tsx
 * Wrapper client component que agrupa NotifBell y Chatbot.
 * Se usa en todos los dashboards (server components) para poder
 * incluir componentes client sin convertir todo el dashboard.
 *
 * USO en cualquier server component:
 *   import TopbarActions from '@/components/TopbarActions'
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
    <>
      {/* Campana de notificaciones — va dentro del topbar */}
      <NotifBell
        userId={userId}
        rol={rol}
        esAdmin={rol === 'admin'}
      />
    </>
  )
}
