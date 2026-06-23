import type { HTMLAttributes } from 'react'

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
