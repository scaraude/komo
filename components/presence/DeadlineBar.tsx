'use client'

import { useEffect, useState, useTransition } from 'react'
import { updateDeadline } from '@/lib/actions/events'

function daysUntil(dateStr: string): number {
  const deadline = new Date(dateStr)
  deadline.setHours(23, 59, 59, 999)
  const now = new Date()
  return Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function DeadlineBar({
  slug,
  deadline,
  pendingCount,
  isCreator,
}: {
  slug: string
  deadline: string | null
  pendingCount: number
  isCreator: boolean
}) {
  const [days, setDays] = useState(deadline ? daysUntil(deadline) : null)
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (!deadline) return
    setDays(daysUntil(deadline))
    const id = setInterval(() => setDays(daysUntil(deadline!)), 60_000)
    return () => clearInterval(id)
  }, [deadline])

  function copyLink() {
    const url = `${window.location.origin}/e/${slug}`
    const text = deadline
      ? `Déclare-toi avant le ${new Date(deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} : ${url}`
      : url
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDeadlineChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const val = (e.currentTarget.elements.namedItem('deadline') as HTMLInputElement).value
    startTransition(async () => {
      await updateDeadline(slug, val)
      setEditing(false)
    })
  }

  if (!deadline && !isCreator) return null

  return (
    <div className="bg-amber/15 border border-amber rounded-2xl px-4 py-3 mb-6 flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-0">
        {deadline && days !== null ? (
          <p className="text-sm font-semibold">
            ⏳ {days > 0 ? `Deadline dans ${days} jour${days > 1 ? 's' : ''}` : days === 0 ? "Deadline aujourd'hui !" : 'Deadline dépassée'}
            {pendingCount > 0 && (
              <span className="text-muted font-normal ml-2">
                · {pendingCount} pote{pendingCount > 1 ? 's' : ''} n'ont pas répondu
              </span>
            )}
          </p>
        ) : (
          isCreator && <p className="text-sm text-muted">Ajouter une deadline de présence</p>
        )}
        {isCreator && editing && (
          <form onSubmit={handleDeadlineChange} className="mt-2 flex gap-2">
            <input
              name="deadline"
              type="date"
              defaultValue={deadline ?? ''}
              className="border-2 border-ink rounded-lg px-3 py-1.5 text-sm bg-paper focus:outline-none focus:border-terracotta"
            />
            <button type="submit" className="text-sm font-semibold text-terracotta">OK</button>
            <button type="button" onClick={() => setEditing(false)} className="text-sm text-muted">Annuler</button>
          </form>
        )}
      </div>

      <div className="flex gap-2 shrink-0">
        <button
          onClick={copyLink}
          className="text-xs font-semibold px-3 py-1.5 bg-card border border-line rounded-full"
        >
          {copied ? '✓ Copié !' : '🔗 Copier le lien'}
        </button>
        {isCreator && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs font-semibold px-3 py-1.5 bg-card border border-line rounded-full"
          >
            ✏️ {deadline ? 'Modifier' : 'Deadline'}
          </button>
        )}
      </div>
    </div>
  )
}
