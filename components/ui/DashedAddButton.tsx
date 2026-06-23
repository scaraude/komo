import type { ButtonHTMLAttributes } from 'react'

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
