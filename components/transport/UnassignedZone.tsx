import type { Database } from '@/lib/database.types'

type Participant = Database['public']['Tables']['participants']['Row']

const LUGGAGE_LABELS: Record<string, string> = {
  light: '🎒', medium: '🧳', large: '🪣',
}

export function UnassignedZone({ participants }: { participants: Participant[] }) {
  if (participants.length === 0) return null

  return (
    <div className="bg-terracotta-soft border-[1.5px] border-dashed border-[var(--color-terracotta-line)] rounded-[18px] p-[16px] mt-6">
      <p className="text-[13px] font-bold text-terracotta mb-3 flex items-center gap-2">
        <span className="animate-pulse-dot w-2.5 h-2.5 rounded-full bg-terracotta inline-block" />
        {participants.length} sans solution de transport
      </p>
      <div className="flex flex-wrap gap-2">
        {participants.map((p) => (
          <div key={p.id}
            className="inline-flex items-center gap-1.5 bg-card border-[1.5px] border-[var(--color-terracotta-line)] rounded-[20px] px-[12px] py-[7px] text-[13px] font-medium text-body">
            <div className="w-5 h-5 rounded-full bg-terracotta text-white text-[11px] font-bold flex items-center justify-center shrink-0">
              {p.pseudo[0]?.toUpperCase() ?? '?'}
            </div>
            {p.pseudo}
            {p.departure_city && <span className="text-muted text-[12px]">· {p.departure_city}</span>}
            {p.luggage_size && <span>{LUGGAGE_LABELS[p.luggage_size]}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
