// Liens d'un repas au restaurant (Google Maps, site, menu, réservation…).
// Fonctions pures, isolées pour être testées. On stocke l'URL normalisée (avec
// schéma) ; l'affichage dérive une icône et un hôte lisible.

// Ajoute https:// si l'utilisateur a collé une URL sans schéma (« maps.google… »).
// Laisse intacts http(s) et les schémas déjà présents.
export function normalizeUrl(raw: string): string {
  const url = raw.trim()
  if (!url) return ''
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`
}

// Détecte les liens de cartographie pour choisir l'icône.
export function linkKind(url: string): 'maps' | 'web' {
  const host = hostname(url)
  if (!host) return 'web'
  const isMaps =
    /(^|\.)google\.[a-z.]+$/.test(host) && /\/maps/.test(pathOf(url)) ||
    host === 'maps.app.goo.gl' ||
    host === 'goo.gl' && /\/maps/.test(pathOf(url)) ||
    host === 'maps.apple.com' ||
    host === 'maps.google.com'
  return isMaps ? 'maps' : 'web'
}

export function linkIcon(url: string): string {
  return linkKind(url) === 'maps' ? '📍' : '🔗'
}

// Hôte nettoyé (sans « www. ») pour libeller une puce ; repli sur l'URL brute.
export function linkHost(url: string): string {
  const host = hostname(url)
  if (!host) return url
  return host.replace(/^www\./, '')
}

function parse(url: string): URL | null {
  try {
    return new URL(normalizeUrl(url))
  } catch {
    return null
  }
}

function hostname(url: string): string {
  return parse(url)?.hostname.toLowerCase() ?? ''
}

function pathOf(url: string): string {
  return parse(url)?.pathname ?? ''
}
