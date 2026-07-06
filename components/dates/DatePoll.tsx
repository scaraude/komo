'use client'

import { useState, useTransition } from 'react'
import { proposeDateOption, voteDate, fixDate } from '@/lib/actions/dates'
import type { DateProposal, Period } from '@/lib/types'
import { formatPeriod } from '@/lib/format'
import { randomId } from '@/lib/uuid'
import { Button } from '@/components/ui/Button'
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

  const sorted = [...proposals].sort((a, b) => {
    const diff = countVotes(b.votes) - countVotes(a.votes)
    return diff !== 0 ? diff : a.start_date.localeCompare(b.start_date)
  })

  return (
    <section>
      <h2 className="font-serif font-bold text-xl mb-1">Quel créneau vous arrange ?</h2>
      <p className="text-sm text-muted mb-6">
        Votez pour les périodes qui vous conviennent, le créateur fixera la meilleure.
      </p>

      <div className="flex flex-col gap-3 mb-6">
        {sorted.length === 0 && (
          <p className="text-sm text-muted text-center py-6">Aucun créneau proposé pour l&apos;instant.</p>
        )}
        {sorted.map((p) => {
          const count = getVoteCount(p)
          const voted = hasVoted(p)
          const pct = totalParticipants > 0 ? (count / totalParticipants) * 100 : 0
          return (
            <Card key={p.id} className="rounded-[18px] overflow-hidden">
              <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm capitalize">
                    {formatPeriod({ start: p.start_date, end: p.end_date })}
                  </p>
                  <p className="text-xs text-muted mt-0.5">{count} / {totalParticipants} votes</p>
                </div>
                <div className="flex gap-2 items-center">
                  {isCreator && (
                    <button
                      onClick={() => handleFix(p)}
                      className="text-xs font-bold px-3 py-1.5 bg-olive/15 text-olive border border-olive/30 rounded-full hover:bg-olive/25 transition-colors"
                    >
                      Fixer ✓
                    </button>
                  )}
                  <button
                    onClick={() => handleVote(p)}
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
