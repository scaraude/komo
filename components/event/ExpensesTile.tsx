'use client'

import { useState, useTransition } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { BanknoteIcon, PencilIcon } from '@/components/ui/icons'
import { updateTricountUrl } from '@/lib/actions/events'

// Pleine largeur (col-span-2) : évite la 5ᵉ tuile orpheline dans la grille 2×2.
const TILE =
  'col-span-2 flex w-full items-center gap-[13px] rounded-[19px] border-[1.5px] p-[17px] text-left'
const INPUT =
  'w-full bg-card border-[1.5px] border-line rounded-[13px] p-[13px] text-[14.5px] text-ink outline-none focus:border-terracotta placeholder:text-disabled'

// Tuile « Frais » de l'accueil : entrée event-wide vers le Tricount/cagnotte.
// Pas de gestion de dépenses en interne — juste un lien de partage que tous
// ouvrent. Comme la page event est réservée aux membres, tout membre peut le
// coller ou le modifier (canEdit) ; l'écrasement/retrait passe par une confirm.
export function ExpensesTile({
  slug, initialUrl, canEdit,
}: {
  slug: string
  initialUrl: string | null
  canEdit: boolean
}) {
  const [url, setUrl] = useState(initialUrl)
  const [editing, setEditing] = useState(false)

  // Lien défini : la tuile ouvre le Tricount ; un membre peut le modifier (crayon).
  if (url) {
    return (
      <div className="relative col-span-2">
        <a href={url} target="_blank" rel="noopener noreferrer"
          className={`${TILE} border-line-2 bg-card shadow-card ${canEdit ? 'pr-[52px]' : ''}`}>
          <BanknoteIcon className="h-[23px] w-[23px] shrink-0 text-terracotta" />
          <div className="flex-1">
            <div className="text-[15px] font-bold text-ink">Frais</div>
            <div className="text-[12.5px] text-muted">Ouvrir le Tricount</div>
          </div>
          {!canEdit && <span className="text-[13px] font-bold text-terracotta">ouvrir ›</span>}
        </a>
        {canEdit && (
          <button onClick={() => setEditing(true)} aria-label="Modifier le lien Tricount"
            className="absolute right-[14px] top-1/2 flex h-[28px] w-[28px] -translate-y-1/2 items-center justify-center rounded-[9px] text-muted hover:bg-soft transition-colors">
            <PencilIcon className="h-[13px] w-[13px]" />
          </button>
        )}
        {editing && (
          <EditSheet slug={slug} initialUrl={url} onClose={() => setEditing(false)} onSaved={setUrl} />
        )}
      </div>
    )
  }

  // Pas de lien : un membre sans droit d'édition voit « bientôt » (défensif —
  // sur la page event, canEdit est toujours vrai).
  if (!canEdit) {
    return (
      <div className={`${TILE} border-dashed border-[var(--color-dashed)] bg-soft`}>
        <BanknoteIcon className="h-[23px] w-[23px] shrink-0 text-disabled" />
        <div>
          <div className="text-[15px] font-bold text-disabled">Frais</div>
          <div className="text-[12.5px] text-disabled">bientôt</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <button onClick={() => setEditing(true)}
        className={`${TILE} border-dashed border-[var(--color-dashed)] bg-soft`}>
        <BanknoteIcon className="h-[23px] w-[23px] shrink-0 text-terracotta" />
        <div>
          <div className="text-[15px] font-bold text-ink">Frais</div>
          <div className="text-[12.5px] text-terracotta font-semibold">＋ lien Tricount</div>
        </div>
      </button>
      {editing && (
        <EditSheet slug={slug} initialUrl="" onClose={() => setEditing(false)} onSaved={setUrl} />
      )}
    </>
  )
}

function EditSheet({
  slug, initialUrl, onClose, onSaved,
}: {
  slug: string
  initialUrl: string
  onClose: () => void
  onSaved: (url: string | null) => void
}) {
  const [value, setValue] = useState(initialUrl)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState(false)
  // Le lien est partagé (tout membre peut l'éditer) : on confirme avant
  // d'écraser ('save') ou de retirer ('remove') un lien existant.
  const [confirm, setConfirm] = useState<null | 'save' | 'remove'>(null)

  // Persiste puis réconcilie avec le retour serveur : on ne ferme et ne met à
  // jour l'affichage QUE si l'écriture a réussi (sinon on garde le Sheet ouvert
  // avec un message — plus d'optimistic « fantôme » perdu au reload).
  function commit(next: string) {
    const clean = next.trim()
    setError(false)
    startTransition(async () => {
      const { ok } = await updateTricountUrl(slug, clean)
      if (!ok) {
        setError(true)
        setConfirm(null)
        return
      }
      onSaved(clean || null)
      onClose()
    })
  }

  function requestSave() {
    // Écrasement d'un lien existant différent → confirmation ; ajout → direct.
    if (initialUrl && value.trim() !== initialUrl) setConfirm('save')
    else commit(value)
  }

  if (confirm) {
    const removing = confirm === 'remove'
    return (
      <Sheet onClose={onClose}>
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="font-serif text-[20px] text-ink">
              {removing ? 'Retirer le lien ?' : 'Remplacer le lien ?'}
            </h3>
            <p className="mt-1 text-[14px] text-body">
              {removing
                ? 'Le lien disparaîtra pour tout le monde.'
                : 'Le lien actuel sera remplacé pour tout le monde.'}
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirm(null)} disabled={pending}
              className="rounded-[15px] px-4 py-[14px] font-semibold text-muted hover:text-prune transition-colors">
              Annuler
            </button>
            <Button type="button" onClick={() => commit(removing ? '' : value)} disabled={pending}
              className="flex-1 rounded-[15px] p-[14px]">
              {removing ? 'Retirer' : 'Remplacer'}
            </Button>
          </div>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="font-serif text-[20px] text-ink">Lien Tricount</h3>
          <p className="mt-1 text-[14px] text-body">
            Colle le lien de partage de ton Tricount (ou cagnotte) : tout le monde pourra l&apos;ouvrir.
          </p>
        </div>
        <input autoFocus type="url" inputMode="url" value={value}
          onChange={(e) => { setValue(e.target.value); setError(false) }}
          placeholder="https://tricount.com/…" className={INPUT} />
        {error && (
          <p className="text-[13px] font-semibold text-prune">
            Impossible d&apos;enregistrer le lien. Réessaie.
          </p>
        )}
        <div className="flex gap-2">
          {initialUrl && (
            <button type="button" onClick={() => setConfirm('remove')} disabled={pending}
              className="rounded-[15px] px-4 py-[14px] font-semibold text-muted hover:text-prune transition-colors">
              Retirer
            </button>
          )}
          <Button type="button" onClick={requestSave} disabled={pending || !value.trim()}
            className="flex-1 rounded-[15px] p-[14px]">
            Enregistrer
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
