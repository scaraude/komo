import type { HTMLAttributes } from 'react'

type AvatarProps = HTMLAttributes<HTMLElement> & { pseudo: string; avatarUrl?: string | null }

export function Avatar({ pseudo, avatarUrl, className = '', ...props }: AvatarProps) {
  if (avatarUrl) {
    return (
      <img
        {...props}
        src={avatarUrl}
        alt={pseudo}
        className={`inline-block shrink-0 rounded-full object-cover ${className}`}
      />
    )
  }
  return (
    <span
      {...props}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${className}`}
    >
      {pseudo[0]?.toUpperCase() ?? '?'}
    </span>
  )
}
