'use client'

import { useState, useTransition } from 'react'
import { proposeAccommodation, voteAccommodation } from '@/lib/actions/accommodation'
import type { Database } from '@/lib/database.types'
import { randomId } from '@/lib/uuid'

type Option = Database['public']['Tables']['accommodation_options']['Row']

export function AccommodationSection({
  slug,
  eventId,
  participantId,
  initialOptions,
  totalParticipants,
}: {
  slug: string
  eventId: string
  participantId: string
  initialOptions: Option[]
  totalParticipants: number
}) {
  const [options, setOptions] = useState(initialOptions)
  const [showForm, setShowForm] = useState(false)
  const [, startTransition] = useTransition()

  function hasVoted(o: Option) {
    return (o.votes as Record<string, boolean>)[participantId] === true
  }

  function voteCount(o: Option) {
    return Object.values(o.votes as Record<string, boolean>).filter(Boolean).length
  }

  function handleVote(option: Option) {
    const voted = hasVoted(option)
    setOptions((prev) =>
      prev.map((o) =>
        o.id === option.id
          ? { ...o, votes: { ...(o.votes as Record<string, boolean>), [participantId]: !voted } }
          : o
      )
    )
    startTransition(async () => {
      try { await voteAccommodation(slug, option.id, participantId) } catch { /* optimiste */ }
    })
  }

  const sorted = [...options].sort((a, b) => voteCount(b) - voteCount(a))

  return (
    <div className="mt-10 pt-8 border-t border-line">
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted mb-4">
        🏠 Logement
      </h3>

      <div className="flex flex-col gap-3 mb-4">
        {sorted.length === 0 && (
          <p className="text-sm text-muted text-center py-4">Aucune option proposée.</p>
        )}
        {sorted.map((o) => {
          const voted = hasVoted(o)
          const count = voteCount(o)
          const pct = totalParticipants > 0 ? (count / totalParticipants) * 100 : 0
          return (
            <div key={o.id} className="bg-card border-[1.5px] border-line-2 rounded-[18px] overflow-hidden shadow-[0_2px_8px_rgba(60,45,20,0.04)]">
              <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{o.label}</p>
                  <div className="flex gap-3 text-xs text-muted mt-0.5">
                    {o.price_per_night && <span>{o.price_per_night}€/nuit</span>}
                    {o.url && (
                      <a href={o.url} target="_blank" rel="noopener noreferrer" className="text-sky underline truncate">
                        Voir →
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted">{count}/{totalParticipants}</span>
                  <button
                    onClick={() => handleVote(o)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full border-[1.5px] transition-colors ${
                      voted ? 'bg-ink text-paper border-ink' : 'bg-card border-line-3 hover:border-terracotta hover:text-terracotta'
                    }`}
                  >
                    {voted ? '✓ Top' : 'Top'}
                  </button>
                </div>
              </div>
              <div className="h-1 bg-line mx-4 mb-3 rounded-full overflow-hidden">
                <div className="h-full bg-olive rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      {showForm ? (
        <form
          action={(fd) => {
            const label = fd.get('label')?.toString().trim() ?? ''
            if (!label) return
            const url = fd.get('url')?.toString().trim() || null
            const priceRaw = fd.get('price_per_night')?.toString()
            const price_per_night = priceRaw ? parseFloat(priceRaw) : null
            const optimistic: Option = {
              id: randomId(), event_id: eventId, label, url,
              price_per_night, proposed_by: participantId, votes: {}, created_at: new Date().toISOString(),
            }
            setOptions((prev) => [...prev, optimistic])
            setShowForm(false)
            startTransition(() => proposeAccommodation(slug, eventId, participantId, fd))
          }}
          className="flex flex-col gap-3 bg-card border-[1.5px] border-line-2 rounded-[18px] p-4 shadow-[0_2px_8px_rgba(60,45,20,0.04)]"
        >
          <input name="label" type="text" required maxLength={80} placeholder="Airbnb Les Calanques, Camping…"
            className="w-full border-[1.5px] border-line rounded-[13px] px-3 py-2.5 text-sm bg-card focus:outline-none focus:border-terracotta" />
          <div className="flex gap-2">
            <input name="url" type="url" placeholder="https://airbnb.com/…"
              className="flex-1 border-[1.5px] border-line rounded-[13px] px-3 py-2.5 text-sm bg-card focus:outline-none focus:border-terracotta" />
            <input name="price_per_night" type="number" min="0" step="1" placeholder="€/nuit" aria-label="Prix par nuit"
              className="w-24 border-[1.5px] border-line rounded-[13px] px-3 py-2.5 text-sm bg-card focus:outline-none focus:border-terracotta" />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 py-2.5 border-[1.5px] border-line-3 bg-card rounded-[15px] text-sm font-bold">Annuler</button>
            <button type="submit"
              className="flex-1 py-2.5 bg-terracotta text-white rounded-[15px] text-sm font-bold shadow-[0_4px_0_var(--color-terracotta-dk)] active:translate-y-1 active:shadow-none transition-all">Proposer →</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setShowForm(true)}
          className="w-full py-3 border-[1.5px] border-dashed border-[var(--color-dashed)] rounded-[18px] text-sm font-semibold text-muted hover:border-olive hover:text-olive transition-colors">
          + Proposer un logement
        </button>
      )}
    </div>
  )
}
