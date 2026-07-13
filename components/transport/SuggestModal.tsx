'use client'

import { useState, useTransition } from 'react'
import { suggestAssignments, applyAssignments } from '@/lib/actions/transport'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import type { Assignment } from '@/lib/transport/solver'
import { pseudoOf } from '@/lib/participants'
import type { Participant, Leg } from '@/lib/types'
import { SparklesIcon } from '@/components/ui/icons'

export function SuggestModal({
  slug,
  eventId,
  direction,
  participants,
  legs,
  onClose,
}: {
  slug: string
  eventId: string
  direction: 'aller' | 'retour'
  participants: Participant[]
  legs: Leg[]
  onClose: () => void
}) {
  const [assignments, setAssignments] = useState<Assignment[] | null>(null)
  const [unresolved, setUnresolved] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()

  const participantName = (id: string) => pseudoOf(participants, id)

  function legLabel(id: string) {
    const l = legs.find((l) => l.id === id)
    if (!l) return '?'
    const city = l.departure_city ?? l.arrival_city
    return city ? `${l.label} (${city})` : l.label
  }

  function handleSuggest() {
    startTransition(async () => {
      const result = await suggestAssignments(slug, eventId, direction)
      setAssignments(result.assignments)
      setUnresolved(result.unresolved)
    })
  }

  function handleConfirm() {
    if (!assignments) return
    startTransition(async () => {
      await applyAssignments(slug, assignments)
      onClose()
    })
  }

  return (
    <Sheet onClose={onClose} labelledBy="suggest-title">
        <h3 id="suggest-title" className="mb-1 flex items-center gap-2 font-serif text-[22px] text-ink">
          <SparklesIcon className="h-[19px] w-[19px] shrink-0 text-terracotta" /> Auto-affecter
        </h3>
        <p className="text-[13px] text-muted mb-5">
          Le solveur cherche la meilleure répartition selon les villes de départ.
        </p>

        {assignments === null ? (
          <Button onClick={handleSuggest} disabled={isPending} className="w-full rounded-[15px] p-[16px]">
            {isPending ? 'Calcul…' : 'Calculer les suggestions'}
          </Button>
        ) : (
          <>
            {assignments.length === 0 && unresolved.length === 0 ? (
              <p className="text-[13px] text-center text-muted py-4">Tout le monde est déjà casé 🎉</p>
            ) : (
              <div className="flex flex-col gap-2 mb-5">
                {assignments.map((a) => (
                  <div key={a.participantId} className="flex items-center justify-between text-[14px] bg-card border-[1.5px] border-line-2 rounded-[13px] px-[14px] py-[11px]">
                    <span className="font-semibold text-ink">{participantName(a.participantId)}</span>
                    <span className="text-muted">→ {legLabel(a.legId)}</span>
                  </div>
                ))}
                {unresolved.length > 0 && (
                  <div className="text-[12.5px] text-terracotta font-semibold mt-1 px-1">
                    ⚠️ Sans solution : {unresolved.map(participantName).join(', ')}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 bg-card border-[1.5px] border-line-3 rounded-[15px] p-[16px] font-bold text-ink">
                Annuler
              </button>
              {assignments.length > 0 && (
                <Button onClick={handleConfirm} disabled={isPending} className="flex-[1.5] rounded-[15px] p-[16px]">
                  {isPending ? '…' : 'Confirmer →'}
                </Button>
              )}
            </div>
          </>
        )}
    </Sheet>
  )
}
