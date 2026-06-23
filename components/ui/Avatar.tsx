import type { HTMLAttributes } from 'react'

/**
 * Pastille ronde avec l'initiale d'un pseudo. Centralise le garde
 * `pseudo[0]?` (pseudo vide → « ? » au lieu d'un crash) et la structure de
 * base ; la taille et les couleurs restent pilotées par `className`.
 */
export function Avatar({
  pseudo,
  className = '',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { pseudo: string }) {
  return (
    <span
      {...props}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${className}`}
    >
      {pseudo[0]?.toUpperCase() ?? '?'}
    </span>
  )
}
