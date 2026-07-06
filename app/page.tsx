import { redirect } from 'next/navigation'
import { LandingExperience } from './LandingExperience'
import { getAuthUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const user = await getAuthUser()

  // Déjà une session avec au moins un Komo → on saute la landing et on file
  // droit sur « Mes Komos ».
  if (user) {
    const supabase = await createClient()
    const { count } = await supabase
      .from('participants')
      .select('event_id', { count: 'exact', head: true })
      .eq('user_id', user.id)
    if (count && count > 0) redirect('/mes-komos')
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[440px]">
      <LandingExperience showEmail={!user?.email} />
    </main>
  )
}
