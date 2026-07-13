'use client'

import { useState, useTransition } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { sendFeedback } from '@/lib/actions/feedback'
import { MessageIcon } from '@/components/ui/icons'

/**
 * Point d'entrée feedback : un déclencheur discret + une modale (textarea + Envoyer).
 * `eventId` est joint au feedback quand on est dans un event (contexte utile).
 */
export function FeedbackButton({
  eventId,
  className,
  children,
}: {
  eventId?: string | null
  className?: string
  children?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit() {
    const message = value.trim()
    if (!message) return
    setError(null)
    startTransition(async () => {
      try {
        await sendFeedback({
          message,
          eventId: eventId ?? null,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        })
        setSent(true)
        setValue('')
      } catch {
        setError("Oups, l'envoi a échoué. Réessaie.")
      }
    })
  }

  function close() {
    setOpen(false)
    // Réinitialise après l'animation de fermeture.
    setTimeout(() => {
      setSent(false)
      setError(null)
    }, 250)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          'mx-auto mt-7 block text-[13px] font-semibold text-muted transition-colors hover:text-terracotta'
        }
      >
        {children ?? (
          <span className="inline-flex items-center gap-1.5">
            <MessageIcon className="h-[13px] w-[13px] shrink-0" /> Un avis sur Komo ?
          </span>
        )}
      </button>

      {open && (
        <Sheet onClose={close} labelledBy="feedback-title">
          {sent ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <span className="text-[34px]">🙏</span>
              <h3 id="feedback-title" className="font-serif text-[20px] text-ink">
                Merci pour ton retour !
              </h3>
              <p className="text-[14px] text-body">C&apos;est bien arrivé, on lit tout.</p>
              <Button onClick={close} className="mt-1 rounded-[15px] px-6 py-2.5 text-sm">
                Fermer
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div>
                <h3 id="feedback-title" className="font-serif text-[20px] text-ink">
                  Un avis, une idée, un bug&nbsp;?
                </h3>
                <p className="mt-1 text-[14px] text-body">
                  Dis-nous tout — ça nous aide à améliorer Komo.
                </p>
              </div>
              <textarea
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                maxLength={2000}
                rows={5}
                placeholder="Ce qui te plaît, ce qui coince, ce qui manque…"
                className="w-full resize-none rounded-[13px] border-[1.5px] border-line bg-card p-3 text-[14.5px] text-ink outline-none focus:border-terracotta placeholder:text-disabled"
              />
              {error && <p className="text-[13px] text-prune">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={close}
                  className="flex-1 rounded-[15px] border-[1.5px] border-line-3 bg-card py-2.5 text-sm font-bold"
                >
                  Annuler
                </button>
                <Button
                  onClick={submit}
                  disabled={pending || !value.trim()}
                  className="flex-1 rounded-[15px] py-2.5 text-sm"
                >
                  {pending ? 'Envoi…' : 'Envoyer →'}
                </Button>
              </div>
            </div>
          )}
        </Sheet>
      )}
    </>
  )
}
