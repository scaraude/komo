/**
 * Logo KOMO — charte graphique (mark soleil + vagues, wordmark Fredoka).
 * Le mark reprend la métaphore du logo : un soleil qui se couche sur des
 * vagues qui se croisent (départ / horizon / voyage entre amis).
 */

export function KomoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 32"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      {/* Couleurs de la charte figées en dur : ce sont les couleurs propres au
          logo (asset de marque), indépendantes du thème — et Tailwind v4 élague
          les variables @theme non référencées par une classe utilitaire. */}
      {/* Soleil (dessiné en premier → en partie masqué par les vagues) */}
      <circle cx="15" cy="12" r="7.5" fill="#df402a" />
      {/* Vague lavande (arrière) */}
      <path
        d="M2 15 C9 23 17 23 24 17 C31 11 39 11 46 19"
        stroke="#d1b2e2"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.85"
      />
      {/* Vague orange (avant) */}
      <path
        d="M2 20 C9 12 17 12 24 18 C31 24 39 24 46 16"
        stroke="#fe7a5d"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Logo({
  className = '',
  showSignature = false,
}: {
  className?: string
  showSignature?: boolean
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <KomoMark className="h-7 w-auto" />
      <span className="flex flex-col leading-none">
        <span className="font-serif text-[24px] font-semibold leading-none text-terracotta">
          Komo
        </span>
        {showSignature && (
          <span className="mt-[3px] text-[9px] font-bold uppercase tracking-[2px] text-terracotta/70">
            Crew. Plan. Go.
          </span>
        )}
      </span>
    </span>
  )
}
