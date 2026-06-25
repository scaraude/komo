'use client'

import { useState, useTransition } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import { ConfirmButton } from '@/components/ui/ConfirmButton'
import { useUndo } from '@/components/ui/undo'
import {
  addParticipantProfile,
  deleteParticipantProfile,
  getProfileAttachments,
  leaveEvent,
} from '@/lib/actions/participants'
import { randomId } from '@/lib/uuid'

const AVATAR_COLORS = ['#c4602f', '#5f7a3e', '#9a8a6a', '#3a7ca5', '#9a5a6e']

type ParticipantSummary = {
  id: string
  pseudo: string
  hasAccount: boolean
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
  currentParticipantId,
  isCreator,
  participants,
}: {
  slug: string
  eventId: string
  currentParticipantId: string
  isCreator: boolean
  participants: ParticipantSummary[]
}) {
  const [open, setOpen] = useState(false)
  // Liste locale : enrichie/réduite en optimiste (ajout & suppression de potes).
  const [list, setList] = useState(participants)
  const [pseudo, setPseudo] = useState('')
  const [error, setError] = useState<string | null>(null)
  // Alerte de rattachement avant suppression d'un profil lié à des données.
  const [attachAlert, setAttachAlert] = useState<{ id: string; pseudo: string; links: string[] } | null>(null)
  const [checkingId, setCheckingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const requestUndo = useUndo()

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const clean = pseudo.trim()
    if (!clean) return
    setError(null)
    const tempId = randomId()
    setList((l) => [...l, { id: tempId, pseudo: clean, hasAccount: false }])
    setPseudo('')
    startTransition(async () => {
      try {
        const created = await addParticipantProfile(slug, eventId, clean)
        setList((l) => l.map((p) => (p.id === tempId ? { ...created, hasAccount: false } : p)))
      } catch {
        setList((l) => l.filter((p) => p.id !== tempId))
        setError('Ajout impossible, réessaie.')
      }
    })
  }

  // 2e clic du ConfirmButton : on vérifie d'abord les rattachements.
  function requestDelete(profile: ParticipantSummary) {
    setError(null)
    setCheckingId(profile.id)
    startTransition(async () => {
      try {
        const links = await getProfileAttachments(profile.id)
        if (links.length > 0) {
          setAttachAlert({ id: profile.id, pseudo: profile.pseudo, links })
        } else {
          performDelete(profile.id, profile.pseudo)
        }
      } catch {
        setError('Action impossible, réessaie.')
      } finally {
        setCheckingId(null)
      }
    })
  }

  // Suppression optimiste + bandeau d'annulation (commit serveur différé 30 s).
  function performDelete(id: string, name: string) {
    const idx = list.findIndex((p) => p.id === id)
    const removed = list[idx]
    if (!removed) return
    setAttachAlert(null)
    setList((l) => l.filter((p) => p.id !== id))
    requestUndo({
      message: `${name} supprimé`,
      commit: () => deleteParticipantProfile(slug, id),
      undo: () =>
        setList((prev) =>
          prev.some((p) => p.id === id)
            ? prev
            : [...prev.slice(0, idx), removed, ...prev.slice(idx)],
        ),
    })
  }

  function handleLeave() {
    startTransition(async () => {
      try {
        await leaveEvent(slug)
      } catch {
        setError('Impossible de quitter, réessaie.')
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

          <div className="flex max-h-[46vh] flex-col gap-2 overflow-y-auto">
            {list.map((p) => {
              const isSelf = p.id === currentParticipantId
              return (
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
                  <span className="text-[14.5px] font-semibold text-ink">
                    {p.pseudo}
                    {isSelf && <span className="ml-1.5 text-xs font-normal text-terracotta">(toi)</span>}
                    {!p.hasAccount && (
                      <span className="ml-2 rounded-full bg-soft px-1.5 py-0.5 text-[11px] font-medium text-muted">
                        sans compte
                      </span>
                    )}
                  </span>
                  {/* Seuls les profils sans compte sont supprimables ici. */}
                  {!p.hasAccount && !isSelf && (
                    <span className="ml-auto">
                      <ConfirmButton
                        onConfirm={() => requestDelete(p)}
                        confirmLabel="Supprimer ?"
                        ariaLabel={`Supprimer ${p.pseudo}`}
                        className="text-[13px] text-muted transition-colors hover:text-prune"
                      >
                        {checkingId === p.id ? '…' : '🗑'}
                      </ConfirmButton>
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Alerte : le profil est rattaché à des données. */}
          {attachAlert && (
            <div className="mt-3 rounded-[13px] border-[1.5px] border-prune/40 bg-prune-soft p-3">
              <p className="text-[13px] text-ink">
                <b>{attachAlert.pseudo}</b> est rattaché à {attachAlert.links.join(', ')}. Ces
                éléments seront retirés ou détachés.
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setAttachAlert(null)}
                  className="flex-1 rounded-[11px] border-[1.5px] border-line-3 bg-card py-2 text-[13px] font-bold text-ink"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => performDelete(attachAlert.id, attachAlert.pseudo)}
                  className="flex-1 rounded-[11px] bg-prune py-2 text-[13px] font-bold text-white active:translate-y-px"
                >
                  Supprimer quand même
                </button>
              </div>
            </div>
          )}

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

          {/* Quitter le Komo (sauf créateur). */}
          {isCreator ? (
            <p className="mt-4 text-center text-[12.5px] text-muted">
              En tant que créateur·ice, tu ne peux pas quitter ce Komo.
            </p>
          ) : (
            <div className="mt-4 flex justify-center">
              <ConfirmButton
                onConfirm={handleLeave}
                confirmLabel="Quitter pour de bon ?"
                className="text-[13px] font-semibold text-muted transition-colors hover:text-prune"
                confirmClassName="rounded-[11px] bg-prune px-3 py-1.5 text-[13px] font-bold text-white"
              >
                Quitter le Komo
              </ConfirmButton>
            </div>
          )}

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
