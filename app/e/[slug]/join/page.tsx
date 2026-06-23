import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'
import { JoinForm } from './JoinForm'
import { formatEventDates } from '@/lib/format'

export default async function JoinPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('id, title, date_start, date_end, destination')
    .eq('slug', slug)
    .single()

  if (!event) notFound()

  // Email déjà lié à l'identité → inutile de le redemander.
  const user = await getAuthUser()
  const showEmail = !user?.email

  // Déjà participant (ex. retour de magic link « relier ») → droit à l'event,
  // pas de re-formulaire ni de doublon.
  if (user) {
    const { data: already } = await supabase
      .from('participants')
      .select('id')
      .eq('event_id', event.id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (already) redirect(`/e/${slug}`)
  }

  const dateLabel = formatEventDates(event.date_start, event.date_end, { fallback: 'Date à définir' })

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <p className="text-xs font-bold tracking-widest uppercase text-terracotta mb-3 flex items-center gap-2">
          <span className="w-6 h-0.5 bg-terracotta inline-block" />
          Komo · lien reçu
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

        <JoinForm slug={slug} showEmail={showEmail} />
      </div>
    </main>
  )
}
