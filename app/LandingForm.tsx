'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createEvent } from '@/lib/actions/events'
import { Button } from '@/components/ui/Button'
import { DestinationField } from './DestinationField'

const VIBES = [
  { value: 'weekend', label: '🏔️ Week-end' },
  { value: 'soiree', label: '🎉 Soirée' },
  { value: 'concert', label: '🎸 Concert' },
  { value: 'road_trip', label: '🚗 Road trip' },
  { value: 'sport', label: '⚽ Sport' },
] as const

export function LandingForm({ showEmail }: { showEmail: boolean }) {
  const [vibe, setVibe] = useState<string | null>(null)
  const [pollMode, setPollMode] = useState(false)

  return (
    <form
      action={createEvent}
      className="animate-screen-in flex min-h-dvh flex-col px-6 pb-10 pt-8"
    >
      {/* Logo + accès à mes events */}
      <div className="mb-12 flex items-center justify-between">
        <div className="flex items-center gap-[7px]">
          <span className="font-serif text-[26px] leading-none text-ink">Komo</span>
          <span className="mt-1.5 h-[7px] w-[7px] rounded-full bg-terracotta" />
        </div>
        <Link
          href="/mes-komos"
          className="rounded-full border-[1.5px] border-line-3 bg-card px-[14px] py-[8px] text-[13px] font-semibold text-body"
        >
          Mes Komos
        </Link>
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
        <div className="mb-[18px] rounded-[15px] border-[1.5px] border-dashed border-terracotta bg-terracotta-soft px-4 py-[14px] text-[13.5px] font-medium leading-[1.45] text-terracotta-dk">
          📅 On vote pour les dates — chacun coche ce qui l&apos;arrange, tu fixeras la meilleure.
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

      {/* Email — facultatif, masqué si l'identité a déjà un email lié */}
      {showEmail && (
        <>
          <label
            htmlFor="email"
            className="mb-[9px] mt-[22px] text-[12px] font-bold uppercase tracking-[0.8px] text-muted-2"
          >
            Ton email <span className="font-medium text-[#c2b8a6]">· pour retrouver tes Komos · facultatif</span>
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
