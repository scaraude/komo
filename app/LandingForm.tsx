'use client'

import { useState } from 'react'
import { createEvent } from '@/lib/actions/events'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'
import { MesKomosLink } from './MesKomosLink'
import { DestinationField } from './DestinationField'
import { EventTypeIcon, CalendarIcon } from '@/components/ui/icons'

const VIBES = [
  { value: 'weekend', label: 'Week-end' },
  { value: 'soiree', label: 'Soirée' },
  { value: 'concert', label: 'Concert' },
  { value: 'road_trip', label: 'Road trip' },
  { value: 'sport', label: 'Sport' },
] as const

export function LandingForm({
  showEmail,
  onBack,
}: {
  showEmail: boolean
  onBack?: () => void
}) {
  const [vibe, setVibe] = useState<string | null>(null)
  const [pollMode, setPollMode] = useState(false)

  return (
    <form
      action={createEvent}
      className="animate-screen-in flex min-h-dvh flex-col px-6 pb-10 pt-8"
    >
      {/* Logo + accès à mes events */}
      <div className="mb-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Retour à l'accueil"
              className="-ml-1 flex h-8 w-8 items-center justify-center rounded-full text-[18px] text-muted-2 transition-colors hover:text-ink"
            >
              ←
            </button>
          )}
          <Logo />
        </div>
        <MesKomosLink />
      </div>

      {/* Titre */}
      <h1 className="mb-3 font-serif text-[38px] leading-[1.08] text-ink">
        C&apos;est quoi
        <br />
        le plan&nbsp;?
      </h1>
      <p className="mb-9 text-[15.5px] leading-[1.5] text-faint">
        Un nom, des dates, et tu balances le lien. Tout le monde se déclare en
        30&nbsp;secondes.
      </p>

      {/* Nom */}
      <label
        htmlFor="title"
        className="mb-[9px] text-[12px] font-bold uppercase tracking-[0.8px] text-muted-2"
      >
        Nom du Komo
      </label>
      <input
        id="title"
        name="title"
        type="text"
        required
        maxLength={80}
        autoFocus
        placeholder="ex : Week-end à Chamonix"
        className="mb-[18px] w-full rounded-[15px] border-[1.5px] border-line bg-card p-4 text-[15px] text-ink outline-none placeholder:text-disabled focus:border-terracotta"
      />

      {/* Destination */}
      <label
        htmlFor="destination"
        className="mb-[9px] text-[12px] font-bold uppercase tracking-[0.8px] text-muted-2"
      >
        Où ça&nbsp;?
      </label>
      <DestinationField />

      {/* Dates */}
      <div className="mb-[9px] flex items-center justify-between">
        <span className="text-[12px] font-bold uppercase tracking-[0.8px] text-muted-2">
          Quand
        </span>
        <button
          type="button"
          onClick={() => setPollMode((v) => !v)}
          className="text-[12.5px] font-semibold text-terracotta"
        >
          {pollMode ? '← Dates fixes' : 'Pas encore de date ?'}
        </button>
      </div>
      {pollMode ? (
        <div className="mb-[18px] flex items-start gap-[8px] rounded-[15px] border-[1.5px] border-dashed border-terracotta bg-terracotta-soft px-4 py-[14px] text-[13.5px] font-medium leading-[1.45] text-terracotta-dk">
          <CalendarIcon className="mt-[2px] h-[14px] w-[14px] shrink-0" />
          <span>On vote pour les dates — chacun coche ce qui l&apos;arrange, tu fixeras la meilleure.</span>
          <input type="hidden" name="poll" value="1" />
        </div>
      ) : (
        <div className="mb-[18px] flex gap-[10px]">
          <DateField name="date_start" />
          <DateField name="date_end" />
        </div>
      )}

      {/* Vibe */}
      <span className="mb-[11px] text-[12px] font-bold uppercase tracking-[0.8px] text-muted-2">
        Une vibe&nbsp;? <span className="font-medium text-disabled">· facultatif</span>
      </span>
      <input type="hidden" name="event_type" value={vibe ?? 'autre'} />
      <div className="flex flex-wrap gap-2">
        {VIBES.map((v) => {
          const active = vibe === v.value
          return (
            <button
              type="button"
              key={v.value}
              onClick={() => setVibe(active ? null : v.value)}
              className={`inline-flex items-center gap-[6px] rounded-[22px] border-[1.5px] px-[15px] py-[10px] text-[13.5px] transition-all ${
                active
                  ? 'border-ink bg-ink font-bold text-white'
                  : 'border-line bg-card text-body'
              }`}
            >
              <EventTypeIcon type={v.value} className="h-[14px] w-[14px] shrink-0" />
              {v.label}
            </button>
          )
        })}
      </div>

      {/* Email — facultatif, masqué si l'identité a déjà un email lié */}
      {showEmail && (
        <>
          <label
            htmlFor="email"
            className="mb-[9px] mt-[22px] text-[12px] font-bold uppercase tracking-[0.8px] text-muted-2"
          >
            Ton email <span className="font-medium text-disabled">· pour retrouver tes Komos · facultatif</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            maxLength={120}
            placeholder="ex : marie@email.com"
            className="w-full rounded-[15px] border-[1.5px] border-line bg-card p-4 text-[15px] text-ink outline-none placeholder:text-disabled focus:border-terracotta"
          />
        </>
      )}

      {/* CTA */}
      <Button type="submit" className="mt-[22px] rounded-[17px] p-[18px] text-[16px]">
        Créer le plan →
      </Button>
      <p className="mt-[14px] text-center text-[12.5px] text-muted-2">
        Pas de mot de passe · <a href="/connexion" className="font-semibold text-terracotta">déjà un Komo ?</a>
      </p>
    </form>
  )
}

function DateField({ name }: { name: string }) {
  return (
    <label className="flex flex-1 items-center gap-2 rounded-[15px] border-[1.5px] border-line bg-card px-[15px] py-[14px] text-[15px] text-ink focus-within:border-terracotta">
      <CalendarIcon className="h-[15px] w-[15px] shrink-0 text-muted" />
      <input
        name={name}
        type="date"
        required
        className="w-full bg-transparent text-[15px] text-ink outline-none"
      />
    </label>
  )
}
