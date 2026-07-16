import type { Metadata } from 'next'
import { getEventBySlug } from '@/lib/events'
import { clientEnv } from '@/lib/env/client'

const BASE_URL = clientEnv.siteUrl

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const event = await getEventBySlug(slug)

  if (!event) return {}

  const title = `${event.title} · Komo`
  const description = `Rejoins l'event à ${event.destination} !`
  const ogImage = `${BASE_URL}/api/og/${slug}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

export default function EventLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
