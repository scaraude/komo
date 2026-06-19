import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserId } from '@/lib/auth'

const VIBE_EMOJI: Record<string, string> = {
  weekend: '🏔️', soiree: '🎉', concert: '🎸', road_trip: '🚗', sport: '⚽', autre: '✨',
}

function dateLabel(start: string | null, end: string | null) {
  if (!start) return 'Dates à définir'
  const s = new Date(start + 'T12:00:00')
  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  if (!end || start === end) return fmt(s)
  return `${fmt(s)} → ${fmt(new Date(end + 'T12:00:00'))}`
}

export default async function MesKomosPage() {
  const userId = await getUserId()
  const supabase = await createClient()

  // Events où je suis membre (le créateur a aussi une ligne participant).
  const myParts = userId
    ? (await supabase
        .from('participants')
        .select('event_id, pseudo, role')
        .eq('user_id', userId)).data ?? []
    : []

  const eventIds = myParts.map((p) => p.event_id)
  const events = eventIds.length
    ? (await supabase
        .from('events')
        .select('*')
        .in('id', eventIds)
        .order('created_at', { ascending: false })).data ?? []
    : []

  const partByEvent = new Map(myParts.map((p) => [p.event_id, p]))

  return (
    <main className="animate-screen-in mx-auto min-h-dvh w-full max-w-[440px] px-[20px] pb-10 pt-8">
      <div className="mb-9 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-[7px]">
          <span className="font-serif text-[24px] leading-none text-ink">Komo</span>
          <span className="mt-1.5 h-[6px] w-[6px] rounded-full bg-terracotta" />
        </Link>
        <Link
          href="/"
          className="rounded-full border-[1.5px] border-line-3 bg-card px-[14px] py-[8px] text-[13px] font-bold text-ink"
        >
          ＋ Nouveau
        </Link>
      </div>

      <h1 className="mb-1 font-serif text-[30px] text-ink">Mes Komos</h1>
      <p className="mb-7 text-[14px] text-faint">
        Les plans que tu as créés ou rejoints.
      </p>

      {events.length === 0 ? (
        <div className="rounded-[20px] border-[1.5px] border-dashed border-[var(--color-dashed)] bg-soft p-7 text-center">
          <div className="mb-2 text-[30px]">🗺️</div>
          <p className="mb-1 text-[15px] font-bold text-ink">Aucun Komo pour l&apos;instant</p>
          <p className="mb-5 text-[13.5px] leading-[1.5] text-muted">
            Crée ton premier plan, ou ouvre le lien d&apos;invitation qu&apos;on t&apos;a envoyé.
          </p>
          <Link
            href="/"
            className="inline-block rounded-[14px] bg-terracotta px-5 py-[13px] text-[14px] font-bold text-white shadow-[0_4px_0_var(--color-terracotta-dk)] active:translate-y-1 active:shadow-none"
          >
            Créer un Komo →
          </Link>
          <p className="mt-4 text-[13px] text-muted">
            Tu avais déjà des Komos&nbsp;?{' '}
            <Link href="/connexion" className="font-semibold text-terracotta">Se connecter</Link>
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-[11px]">
          {events.map((ev) => {
            const part = partByEvent.get(ev.id)
            const isOrganizer = part?.role === 'créateur' || part?.role === 'co_organisateur'
            return (
              <Link
                key={ev.id}
                href={`/e/${ev.slug}`}
                className="flex items-center gap-3 rounded-[18px] border-[1.5px] border-line-2 bg-card p-[15px] shadow-[0_2px_8px_rgba(60,45,20,0.04)]"
              >
                <span className="text-[26px]">{VIBE_EMOJI[ev.event_type] ?? '✨'}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15.5px] font-bold text-ink">{ev.title}</p>
                  <p className="truncate text-[13px] text-muted">
                    {dateLabel(ev.date_start, ev.date_end)}
                    {ev.destination ? ` · ${ev.destination}` : ''}
                  </p>
                </div>
                {isOrganizer && (
                  <span className="shrink-0 rounded-full bg-terracotta-soft px-[10px] py-[3px] text-[11px] font-bold text-terracotta">
                    {part?.role === 'créateur' ? 'créateur' : 'co-orga'}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}
