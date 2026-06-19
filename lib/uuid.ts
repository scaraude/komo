// UUID v4 sûr en toutes circonstances.
//
// `crypto.randomUUID()` n'existe que dans un contexte sécurisé (HTTPS ou
// localhost) ; en accès LAN via http://192.168.x.x il est `undefined`.
// `crypto.getRandomValues()`, lui, reste disponible — d'où ce fallback.
export function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const b = crypto.getRandomValues(new Uint8Array(16))
    b[6] = (b[6] & 0x0f) | 0x40 // version 4
    b[8] = (b[8] & 0x3f) | 0x80 // variant
    const h = Array.from(b, (x) => x.toString(16).padStart(2, '0'))
    return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h
      .slice(6, 8)
      .join('')}-${h.slice(8, 10).join('')}-${h.slice(10, 16).join('')}`
  }

  // Dernier recours (environnements sans Web Crypto) — non cryptographique,
  // suffisant pour un id optimiste temporaire remplacé par le serveur.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}
