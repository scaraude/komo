import type { ButtonHTMLAttributes } from 'react'

/**
 * Bouton « + » en pointillés pour ajouter un élément (repas, trajet, activité,
 * créneau, hébergement). Centralise la bordure pointillée + l'effet hover ;
 * l'accent de hover dépend de la couleur du module.
 *
 * - `accent="terracotta"` (défaut) · `accent="olive"`.
 * La géométrie (radius, padding, largeur) reste pilotée par `className`.
 */
const ACCENT = {
  terracotta: 'hover:border-terracotta hover:text-terracotta',
  olive: 'hover:border-olive hover:text-olive',
} as const

export function DashedAddButton({
  accent = 'terracotta',
  type = 'button',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { accent?: keyof typeof ACCENT }) {
  return (
    <button
      type={type}
      {...props}
      className={`border-[1.5px] border-dashed border-[var(--color-dashed)] font-semibold text-muted transition-colors ${ACCENT[accent]} ${className}`}
    />
  )
}
