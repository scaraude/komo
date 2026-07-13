'use client'

import { useDraggable, useDroppable } from '@dnd-kit/core'
import type { Participant } from '@/lib/types'
import { Avatar } from '@/components/ui/Avatar'
import { BackpackIcon, SuitcaseIcon, PackageIcon } from '@/components/ui/icons'

const LUGGAGE_ICON_CLASS = 'h-[13px] w-[13px] shrink-0 text-muted'

function LuggageIcon({ size }: { size: string }) {
  switch (size) {
    case 'light': return <BackpackIcon className={LUGGAGE_ICON_CLASS} />
    case 'medium': return <SuitcaseIcon className={LUGGAGE_ICON_CLASS} />
    case 'large': return <PackageIcon className={LUGGAGE_ICON_CLASS} />
    default: return null
  }
}

export function UnassignedZone({
  participants,
  draggable = false,
  dropId,
}: {
  participants: Participant[]
  // Active le DnD (faux au SSR / 1er rendu pour éviter un mismatch d'hydratation).
  draggable?: boolean
  // id de la zone de dépôt (déposer ici = renvoyer vers « non affectés »).
  dropId?: string
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dropId ?? 'unassigned', disabled: !draggable })

  // Vide : on n'affiche rien hors DnD. En DnD, on garde une zone de dépôt
  // visible pour pouvoir y déposer quelqu'un sorti d'un véhicule.
  if (participants.length === 0 && !draggable) return null

  return (
    <div ref={setNodeRef}
      className={`bg-terracotta-soft border-[1.5px] border-dashed rounded-[18px] p-[16px] mt-6 transition-colors ${
        isOver ? 'border-terracotta bg-terracotta-soft/80' : 'border-[var(--color-terracotta-line)]'
      }`}>
      <p className="text-[13px] font-bold text-terracotta mb-3 flex items-center gap-2">
        <span className="animate-pulse-dot w-2.5 h-2.5 rounded-full bg-terracotta inline-block" />
        {participants.length > 0
          ? `${participants.length} sans solution de transport`
          : 'Personne sans solution de transport'}
      </p>
      {participants.length === 0 ? (
        <p className="text-[12.5px] text-muted italic">Glisse quelqu&apos;un ici pour le sortir d&apos;un véhicule.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {participants.map((p) => (
            <UnassignedChip key={p.id} participant={p} draggable={draggable} />
          ))}
        </div>
      )}
    </div>
  )
}

// Une pastille participant non affecté, déplaçable vers un véhicule.
// id de drag = `unassigned:<participantId>` (pas d'occupant côté DB).
function UnassignedChip({ participant: p, draggable }: { participant: Participant; draggable: boolean }) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `unassigned:${p.id}`,
    disabled: !draggable,
  })
  return (
    <div ref={setNodeRef} {...attributes} {...listeners}
      className={`inline-flex items-center gap-1.5 bg-card border-[1.5px] border-[var(--color-terracotta-line)] rounded-[20px] px-[12px] py-[7px] text-[13px] font-medium text-body ${
        draggable ? 'cursor-grab active:cursor-grabbing touch-none' : ''
      } ${isDragging ? 'opacity-40' : ''}`}>
      <Avatar pseudo={p.pseudo} className="h-5 w-5 bg-terracotta text-[11px] text-white" />
      {p.pseudo}
      {p.departure_city && <span className="text-muted text-[12px]">· {p.departure_city}</span>}
      {p.luggage_size && <LuggageIcon size={p.luggage_size} />}
    </div>
  )
}
