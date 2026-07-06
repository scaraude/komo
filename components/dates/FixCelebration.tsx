'use client'

import Link from 'next/link'
import { formatPeriod } from '@/lib/format'
import type { Period } from '@/lib/types'

/**
 * Écran signature joué quand le créateur fixe les dates du séjour : le soleil
 * KOMO se lève sur les vagues — « Crew. Plan. Go. » Le moment le plus heureux
 * du sondage mérite mieux qu'un simple rafraîchissement de page.
 */
export function FixCelebration({ period, slug }: { period: Period; slug: string }) {
  return (
    <div
      role="dialog"
      aria-label={`Dates fixées : ${formatPeriod(period)}`}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#d1b2e2_0%,#ff9f8c_45%,#fe7a5d_65%,#df402a_100%)]"
    >
      {/* Soleil */}
      <div aria-hidden className="animate-sun-rise absolute bottom-[32%] left-1/2 -translate-x-1/2">
        <div className="h-28 w-28 rounded-full bg-paper shadow-[0_0_80px_28px_rgba(251,244,233,0.55)]" />
      </div>

      {/* Vagues */}
      <div aria-hidden className="absolute inset-x-[-20%] bottom-0 h-[30%]">
        <div className="animate-float-y absolute inset-x-0 bottom-[38px] h-28 rounded-t-[50%] bg-[#c93a25]" />
        <div className="absolute inset-x-0 bottom-[-20px] h-28 rounded-t-[50%] bg-[#a8301c]" />
      </div>

      <div className="relative z-10 mb-28 text-center text-on-dark">
        <p className="animate-rise-up text-[13px] font-bold uppercase tracking-[0.3em] opacity-85">
          Crew. Plan.
        </p>
        <p
          className="animate-rise-up font-serif text-[84px] font-bold leading-none"
          style={{ animationDelay: '.15s' }}
        >
          Go.
        </p>
        <p
          className="animate-rise-up mt-4 inline-block rounded-full border-[1.5px] border-on-dark/50 bg-on-dark/15 px-5 py-2 text-[14.5px] font-bold"
          style={{ animationDelay: '.3s' }}
        >
          {formatPeriod(period)} ☀️
        </p>
      </div>

      <Link
        href={`/e/${slug}`}
        className="absolute bottom-12 z-10 rounded-full bg-paper px-7 py-3.5 text-[15px] font-bold text-terracotta shadow-[0_4px_0_rgba(0,0,0,0.15)] transition-all active:translate-y-1 active:shadow-none"
      >
        C&apos;est parti →
      </Link>
    </div>
  )
}
