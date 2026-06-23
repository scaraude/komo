import type { ButtonHTMLAttributes } from 'react'

/**
 * Bouton CTA « poussoir » de l'app : fond plein, ombre portée de 4px qui
 * s'écrase à l'appui (`active:translate-y-1`). Centralise la partie verbeuse
 * identique répétée dans ~9 endroits ; la géométrie (largeur, radius, padding)
 * reste pilotée par `className` au cas par cas.
 *
 * - `tone="terracotta"` (défaut) : CTA principal.
 * - `tone="ink"` : CTA neutre foncé (partage, etc.).
 *
 * `type="button"` par défaut (un `<button>` nu vaut `submit` et soumettrait le
 * formulaire parent) ; passer `type="submit"` explicitement pour un envoi.
 * `className` est concaténé après la base : éviter d'y passer un utilitaire qui
 * entre en conflit (l'ordre gagnant dépend du CSS généré, pas de la chaîne).
 */
const TONE = {
  terracotta: 'bg-terracotta text-white shadow-[0_4px_0_var(--color-terracotta-dk)]',
  ink: 'bg-ink text-white shadow-[0_4px_0_rgba(0,0,0,0.25)]',
} as const

export function Button({
  tone = 'terracotta',
  type = 'button',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: keyof typeof TONE }) {
  return (
    <button
      type={type}
      {...props}
      className={`text-center font-bold transition-all active:translate-y-1 active:shadow-none disabled:opacity-60 ${TONE[tone]} ${className}`}
    />
  )
}
