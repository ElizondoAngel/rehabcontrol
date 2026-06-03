import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function PacienteDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nombre_completo, rol')
    .eq('id', user.id)
    .single()

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold text-green-800 mb-2">
        Dashboard — Paciente
      </h1>
      <p className="text-gray-600">
        Bienvenido, {profile?.nombre_completo ?? user.email}
      </p>
      <p className="text-sm text-gray-400 mt-1">Rol: {profile?.rol}</p>
    </main>
  )
}
