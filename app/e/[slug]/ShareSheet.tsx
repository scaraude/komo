'use client'

import { useEffect, useState } from 'react'

export function ShareSheet({ slug, title }: { slug: string; title: string }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [url, setUrl] = useState(`komo.app/${slug}`)
  const [fullUrl, setFullUrl] = useState('')

  useEffect(() => {
    const u = `${window.location.origin}/e/${slug}`
    setFullUrl(u)
    setUrl(u.replace(/^https?:\/\//, ''))
  }, [slug])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-[17px] bg-ink p-[17px] text-center text-[15px] font-bold text-white shadow-[0_4px_0_rgba(0,0,0,0.25)] transition-all active:translate-y-1 active:shadow-none"
      >
        🔗 Partager le lien
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-[rgba(25,20,12,0.45)]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-sheet-up w-full max-w-[440px] rounded-t-[28px] bg-sheet px-[22px] pb-[30px] pt-6"
          >
            <div className="mx-auto mb-5 h-[5px] w-[42px] rounded-full bg-line-3" />
            <h2 className="mb-1 font-serif text-[23px] text-ink">Partage le Komo</h2>
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
          </div>
        </div>
      )}
    </>
  )
}
