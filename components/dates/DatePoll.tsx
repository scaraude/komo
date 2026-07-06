'use client'

import { useState, useTransition } from 'react'
import { proposeDateOption, voteDate, fixDate, deleteDateProposal } from '@/lib/actions/dates'
import type { DateProposal, Period } from '@/lib/types'
import { formatPeriod } from '@/lib/format'
import { randomId } from '@/lib/uuid'
import { Button } from '@/components/ui/Button'
import { ConfirmButton } from '@/components/ui/ConfirmButton'
import { DashedAddButton } from '@/components/ui/DashedAddButton'
import { RangeCalendar } from '@/components/ui/RangeCalendar'
import { countVotes, hasVote, toggleVote } from '@/lib/votes'
import { Card } from '@/components/ui/Card'

export function DatePoll({
  slug,
  eventId,
  participantId,
  initialProposals,
  totalParticipants,
  isCreator,
}: {
  slug: string
  eventId: string
  participantId: string
  initialProposals: DateProposal[]
  totalParticipants: number
  isCreator: boolean
}) {
  const [proposals, setProposals] = useState(initialProposals)
  const [showInput, setShowInput] = useState(false)
  const [range, setRange] = useState<Period | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function getVoteCount(p: DateProposal) {
    return countVotes(p.votes)
  }

  function hasVoted(p: DateProposal) {
    return hasVote(p.votes, participantId)
  }

  function handleVote(proposal: DateProposal) {
    const newVote = !hasVoted(proposal)
    setProposals((prev) =>
      prev.map((p) =>
        p.id === proposal.id
          ? { ...p, votes: toggleVote(p.votes, participantId) }
          : p
      )
    )
    startTransition(async () => {
      try { await voteDate(slug, proposal.id, participantId, newVote) } catch { /* optimiste */ }
    })
  }

  function resetInput() {
    setRange(null)
    setShowInput(false)
  }

  function handlePropose() {
    if (!range) return
    const { start, end } = range
    const optimistic: DateProposal = {
      id: randomId(),
      event_id: eventId,
      start_date: start,
      end_date: end,
      created_by: participantId,
      votes: {},
      created_at: new Date().toISOString(),
    }
    setProposals((prev) => [...prev, optimistic])
    resetInput()
    startTransition(() => proposeDateOption(slug, eventId, participantId, start, end))
  }

  function handleFix(proposal: DateProposal) {
    startTransition(() => fixDate(slug, eventId, proposal.start_date, proposal.end_date))
  }

  function handleDelete(proposal: DateProposal) {
    const prev = proposals
    setProposals((cur) => cur.filter((p) => p.id !== proposal.id))
    startTransition(async () => {
      try { await deleteDateProposal(slug, proposal.id) } catch { setProposals(prev) }
    })
  }

  const sorted = [...proposals].sort((a, b) => {
    const diff = countVotes(b.votes) - countVotes(a.votes)
    return diff !== 0 ? diff : a.start_date.localeCompare(b.start_date)
  })

  const selectedProposal = proposals.find((p) => p.id === selectedId) ?? null

  return (
    <section>
      <h2 className="font-serif font-bold text-xl mb-1">On fait ça quand ?</h2>
      <p className="text-sm text-muted mb-6">
        Votez pour les créneaux qui vous arrangent.
        {isCreator ? ' Sélectionne le créneau retenu pour fixer les dates du séjour.' : ' Le créateur choisira le créneau retenu.'}
      </p>

      {isCreator && sorted.length > 0 && (
        <button
          onClick={() => selectedProposal && handleFix(selectedProposal)}
          disabled={!selectedProposal}
          className={`w-full flex items-center justify-center gap-2 rounded-[14px] px-4 py-3.5 text-sm font-bold mb-4 transition-all ${
            selectedProposal
              ? 'bg-olive text-white shadow-[0_3px_0_var(--color-olive-text-dk)] active:translate-y-[3px] active:shadow-none'
              : 'bg-soft text-disabled cursor-not-allowed'
          }`}
        >
          {selectedProposal ? (
            <span>✓ Choisir ces dates · <span className="capitalize">{formatPeriod({ start: selectedProposal.start_date, end: selectedProposal.end_date })}</span></span>
          ) : (
            'Sélectionne un créneau ci-dessous'
          )}
        </button>
      )}

      <div className="flex flex-col gap-3 mb-6" role={isCreator ? 'radiogroup' : undefined}>
        {sorted.length === 0 && (
          <p className="text-sm text-muted text-center py-6">Aucun créneau proposé pour l&apos;instant.</p>
        )}
        {sorted.map((p) => {
          const count = getVoteCount(p)
          const voted = hasVoted(p)
          const pct = totalParticipants > 0 ? (count / totalParticipants) * 100 : 0
          const selected = selectedId === p.id
          return (
            <Card
              key={p.id}
              onClick={isCreator ? () => setSelectedId(p.id) : undefined}
              role={isCreator ? 'radio' : undefined}
              aria-checked={isCreator ? selected : undefined}
              className={`rounded-[18px] overflow-hidden transition-shadow ${
                isCreator ? 'cursor-pointer' : ''
              } ${selected ? 'ring-2 ring-olive' : ''}`}
            >
              <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-3">
                <div className="min-w-0 flex items-center gap-2.5">
                  {isCreator && (
                    <span
                      className={`shrink-0 grid place-items-center h-5 w-5 rounded-full border-[1.5px] text-[11px] font-bold transition-colors ${
                        selected ? 'border-olive bg-olive text-white' : 'border-line-3 text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm capitalize">
                      {formatPeriod({ start: p.start_date, end: p.end_date })}
                    </p>
                    <p className="text-xs text-muted mt-0.5">{count} / {totalParticipants} votes</p>
                  </div>
                </div>
                <div className="flex gap-1.5 items-center shrink-0">
                  {p.created_by === participantId && (
                    <span onClick={(e) => e.stopPropagation()}>
                      <ConfirmButton
                        onConfirm={() => handleDelete(p)}
                        ariaLabel="Supprimer mon créneau"
                        confirmLabel="Supprimer ?"
                        className="flex h-9 w-9 items-center justify-center rounded-[11px] text-[17px] text-muted hover:text-prune hover:bg-soft transition-colors"
                      >
                        🗑
                      </ConfirmButton>
                    </span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleVote(p) }}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full border-[1.5px] transition-colors ${
                      voted
                        ? 'bg-ink text-paper border-ink'
                        : 'bg-card text-ink border-line-3 hover:border-terracotta hover:text-terracotta'
                    }`}
                  >
                    {voted ? '✓ Je peux' : 'Je peux'}
                  </button>
                </div>
              </div>
              <div
                className="h-1 bg-line mx-4 mb-3 rounded-full overflow-hidden"
                role="progressbar"
                aria-label={`${count} vote${count > 1 ? 's' : ''} sur ${totalParticipants}`}
                aria-valuenow={count}
                aria-valuemin={0}
                aria-valuemax={totalParticipants}
              >
                <div
                  className="h-full bg-terracotta rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </Card>
          )
        })}
      </div>

      {showInput ? (
        <div className="flex flex-col gap-3">
          <RangeCalendar value={range} onChange={setRange} />
          <p className="text-sm text-center text-muted min-h-[20px]">
            {range ? (
              <>Créneau : <span className="font-semibold text-ink capitalize">{formatPeriod(range)}</span></>
            ) : (
              'Clique une date de début, puis une date de fin.'
            )}
          </p>
          <div className="flex gap-2">
            <Button onClick={handlePropose} disabled={!range} className="flex-1 rounded-[13px] px-4 py-2.5 text-sm">
              Proposer
            </Button>
            <button
              onClick={resetInput}
              aria-label="Annuler"
              className="px-3 py-2.5 border-[1.5px] border-line-3 bg-card rounded-[13px] text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        <DashedAddButton onClick={() => setShowInput(true)} className="w-full rounded-[18px] py-3 text-sm">
          + Proposer un créneau
        </DashedAddButton>
      )}
    </section>
  )
}
