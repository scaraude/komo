'use client'

import { useState, useTransition } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import { addParticipantProfile } from '@/lib/actions/participants'
import { randomId } from '@/lib/uuid'

const AVATAR_COLORS = ['#c4602f', '#5f7a3e', '#9a8a6a', '#3a7ca5', '#9a5a6e']

type ParticipantSummary = {
  id: string
  pseudo: string
}

// Couleur stable par participant, dérivée de l'id (indépendante de la position).
function avatarColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function ParticipantsBadge({
  slug,
  eventId,
  participants,
}: {
  slug: string
  eventId: string
  participants: ParticipantSummary[]
}) {
  const [open, setOpen] = useState(false)
  // Liste locale : on l'enrichit en optimiste à l'ajout d'un pote.
  const [list, setList] = useState(participants)
  const [pseudo, setPseudo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const clean = pseudo.trim()
    if (!clean) return
    setError(null)
    const tempId = randomId()
    setList((l) => [...l, { id: tempId, pseudo: clean }])
    setPseudo('')
    startTransition(async () => {
      try {
        const created = await addParticipantProfile(slug, eventId, clean)
        // Remplace l'id temporaire par l'id réel renvoyé par la DB.
        setList((l) => l.map((p) => (p.id === tempId ? created : p)))
      } catch {
        setList((l) => l.filter((p) => p.id !== tempId))
        setError("Ajout impossible, réessaie.")
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-[16px] flex items-center text-left"
      >
        {list.slice(0, 3).map((p) => (
          <div
            key={p.id}
            className="-mr-[11px] flex h-[30px] w-[30px] items-center justify-center rounded-full border-[2.5px] border-ink text-[11px] font-bold text-white"
            style={{ backgroundColor: avatarColor(p.id) }}
          >
            {p.pseudo[0]?.toUpperCase()}
          </div>
        ))}
        {list.length > 3 && (
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full border-[2.5px] border-ink bg-[#3a352e] text-[11px] font-bold text-white">
            +{list.length - 3}
          </div>
        )}
        <span className="ml-4 text-[13px] text-on-dark-2 underline-offset-2 hover:underline">
          {list.length} dans le coup
        </span>
      </button>

      {open && (
        <Sheet onClose={() => setOpen(false)} labelledBy="participants-title">
          <h3 id="participants-title" className="mb-4 font-serif text-[22px] text-ink">
            Les {list.length} potes
          </h3>
          <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
            {list.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-[13px] border-[1.5px] border-line-2 bg-card px-[14px] py-[11px]"
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: avatarColor(p.id) }}
                >
                  {p.pseudo[0]?.toUpperCase()}
                </div>
                <span className="text-[14.5px] font-semibold text-ink">{p.pseudo}</span>
              </div>
            ))}
          </div>

          {/* Ajout d'un pote (profil sans compte) — ouvert à tout membre. */}
          <form onSubmit={handleAdd} className="mt-3 flex gap-2">
            <input
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              maxLength={40}
              placeholder="Ajouter un pote (prénom)…"
              aria-label="Prénom du pote à ajouter"
              className="flex-1 rounded-[13px] border-[1.5px] border-line bg-card px-3 py-2.5 text-[14px] text-ink outline-none focus:border-terracotta placeholder:text-disabled"
            />
            <button
              type="submit"
              disabled={!pseudo.trim()}
              className="shrink-0 rounded-[13px] bg-ink px-4 text-sm font-bold text-white transition-all active:translate-y-px disabled:opacity-50"
            >
              Ajouter
            </button>
          </form>
          {error && <p className="mt-1.5 text-[13px] text-prune">{error}</p>}

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-4 w-full rounded-[15px] border-[1.5px] border-line-3 bg-card p-[16px] font-bold text-ink"
          >
            Fermer
          </button>
        </Sheet>
      )}
    </>
  )
}
