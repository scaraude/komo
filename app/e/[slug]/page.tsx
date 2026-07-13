import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserId } from '@/lib/auth'
import { PresenceToggle } from '@/components/presence/PresenceToggle'
import { PartialPresence } from '@/components/presence/PartialPresence'
import { LiveCounter } from '@/components/presence/LiveCounter'
import { PresenceCycle } from '@/components/presence/PresenceCycle'
import { TransportPanel } from '@/components/transport/TransportPanel'
import { DatePoll } from '@/components/dates/DatePoll'
import { Avatar } from '@/components/ui/Avatar'
import { formatEventDates } from '@/lib/format'
import { AccommodationSection } from '@/components/accommodation/AccommodationSection'
import { MealsPanel } from '@/components/meals/MealsPanel'
import { ActivityPanel } from '@/components/activities/ActivityPanel'
import { TimelinePanel } from '@/components/timeline/TimelinePanel'
import { RecapButton } from '@/components/event/RecapButton'
import { ExpensesTile } from '@/components/event/ExpensesTile'
import { ShareSheet } from './ShareSheet'
import { ParticipantsBadge } from './ParticipantsBadge'
import { FeedbackButton } from '@/components/feedback/FeedbackButton'
import { AppHeader } from '@/components/layout/AppHeader'
import { PlaceLink } from '@/components/ui/PlaceLink'
import { CompassIcon, CalendarIcon, UsersIcon, CarIcon, BasketIcon, TicketIcon } from '@/components/ui/icons'
import type { Participant } from '@/lib/types'
import type { ReactNode } from 'react'

const EVENT_TYPE_WORDING = {
  weekend:  { eyebrow: 'Komo · week-end',  presenceQ: 'Tu viens ?' },
  soiree:   { eyebrow: 'Komo · soirée',    presenceQ: 'Tu viens ?' },
  concert:  { eyebrow: 'Komo · concert',   presenceQ: 'Tu y vas ?' },
  road_trip:{ eyebrow: 'Komo · road trip', presenceQ: 'T\'embarques ?' },
  sport:    { eyebrow: 'Komo · sport',     presenceQ: 'Tu joues ?' },
  autre:    { eyebrow: 'Komo · ton event', presenceQ: 'Tu es là ?' },
} as const

const MODULE_TABS = new Set(['presence', 'dates', 'transport', 'bouffe', 'activites', 'fil'])

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

  const [{ data: event }, userId] = await Promise.all([
    supabase.from('events').select('*').eq('slug', slug).single(),
    getUserId(),
  ])
  if (!event) notFound()
  if (!userId) redirect(`/e/${slug}/join`)

  const isPoll = !event.date_start
  const isMultiDay = !isPoll && event.date_start !== event.date_end

  const [
    { data: participant },
    { data: allParticipants },
    { data: dateProposals },
    { data: accommodationOptions },
    { data: meals },
    { data: products },
    { data: mealOwners },
    { data: activities },
    { data: activitySignups },
    { legs, occupants },
  ] = await Promise.all([
    supabase.from('participants').select('*').eq('event_id', event.id).eq('user_id', userId).maybeSingle(),
    supabase.from('participants').select('*').eq('event_id', event.id).order('joined_at', { ascending: true }),
    isPoll
      ? supabase.from('date_proposals').select('*').eq('event_id', event.id).order('start_date')
      : Promise.resolve({ data: [] }),
    isMultiDay
      ? supabase.from('accommodation_options').select('*').eq('event_id', event.id).order('created_at')
      : Promise.resolve({ data: [] }),
    supabase.from('meals').select('*').eq('event_id', event.id).order('created_at'),
    supabase.from('products').select('*').eq('event_id', event.id).order('created_at'),
    supabase.from('meal_owners').select('*').eq('event_id', event.id),
    supabase.from('activities').select('*').eq('event_id', event.id).order('created_at'),
    supabase.from('activity_signups').select('*').eq('event_id', event.id),
    (async () => {
      const { data: legs } = await supabase.from('transport_legs').select('*').eq('event_id', event.id)
      const { data: occupants } = await supabase
        .from('transport_occupants').select('*')
        .in('leg_id', (legs ?? []).map((l) => l.id))
      return { legs, occupants }
    })(),
  ])
  if (!participant) redirect(`/e/${slug}/join`)
  const participants = allParticipants ?? []

  const isAdmin = participant.role === 'créateur' || participant.role === 'co_organisateur'
  // Créateur de l'event : sert à la sheet membres (bloque « Quitter le Komo »).
  const isCreator = event.created_by === userId
  const wording = EVENT_TYPE_WORDING[event.event_type as keyof typeof EVENT_TYPE_WORDING] ?? EVENT_TYPE_WORDING.autre


  // Le fil a besoin de vraies dates : tant que l'event est un sondage, retour au hub.
  const activeTab = tab && MODULE_TABS.has(tab) && !(tab === 'fil' && isPoll) ? tab : null
  const showHub = activeTab === null

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
  const groceryCount = (products ?? []).length
  const activityCount = (activities ?? []).length
  const dateProposalCount = (dateProposals ?? []).length
  const timelineCount = (legs ?? []).length + (meals ?? []).length + activityCount

  // ====================== HUB ======================
  if (showHub) {
    return (
      <main className="animate-screen-in mx-auto min-h-dvh w-full max-w-[440px] px-[18px] pb-8 pt-2">
        <AppHeader />

        {/* Hero */}
        <div className="mb-[14px] rounded-[24px] bg-ink p-[22px] text-on-dark">
          <h1 className="font-serif text-[27px] leading-[1.1] text-on-dark">{event.title}</h1>
          <div className="mt-[7px] text-[13px] text-on-dark-2">
            <div>{isPoll ? 'Dates à définir' : formatEventDates(event.date_start, event.date_end)}</div>
            {event.destination && (
              <div className="mt-[2px]">
                <PlaceLink query={event.destination} className="underline decoration-dotted underline-offset-2 decoration-on-dark-2 hover:decoration-on-dark">
                  {event.destination}
                </PlaceLink>
              </div>
            )}
          </div>
          <ParticipantsBadge
            slug={slug}
            eventId={event.id}
            currentParticipantId={participant.id}
            isCreator={isCreator}
            participants={participants.map((p) => ({ id: p.id, pseudo: p.pseudo, hasAccount: p.user_id != null, avatar_url: p.avatar_url }))}
          />
        </div>

        {/* Le fil du séjour — vue chronologique transverse (events datés seulement) */}
        {!isPoll && (
          <Link
            href="?tab=fil"
            className="mb-[12px] flex items-center justify-between rounded-[19px] border-[1.5px] border-line-2 bg-card p-[17px] shadow-card"
          >
            <div className="flex items-center gap-[13px]">
              <CompassIcon className="h-[23px] w-[23px] shrink-0 text-terracotta" />
              <div>
                <div className="text-[15px] font-bold text-ink">Le fil du séjour</div>
                <div className="text-[12.5px] text-muted">
                  {timelineCount > 0
                    ? `${timelineCount} moment${timelineCount > 1 ? 's' : ''}, du départ au retour`
                    : 'transports, repas & activités, dans l’ordre'}
                </div>
              </div>
            </div>
            <span className="text-[13px] font-bold text-terracotta">ouvrir ›</span>
          </Link>
        )}

        {/* Grille modules 2×2 */}
        <div className="mb-[18px] grid grid-cols-2 gap-[12px]">
          {isPoll ? (
            <ModuleTile href="?tab=dates" icon={<CalendarIcon className="h-[23px] w-[23px]" />} title="Dates"
              subtitle={`${dateProposalCount} proposition${dateProposalCount > 1 ? 's' : ''}`} />
          ) : (
            <ModuleTile href="?tab=presence" icon={<UsersIcon className="h-[23px] w-[23px]" />} title="Présence"
              subtitle={`${hotCount} chaud${hotCount > 1 ? 's' : ''} · ${maybeCount} hésite${maybeCount > 1 ? 'nt' : ''}`} />
          )}
          <ModuleTile href="?tab=transport" icon={<CarIcon className="h-[23px] w-[23px]" />} title="Transport" locked={isPoll}
            subtitle={freeSeats > 0 ? `${freeSeats} place${freeSeats > 1 ? 's' : ''} libre${freeSeats > 1 ? 's' : ''}` : 'à organiser'} />
          <ModuleTile href="?tab=bouffe" icon={<BasketIcon className="h-[23px] w-[23px]" />} title="Bouffe" locked={isPoll}
            subtitle={groceryCount > 0 ? `${groceryCount} produit${groceryCount > 1 ? 's' : ''}` : 'rien encore'} />
          <ModuleTile href="?tab=activites" icon={<TicketIcon className="h-[23px] w-[23px]" />} title="Activités" locked={isPoll}
            subtitle={activityCount > 0 ? `${activityCount} activité${activityCount > 1 ? 's' : ''}` : 'rien encore'} />
          <ExpensesTile slug={slug} initialUrl={event.tricount_url} canEdit />
        </div>

        {/* Partage */}
        <ShareSheet slug={slug} title={event.title} />

        <FeedbackButton eventId={event.id} />
      </main>
    )
  }

  // ====================== ÉCRANS MODULES ======================
  return (
    <main className="animate-screen-in mx-auto min-h-dvh w-full max-w-[440px] px-[20px] pb-10 pt-3">
      <Link
        href={`/e/${slug}`}
        className="mb-4 inline-flex items-center gap-1 text-[14px] font-semibold text-muted"
      >
        <span aria-hidden>‹</span> Retour
        <span className="sr-only">à l&apos;accueil de l&apos;event</span>
      </Link>

      {/* Sondage de dates */}
      {activeTab === 'dates' && (
        <DatePoll
          slug={slug}
          eventId={event.id}
          participantId={participant.id}
          initialProposals={dateProposals ?? []}
          participants={participants.map((p) => ({ id: p.id, pseudo: p.pseudo, avatar_url: p.avatar_url }))}
          isCreator={isAdmin}
        />
      )}

      {/* Présence */}
      {activeTab === 'presence' && (
        <section>
          <h1 className="mb-[18px] font-serif text-[30px] text-ink">{wording.presenceQ}</h1>

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
                    <Avatar pseudo={p.pseudo} avatarUrl={p.avatar_url} className="h-8 w-8 bg-ink text-xs text-paper" />
                    <div>
                      <span className="text-sm font-semibold">
                        {p.pseudo}
                        {p.id === participant.id && (
                          <span className="ml-1.5 text-xs font-normal text-terracotta">(toi)</span>
                        )}
                      </span>
                      {/* Le rôle co-orga existe en back (RLS) mais reste masqué côté front. */}
                      {p.role === 'créateur' && (
                        <span className="ml-2 rounded-full bg-terracotta-soft px-1.5 py-0.5 text-xs font-semibold text-terracotta">
                          créateur
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <PresenceCycle
                      slug={slug}
                      participantId={p.id}
                      initialStatus={p.presence_status}
                      pseudo={p.pseudo}
                    />
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
        <MealsPanel
          slug={slug}
          eventId={event.id}
          participantId={participant.id}
          initialMeals={meals ?? []}
          initialProducts={products ?? []}
          initialMealOwners={mealOwners ?? []}
          participants={participants}
          dateStart={event.date_start}
          dateEnd={event.date_end}
        />
      )}

      {/* Activités */}
      {activeTab === 'activites' && (
        <ActivityPanel
          slug={slug}
          eventId={event.id}
          participantId={participant.id}
          initialActivities={activities ?? []}
          initialSignups={activitySignups ?? []}
          participants={participants.map((p) => ({ id: p.id, pseudo: p.pseudo, avatar_url: p.avatar_url }))}
          isAdmin={isAdmin}
          dateStart={event.date_start}
          dateEnd={event.date_end}
        />
      )}

      {/* Le fil */}
      {activeTab === 'fil' && !isPoll && (
        <TimelinePanel
          slug={slug}
          eventId={event.id}
          participantId={participant.id}
          dateStart={event.date_start!}
          dateEnd={event.date_end ?? event.date_start!}
          destination={event.destination}
          participants={participants}
          legs={legs ?? []}
          occupants={occupants ?? []}
          meals={meals ?? []}
          mealOwners={mealOwners ?? []}
          products={products ?? []}
          activities={activities ?? []}
          initialSignups={activitySignups ?? []}
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
  href, icon, title, subtitle, locked = false,
}: {
  href: string; icon: ReactNode; title: string; subtitle: string
  /** Tant que les dates ne sont pas fixées, la tuile est inerte. */
  locked?: boolean
}) {
  if (locked) {
    return (
      <div
        aria-disabled="true"
        className="flex h-[94px] flex-col justify-between rounded-[19px] border-[1.5px] border-line-2 bg-card p-[17px]"
      >
        <div className="text-disabled">{icon}</div>
        <div>
          <div className="text-[15px] font-bold text-disabled">{title}</div>
          <div className="text-[11px] font-bold leading-[1.25] text-terracotta">
            nous faut une date d&apos;abord
          </div>
        </div>
      </div>
    )
  }
  return (
    <Link
      href={href}
      className="flex h-[94px] flex-col justify-between rounded-[19px] border-[1.5px] border-line-2 bg-card p-[17px] shadow-card"
    >
      <div className="text-terracotta">{icon}</div>
      <div>
        <div className="text-[15px] font-bold text-ink">{title}</div>
        <div className="text-[12.5px] text-muted">{subtitle}</div>
      </div>
    </Link>
  )
}
