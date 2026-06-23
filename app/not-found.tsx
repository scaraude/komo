import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 text-[44px]">🗺️</div>
      <h1 className="mb-2 font-serif text-[26px] text-ink">Komo introuvable</h1>
      <p className="mb-6 text-[14px] leading-[1.5] text-muted">
        Ce lien n&apos;existe pas ou plus. Vérifie l&apos;adresse, ou lance ton propre plan.
      </p>
      <Link
        href="/"
        className="rounded-[15px] bg-terracotta px-6 py-[14px] text-[15px] font-bold text-white shadow-[0_4px_0_var(--color-terracotta-dk)] transition-all active:translate-y-1 active:shadow-none"
      >
        Créer un Komo →
      </Link>
    </main>
  )
}
