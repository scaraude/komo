'use client'

import { useState } from 'react'

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
  participants,
}: {
  participants: ParticipantSummary[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-[16px] flex items-center text-left"
      >
        {participants.slice(0, 3).map((p) => (
          <div
            key={p.id}
            className="-mr-[11px] flex h-[30px] w-[30px] items-center justify-center rounded-full border-[2.5px] border-ink text-[11px] font-bold text-white"
            style={{ backgroundColor: avatarColor(p.id) }}
          >
            {p.pseudo[0]?.toUpperCase()}
          </div>
        ))}
        {participants.length > 3 && (
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full border-[2.5px] border-ink bg-[#3a352e] text-[11px] font-bold text-white">
            +{participants.length - 3}
          </div>
        )}
        <span className="ml-4 text-[13px] text-on-dark-2 underline-offset-2 hover:underline">
          {participants.length} dans le coup
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-4 sm:items-center">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md rounded-[22px] bg-paper p-6 shadow-[0_8px_40px_rgba(60,45,20,0.18)]">
            <h3 className="mb-4 font-serif text-[22px] text-ink">
              Les {participants.length} potes
            </h3>
            <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
              {participants.map((p) => (
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
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-5 w-full rounded-[15px] border-[1.5px] border-line-3 bg-card p-[16px] font-bold text-ink"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  )
}
