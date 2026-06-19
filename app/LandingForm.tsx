'use client'

import { useState } from 'react'
import { createEvent } from '@/lib/actions/events'
import { DestinationField } from './DestinationField'

const VIBES = [
  { value: 'weekend', label: '🏔️ Week-end' },
  { value: 'soiree', label: '🎉 Soirée' },
  { value: 'concert', label: '🎸 Concert' },
  { value: 'road_trip', label: '🚗 Road trip' },
] as const

export function LandingForm() {
  const [vibe, setVibe] = useState<string | null>(null)

  return (
    <form
      action={createEvent}
      className="animate-screen-in flex min-h-dvh flex-col px-6 pb-10 pt-8"
    >
      {/* Logo */}
      <div className="mb-12 flex items-center gap-[7px]">
        <span className="font-serif text-[26px] leading-none text-ink">Komo</span>
        <span className="mt-1.5 h-[7px] w-[7px] rounded-full bg-terracotta" />
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
      <span className="mb-[9px] text-[12px] font-bold uppercase tracking-[0.8px] text-muted-2">
        Quand
      </span>
      <div className="mb-[18px] flex gap-[10px]">
        <DateField name="date_start" />
        <DateField name="date_end" />
      </div>

      {/* Vibe */}
      <span className="mb-[11px] text-[12px] font-bold uppercase tracking-[0.8px] text-muted-2">
        Une vibe&nbsp;? <span className="font-medium text-[#c2b8a6]">· facultatif</span>
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
              className={`rounded-[22px] border-[1.5px] px-[15px] py-[10px] text-[13.5px] transition-all ${
                active
                  ? 'border-ink bg-ink font-bold text-white'
                  : 'border-line bg-card text-body'
              }`}
            >
              {v.label}
            </button>
          )
        })}
      </div>

      {/* CTA */}
      <button
        type="submit"
        className="mt-auto rounded-[17px] bg-terracotta p-[18px] text-center text-[16px] font-bold text-white shadow-[0_4px_0_var(--color-terracotta-dk)] transition-all active:translate-y-1 active:shadow-none"
      >
        Créer le plan →
      </button>
      <p className="mt-[14px] text-center text-[12.5px] text-muted-2">
        Zéro compte · un lien suffit
      </p>
    </form>
  )
}

function DateField({ name }: { name: string }) {
  return (
    <label className="flex flex-1 items-center gap-2 rounded-[15px] border-[1.5px] border-line bg-card px-[15px] py-[14px] text-[15px] text-ink focus-within:border-terracotta">
      <span className="text-[15px]">📅</span>
      <input
        name={name}
        type="date"
        required
        className="w-full bg-transparent text-[15px] text-ink outline-none"
      />
    </label>
  )
}
