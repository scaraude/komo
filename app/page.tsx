import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-paper flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center">
        <p className="text-xs font-bold tracking-widest uppercase text-terracotta mb-6 flex items-center gap-2 justify-center">
          <span className="w-6 h-0.5 bg-terracotta inline-block" />
          Organise ton event entre potes
          <span className="w-6 h-0.5 bg-terracotta inline-block" />
        </p>

        <h1 className="font-serif font-black text-6xl sm:text-7xl leading-none tracking-tight mb-6 text-ink">
          Komo
        </h1>

        <p className="text-muted text-lg max-w-sm mb-12 leading-relaxed">
          Un lien dans le groupe. Tout le monde se déclare en 30 secondes.
          Qui vient, qui a une caisse, qui cherche encore.
        </p>

        <Link
          href="/new"
          className="bg-terracotta text-white border-2 border-ink rounded-full px-8 py-4 font-bold text-lg shadow-[0_4px_0_rgba(26,20,16,0.9)] active:translate-y-1 active:shadow-none transition-all inline-flex items-center gap-2"
        >
          Créer un event →
        </Link>
      </div>

      <footer className="pb-8 text-center">
        <p className="text-xs text-muted">
          Zéro inscription · Zéro install · Un lien WhatsApp suffit
        </p>
      </footer>
    </main>
  )
}
