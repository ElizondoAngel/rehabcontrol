import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Chatbot from '@/app/components/Chatbot'

export default async function PacienteLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
  if (profile?.rol !== 'paciente') redirect('/unauthorized')
  return <>{children}<Chatbot rol="paciente" /></>
}