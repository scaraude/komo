'use client'

import Link from 'next/link'
import { KomoMark } from '@/components/ui/Logo'
import { MesKomosLink } from './MesKomosLink'

/**
 * Écran d'accueil signature de KOMO.
 *
 * Le logo (soleil qui se couche sur des vagues) + la signature « Crew. Plan.
 * Go. » racontent le voyage entre amis : ton crew → vous planifiez → vous
 * partez. Le « Go. » est le bouton qui lance la création.
 */
export function LandingHero({ onGo }: { onGo: () => void }) {
  return (
    <div className="relative flex min-h-dvh flex-col px-6 pb-12 pt-7">
      {/* Accès direct à mes Komos */}
      <div className="flex justify-end">
        <MesKomosLink />
      </div>

      {/* Scène : soleil + vagues + wordmark */}
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="animate-sun-rise relative mb-7">
          {/* Halo chaud derrière le soleil */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-soft/40 blur-3xl"
          />
          <KomoMark className="animate-float-y relative h-[120px] w-auto" />
        </div>

        <h1 className="animate-rise-up font-serif text-[60px] font-semibold leading-none text-terracotta">
          Komo
        </h1>

        <p
          className="animate-rise-up mt-5 max-w-[300px] text-[16px] leading-[1.5] text-body"
          style={{ animationDelay: '.08s' }}
        >
          Organise tes voyages entre amis.
          <br />
          Sans le bazar des groupes de discussion.
        </p>

        {/* Signature — Crew. Plan. → Go. (CTA) */}
        <div className="mt-10 flex items-center justify-center gap-3">
          <span
            className="animate-rise-up text-[19px] font-bold uppercase tracking-[1px] text-ink/35"
            style={{ animationDelay: '.16s' }}
          >
            Crew.
          </span>
          <span
            className="animate-rise-up text-[19px] font-bold uppercase tracking-[1px] text-ink/35"
            style={{ animationDelay: '.24s' }}
          >
            Plan.
          </span>
          <button
            type="button"
            onClick={onGo}
            style={{ animationDelay: '.32s' }}
            className="animate-rise-up rounded-full bg-terracotta px-[22px] py-[12px] text-[19px] font-bold uppercase tracking-[1px] text-on-dark shadow-[0_4px_0_var(--color-terracotta-dk)] transition-all active:translate-y-1 active:shadow-none"
          >
            Go.&nbsp;→
          </button>
        </div>
      </div>

      <p className="text-center text-[12.5px] text-muted-2">
        Pas de mot de passe ·{' '}
        <Link href="/connexion" className="font-semibold text-terracotta">
          déjà un Komo&nbsp;?
        </Link>
      </p>
    </div>
  )
}
