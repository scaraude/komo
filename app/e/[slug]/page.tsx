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
import { ShareSheet } from './ShareSheet'
import type { Database } from '@/lib/database.types'

type Participant = Database['public']['Tables']['participants']['Row']

const EVENT_TYPE_WORDING = {
  weekend:  { eyebrow: 'Komo · week-end',  presenceQ: 'Tu viens ?' },
  soiree:   { eyebrow: 'Komo · soirée',    presenceQ: 'Tu viens ?' },
  concert:  { eyebrow: 'Komo · concert',   presenceQ: 'Tu y vas ?' },
  road_trip:{ eyebrow: 'Komo · road trip', presenceQ: 'T\'embarques ?' },
  sport:    { eyebrow: 'Komo · sport',     presenceQ: 'Tu joues ?' },
  autre:    { eyebrow: 'Komo · ton event', presenceQ: 'Tu es là ?' },
} as const

const VIBE = {
  weekend:   { emoji: '🏔️', label: 'WEEK-END' },
  soiree:    { emoji: '🎉', label: 'SOIRÉE' },
  concert:   { emoji: '🎸', label: 'CONCERT' },
  road_trip: { emoji: '🚗', label: 'ROAD TRIP' },
  sport:     { emoji: '⚽', label: 'SPORT' },
  autre:     { emoji: '✨', label: 'EVENT' },
} as const

const STATUS_CONFIG = {
  hot: { emoji: '🔥', label: 'Chaud' },
  maybe: { emoji: '🤔', label: 'Probable' },
  unsure: { emoji: '😬', label: 'Pas sûr' },
  no: { emoji: '❌', label: 'Non' },
} as const

const RSVP_LABEL: Record<string, string> = {
  hot: 'chaud 🔥', maybe: 'probable 🤔', unsure: 'pas sûr 😬', no: 'pas là ✕',
}

const AVATAR_COLORS = ['#c4602f', '#5f7a3e', '#9a8a6a', '#3a7ca5', '#9a5a6e']

function heroDateRange(start: string, end: string) {
  const s = new Date(start + 'T12:00:00')
  const e = new Date(end + 'T12:00:00')
  const month = (d: Date) => d.toLocaleDateString('fr-FR', { month: 'long' })
  if (start === end) return `${s.getDate()} ${month(s)}`
  if (s.getMonth() === e.getMonth()) return `${s.getDate()} → ${e.getDate()} ${month(e)}`
  return `${s.getDate()} ${month(s)} → ${e.getDate()} ${month(e)}`
}

const MODULE_TABS = new Set(['presence', 'dates', 'transport', 'bouffe'])

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
  const vibe = VIBE[event.event_type as keyof typeof VIBE] ?? VIBE.autre

  const isSondage = !event.date_start
  const pendingCount = participants.filter((p) => !p.presence_status).length
  const isMultiDay = !isSondage && event.date_start !== event.date_end

  // Navigation : pas de tab valide → hub. tab valide → écran module.
  const presenceTabName = isSondage ? 'dates' : 'presence'
  const activeTab = tab && MODULE_TABS.has(tab) ? tab : null
  const showHub = activeTab === null

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

  // Transport data
  const { data: legs } = await supabase
    .from('transport_legs').select('*').eq('event_id', event.id)
  const { data: occupants } = await supabase
    .from('transport_occupants').select('*')
    .in('leg_id', (legs ?? []).map((l) => l.id))

  // ---- Counts pour les tuiles du hub ----
  const hotCount = participants.filter((p) => p.presence_status === 'hot').length
  const maybeCount = participants.filter(
    (p) => p.presence_status === 'maybe' || p.presence_status === 'unsure',
  ).length
  const freeSeats = (legs ?? [])
    .filter((l) => l.total_seats != null)
    .reduce((acc, l) => {
      const taken = (occupants ?? []).filter((o) => o.leg_id === l.id).length
      return acc + Math.max(0, (l.total_seats ?? 0) - taken)
    }, 0)
  const bouffeCount = (mealContribs ?? []).length
  const dateProposalCount = (dateProposals ?? []).length
  const rsvpLabel = participant.presence_status ? RSVP_LABEL[participant.presence_status] : 'à déclarer'

  // ====================== HUB ======================
  if (showHub) {
    return (
      <main className="animate-screen-in mx-auto min-h-dvh w-full max-w-[440px] px-[18px] pb-8 pt-2">
        {/* Hero */}
        <div className="mb-[14px] rounded-[24px] bg-ink p-[22px] text-on-dark">
          <div className="mb-[10px] text-[11px] font-bold uppercase tracking-[1px] text-terracotta">
            {vibe.emoji} {vibe.label}
          </div>
          <h1 className="font-serif text-[27px] leading-[1.1] text-on-dark">{event.title}</h1>
          <div className="mt-[7px] text-[13px] text-on-dark-2">
            {isSondage ? 'Dates à définir' : heroDateRange(event.date_start!, event.date_end!)}
            {event.destination ? ` · ${event.destination}` : ''}
          </div>
          <div className="mt-[16px] flex items-center">
            {participants.slice(0, 3).map((p, i) => (
              <div
                key={p.id}
                className="-mr-[11px] flex h-[30px] w-[30px] items-center justify-center rounded-full border-[2.5px] border-ink text-[11px] font-bold text-white"
                style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
              >
                {p.pseudo[0]?.toUpperCase()}
              </div>
            ))}
            {participants.length > 3 && (
              <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full border-[2.5px] border-ink bg-[#3a352e] text-[11px] font-bold text-white">
                +{participants.length - 3}
              </div>
            )}
            <div className="ml-4 text-[13px] text-on-dark-2">
              {participants.length} dans le coup
            </div>
          </div>
        </div>

        {/* Pill de statut */}
        <Link
          href={`?tab=${presenceTabName}`}
          className="mb-[14px] flex items-center justify-between rounded-[16px] border-[1.5px] border-terracotta-line bg-terracotta-soft px-4 py-[14px]"
        >
          <span className="text-[14.5px] text-ink">
            Tu es <b>{rsvpLabel}</b>
          </span>
          <span className="text-[13px] font-bold text-terracotta">changer ›</span>
        </Link>

        {/* Grille modules 2×2 */}
        <div className="mb-[18px] grid grid-cols-2 gap-[12px]">
          {isSondage ? (
            <ModuleTile href="?tab=dates" emoji="📅" title="Dates"
              subtitle={`${dateProposalCount} proposition${dateProposalCount > 1 ? 's' : ''}`} />
          ) : (
            <ModuleTile href="?tab=presence" emoji="👥" title="Présence"
              subtitle={`${hotCount} chaud${hotCount > 1 ? 's' : ''} · ${maybeCount} hésite${maybeCount > 1 ? 'nt' : ''}`} />
          )}
          <ModuleTile href="?tab=transport" emoji="🚗" title="Covoit"
            subtitle={freeSeats > 0 ? `${freeSeats} place${freeSeats > 1 ? 's' : ''} libre${freeSeats > 1 ? 's' : ''}` : 'à organiser'} />
          <ModuleTile href="?tab=bouffe" emoji="🛒" title="Bouffe"
            subtitle={bouffeCount > 0 ? `${bouffeCount} produit${bouffeCount > 1 ? 's' : ''}` : 'rien encore'} />
          <div className="flex h-[94px] flex-col justify-between rounded-[19px] border-[1.5px] border-dashed border-[#ddd1bd] bg-soft p-[17px]">
            <div className="text-[23px] opacity-50">💸</div>
            <div>
              <div className="text-[15px] font-bold text-disabled">Frais</div>
              <div className="text-[12.5px] text-disabled">bientôt</div>
            </div>
          </div>
        </div>

        {/* Partage */}
        <ShareSheet slug={slug} title={event.title} />
      </main>
    )
  }

  // ====================== ÉCRANS MODULES ======================
  const moduleTitle: Record<string, string> = {
    presence: 'Présence', dates: 'Dates', transport: 'Covoiturage', bouffe: 'Bouffe',
  }

  return (
    <main className="animate-screen-in mx-auto min-h-dvh w-full max-w-[440px] px-[20px] pb-10 pt-3">
      <Link
        href={`/e/${slug}`}
        className="mb-4 inline-block text-[14px] font-semibold text-muted"
      >
        ‹ {moduleTitle[activeTab!]}
      </Link>

      {/* Sondage de dates */}
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

      {/* Présence */}
      {activeTab === 'presence' && (
        <section>
          <h1 className="mb-[18px] font-serif text-[30px] text-ink">{wording.presenceQ}</h1>

          {!isSondage && <DeadlineBar
            slug={slug}
            deadline={event.presence_deadline}
            pendingCount={pendingCount}
            isCreator={isAdmin}
          />}

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

          <LiveCounter eventId={event.id} initialParticipants={participants} />

          <div className="mt-8">
            <h3 className="mb-3 text-[12px] font-bold uppercase tracking-[0.8px] text-muted-2">
              Les {participants.length} potes
            </h3>
            <div className="flex flex-col gap-2">
              {participants.map((p: Participant) => (
                <div key={p.id}
                  className={`flex items-center justify-between rounded-[16px] border-[1.5px] bg-card px-4 py-3 ${
                    p.id === participant.id ? 'border-terracotta' : 'border-line-2'
                  }`}>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-bold text-paper">
                      {p.pseudo[0].toUpperCase()}
                    </div>
                    <div>
                      <span className="text-sm font-semibold">
                        {p.pseudo}
                        {p.id === participant.id && (
                          <span className="ml-1.5 text-xs font-normal text-terracotta">(toi)</span>
                        )}
                      </span>
                      {p.role !== 'participant' && (
                        <span className={`ml-2 rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                          p.role === 'créateur'
                            ? 'bg-terracotta-soft text-terracotta'
                            : 'bg-olive-soft text-olive-text'
                        }`}>
                          {p.role === 'créateur' ? 'créateur' : 'co-orga'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isCreator && p.id !== participant.id && p.role !== 'créateur' && (
                      <form action={promoteParticipant.bind(null, slug, p.id, p.role === 'participant' ? 'co_organisateur' : 'participant')}>
                        <button type="submit" className="text-xs text-muted transition-colors hover:text-olive">
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

      {/* Bouffe */}
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

      {/* Transport */}
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
          eventDestination={event.destination}
          eventDateStart={event.date_start}
          eventDateEnd={event.date_end}
        />
      )}
    </main>
  )
}

function ModuleTile({
  href, emoji, title, subtitle,
}: {
  href: string; emoji: string; title: string; subtitle: string
}) {
  return (
    <Link
      href={href}
      className="flex h-[94px] flex-col justify-between rounded-[19px] border-[1.5px] border-line-2 bg-card p-[17px] shadow-[0_2px_8px_rgba(60,45,20,0.04)]"
    >
      <div className="text-[23px]">{emoji}</div>
      <div>
        <div className="text-[15px] font-bold text-ink">{title}</div>
        <div className="text-[12.5px] text-muted">{subtitle}</div>
      </div>
    </Link>
  )
}
