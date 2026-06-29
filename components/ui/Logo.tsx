import Image from 'next/image'

/**
 * Logo KOMO — assets de marque (charte). Le mark (soleil + vagues) et le
 * logotype complet sont les PNG transparents fournis, détourés sur fond crème.
 * Dimensions intrinsèques des fichiers dans /public.
 */

export function KomoMark({ className }: { className?: string }) {
  return (
    <Image
      src="/komo-mark.png"
      alt=""
      width={1274}
      height={496}
      className={className}
    />
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
      <KomoMark className="h-6 w-auto" />
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
