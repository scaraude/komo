import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'
import { UserMenu } from '@/components/user/UserMenu'
import { getAuthUser } from '@/lib/auth'

/**
 * Barre de navigation partagée (logo + menu utilisateur). Montée sur les pages
 * connectées : /mes-komos et la page d'un Komo. `showNew` ajoute le raccourci
 * « + Nouveau » (utile sur /mes-komos).
 */
export async function AppHeader({ showNew = false }: { showNew?: boolean }) {
  const user = await getAuthUser()

  return (
    <header className="mb-7 flex items-center justify-between">
      <Link href="/" className="inline-flex w-fit">
        <Logo />
      </Link>
      <div className="flex items-center gap-2">
        {showNew && (
          <Link
            href="/"
            className="rounded-full border-[1.5px] border-line-3 bg-card px-[14px] py-[8px] text-[13px] font-bold text-ink"
          >
            ＋ Nouveau
          </Link>
        )}
        <UserMenu email={user?.email ?? null} />
      </div>
    </header>
  )
}
