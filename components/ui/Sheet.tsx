'use client'

import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * Feuille / modale unique de l'app. Le parent la monte conditionnellement
 * (`{open && <Sheet onClose={…}>…</Sheet>}`) — le montage = ouverture.
 *
 * Gère : overlay + clic extérieur, Échap, verrou du scroll body, focus-trap
 * (Tab cyclique) et restauration du focus à la fermeture. Respecte un `autoFocus`
 * déjà présent dans le contenu (ne le vole pas).
 *
 * - `variant="modal"` (défaut) : bas sur mobile, centré sur desktop, fond papier.
 * - `variant="bottom"` : feuille basse arrondie en haut (façon partage).
 */
export function Sheet({
  onClose,
  children,
  variant = 'modal',
  className = '',
  labelledBy,
}: {
  onClose: () => void
  children: React.ReactNode
  variant?: 'modal' | 'bottom'
  className?: string
  labelledBy?: string
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  // `onClose` est souvent une arrow inline (identité changeante à chaque render).
  // On la lit via une ref pour que l'effet ne tourne qu'au montage — sinon il se
  // rejoue à chaque frappe et vole le focus (le cleanup restaure puis re-focus
  // le 1er élément focusable du panel).
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const panel = panelRef.current
    // Ne vole pas un autoFocus déjà appliqué dans le contenu.
    if (panel && !panel.contains(document.activeElement)) {
      ;(panel.querySelector<HTMLElement>(FOCUSABLE) ?? panel).focus()
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (e.key === 'Tab' && panel) {
        const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
        if (items.length === 0) return
        const first = items[0]!
        const last = items[items.length - 1]!
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      previouslyFocused?.focus?.()
    }
    // Montage uniquement : `onClose` est lu via `onCloseRef` (voir plus haut).
  }, [])

  const isBottom = variant === 'bottom'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onClick={onClose}
      className={
        isBottom
          ? 'animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-[rgba(25,20,12,0.45)]'
          : 'fixed inset-0 z-50 flex items-end justify-center px-4 pb-4 sm:items-center'
      }
    >
      {!isBottom && <div className="absolute inset-0 bg-ink/40" />}
      <div
        ref={panelRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={
          isBottom
            ? `animate-sheet-up w-full max-w-[440px] rounded-t-[28px] bg-sheet px-[22px] pb-[30px] pt-6 outline-none ${className}`
            : `animate-sheet-up relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[22px] bg-paper p-6 shadow-[0_8px_40px_rgba(60,45,20,0.18)] outline-none ${className}`
        }
      >
        {children}
      </div>
    </div>
  )
}
