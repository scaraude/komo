import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSessionToken, getCreatorToken } from '@/lib/session'
import { PresenceToggle } from '@/components/presence/PresenceToggle'
import { PartialPresence } from '@/components/presence/PartialPresence'
import { DeadlineBar } from '@/components/presence/DeadlineBar'
import { LiveCounter } from '@/components/presence/LiveCounter'
import { TransportPanel } from '@/components/transport/TransportPanel'
import { DatePoll } from '@/components/dates/DatePoll'
import { AccommodationSection } from '@/components/accommodation/AccommodationSection'
import { MealGrid } from '@/components/meals/MealGrid'
import { RecapButton } from '@/components/event/RecapButton'
import { promoteParticipant } from '@/lib/actions/participants'
import type { Database } from '@/lib/database.types'

type Participant = Database['public']['Tables']['participants']['Row']

const EVENT_TYPE_WORDING = {
  weekend:  { eyebrow: 'Komo · week-end',  presenceQ: 'tu viens ?' },
  soiree:   { eyebrow: 'Komo · soirée',    presenceQ: 'tu viens ?' },
  concert:  { eyebrow: 'Komo · concert',   presenceQ: 'tu y vas ?' },
  road_trip:{ eyebrow: 'Komo · road trip', presenceQ: 't\'embarques ?' },
  sport:    { eyebrow: 'Komo · sport',     presenceQ: 'tu joues ?' },
  autre:    { eyebrow: 'Komo · ton event', presenceQ: 'tu es…' },
} as const

const STATUS_CONFIG = {
  hot: { emoji: '🔥', label: 'Chaud' },
  maybe: { emoji: '🤔', label: 'Probable' },
  unsure: { emoji: '😬', label: 'Pas sûr' },
  no: { emoji: '❌', label: 'Non' },
} as const

function formatDateRange(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  if (start === end)
    return s.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })
  return `${s.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })} → ${e.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })}`
}

const TABS_NORMAL = ['presence', 'transport', 'bouffe', 'frais'] as const
const TABS_SONDAGE = ['dates', 'transport', 'bouffe', 'frais'] as const
const TAB_LABELS: Record<string, string> = {
  presence: 'Présence', dates: 'Dates 📅', transport: 'Transport', bouffe: '🍽️ Bouffe', frais: 'Frais',
}
const PLACEHOLDER_TABS = new Set(['frais'])

export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { slug } = await params
  const { tab } = await searchParams

  const supabase = await createClient()

  const { data: event } = await supabase.from('events').select('*').eq('slug', slug).single()
  if (!event) notFound()

  const sessionToken = await getSessionToken(slug)
  if (!sessionToken) redirect(`/e/${slug}/join`)

  const { data: participant } = await supabase
    .from('participants').select('*')
    .eq('event_id', event.id).eq('session_token', sessionToken).single()
  if (!participant) redirect(`/e/${slug}/join`)

  const { data: allParticipants } = await supabase
    .from('participants').select('*')
    .eq('event_id', event.id).order('joined_at', { ascending: true })
  const participants = allParticipants ?? []

  const creatorToken = await getCreatorToken(slug)
  const isCreator = !!creatorToken && creatorToken === event.creator_token
  const isAdmin = participant.role === 'créateur' || participant.role === 'co_organisateur'
  const wording = EVENT_TYPE_WORDING[event.event_type as keyof typeof EVENT_TYPE_WORDING] ?? EVENT_TYPE_WORDING.autre

  const isSondage = !event.date_start
  const TABS = isSondage ? TABS_SONDAGE : TABS_NORMAL
  const defaultTab = isSondage ? 'dates' : 'presence'
  const isValidTab = (t: string | undefined): t is typeof TABS[number] =>
    !!t && (TABS as readonly string[]).includes(t)
  const activeTab = isValidTab(tab) ? tab : defaultTab

  const pendingCount = participants.filter((p) => !p.presence_status).length
  const isMultiDay = !isSondage && event.date_start !== event.date_end

  // Date proposals (sondage mode)
  const { data: dateProposals } = isSondage
    ? await supabase.from('date_proposals').select('*').eq('event_id', event.id).order('proposed_date')
    : { data: [] }

  // Accommodation options (multi-day events)
  const { data: accommodationOptions } = isMultiDay
    ? await supabase.from('accommodation_options').select('*').eq('event_id', event.id).order('created_at')
    : { data: [] }

  // Meal data
  const { data: mealSlots } = await supabase.from('meal_slots').select('*').eq('event_id', event.id).order('day').order('type')
  const { data: mealContribs } = await supabase.from('meal_contributions').select('*')
    .in('slot_id', (mealSlots ?? []).map((s) => s.id))

  // Days between start and end
  const eventDays: string[] = []
  if (!isSondage && event.date_start && event.date_end) {
    const cur = new Date(event.date_start + 'T12:00:00')
    const end = new Date(event.date_end + 'T12:00:00')
    while (cur <= end) {
      eventDays.push(cur.toISOString().slice(0, 10))
      cur.setDate(cur.getDate() + 1)
    }
  }

  // Transport data (fetched only when needed but always here for server render)
  const { data: legs } = await supabase
    .from('transport_legs').select('*').eq('event_id', event.id)
  const { data: occupants } = await supabase
    .from('transport_occupants').select('*')
    .in('leg_id', (legs ?? []).map((l) => l.id))

  return (
    <div className="max-w-2xl mx-auto px-4 pb-20">
      <header className="pt-10 pb-6">
        <p className="text-xs font-bold tracking-widest uppercase text-terracotta mb-3 flex items-center gap-2">
          <span className="w-6 h-0.5 bg-terracotta inline-block" />
          {wording.eyebrow}
        </p>
        <h1 className="font-serif font-black text-5xl leading-none tracking-tight mb-4">
          {event.title}
        </h1>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 bg-card border border-line rounded-full px-3 py-1.5 text-sm font-medium">
            📅 {isSondage ? 'Date à définir' : formatDateRange(event.date_start!, event.date_end!)}
          </span>
          <span className="inline-flex items-center gap-1.5 bg-card border border-line rounded-full px-3 py-1.5 text-sm font-medium">
            📍 {event.destination}
          </span>
        </div>
      </header>

      {/* VIR-12 — Live counter */}
      <LiveCounter eventId={event.id} initialParticipants={participants} />

      {/* VIR-11 — Deadline bar (only when dates are fixed) */}
      {!isSondage && <DeadlineBar
        slug={slug}
        deadline={event.presence_deadline}
        pendingCount={pendingCount}
        isCreator={isAdmin}
      />}

      {/* Tabs */}
      <div className="border-b-2 border-line mb-8">
        <div className="flex gap-1">
          {TABS.map((t) => {
            const isActive = t === activeTab
            const isPlaceholder = PLACEHOLDER_TABS.has(t)
            return (
              <Link
                key={t}
                href={isPlaceholder ? '#' : `?tab=${t}`}
                className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg relative ${
                  isActive ? 'text-ink' : 'text-muted'
                } ${isPlaceholder ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                {TAB_LABELS[t]}
                {isActive && (
                  <span className="absolute left-3.5 right-3.5 -bottom-0.5 h-0.5 bg-terracotta rounded" />
                )}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Sondage de dates — VIR-20 */}
      {activeTab === 'dates' && (
        <DatePoll
          slug={slug}
          eventId={event.id}
          participantId={participant.id}
          initialProposals={dateProposals ?? []}
          totalParticipants={participants.length}
          isCreator={isAdmin}
        />
      )}

      {/* Présence panel — VIR-09 + VIR-10 */}
      {activeTab === 'presence' && (
        <section>
          <h2 className="font-serif font-bold text-xl mb-4">
            {participant.pseudo}, {wording.presenceQ}
          </h2>
          <PresenceToggle
            slug={slug}
            participantId={participant.id}
            initialStatus={participant.presence_status}
          />
          {isMultiDay && (
            <PartialPresence
              slug={slug}
              participantId={participant.id}
              initialDays={participant.partial_days as Record<string, boolean> | null}
              dateStart={event.date_start!}
              dateEnd={event.date_end!}
            />
          )}
          {isMultiDay && (
            <AccommodationSection
              slug={slug}
              eventId={event.id}
              participantId={participant.id}
              initialOptions={accommodationOptions ?? []}
              totalParticipants={participants.length}
            />
          )}
          <div className="mt-8">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted mb-3">
              Les {participants.length} potes
            </h3>
            <div className="flex flex-col gap-2">
              {participants.map((p: Participant) => (
                <div key={p.id}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                    p.id === participant.id ? 'border-terracotta bg-card' : 'border-line bg-card'
                  }`}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-ink text-paper text-xs font-bold flex items-center justify-center">
                      {p.pseudo[0].toUpperCase()}
                    </div>
                    <div>
                      <span className="font-semibold text-sm">
                        {p.pseudo}
                        {p.id === participant.id && (
                          <span className="text-terracotta ml-1.5 text-xs font-normal">(toi)</span>
                        )}
                      </span>
                      {p.role !== 'participant' && (
                        <span className={`ml-2 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                          p.role === 'créateur'
                            ? 'bg-terracotta/10 text-terracotta'
                            : 'bg-olive/10 text-olive'
                        }`}>
                          {p.role === 'créateur' ? 'créateur' : 'co-orga'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isCreator && p.id !== participant.id && p.role !== 'créateur' && (
                      <form action={promoteParticipant.bind(null, slug, p.id, p.role === 'participant' ? 'co_organisateur' : 'participant')}>
                        <button type="submit" className="text-xs text-muted hover:text-olive transition-colors">
                          {p.role === 'participant' ? '+ co-orga' : '− co-orga'}
                        </button>
                      </form>
                    )}
                    {p.presence_status ? (
                      <span title={STATUS_CONFIG[p.presence_status].label}>
                        {STATUS_CONFIG[p.presence_status].emoji}
                      </span>
                    ) : (
                      <span className="text-xs text-muted">?</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {isAdmin && (
              <RecapButton
                event={{ slug, title: event.title, date_start: event.date_start, date_end: event.date_end, destination: event.destination }}
                participants={participants}
                legs={legs ?? []}
                occupants={occupants ?? []}
              />
            )}
          </div>
        </section>
      )}

      {/* Bouffe panel — VIR-23 */}
      {activeTab === 'bouffe' && (
        <MealGrid
          slug={slug}
          eventId={event.id}
          participantId={participant.id}
          initialSlots={mealSlots ?? []}
          initialContributions={mealContribs ?? []}
          participants={participants}
          days={eventDays}
        />
      )}

      {/* Transport panel — VIR-13–18 */}
      {activeTab === 'transport' && (
        <TransportPanel
          slug={slug}
          eventId={event.id}
          participantId={participant.id}
          legs={legs ?? []}
          occupants={occupants ?? []}
          participants={participants}
          initialDirection="aller"
          isCreator={isAdmin}
        />
      )}
    </div>
  )
}
