import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { joinEvent } from '@/lib/actions/participants'

export default async function JoinPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('title, date_start, date_end, destination')
    .eq('slug', slug)
    .single()

  if (!event) notFound()

  const dateLabel = event.date_start === event.date_end
    ? new Date(event.date_start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    : `${new Date(event.date_start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} → ${new Date(event.date_end).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`

  const joinWithSlug = joinEvent.bind(null, slug)

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <p className="text-xs font-bold tracking-widest uppercase text-terracotta mb-3 flex items-center gap-2">
          <span className="w-6 h-0.5 bg-terracotta inline-block" />
          Plan · lien reçu
        </p>

        <h1 className="font-serif font-black text-4xl leading-none tracking-tight mb-4">
          {event.title}
        </h1>

        <div className="flex flex-wrap gap-2 mb-8">
          <span className="inline-flex items-center gap-1.5 bg-card border border-line rounded-full px-3 py-1 text-sm font-medium">
            📅 {dateLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 bg-card border border-line rounded-full px-3 py-1 text-sm font-medium">
            📍 {event.destination}
          </span>
        </div>

        <div className="bg-card border-2 border-ink rounded-2xl p-6 shadow-[5px_5px_0_rgba(26,20,16,0.9)]">
          <p className="font-semibold text-lg mb-1">Tu es invité·e 🎉</p>
          <p className="text-muted text-sm mb-5">Choisis un pseudo pour rejoindre.</p>

          <form action={joinWithSlug}>
            <label className="block text-sm font-semibold mb-1.5" htmlFor="pseudo">
              Ton pseudo
            </label>
            <input
              id="pseudo"
              name="pseudo"
              type="text"
              required
              minLength={1}
              maxLength={30}
              placeholder="ex: Marco, Inès, YoYo…"
              autoFocus
              className="w-full border-2 border-ink rounded-xl px-4 py-3 text-base bg-paper focus:outline-none focus:border-terracotta transition-colors mb-4"
            />
            <button
              type="submit"
              className="w-full bg-terracotta text-white border-2 border-ink rounded-full px-6 py-3.5 font-bold text-base shadow-[0_4px_0_rgba(26,20,16,0.9)] active:translate-y-1 active:shadow-none transition-all"
            >
              Rejoindre l'event →
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
