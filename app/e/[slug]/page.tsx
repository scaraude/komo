import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSessionToken } from '@/lib/session'

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!event) notFound()

  const sessionToken = await getSessionToken(slug)
  if (!sessionToken) redirect(`/e/${slug}/join`)

  const { data: participant } = await supabase
    .from('participants')
    .select('*')
    .eq('event_id', event.id)
    .eq('session_token', sessionToken)
    .single()

  if (!participant) redirect(`/e/${slug}/join`)

  const dateLabel = event.date_start === event.date_end
    ? new Date(event.date_start).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })
    : `${new Date(event.date_start).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })} → ${new Date(event.date_end).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })}`

  return (
    <div className="max-w-4xl mx-auto px-4 pb-20">
      <header className="pt-10 pb-6">
        <p className="text-xs font-bold tracking-widest uppercase text-terracotta mb-3 flex items-center gap-2">
          <span className="w-6 h-0.5 bg-terracotta inline-block" />
          Plan · ton event
        </p>
        <h1 className="font-serif font-black text-5xl leading-none tracking-tight mb-4">
          {event.title}
        </h1>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 bg-card border border-line rounded-full px-3 py-1.5 text-sm font-medium">
            📅 {dateLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 bg-card border border-line rounded-full px-3 py-1.5 text-sm font-medium">
            📍 {event.destination}
          </span>
        </div>
      </header>

      {/* Tabs — modules à venir (VIR-08, VIR-09, VIR-15…) */}
      <div className="border-b-2 border-line mb-6">
        <div className="flex gap-1">
          {['Présence', 'Transport', 'Bouffe', 'Frais'].map((tab, i) => (
            <button
              key={tab}
              className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg relative ${
                i === 0 ? 'text-ink' : 'text-muted'
              }`}
            >
              {tab}
              {i === 0 && (
                <span className="absolute left-3.5 right-3.5 -bottom-0.5 h-0.5 bg-terracotta rounded" />
              )}
            </button>
          ))}
        </div>
      </div>

      <p className="text-muted text-sm">
        Connecté·e en tant que <strong className="text-ink">{participant.pseudo}</strong>.
        Les modules arrivent avec les prochains tickets.
      </p>
    </div>
  )
}
