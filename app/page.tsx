import { LandingForm } from './LandingForm'
import { getAuthUser } from '@/lib/auth'

export default async function Home() {
  const user = await getAuthUser()
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[440px]">
      <LandingForm showEmail={!user?.email} />
    </main>
  )
}
