'use client'

import { useState, useTransition } from 'react'
import { createLeg } from '@/lib/actions/transport'

const MODES = [
  { value: 'car', label: '🚗 Voiture perso' },
  { value: 'rental', label: '🚙 Location' },
  { value: 'train', label: '🚆 Train' },
  { value: 'bus', label: '🚌 Bus' },
  { value: 'navette', label: '🚐 Navette' },
] as const

const TRUNKS = [
  { value: 'small', label: 'Petit coffre' },
  { value: 'medium', label: 'Coffre moyen' },
  { value: 'large', label: 'Grand coffre' },
] as const

export function ProposeVehicleForm({
  slug,
  eventId,
  participantId,
  direction,
  onClose,
}: {
  slug: string
  eventId: string
  participantId: string
  direction: 'aller' | 'retour'
  onClose: () => void
}) {
  const [seats, setSeats] = useState(4)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createLeg(slug, eventId, participantId, direction, formData)
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-paper border-2 border-ink rounded-2xl shadow-[6px_6px_0_rgba(26,20,16,0.9)] p-6">
        <h3 className="font-serif font-bold text-xl mb-5">
          Je propose un trajet {direction === 'aller' ? '→' : '←'}
        </h3>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-muted">Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {MODES.map((m) => (
                <label key={m.value} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="mode" value={m.value} defaultChecked={m.value === 'car'} className="accent-terracotta" />
                  <span className="text-sm">{m.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-muted">Label</label>
            <input name="label" type="text" required maxLength={60} placeholder="ex: Golf de Marine, TGV 8h12…"
              className="w-full border-2 border-ink rounded-xl px-3 py-2.5 text-sm bg-card focus:outline-none focus:border-terracotta" />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-muted">Ville départ</label>
              <input name="departure_city" type="text" required maxLength={60} placeholder="Paris, Lyon…"
                className="w-full border-2 border-ink rounded-xl px-3 py-2.5 text-sm bg-card focus:outline-none focus:border-terracotta" />
            </div>
            <div className="w-32">
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-muted">Heure</label>
              <input name="departure_time" type="time"
                className="w-full border-2 border-ink rounded-xl px-3 py-2.5 text-sm bg-card focus:outline-none focus:border-terracotta" />
            </div>
          </div>

          <div className="flex gap-3 items-end">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-muted">Places</label>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setSeats(Math.max(1, seats - 1))}
                  className="w-8 h-8 rounded-full border-2 border-ink font-bold text-lg flex items-center justify-center">−</button>
                <input name="total_seats" type="hidden" value={seats} />
                <span className="w-6 text-center font-bold">{seats}</span>
                <button type="button" onClick={() => setSeats(Math.min(12, seats + 1))}
                  className="w-8 h-8 rounded-full border-2 border-ink font-bold text-lg flex items-center justify-center">+</button>
              </div>
            </div>

            <div className="flex-1">
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-muted">Coffre</label>
              <select name="trunk_size" className="w-full border-2 border-ink rounded-xl px-3 py-2.5 text-sm bg-card focus:outline-none">
                <option value="">—</option>
                {TRUNKS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-muted">Lien résa (optionnel)</label>
            <input name="link_url" type="url" placeholder="https://…"
              className="w-full border-2 border-ink rounded-xl px-3 py-2.5 text-sm bg-card focus:outline-none focus:border-terracotta" />
          </div>

          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 border-2 border-ink rounded-full font-bold text-sm">Annuler</button>
            <button type="submit" disabled={isPending}
              className="flex-1 py-3 bg-terracotta text-white border-2 border-ink rounded-full font-bold text-sm shadow-[0_3px_0_rgba(26,20,16,0.9)] disabled:opacity-60">
              {isPending ? '…' : 'Proposer →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
