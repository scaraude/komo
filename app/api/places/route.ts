import { NextResponse, type NextRequest } from 'next/server'
import { serverEnv } from '@/lib/env/server'

// Proxy serveur vers l'autocomplete Geoapify. La clé reste côté serveur
// (GEOAPIFY_API_KEY, non NEXT_PUBLIC_) — jamais exposée dans le bundle client.
// Renvoie une liste compacte { id, line1, line2, label } prête à afficher.

type GeoapifyProps = {
  place_id?: string
  formatted?: string
  address_line1?: string
  address_line2?: string
}

type GeoapifyFeature = { properties?: GeoapifyProps }

export type PlaceSuggestion = {
  id: string
  line1: string
  line2: string
  label: string
}

export async function GET(request: NextRequest) {
  const key = serverEnv.geoapifyApiKey
  if (!key) {
    return NextResponse.json({ error: 'geocoder_not_configured' }, { status: 503 })
  }

  const q = (request.nextUrl.searchParams.get('q') ?? '').trim()
  if (q.length < 3) {
    return NextResponse.json({ places: [] })
  }

  // Monde entier, mais biaisé vers la France (bias, pas filter : on ne coupe
  // pas les destinations étrangères). lang=fr pour des libellés en français.
  const url =
    'https://api.geoapify.com/v1/geocode/autocomplete' +
    '?format=geojson&lang=fr&limit=6&bias=countrycode:fr' +
    `&text=${encodeURIComponent(q.slice(0, 120))}` +
    `&apiKey=${encodeURIComponent(key)}`

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) {
      return NextResponse.json({ places: [] }, { status: 502 })
    }
    const data: { features?: GeoapifyFeature[] } = await res.json()
    const seen = new Set<string>()
    const places: PlaceSuggestion[] = []
    for (const f of data.features ?? []) {
      const p = f.properties
      if (!p?.place_id || !p.address_line1) continue
      if (seen.has(p.place_id)) continue
      seen.add(p.place_id)
      places.push({
        id: p.place_id,
        line1: p.address_line1,
        line2: p.address_line2 ?? '',
        label: p.formatted ?? p.address_line1,
      })
    }
    return NextResponse.json({ places })
  } catch {
    // timeout / réseau / JSON invalide — on dégrade en liste vide
    return NextResponse.json({ places: [] }, { status: 502 })
  }
}
