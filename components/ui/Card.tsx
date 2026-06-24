import type { HTMLAttributes } from 'react'

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={`border-[1.5px] border-line-2 bg-card shadow-card ${className}`} />
  )
}
