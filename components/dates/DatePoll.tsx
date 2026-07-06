'use client'

import { useState, useTransition } from 'react'
import { proposeDateOption, voteDate, fixDate, deleteDateProposal } from '@/lib/actions/dates'
import type { DateProposal, Period } from '@/lib/types'
import { formatPeriod } from '@/lib/format'
import { randomId } from '@/lib/uuid'
import { Button } from '@/components/ui/Button'
import { ConfirmButton } from '@/components/ui/ConfirmButton'
import { DashedAddButton } from '@/components/ui/DashedAddButton'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { ProposalCalendar, type CalendarProposal } from './ProposalCalendar'
import { FixCelebration } from './FixCelebration'
import { countVotes, hasVote, toggleVote } from '@/lib/votes'

/** Couleurs des bandeaux et des avatars — déclinaisons de la charte KOMO
 *  (rouge, lavande sombre, orange vif, olive, prune, ocre). */
const CREW_COLORS = ['#df402a', '#7c68b0', '#fe7a5d', '#5f7a3e', '#9a5a6e', '#c99b2e'] as const

type Member = { id: string; pseudo: string }

export function DatePoll({
  slug,
  eventId,
  participantId,
  initialProposals,
  participants,
  isCreator,
}: {
  slug: string
  eventId: string
  participantId: string
  initialProposals: DateProposal[]
  participants: Member[]
  isCreator: boolean
}) {
  const [proposals, setProposals] = useState(initialProposals)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focusedMemberId, setFocusedMemberId] = useState<string | null>(null)
  // Pas encore de créneau : on ouvre directement la sélection sur le calendrier.
  const [adding, setAdding] = useState(initialProposals.length === 0)
  const [range, setRange] = useState<Period | null>(null)
  const [fixedPeriod, setFixedPeriod] = useState<Period | null>(null)
  const [, startTransition] = useTransition()

  const totalParticipants = participants.length
  const sorted = [...proposals].sort((a, b) => a.start_date.localeCompare(b.start_date))
  const selectedProposal = proposals.find((proposal) => proposal.id === selectedId) ?? null
  const focusedMember = participants.find((member) => member.id === focusedMemberId) ?? null

  function memberColor(memberId: string): string {
    const index = participants.findIndex((member) => member.id === memberId)
    return CREW_COLORS[Math.max(0, index) % CREW_COLORS.length] ?? '#df402a'
  }

  function memberLabel(member: Member): string {
    return member.id === participantId ? 'Toi' : member.pseudo
  }

  const calendarProposals: CalendarProposal[] = sorted.map((proposal, index) => {
    const count = countVotes(proposal.votes)
    return {
      id: proposal.id,
      start: proposal.start_date,
      end: proposal.end_date,
      color: CREW_COLORS[index % CREW_COLORS.length] ?? '#df402a',
      intensity: totalParticipants > 0 ? count / totalParticipants : 0,
      label: `${count}/${totalParticipants}`,
      ariaLabel: `${formatPeriod({ start: proposal.start_date, end: proposal.end_date })}, ${count} sur ${totalParticipants} peuvent`,
      selected: selectedId === proposal.id,
      dimmed: focusedMemberId !== null && !hasVote(proposal.votes, focusedMemberId),
      full: totalParticipants > 1 && count === totalParticipants,
    }
  })

  const focusedCanCount = focusedMemberId
    ? sorted.filter((proposal) => hasVote(proposal.votes, focusedMemberId)).length
    : 0

  function handleVote(proposal: DateProposal) {
    const newVote = !hasVote(proposal.votes, participantId)
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
    if (!range) return
    const { start, end } = range
    const optimistic: DateProposal = {
      id: randomId(),
      event_id: eventId,
      start_date: start,
      end_date: end,
      created_by: participantId,
      // Proposer vaut « je peux » — aligné sur le vote pré-rempli côté serveur.
      votes: { [participantId]: true },
      created_at: new Date().toISOString(),
    }
    setProposals((prev) => [...prev, optimistic])
    setSelectedId(optimistic.id)
    setAdding(false)
    setRange(null)
    startTransition(async () => {
      try {
        // On réconcilie l'id optimiste avec la ligne créée : un vote qui suit
        // immédiatement doit viser le vrai id, pas l'id client jetable.
        const created = await proposeDateOption(slug, eventId, participantId, start, end)
        setProposals((prev) => prev.map((p) => (p.id === optimistic.id ? created : p)))
        setSelectedId((prev) => (prev === optimistic.id ? created.id : prev))
      } catch {
        setProposals((prev) => prev.filter((p) => p.id !== optimistic.id))
      }
    })
  }

  function handleDelete(proposal: DateProposal) {
    const prev = proposals
    setProposals((cur) => cur.filter((p) => p.id !== proposal.id))
    setSelectedId(null)
    startTransition(async () => {
      try { await deleteDateProposal(slug, proposal.id) } catch { setProposals(prev) }
    })
  }

  function handleFix(proposal: DateProposal) {
    const period = { start: proposal.start_date, end: proposal.end_date }
    setFixedPeriod(period)
    startTransition(async () => {
      try { await fixDate(slug, eventId, period.start, period.end) } catch { setFixedPeriod(null) }
    })
  }

  return (
    <section>
      <h2 className="mb-1 font-serif text-xl font-bold">On fait ça quand&nbsp;?</h2>
      <p className="mb-5 text-sm text-muted">
        Votez pour les créneaux qui vous arrangent.
        {isCreator ? ' Sélectionne le créneau retenu pour fixer les dates du séjour.' : ' Le créateur choisira le créneau retenu.'}
      </p>

      {/* Le crew : tape un avatar pour mettre en avant les créneaux d'un participant. */}
      {totalParticipants > 1 && sorted.length > 0 && (
        <div className="mb-2 flex gap-3 overflow-x-auto pb-1">
          {participants.map((member) => {
            const focused = focusedMemberId === member.id
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => setFocusedMemberId(focused ? null : member.id)}
                aria-pressed={focused}
                className="flex shrink-0 flex-col items-center gap-1"
              >
                <Avatar
                  pseudo={member.pseudo}
                  style={{ backgroundColor: memberColor(member.id) }}
                  className={`h-9 w-9 text-[13px] text-white transition-transform ${
                    focused ? 'scale-110 ring-2 ring-ink ring-offset-2 ring-offset-paper' : ''
                  }`}
                />
                <span className={`text-[10.5px] font-semibold ${focused ? 'text-ink' : 'text-muted'}`}>
                  {memberLabel(member)}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {focusedMember && (
        <p className="mb-3 text-[13px] text-muted" role="status">
          {focusedMember.id === participantId ? (
            focusedCanCount > 0 ? (
              <>Tu peux sur <b className="text-ink">{focusedCanCount}</b> des {sorted.length} créneaux.</>
            ) : (
              <>Tu n&apos;as encore voté pour aucun créneau.</>
            )
          ) : focusedCanCount > 0 ? (
            <><b className="text-ink">{focusedMember.pseudo}</b> peut sur <b className="text-ink">{focusedCanCount}</b> des {sorted.length} créneaux.</>
          ) : (
            <><b className="text-ink">{focusedMember.pseudo}</b> n&apos;a pas encore voté.</>
          )}
        </p>
      )}

      <ProposalCalendar
        proposals={calendarProposals}
        onProposalClick={(id) => setSelectedId((previous) => (previous === id ? null : id))}
        selecting={adding}
        range={range}
        onRangeChange={setRange}
      />

      {adding ? (
        <div className="mt-3 flex flex-col gap-3">
          <p className="min-h-[20px] text-center text-sm text-muted">
            {range ? (
              <>Créneau : <span className="font-semibold text-ink">{formatPeriod(range)}</span></>
            ) : (
              'Clique une date de début, puis une date de fin.'
            )}
          </p>
          <div className="flex gap-2">
            <Button onClick={handlePropose} disabled={!range} className="flex-1 rounded-[13px] px-4 py-2.5 text-sm">
              Proposer ce créneau
            </Button>
            {sorted.length > 0 && (
              <button
                onClick={() => { setAdding(false); setRange(null) }}
                aria-label="Annuler"
                className="rounded-[13px] border-[1.5px] border-line-3 bg-card px-3 py-2.5 text-sm"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      ) : sorted.length === 0 ? (
        <p className="mt-3 text-center text-sm text-muted">Aucun créneau proposé pour l&apos;instant.</p>
      ) : selectedProposal ? (
        <Card className="mt-3 rounded-[18px] p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-serif text-[16px] font-semibold">
                {formatPeriod({ start: selectedProposal.start_date, end: selectedProposal.end_date })}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {countVotes(selectedProposal.votes)} / {totalParticipants}
                {totalParticipants > 1 && countVotes(selectedProposal.votes) === totalParticipants
                  ? ' · 🎉 tout le monde peut !'
                  : ' peuvent'}
              </p>
            </div>
            {selectedProposal.created_by === participantId && (
              <ConfirmButton
                onConfirm={() => handleDelete(selectedProposal)}
                ariaLabel="Supprimer mon créneau"
                confirmLabel="Supprimer ?"
                className="flex h-9 w-9 items-center justify-center rounded-[11px] text-[17px] text-muted transition-colors hover:bg-soft hover:text-prune"
              >
                🗑
              </ConfirmButton>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {participants.map((member) => {
              const can = hasVote(selectedProposal.votes, member.id)
              return (
                <span
                  key={member.id}
                  style={can ? { backgroundColor: memberColor(member.id) } : undefined}
                  className={`inline-flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-[12px] font-semibold ${
                    can ? 'text-white' : 'bg-soft text-disabled'
                  }`}
                >
                  <Avatar
                    pseudo={member.pseudo}
                    className={`h-5 w-5 text-[10px] ${can ? 'bg-white/25 text-white' : 'bg-track text-muted'}`}
                  />
                  {memberLabel(member)}
                </span>
              )
            })}
          </div>

          <button
            onClick={() => handleVote(selectedProposal)}
            className={`mt-3 w-full rounded-[12px] border-[1.5px] px-4 py-2.5 text-sm font-bold transition-colors ${
              hasVote(selectedProposal.votes, participantId)
                ? 'border-ink bg-ink text-paper'
                : 'border-line-3 bg-card text-ink hover:border-terracotta hover:text-terracotta'
            }`}
          >
            {hasVote(selectedProposal.votes, participantId) ? '✓ Je peux' : 'Je peux ces dates'}
          </button>

          {isCreator && (
            <Button onClick={() => handleFix(selectedProposal)} className="mt-2 w-full rounded-[13px] px-4 py-3 text-sm">
              ✓ Choisir ces dates
            </Button>
          )}
        </Card>
      ) : (
        <p className="mt-3 text-center text-[13px] text-muted">
          Tape un créneau coloré pour voir qui peut.
        </p>
      )}

      {!adding && (
        <DashedAddButton
          onClick={() => { setAdding(true); setRange(null); setSelectedId(null) }}
          className="mt-3 w-full rounded-[18px] py-3 text-sm"
        >
          + Proposer un créneau
        </DashedAddButton>
      )}

      {fixedPeriod && <FixCelebration period={fixedPeriod} slug={slug} />}
    </section>
  )
}
