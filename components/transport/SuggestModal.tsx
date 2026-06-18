'use client'

import { useState, useTransition } from 'react'
import { suggestAssignments, applyAssignments } from '@/lib/actions/transport'
import type { Assignment } from '@/lib/transport/solver'
import type { Database } from '@/lib/database.types'

type Participant = Database['public']['Tables']['participants']['Row']
type Leg = Database['public']['Tables']['transport_legs']['Row']

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

  function participantName(id: string) {
    return participants.find((p) => p.id === id)?.pseudo ?? '?'
  }

  function legLabel(id: string) {
    const l = legs.find((l) => l.id === id)
    return l ? `${l.label} (${l.departure_city})` : '?'
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-paper border-2 border-ink rounded-2xl shadow-[6px_6px_0_rgba(26,20,16,0.9)] p-6">
        <h3 className="font-serif font-bold text-xl mb-2">✨ Auto-affecter</h3>
        <p className="text-sm text-muted mb-5">
          Le solveur cherche la meilleure répartition selon les villes de départ.
        </p>

        {assignments === null ? (
          <button
            onClick={handleSuggest}
            disabled={isPending}
            className="w-full py-3 bg-terracotta text-white border-2 border-ink rounded-full font-bold text-sm disabled:opacity-60"
          >
            {isPending ? 'Calcul…' : 'Calculer les suggestions'}
          </button>
        ) : (
          <>
            {assignments.length === 0 && unresolved.length === 0 ? (
              <p className="text-sm text-center text-muted py-4">Tout le monde est déjà casé 🎉</p>
            ) : (
              <div className="flex flex-col gap-2 mb-5">
                {assignments.map((a) => (
                  <div key={a.participantId} className="flex items-center justify-between text-sm px-3 py-2 bg-card border border-line rounded-xl">
                    <span className="font-semibold">{participantName(a.participantId)}</span>
                    <span className="text-muted">→ {legLabel(a.legId)}</span>
                  </div>
                ))}
                {unresolved.length > 0 && (
                  <div className="text-xs text-terracotta font-semibold mt-1 px-1">
                    ⚠️ Sans solution : {unresolved.map(participantName).join(', ')}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 border-2 border-ink rounded-full font-bold text-sm">
                Annuler
              </button>
              {assignments.length > 0 && (
                <button
                  onClick={handleConfirm}
                  disabled={isPending}
                  className="flex-1 py-3 bg-terracotta text-white border-2 border-ink rounded-full font-bold text-sm shadow-[0_3px_0_rgba(26,20,16,0.9)] disabled:opacity-60"
                >
                  {isPending ? '…' : 'Confirmer →'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
