import { ImageResponse } from '@vercel/og'
import { createClient } from '@/lib/supabase/server'
import { formatEventDates } from '@/lib/format'

export const runtime = 'edge'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events').select('id, title, destination, date_start, date_end').eq('slug', slug).single()

  if (!event) return new Response(null, { status: 404 })

  const { data: participants } = await supabase
    .from('participants').select('presence_status').eq('event_id', event.id)

  const hot = (participants ?? []).filter((p) => p.presence_status === 'hot').length
  const maybe = (participants ?? []).filter((p) => ['maybe', 'unsure'].includes(p.presence_status ?? '')).length
  const total = (participants ?? []).length

  const dateLabel = formatEventDates(event.date_start, event.date_end, { fallback: 'Date à définir' })

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px', height: '630px',
          background: '#fbf4e9',
          display: 'flex', flexDirection: 'column',
          padding: '64px',
          fontFamily: 'serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <div style={{ width: '24px', height: '3px', borderRadius: '2px', background: '#df402a' }} />
          <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '4px', textTransform: 'uppercase', color: '#df402a', fontFamily: 'sans-serif' }}>
            Komo · Crew. Plan. Go.
          </span>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '72px', fontWeight: 900, lineHeight: 1, color: '#221f1a', marginBottom: '24px' }}>
            {event.title}
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ background: '#fffdf8', border: '1.5px solid #e2d8c6', borderRadius: '999px', padding: '8px 16px', fontSize: '18px', color: '#221f1a', fontFamily: 'sans-serif' }}>
              📅 {dateLabel}
            </span>
            <span style={{ background: '#fffdf8', border: '1.5px solid #e2d8c6', borderRadius: '999px', padding: '8px 16px', fontSize: '18px', color: '#221f1a', fontFamily: 'sans-serif' }}>
              📍 {event.destination ?? ''}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', fontFamily: 'sans-serif' }}>
          {total > 0 && (
            <>
              <span style={{ fontSize: '16px', color: '#5f7a3e', fontWeight: 600 }}>🔥 {hot} chauds</span>
              {maybe > 0 && <span style={{ fontSize: '16px', color: '#c8722e', fontWeight: 600 }}>🤔 {maybe} hésitants</span>}
              <span style={{ fontSize: '16px', color: '#5c574e' }}>{total} participants</span>
            </>
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
