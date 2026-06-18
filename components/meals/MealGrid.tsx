'use client'

import { useState, useTransition } from 'react'
import { addMealSlot, addContribution, removeContribution } from '@/lib/actions/meals'
import type { Database } from '@/lib/database.types'

type Slot = Database['public']['Tables']['meal_slots']['Row']
type Contribution = Database['public']['Tables']['meal_contributions']['Row']
type Participant = Database['public']['Tables']['participants']['Row']

function formatDay(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function ContribForm({ onSubmit, onCancel }: { onSubmit: (what: string, count: number) => void; onCancel: () => void }) {
  const [what, setWhat] = useState('')
  const [count, setCount] = useState(4)
  return (
    <div className="flex flex-col gap-2 mt-2 p-3 bg-paper border border-line rounded-xl">
      <input value={what} onChange={(e) => setWhat(e.target.value)} placeholder="Salade, Tiramisu…"
        className="w-full border border-ink rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-terracotta" />
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted">Pour</span>
        <button type="button" onClick={() => setCount(Math.max(1, count - 1))}
          className="w-5 h-5 rounded-full border border-ink text-xs flex items-center justify-center">−</button>
        <span className="text-xs font-bold w-4 text-center">{count}</span>
        <button type="button" onClick={() => setCount(Math.min(20, count + 1))}
          className="w-5 h-5 rounded-full border border-ink text-xs flex items-center justify-center">+</button>
        <span className="text-xs text-muted">personnes</span>
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-1 border border-ink rounded-full text-xs">Annuler</button>
        <button onClick={() => what.trim() && onSubmit(what.trim(), count)} disabled={!what.trim()}
          className="flex-1 py-1 bg-terracotta text-white border border-ink rounded-full text-xs disabled:opacity-50">OK</button>
      </div>
    </div>
  )
}

export function MealGrid({
  slug,
  eventId,
  participantId,
  initialSlots,
  initialContributions,
  participants,
  days,
}: {
  slug: string
  eventId: string
  participantId: string
  initialSlots: Slot[]
  initialContributions: Contribution[]
  participants: Participant[]
  days: string[]
}) {
  const [slots, setSlots] = useState(initialSlots)
  const [contribs, setContribs] = useState(initialContributions)
  const [activeForm, setActiveForm] = useState<{ slotId: string } | { day: string; type: 'midi' | 'soir' } | null>(null)
  const [, startTransition] = useTransition()

  function participantName(id: string) {
    return participants.find((p) => p.id === id)?.pseudo ?? '?'
  }

  function slotContribs(slotId: string) {
    return contribs.filter((c) => c.slot_id === slotId)
  }

  function coverage(slotId: string) {
    return slotContribs(slotId).reduce((sum, c) => sum + c.for_count, 0)
  }

  function handleAddContrib(slotId: string, what: string, forCount: number) {
    const optimistic = { id: crypto.randomUUID(), slot_id: slotId, participant_id: participantId, what, for_count: forCount, created_at: new Date().toISOString() }
    setContribs((prev) => [...prev, optimistic])
    setActiveForm(null)
    startTransition(() => addContribution(slug, slotId, participantId, what, forCount))
  }

  function handleRemoveContrib(id: string) {
    setContribs((prev) => prev.filter((c) => c.id !== id))
    startTransition(() => removeContribution(slug, id))
  }

  function handleAddSlot(day: string, type: 'midi' | 'soir') {
    const label = type === 'midi' ? 'Déjeuner' : 'Dîner'
    const optimistic: Slot = {
      id: crypto.randomUUID(),
      event_id: eventId,
      day,
      type,
      label,
      created_by: participantId,
      created_at: new Date().toISOString(),
    }
    setSlots((prev) => [...prev, optimistic])
    setActiveForm(null)
    startTransition(() => addMealSlot(slug, eventId, participantId, day, type, label))
  }

  const totalParticipants = participants.filter(
    (p) => ['hot', 'maybe', 'unsure'].includes(p.presence_status ?? '')
  ).length

  return (
    <section>
      <h2 className="font-serif font-bold text-xl mb-2">Qui apporte quoi ?</h2>
      <p className="text-sm text-muted mb-6">Organisez les repas collectifs.</p>

      <div className="flex flex-col gap-6">
        {days.map((day) => (
          <div key={day}>
            <p className="text-xs font-bold uppercase tracking-wider text-muted mb-3 capitalize">{formatDay(day)}</p>
            <div className="flex flex-col gap-3">
              {(['midi', 'soir'] as const).map((type) => {
                const slot = slots.find((s) => s.day === day && s.type === type)
                const icon = type === 'midi' ? '☀️' : '🌙'
                const label = type === 'midi' ? 'Déjeuner' : 'Dîner'

                if (!slot) {
                  return (
                    <button key={type} onClick={() => handleAddSlot(day, type)}
                      className="flex items-center gap-2 py-2.5 px-4 border-2 border-dashed border-line rounded-xl text-sm text-muted hover:border-terracotta hover:text-terracotta transition-colors">
                      <span>{icon}</span>
                      <span>+ Ajouter {label.toLowerCase()}</span>
                    </button>
                  )
                }

                const sc = slotContribs(slot.id)
                const cov = coverage(slot.id)
                const covColor = cov === 0 ? 'text-terracotta' : cov < totalParticipants ? 'text-amber' : 'text-olive'

                return (
                  <div key={type} className="bg-card border-2 border-ink rounded-2xl overflow-hidden shadow-[3px_3px_0_rgba(26,20,16,0.8)]">
                    <div className="px-4 py-2.5 border-b border-line flex items-center justify-between">
                      <p className="font-bold text-sm">{icon} {label}</p>
                      <span className={`text-xs font-semibold ${covColor}`}>
                        {cov === 0 ? 'Rien prévu' : `${cov}/${totalParticipants} couverts`}
                      </span>
                    </div>
                    <div className="px-4 py-3 flex flex-col gap-2">
                      {sc.map((c) => (
                        <div key={c.id} className="flex items-center justify-between text-sm">
                          <span>
                            <span className="font-medium">{participantName(c.participant_id)}</span>
                            <span className="text-muted ml-2">apporte {c.what} (×{c.for_count})</span>
                          </span>
                          {c.participant_id === participantId && (
                            <button onClick={() => handleRemoveContrib(c.id)} className="text-xs text-muted hover:text-terracotta ml-2">✕</button>
                          )}
                        </div>
                      ))}
                      {activeForm && 'slotId' in activeForm && activeForm.slotId === slot.id ? (
                        <ContribForm
                          onSubmit={(what, count) => handleAddContrib(slot.id, what, count)}
                          onCancel={() => setActiveForm(null)}
                        />
                      ) : (
                        <button onClick={() => setActiveForm({ slotId: slot.id })}
                          className="text-xs text-terracotta font-semibold hover:underline text-left">
                          + Je m'occupe de…
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
