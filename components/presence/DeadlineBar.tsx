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
    <div className="bg-terracotta-soft border-[1.5px] border-terracotta-line rounded-[16px] px-4 py-3 mb-6 flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-0">
        {deadline && days !== null ? (
          <p className="text-[13.5px] font-bold text-terracotta-dk">
            ⏳ {days > 0 ? `Deadline dans ${days} jour${days > 1 ? 's' : ''}` : days === 0 ? "Deadline aujourd'hui !" : 'Deadline dépassée'}
            {pendingCount > 0 && (
              <span className="text-body font-normal ml-2">
                · {pendingCount} pote{pendingCount > 1 ? 's' : ''} n'ont pas répondu
              </span>
            )}
          </p>
        ) : (
          isCreator && <p className="text-[13.5px] text-body">Ajouter une deadline de présence</p>
        )}
        {isCreator && editing && (
          <form onSubmit={handleDeadlineChange} className="mt-2 flex gap-2 items-center">
            <input
              name="deadline"
              type="date"
              defaultValue={deadline ?? ''}
              className="border-[1.5px] border-line-2 rounded-[12px] px-3 py-1.5 text-[13px] bg-card text-ink focus:outline-none focus:border-terracotta"
            />
            <button type="submit" className="text-[13px] font-bold text-terracotta">OK</button>
            <button type="button" onClick={() => setEditing(false)} className="text-[13px] text-muted">Annuler</button>
          </form>
        )}
      </div>

      <div className="flex gap-2 shrink-0">
        <button
          onClick={copyLink}
          className="text-[12px] font-bold px-3 py-1.5 bg-card border border-line rounded-full text-ink"
        >
          {copied ? '✓ Copié !' : '🔗 Copier le lien'}
        </button>
        {isCreator && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-[12px] font-bold px-3 py-1.5 bg-card border border-line rounded-full text-ink"
          >
            ✏️ {deadline ? 'Modifier' : 'Deadline'}
          </button>
        )}
      </div>
    </div>
  )
}
