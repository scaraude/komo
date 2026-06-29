import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Komo — Crew. Plan. Go.',
    short_name: 'Komo',
    description: 'Organise tes voyages entre amis, simplement.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fbf4e9',
    theme_color: '#df402a',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
