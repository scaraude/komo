import { googleMapsUrl } from '@/lib/maps'

/**
 * Un lieu cliquable qui s'ouvre dans Google Maps (nouvel onglet).
 * `query` = ce qu'on cherche sur Maps ; `children` = ce qu'on affiche
 * (par défaut, le `query` lui-même).
 */
export function PlaceLink({
  query,
  children,
  className = '',
}: {
  query: string
  children?: React.ReactNode
  className?: string
}) {
  return (
    <a
      href={googleMapsUrl(query)}
      target="_blank"
      rel="noopener noreferrer"
      title={`Ouvrir « ${query} » dans Google Maps`}
      className={className}
    >
      {children ?? query}
    </a>
  )
}
