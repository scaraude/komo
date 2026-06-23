'use client'

import { useState, useTransition } from 'react'
import { proposeDateOption, voteDate, fixDate } from '@/lib/actions/dates'
import type { Database } from '@/lib/database.types'
import { randomId } from '@/lib/uuid'
import { Button } from '@/components/ui/Button'
import { DashedAddButton } from '@/components/ui/DashedAddButton'
import { countVotes, hasVote, toggleVote } from '@/lib/votes'

type Proposal = Database['public']['Tables']['date_proposals']['Row']

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

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
  initialProposals: Proposal[]
  totalParticipants: number
  isCreator: boolean
}) {
  const [proposals, setProposals] = useState(initialProposals)
  const [showInput, setShowInput] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [, startTransition] = useTransition()

  function getVoteCount(p: Proposal) {
    return countVotes(p.votes)
  }

  function hasVoted(p: Proposal) {
    return hasVote(p.votes, participantId)
  }

  function handleVote(proposal: Proposal) {
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

  function handlePropose() {
    if (!newDate) return
    const optimistic: Proposal = {
      id: randomId(),
      event_id: eventId,
      proposed_date: newDate,
      created_by: participantId,
      votes: {},
      created_at: new Date().toISOString(),
    }
    setProposals((prev) => [...prev, optimistic])
    setNewDate('')
    setShowInput(false)
    startTransition(() => proposeDateOption(slug, eventId, participantId, newDate))
  }

  function handleFix(proposalId: string) {
    startTransition(() => fixDate(slug, eventId, proposalId))
  }

  const sorted = [...proposals].sort((a, b) => {
    const diff = countVotes(b.votes) - countVotes(a.votes)
    return diff !== 0 ? diff : a.proposed_date.localeCompare(b.proposed_date)
  })

  return (
    <section>
      <h2 className="font-serif font-bold text-xl mb-1">Quelle date vous arrange ?</h2>
      <p className="text-sm text-muted mb-6">
        Votez pour les dates qui vous conviennent, le créateur fixera la meilleure.
      </p>

      <div className="flex flex-col gap-3 mb-6">
        {sorted.length === 0 && (
          <p className="text-sm text-muted text-center py-6">Aucune date proposée pour l&apos;instant.</p>
        )}
        {sorted.map((p) => {
          const count = getVoteCount(p)
          const voted = hasVoted(p)
          const pct = totalParticipants > 0 ? (count / totalParticipants) * 100 : 0
          return (
            <div key={p.id} className="bg-card border-[1.5px] border-line-2 rounded-[18px] overflow-hidden shadow-[0_2px_8px_rgba(60,45,20,0.04)]">
              <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm capitalize">{formatDate(p.proposed_date)}</p>
                  <p className="text-xs text-muted mt-0.5">{count} / {totalParticipants} votes</p>
                </div>
                <div className="flex gap-2 items-center">
                  {isCreator && (
                    <button
                      onClick={() => handleFix(p.id)}
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
            </div>
          )
        })}
      </div>

      {showInput ? (
        <div className="flex gap-2">
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="flex-1 border-[1.5px] border-line rounded-[13px] px-3 py-2.5 text-sm bg-card focus:outline-none focus:border-terracotta"
          />
          <Button onClick={handlePropose} disabled={!newDate} className="rounded-[13px] px-4 py-2.5 text-sm">
            Proposer
          </Button>
          <button
            onClick={() => setShowInput(false)}
            aria-label="Annuler"
            className="px-3 py-2.5 border-[1.5px] border-line-3 bg-card rounded-[13px] text-sm"
          >
            ✕
          </button>
        </div>
      ) : (
        <DashedAddButton onClick={() => setShowInput(true)} className="w-full rounded-[18px] py-3 text-sm">
          + Proposer une date
        </DashedAddButton>
      )}
    </section>
  )
}
