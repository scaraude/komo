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
          background: '#f4ede0',
          display: 'flex', flexDirection: 'column',
          padding: '64px',
          fontFamily: 'serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <div style={{ width: '24px', height: '2px', background: '#d2552a' }} />
          <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '4px', textTransform: 'uppercase', color: '#d2552a', fontFamily: 'sans-serif' }}>
            Komo · ton event
          </span>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '72px', fontWeight: 900, lineHeight: 1, color: '#1a1410', marginBottom: '24px' }}>
            {event.title}
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ background: '#fff', border: '1.5px solid #d4c9b8', borderRadius: '999px', padding: '8px 16px', fontSize: '18px', color: '#1a1410', fontFamily: 'sans-serif' }}>
              📅 {dateLabel}
            </span>
            <span style={{ background: '#fff', border: '1.5px solid #d4c9b8', borderRadius: '999px', padding: '8px 16px', fontSize: '18px', color: '#1a1410', fontFamily: 'sans-serif' }}>
              📍 {event.destination ?? ''}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', fontFamily: 'sans-serif' }}>
          {total > 0 && (
            <>
              <span style={{ fontSize: '16px', color: '#5c6b3c', fontWeight: 600 }}>🔥 {hot} chauds</span>
              {maybe > 0 && <span style={{ fontSize: '16px', color: '#e0a52e', fontWeight: 600 }}>🤔 {maybe} hésitants</span>}
              <span style={{ fontSize: '16px', color: '#6b5f56' }}>{total} participants</span>
            </>
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
