import { redirect } from 'next/navigation'
import { LandingExperience } from './LandingExperience'
import { getAuthUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>
}) {
  const user = await getAuthUser()
  const { new: forceNew } = await searchParams

  // Déjà une session avec au moins un Komo → on saute la landing et on file
  // droit sur « Mes Komos ». `?new=1` court-circuite la redirection pour
  // laisser créer un nouveau Komo depuis la landing.
  if (user && !forceNew) {
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
