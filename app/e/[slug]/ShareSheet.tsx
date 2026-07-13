'use client'

import { useState } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { LinkIcon } from '@/components/ui/icons'

export function ShareSheet({ slug, title }: { slug: string; title: string }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  // Dérivé du window (client only). La feuille ne se rend que `open` (post-clic,
  // donc hydraté) → pas de mismatch SSR et plus de flash « komo.app/… ».
  const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}/e/${slug}` : ''
  const url = fullUrl.replace(/^https?:\/\//, '')

  async function copy() {
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard refusé — on ignore */
    }
  }

  const waText = encodeURIComponent(`Rejoins « ${title} » sur Komo 👉 ${fullUrl}`)

  return (
    <>
      <Button type="button" tone="ink" onClick={() => setOpen(true)} className="w-full rounded-[17px] p-[17px] text-[15px]">
        <span className="inline-flex items-center justify-center gap-2">
          <LinkIcon className="h-[17px] w-[17px]" /> Partager le lien
        </span>
      </Button>

      {open && (
        <Sheet variant="bottom" onClose={() => setOpen(false)} labelledBy="share-title">
          <div className="mx-auto mb-5 h-[5px] w-[42px] rounded-full bg-line-3" />
          <h2 id="share-title" className="mb-1 font-serif text-[23px] text-ink">Partage le Komo</h2>
            <p className="mb-5 text-[14px] text-muted">
              N&apos;importe qui avec le lien peut se déclarer. Aucun compte requis.
            </p>

            <div className="mb-3 flex items-center justify-between rounded-[14px] border-[1.5px] border-line bg-card px-4 py-[14px]">
              <span className="truncate text-[14px] text-ink">{url}</span>
              <button
                type="button"
                onClick={copy}
                className="ml-3 shrink-0 text-[13px] font-bold text-terracotta"
              >
                {copied ? 'Copié ✓' : 'Copier'}
              </button>
            </div>

            <a
              href={`https://wa.me/?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-[10px] block rounded-[15px] bg-whatsapp p-4 text-center text-[15px] font-bold text-white"
            >
              Envoyer sur WhatsApp
            </a>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full p-2 text-center text-[14px] font-semibold text-muted"
            >
              Fermer
            </button>
        </Sheet>
      )}
    </>
  )
}
