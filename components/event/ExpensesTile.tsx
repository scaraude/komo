'use client'

import { useState, useTransition } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { updateTricountUrl } from '@/lib/actions/events'

const TILE =
  'flex h-[94px] flex-col justify-between rounded-[19px] border-[1.5px] p-[17px] text-left'
const INPUT =
  'w-full bg-card border-[1.5px] border-line rounded-[13px] p-[13px] text-[14.5px] text-ink outline-none focus:border-terracotta placeholder:text-disabled'

// Tuile « Frais » de l'accueil : entrée event-wide vers le Tricount/cagnotte.
// Pas de gestion de dépenses en interne — juste un lien de partage collé par
// l'orga (créateur) que tous ouvrent. L'édition n'est offerte qu'à l'admin.
export function ExpensesTile({
  slug, initialUrl, isAdmin,
}: {
  slug: string
  initialUrl: string | null
  isAdmin: boolean
}) {
  const [url, setUrl] = useState(initialUrl)
  const [editing, setEditing] = useState(false)

  // Lien défini : la tuile ouvre le Tricount ; l'admin peut le modifier (crayon).
  if (url) {
    return (
      <div className="relative">
        <a href={url} target="_blank" rel="noopener noreferrer"
          className={`${TILE} border-line-2 bg-card shadow-card`}>
          <div className="text-[23px]">💸</div>
          <div>
            <div className="text-[15px] font-bold text-ink">Frais</div>
            <div className="text-[12.5px] text-muted">Ouvrir le Tricount</div>
          </div>
        </a>
        {isAdmin && (
          <button onClick={() => setEditing(true)} aria-label="Modifier le lien Tricount"
            className="absolute right-2 top-2 flex h-[28px] w-[28px] items-center justify-center rounded-[9px] text-[13px] text-muted hover:bg-soft transition-colors">
            ✎
          </button>
        )}
        {editing && (
          <EditSheet slug={slug} initialUrl={url} onClose={() => setEditing(false)} onSaved={setUrl} />
        )}
      </div>
    )
  }

  // Pas de lien : l'admin peut en ajouter un ; les autres voient « bientôt ».
  if (!isAdmin) {
    return (
      <div className={`${TILE} border-dashed border-[var(--color-dashed)] bg-soft`}>
        <div className="text-[23px] opacity-50">💸</div>
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
        <div className="text-[23px]">💸</div>
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

  function save(next: string) {
    const clean = next.trim()
    // Reflète l'état localement (le server action normalise/persiste).
    onSaved(clean || null)
    onClose()
    startTransition(() => updateTricountUrl(slug, clean))
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
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://tricount.com/…" className={INPUT} />
        <div className="flex gap-2">
          {initialUrl && (
            <button type="button" onClick={() => save('')} disabled={pending}
              className="rounded-[15px] px-4 py-[14px] font-semibold text-muted hover:text-prune transition-colors">
              Retirer
            </button>
          )}
          <Button type="button" onClick={() => save(value)} disabled={pending || !value.trim()}
            className="flex-1 rounded-[15px] p-[14px]">
            Enregistrer
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
