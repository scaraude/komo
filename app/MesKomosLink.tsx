import Link from 'next/link'

/** Pill « Mes Komos » partagée par l'accueil (hero + formulaire de création). */
export function MesKomosLink() {
  return (
    <Link
      href="/mes-komos"
      className="rounded-full border-[1.5px] border-line-3 bg-card px-[14px] py-[8px] text-[13px] font-semibold text-body"
    >
      Mes Komos
    </Link>
  )
}
