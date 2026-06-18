import type { Database } from '@/lib/database.types'

type Participant = Database['public']['Tables']['participants']['Row']

const LUGGAGE_LABELS: Record<string, string> = {
  light: '🎒', medium: '🧳', large: '🪣',
}

export function UnassignedZone({ participants }: { participants: Participant[] }) {
  if (participants.length === 0) return null

  return (
    <div className="stripes-terracotta border-2 border-dashed border-terracotta rounded-2xl p-4 mt-6">
      <p className="text-sm font-bold text-terracotta mb-3 flex items-center gap-2">
        <span className="animate-pulse-dot w-2.5 h-2.5 rounded-full bg-terracotta inline-block" />
        {participants.length} sans solution de transport
      </p>
      <div className="flex flex-wrap gap-2">
        {participants.map((p) => (
          <div key={p.id}
            className="inline-flex items-center gap-1.5 bg-white/70 border border-terracotta/40 rounded-full px-3 py-1.5 text-sm font-medium">
            <div className="w-5 h-5 rounded-full bg-terracotta text-white text-xs font-bold flex items-center justify-center shrink-0">
              {p.pseudo[0].toUpperCase()}
            </div>
            {p.pseudo}
            {p.departure_city && <span className="text-muted text-xs">· {p.departure_city}</span>}
            {p.luggage_size && <span>{LUGGAGE_LABELS[p.luggage_size]}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
