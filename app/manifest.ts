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
    // Screenshots : débloquent la « richer install UI » de Chromium (sinon
    // warning DevTools). `wide` = desktop, `narrow` = mobile.
    screenshots: [
      {
        src: '/screenshot-mobile.png',
        sizes: '390x844',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Komo sur mobile',
      },
      {
        src: '/screenshot-wide.png',
        sizes: '1280x800',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Komo sur ordinateur',
      },
    ],
  }
}
