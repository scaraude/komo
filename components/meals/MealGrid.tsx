'use client'

import { useState, useTransition } from 'react'
import { addMealSlot, addContribution, removeContribution } from '@/lib/actions/meals'
import type { Database } from '@/lib/database.types'
import { randomId } from '@/lib/uuid'

type Slot = Database['public']['Tables']['meal_slots']['Row']
type Contribution = Database['public']['Tables']['meal_contributions']['Row']
type Participant = Database['public']['Tables']['participants']['Row']

function formatDay(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function formatDayShort(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
}

function ContribForm({ onSubmit, onCancel }: { onSubmit: (what: string, count: number) => void; onCancel: () => void }) {
  const [what, setWhat] = useState('')
  const [count, setCount] = useState(4)
  return (
    <div className="flex flex-col gap-3 mt-3 p-[14px] bg-soft border-[1.5px] border-line rounded-[13px]">
      <input
        value={what}
        onChange={(e) => setWhat(e.target.value)}
        placeholder="Salade, Tiramisu…"
        className="w-full bg-card border-[1.5px] border-line rounded-[13px] p-[14px] text-[14.5px] outline-none focus:border-terracotta placeholder:text-disabled"
      />
      <div className="flex items-center gap-3">
        <span className="text-[12.5px] text-muted">Pour</span>
        <button
          type="button"
          onClick={() => setCount(Math.max(1, count - 1))}
          className="w-7 h-7 rounded-full bg-card border-[1.5px] border-line text-body flex items-center justify-center active:translate-y-px transition-transform"
        >
          −
        </button>
        <span className="text-[13px] font-bold w-5 text-center text-ink">{count}</span>
        <button
          type="button"
          onClick={() => setCount(Math.min(20, count + 1))}
          className="w-7 h-7 rounded-full bg-card border-[1.5px] border-line text-body flex items-center justify-center active:translate-y-px transition-transform"
        >
          +
        </button>
        <span className="text-[12.5px] text-muted">personnes</span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-[10px] bg-card border-[1.5px] border-line rounded-[11px] text-[13px] text-body font-semibold"
        >
          Annuler
        </button>
        <button
          onClick={() => what.trim() && onSubmit(what.trim(), count)}
          disabled={!what.trim()}
          className="flex-1 py-[10px] bg-terracotta text-white rounded-[11px] text-[13px] font-bold shadow-[0_3px_0_var(--color-terracotta-dk)] active:translate-y-[3px] active:shadow-none transition-all disabled:opacity-50 disabled:shadow-none disabled:active:translate-y-0"
        >
          OK
        </button>
      </div>
    </div>
  )
}

/** Pilule "tag repas" sur une carte produit (vue liste). */
function MealTag({ slot }: { slot: Slot }) {
  // Modèle actuel : pas de type "apéro", on mappe midi=olive / soir=prune.
  const tone =
    slot.type === 'soir'
      ? 'bg-prune-soft text-prune'
      : 'bg-olive-soft text-olive-text'
  return (
    <span className={`rounded-[12px] px-[10px] py-[4px] text-[11.5px] font-semibold ${tone}`}>
      {slot.label} · {formatDayShort(slot.day)}
    </span>
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
  const [view, setView] = useState<'liste' | 'repas'>('repas')
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
    const optimistic = { id: randomId(), slot_id: slotId, participant_id: participantId, what, for_count: forCount, created_at: new Date().toISOString() }
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
      id: randomId(),
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

  // Vue liste : toutes les contributions à plat, avec le créneau auquel elles appartiennent.
  const flatList = contribs
    .map((c) => ({ contrib: c, slot: slots.find((s) => s.id === c.slot_id) }))
    .filter((row): row is { contrib: Contribution; slot: Slot } => Boolean(row.slot))

  return (
    <section>
      <h2 className="font-serif text-[26px] text-ink mb-1">Liste de courses</h2>
      <p className="text-[13.5px] text-muted mb-5">Qui apporte quoi, repas par repas.</p>

      {/* Toggle de vue (segmented) */}
      <div className="bg-track rounded-[13px] p-[5px] flex gap-[4px] mb-6">
        {(
          [
            ['liste', 'Liste'],
            ['repas', 'Par repas'],
          ] as const
        ).map(([key, label]) => {
          const active = view === key
          return (
            <button
              key={key}
              onClick={() => {
                setView(key)
                setActiveForm(null)
              }}
              className={`flex-1 text-center rounded-[9px] py-[10px] text-[13px] transition-colors ${
                active ? 'bg-ink text-white font-bold' : 'text-[#6b665c]'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {view === 'liste' ? (
        /* ---------- VUE LISTE : produits à plat ---------- */
        <div className="flex flex-col gap-3">
          {flatList.length === 0 ? (
            <div className="bg-terracotta-soft border-[1.5px] border-dashed border-terracotta-line rounded-[13px] px-[14px] py-[12px] text-[13.5px] text-terracotta font-semibold">
              ⚠ Rien dans la liste pour l'instant — passe en « Par repas » pour ajouter.
            </div>
          ) : (
            flatList.map(({ contrib, slot }) => (
              <div
                key={contrib.id}
                className="bg-card border-[1.5px] border-line-2 rounded-[16px] p-[14px] shadow-[0_2px_8px_rgba(60,45,20,0.04)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="text-[15px] font-bold text-ink truncate">{contrib.what}</span>
                    <span className="text-[12.5px] text-disabled shrink-0">
                      {participantName(contrib.participant_id)} · ×{contrib.for_count}
                    </span>
                  </div>
                  {contrib.participant_id === participantId && (
                    <button
                      onClick={() => handleRemoveContrib(contrib.id)}
                      className="text-[13px] text-muted hover:text-terracotta shrink-0"
                      aria-label="Retirer"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-[10px]">
                  <MealTag slot={slot} />
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* ---------- VUE PAR REPAS : groupes par créneau ---------- */
        <div className="flex flex-col gap-6">
          {days.map((day) => (
            <div key={day}>
              <p className="text-[11px] font-bold uppercase tracking-[0.8px] text-disabled mb-3 capitalize">
                {formatDay(day)}
              </p>
              <div className="flex flex-col gap-3">
                {(['midi', 'soir'] as const).map((type) => {
                  const slot = slots.find((s) => s.day === day && s.type === type)
                  const label = type === 'midi' ? 'Déjeuner' : 'Dîner'

                  // Pas encore de créneau : carte d'alerte "trou" (cliquable pour créer le slot).
                  if (!slot) {
                    return (
                      <button
                        key={type}
                        onClick={() => handleAddSlot(day, type)}
                        className="w-full text-left bg-terracotta-soft border-[1.5px] border-dashed border-terracotta-line rounded-[13px] px-[14px] py-[12px] text-[13.5px] text-terracotta font-semibold hover:bg-terracotta-soft/70 transition-colors"
                      >
                        ⚠ Trou — {label.toLowerCase()} pas encore prévu. Appuie pour l'ajouter.
                      </button>
                    )
                  }

                  const sc = slotContribs(slot.id)
                  const cov = coverage(slot.id)
                  const covTone =
                    cov === 0 ? 'text-terracotta' : cov < totalParticipants ? 'text-prune' : 'text-olive-text'

                  return (
                    <div
                      key={type}
                      className="bg-card border-[1.5px] border-line-2 rounded-[16px] p-[14px] shadow-[0_2px_8px_rgba(60,45,20,0.04)]"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`rounded-[12px] px-[10px] py-[4px] text-[11.5px] font-semibold ${
                            type === 'soir' ? 'bg-prune-soft text-prune' : 'bg-olive-soft text-olive-text'
                          }`}
                        >
                          {label}
                        </span>
                        <span className={`text-[12px] font-bold ${covTone}`}>
                          {cov === 0 ? 'Rien prévu' : `${cov}/${totalParticipants} couverts`}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2 mt-2">
                        {sc.map((c) => (
                          <div key={c.id} className="flex items-center justify-between text-[14px]">
                            <span className="min-w-0">
                              <span className="font-semibold text-ink">{c.what}</span>
                              <span className="text-disabled ml-2 text-[12.5px]">
                                {participantName(c.participant_id)} · ×{c.for_count}
                              </span>
                            </span>
                            {c.participant_id === participantId && (
                              <button
                                onClick={() => handleRemoveContrib(c.id)}
                                className="text-[13px] text-muted hover:text-terracotta ml-2 shrink-0"
                                aria-label="Retirer"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}

                        {activeForm && 'slotId' in activeForm && activeForm.slotId === slot.id ? (
                          <ContribForm
                            onSubmit={(what, count) => handleAddContrib(slot.id, what, count)}
                            onCancel={() => setActiveForm(null)}
                          />
                        ) : (
                          <button
                            onClick={() => setActiveForm({ slotId: slot.id })}
                            className="text-[13px] text-terracotta font-bold hover:underline text-left mt-1"
                          >
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
      )}
    </section>
  )
}
