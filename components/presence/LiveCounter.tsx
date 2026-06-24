'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Participant } from '@/lib/types'

function computeCounts(participants: Participant[]) {
  return {
    hot: participants.filter((p) => p.presence_status === 'hot').length,
    hesitant: participants.filter((p) => p.presence_status === 'maybe' || p.presence_status === 'unsure').length,
    pending: participants.filter((p) => !p.presence_status).length,
  }
}

export function LiveCounter({
  eventId,
  initialParticipants,
}: {
  eventId: string
  initialParticipants: Participant[]
}) {
  const [participants, setParticipants] = useState(initialParticipants)
  const counts = computeCounts(participants)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`participants:${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participants', filter: `event_id=eq.${eventId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setParticipants((prev) => [...prev, payload.new as Participant])
          } else if (payload.eventType === 'UPDATE') {
            setParticipants((prev) =>
              prev.map((p) => (p.id === (payload.new as Participant).id ? (payload.new as Participant) : p))
            )
          } else if (payload.eventType === 'DELETE') {
            setParticipants((prev) => prev.filter((p) => p.id !== (payload.old as Participant).id))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [eventId])

  return (
    <div className="grid grid-cols-3 gap-3 mb-8">
      <div className="bg-card border-[1.5px] border-line-2 rounded-[20px] p-4 text-center shadow-[0_2px_8px_rgba(60,45,20,0.04)]">
        <p className="text-2xl font-bold text-ink">{counts.hot}</p>
        <p className="text-[12px] text-muted mt-0.5">🔥 chauds</p>
      </div>
      <div className="bg-card border-[1.5px] border-line-2 rounded-[20px] p-4 text-center shadow-[0_2px_8px_rgba(60,45,20,0.04)]">
        <p className="text-2xl font-bold text-ink">{counts.hesitant}</p>
        <p className="text-[12px] text-muted mt-0.5">🤔 hésitants</p>
      </div>
      <div className="bg-card border-[1.5px] border-line-2 rounded-[20px] p-4 text-center shadow-[0_2px_8px_rgba(60,45,20,0.04)]">
        <p className="text-2xl font-bold text-ink">{counts.pending}</p>
        <p className="text-[12px] text-muted mt-0.5">❓ en attente</p>
      </div>
    </div>
  )
}
