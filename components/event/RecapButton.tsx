'use client'

import { useState } from 'react'
import { pseudoOf, needsTransport } from '@/lib/participants'
import type { Participant, Leg, Occupant } from '@/lib/types'

type Props = {
  event: {
    slug: string
    title: string
    date_start: string | null
    date_end: string | null
    destination: string
  }
  participants: Participant[]
  legs: Leg[]
  occupants: Occupant[]
}

function formatDateRange(start: string, end: string | null) {
  const s = new Date(start + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  if (!end || end === start) return s
  const e = new Date(end + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  return `${s} → ${e}`
}

function buildRecap(props: Props, baseUrl: string): string {
  const { event, participants, legs, occupants } = props

  const dateLabel = event.date_start
    ? formatDateRange(event.date_start, event.date_end)
    : 'Date à définir'

  const hot = participants.filter((p) => p.presence_status === 'hot')
  const allerLegs = legs.filter((l) => l.direction === 'aller')
  const assignedAllerIds = new Set(
    occupants.filter((o) => allerLegs.some((l) => l.id === o.leg_id)).map((o) => o.participant_id)
  )
  const unassigned = participants.filter(
    (p) => needsTransport(p) && !assignedAllerIds.has(p.id)
  )

  const lines: string[] = [
    `🏕️ ${event.title} — ${dateLabel}`,
    `📍 ${event.destination}`,
  ]

  if (hot.length > 0)
    lines.push(`✅ ${hot.length} chaud${hot.length > 1 ? 's' : ''} : ${hot.map((p) => p.pseudo).join(', ')}`)

  if (allerLegs.length > 0) {
    lines.push('🚗 Transport aller :')
    for (const leg of allerLegs) {
      const legOccupants = occupants.filter((o) => o.leg_id === leg.id)
      const driver = legOccupants.find((o) => o.is_driver)
      const driverName = driver ? participants.find((p) => p.id === driver.participant_id)?.pseudo : null
      const passengers = legOccupants
        .filter((o) => !o.is_driver)
        .map((o) => pseudoOf(participants, o.participant_id))
      const freeSeats = (leg.total_seats ?? 4) - legOccupants.length
      const namePart = passengers.length > 0 ? ` : ${passengers.join(', ')}` : ''
      const freePart = freeSeats > 0 ? ` [${freeSeats} place${freeSeats > 1 ? 's' : ''} libre${freeSeats > 1 ? 's' : ''}]` : ' [complet]'
      const legName = driverName ? `${driverName} (${leg.label})` : leg.label
      lines.push(`  → ${legName}${namePart}${freePart}`)
    }
  }

  if (unassigned.length > 0)
    lines.push(`⚠️ Sans transport : ${unassigned.map((p) => p.pseudo).join(', ')}`)

  lines.push(`🔗 ${baseUrl}/e/${event.slug}`)

  return lines.join('\n')
}

export function RecapButton(props: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const baseUrl = window.location.origin
    const text = buildRecap(props, baseUrl)
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleWhatsApp() {
    const baseUrl = window.location.origin
    const text = buildRecap(props, baseUrl)
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div className="flex gap-2 mt-6">
      <button
        onClick={handleCopy}
        className="flex-1 py-2.5 border-2 border-ink rounded-full text-sm font-bold hover:bg-ink hover:text-paper transition-colors"
      >
        {copied ? '✓ Copié !' : 'Copier le récap'}
      </button>
      <button
        onClick={handleWhatsApp}
        className="flex-1 py-2.5 bg-whatsapp text-white border-2 border-ink rounded-full text-sm font-bold hover:opacity-90 transition-opacity"
      >
        Envoyer sur WhatsApp
      </button>
    </div>
  )
}
