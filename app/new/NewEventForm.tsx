'use client'

import { useState } from 'react'
import { createEvent } from '@/lib/actions/events'

const EVENT_TYPES = [
  { value: 'weekend', emoji: '🏕️', label: 'Week-end' },
  { value: 'soiree', emoji: '🎉', label: 'Soirée' },
  { value: 'concert', emoji: '🎵', label: 'Concert' },
  { value: 'road_trip', emoji: '🚗', label: 'Road trip' },
  { value: 'sport', emoji: '⚽', label: 'Sport' },
  { value: 'autre', emoji: '✨', label: 'Autre' },
] as const

type EventType = typeof EVENT_TYPES[number]['value']

const DESTINATION_PLACEHOLDERS: Record<EventType, string> = {
  weekend: 'Chamonix, Île de Ré, Hossegor…',
  soiree: 'Chez Alice, Bar du Coin…',
  concert: 'Paris, Lyon, Barcelone…',
  road_trip: 'Côte Atlantique, Écosse…',
  sport: 'Stade de France, Terrain…',
  autre: 'Destination…',
}

export function NewEventForm() {
  const [step, setStep] = useState<'type' | 'details'>('type')
  const [selectedType, setSelectedType] = useState<EventType | null>(null)
  const [sondageMode, setSondageMode] = useState(false)

  if (step === 'type') {
    return (
      <div className="w-full max-w-md">
        <p className="text-xs font-bold tracking-widest uppercase text-terracotta mb-3 flex items-center gap-2">
          <span className="w-6 h-0.5 bg-terracotta inline-block" />
          Komo · nouvel event
        </p>
        <h1 className="font-serif font-black text-4xl leading-none tracking-tight mb-8">
          C'est quel type d'event ?
        </h1>
        <div className="grid grid-cols-2 gap-3">
          {EVENT_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => { setSelectedType(t.value); setStep('details') }}
              className="flex flex-col items-center gap-2 p-5 bg-card border-2 border-ink rounded-2xl shadow-[4px_4px_0_rgba(26,20,16,0.9)] hover:border-terracotta hover:shadow-[4px_4px_0_rgba(210,85,42,0.5)] transition-all active:translate-y-0.5 active:shadow-none"
            >
              <span className="text-3xl">{t.emoji}</span>
              <span className="font-bold text-sm">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const type = selectedType!

  return (
    <div className="w-full max-w-md">
      <button
        onClick={() => setStep('type')}
        className="text-xs font-bold tracking-widest uppercase text-muted mb-3 flex items-center gap-2 hover:text-ink transition-colors"
      >
        ← Changer le type
      </button>
      <h1 className="font-serif font-black text-4xl leading-none tracking-tight mb-8">
        {EVENT_TYPES.find((t) => t.value === type)?.emoji}{' '}
        {EVENT_TYPES.find((t) => t.value === type)?.label} — c'est où ?
      </h1>

      <div className="bg-card border-2 border-ink rounded-2xl p-6 shadow-[5px_5px_0_rgba(26,20,16,0.9)]">
        <form action={createEvent} className="flex flex-col gap-5">
          <input type="hidden" name="event_type" value={type} />

          <div>
            <label className="block text-sm font-semibold mb-1.5" htmlFor="title">
              Nom de l'event
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              maxLength={80}
              placeholder="ex: Week-end à la montagne, Coloc d'été…"
              autoFocus
              className="w-full border-2 border-ink rounded-xl px-4 py-3 text-base bg-paper focus:outline-none focus:border-terracotta transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5" htmlFor="destination">
              Destination
            </label>
            <input
              id="destination"
              name="destination"
              type="text"
              required
              maxLength={80}
              placeholder={DESTINATION_PLACEHOLDERS[type]}
              className="w-full border-2 border-ink rounded-xl px-4 py-3 text-base bg-paper focus:outline-none focus:border-terracotta transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold">Dates</label>
              <button
                type="button"
                onClick={() => setSondageMode((v) => !v)}
                className="text-xs font-semibold text-terracotta hover:underline"
              >
                {sondageMode ? '← Dates fixes' : 'Pas sûr des dates ?'}
              </button>
            </div>
            {sondageMode ? (
              <div className="border-2 border-dashed border-terracotta rounded-xl px-4 py-3 text-sm text-terracotta font-medium bg-terracotta/5">
                📅 Les participants voteront pour les meilleures dates
                <input type="hidden" name="sondage" value="1" />
              </div>
            ) : (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-muted mb-1.5" htmlFor="date_start">Début</label>
                  <input
                    id="date_start"
                    name="date_start"
                    type="date"
                    required
                    className="w-full border-2 border-ink rounded-xl px-4 py-3 text-base bg-paper focus:outline-none focus:border-terracotta transition-colors"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-muted mb-1.5" htmlFor="date_end">Fin</label>
                  <input
                    id="date_end"
                    name="date_end"
                    type="date"
                    required
                    className="w-full border-2 border-ink rounded-xl px-4 py-3 text-base bg-paper focus:outline-none focus:border-terracotta transition-colors"
                  />
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-terracotta text-white border-2 border-ink rounded-full px-6 py-3.5 font-bold text-base shadow-[0_4px_0_rgba(26,20,16,0.9)] active:translate-y-1 active:shadow-none transition-all mt-1"
          >
            Créer l'event →
          </button>
        </form>
      </div>
    </div>
  )
}
