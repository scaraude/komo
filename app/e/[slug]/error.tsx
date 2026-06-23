'use client'

import { Button } from '@/components/ui/Button'

export default function EventError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 text-[44px]">🧩</div>
      <h1 className="mb-2 font-serif text-[26px] text-ink">Ce Komo n&apos;a pas pu charger</h1>
      <p className="mb-6 text-[14px] leading-[1.5] text-muted">
        Le chargement de l&apos;event a échoué. Réessaie dans un instant.
      </p>
      <Button onClick={reset} className="rounded-[15px] px-6 py-[14px] text-[15px]">
        Réessayer
      </Button>
    </main>
  )
}
