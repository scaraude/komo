'use client'

import { useState, useTransition } from 'react'
import { proposeDateOption, voteDate, fixDate } from '@/lib/actions/dates'
import type { Database } from '@/lib/database.types'
import { randomId } from '@/lib/uuid'

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
    return Object.values(p.votes as Record<string, boolean>).filter(Boolean).length
  }

  function hasVoted(p: Proposal) {
    return (p.votes as Record<string, boolean>)[participantId] === true
  }

  function handleVote(proposal: Proposal) {
    const currentVote = hasVoted(proposal)
    const newVote = !currentVote
    setProposals((prev) =>
      prev.map((p) =>
        p.id === proposal.id
          ? { ...p, votes: { ...(p.votes as Record<string, boolean>), [participantId]: newVote } }
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
    const diff = Object.values(b.votes as Record<string, boolean>).filter(Boolean).length
      - Object.values(a.votes as Record<string, boolean>).filter(Boolean).length
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
              <div className="h-1 bg-line mx-4 mb-3 rounded-full overflow-hidden">
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
          <button
            onClick={handlePropose}
            disabled={!newDate}
            className="px-4 py-2.5 bg-terracotta text-white rounded-[13px] text-sm font-bold shadow-[0_3px_0_var(--color-terracotta-dk)] active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50"
          >
            Proposer
          </button>
          <button
            onClick={() => setShowInput(false)}
            aria-label="Annuler"
            className="px-3 py-2.5 border-[1.5px] border-line-3 bg-card rounded-[13px] text-sm"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowInput(true)}
          className="w-full py-3 border-[1.5px] border-dashed border-[var(--color-dashed)] rounded-[18px] text-sm font-semibold text-muted hover:border-terracotta hover:text-terracotta transition-colors"
        >
          + Proposer une date
        </button>
      )}
    </section>
  )
}
