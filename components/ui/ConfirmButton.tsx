'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Bouton de suppression/retrait en DEUX clics.
 *
 * 1er clic : le bouton « glisse » et révèle un libellé de confirmation
 * (ex. « Supprimer ? »). 2e clic : déclenche `onConfirm`.
 *
 * Se replie tout seul après `collapseAfter` ms ou sur clic en dehors — pas de
 * suppression accidentelle. Pensé pour être combiné avec `useUndo` : `onConfirm`
 * fait le retrait optimiste puis `requestUndo(...)`.
 */
export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = 'Confirmer ?',
  className = '',
  confirmClassName = 'rounded-[9px] bg-prune px-2.5 py-1 text-[12px] font-bold text-white',
  ariaLabel,
  collapseAfter = 4000,
}: {
  /** Action réelle, jouée au 2e clic. */
  onConfirm: () => void
  /** Contenu au repos (icône et/ou texte). */
  children: React.ReactNode
  /** Libellé révélé après le 1er clic. */
  confirmLabel?: string
  /** Classe du bouton au repos. */
  className?: string
  /** Classe du bouton de confirmation. */
  confirmClassName?: string
  ariaLabel?: string
  /** Délai de repli automatique en ms (défaut 4000). */
  collapseAfter?: number
}) {
  const [armed, setArmed] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), collapseAfter)
    function onDocPointer(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setArmed(false)
    }
    document.addEventListener('pointerdown', onDocPointer)
    return () => {
      clearTimeout(t)
      document.removeEventListener('pointerdown', onDocPointer)
    }
  }, [armed, collapseAfter])

  return (
    <span ref={ref} className="inline-flex items-center">
      {armed ? (
        <button
          type="button"
          onClick={() => {
            setArmed(false)
            onConfirm()
          }}
          className={`animate-fade-in ${confirmClassName}`}
        >
          {confirmLabel}
        </button>
      ) : (
        <button
          type="button"
          aria-label={ariaLabel}
          onClick={() => setArmed(true)}
          className={className}
        >
          {children}
        </button>
      )}
    </span>
  )
}
