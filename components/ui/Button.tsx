import type { ButtonHTMLAttributes } from 'react'

const TONE = {
  terracotta: 'bg-terracotta text-white shadow-[0_4px_0_var(--color-terracotta-dk)]',
  ink: 'bg-ink text-white shadow-[0_4px_0_rgba(0,0,0,0.25)]',
  olive: 'bg-olive text-white shadow-[0_4px_0_var(--color-olive-text-dk)]',
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
