'use client'

import { useState, useTransition } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { PencilIcon } from '@/components/ui/icons'
import { updateEventPitch } from '@/lib/actions/events'
import { PITCH_MAX_LENGTH } from '@/lib/types'

const TEXTAREA =
  'w-full resize-none rounded-[13px] border-[1.5px] border-line bg-card p-[13px] text-[14.5px] leading-[1.45] text-ink outline-none focus:border-terracotta placeholder:text-disabled'

/**
 * « Le plan » : les 2-3 lignes de l'orga en tête de la landing d'un event sans
 * dates. C'est la première chose que lit un invité qui arrive par le lien de
 * partage — le calendrier seul ne donne envie à personne.
 *
 * Vit DANS la card héro noire (d'où les couleurs `on-dark`). Édition réservée
 * aux orgas ; pour un invité sans pitch, il n'y a rien à afficher.
 */
export function EventPitch({
  slug,
  initialPitch,
  canEdit,
}: {
  slug: string
  initialPitch: string | null
  canEdit: boolean
}) {
  const [pitch, setPitch] = useState(initialPitch)
  const [editing, setEditing] = useState(false)

  if (pitch) {
    return (
      <div className="relative mt-[14px]">
        <p className={`whitespace-pre-line text-[14.5px] leading-[1.45] text-on-dark ${canEdit ? 'pr-[34px]' : ''}`}>
          {pitch}
        </p>
        {canEdit && (
          <button
            onClick={() => setEditing(true)}
            aria-label="Modifier le plan"
            className="absolute right-0 top-0 flex h-[28px] w-[28px] items-center justify-center rounded-[9px] text-on-dark-2 transition-colors hover:bg-on-dark/10 hover:text-on-dark"
          >
            <PencilIcon className="h-[13px] w-[13px]" />
          </button>
        )}
        {editing && (
          <EditSheet slug={slug} initialPitch={pitch} onClose={() => setEditing(false)} onSaved={setPitch} />
        )}
      </div>
    )
  }

  // Invité sans pitch : pas de placeholder, l'encart se réduit au titre + lieu.
  if (!canEdit) return null

  return (
    <>
      <button
        onClick={() => setEditing(true)}
        className="mt-[14px] w-full rounded-[15px] border-[1.5px] border-dashed border-on-dark-2/50 px-4 py-[13px] text-left text-[14px] font-semibold text-on-dark-2 transition-colors hover:border-on-dark hover:text-on-dark"
      >
        ✍️ Écris deux lignes pour chauffer la team
      </button>
      {editing && (
        <EditSheet slug={slug} initialPitch="" onClose={() => setEditing(false)} onSaved={setPitch} />
      )}
    </>
  )
}

function EditSheet({
  slug, initialPitch, onClose, onSaved,
}: {
  slug: string
  initialPitch: string
  onClose: () => void
  onSaved: (pitch: string | null) => void
}) {
  const [value, setValue] = useState(initialPitch)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState(false)

  const remaining = PITCH_MAX_LENGTH - value.length

  // Persiste puis réconcilie avec le retour serveur : on ne ferme que si
  // l'écriture a réussi (la RPC refuse les non-orgas), sinon on garde la
  // feuille ouverte avec un message.
  function commit(next: string) {
    setError(false)
    startTransition(async () => {
      const { ok } = await updateEventPitch(slug, next)
      if (!ok) {
        setError(true)
        return
      }
      onSaved(next.trim() || null)
      onClose()
    })
  }

  return (
    <Sheet onClose={onClose} labelledBy="pitch-title">
      <div className="flex flex-col gap-4">
        <div>
          <h3 id="pitch-title" className="font-serif text-[20px] text-ink">Le plan</h3>
          <p className="mt-1 text-[14px] text-body">
            Deux ou trois lignes pour donner envie : ce qu&apos;on va faire, l&apos;ambiance, pourquoi il faut venir.
          </p>
        </div>
        <div>
          <textarea
            autoFocus
            rows={4}
            value={value}
            maxLength={PITCH_MAX_LENGTH}
            onChange={(e) => { setValue(e.target.value); setError(false) }}
            placeholder="Une maison au bord de l'eau, du soleil, des barbeucs et zéro réveil. On part le vendredi soir, on rentre quand on veut."
            className={TEXTAREA}
          />
          <p className={`mt-1 text-right text-[12px] ${remaining <= 20 ? 'font-semibold text-terracotta' : 'text-muted'}`}>
            {remaining}
          </p>
        </div>
        {error && (
          <p className="text-[13px] font-semibold text-prune">
            Impossible d&apos;enregistrer le plan. Réessaie.
          </p>
        )}
        <div className="flex gap-2">
          {initialPitch && (
            <button type="button" onClick={() => commit('')} disabled={pending}
              className="rounded-[15px] px-4 py-[14px] font-semibold text-muted transition-colors hover:text-prune">
              Retirer
            </button>
          )}
          <Button type="button" onClick={() => commit(value)} disabled={pending || !value.trim()}
            className="flex-1 rounded-[15px] p-[14px]">
            Enregistrer
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
