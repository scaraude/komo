// Logique calendaire partagée (sélection de jours par mois).
// Mutualise le code dupliqué à l'identique entre BouffePanel et PartialPresence.
//
// Toutes les dates ISO `yyyy-mm-dd` sont ancrées à T12:00:00 pour éviter les
// décalages de jour en fuseau négatif (le parsing nu `new Date('yyyy-mm-dd')`
// interprète minuit UTC → jour précédent à l'ouest de Greenwich).

// Initiales lundi→dimanche. `as const` : tuple readonly figé (constante
// partagée par tous les calendriers — pas de mutation accidentelle).
// NB : 'M' apparaît deux fois (mardi/mercredi) → indexer par position, jamais
// utiliser la valeur comme clé React.
export const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const

export type CalendarMonth = {
  key: string
  label: string
  // cellules de la grille : null = case vide (padding), sinon date ISO
  cells: (string | null)[]
}

/** Jours de l'event (ISO yyyy-mm-dd) entre start et end inclus. */
export function getDaysBetween(start: string, end: string): string[] {
  const days: string[] = []
  const current = new Date(`${start}T12:00:00`)
  const last = new Date(`${end}T12:00:00`)
  while (current <= last) {
    days.push(current.toISOString().slice(0, 10))
    current.setDate(current.getDate() + 1)
  }
  return days
}

/** Index lundi=0 … dimanche=6 à partir d'une date ISO. */
export function isoWeekdayIndex(iso: string): number {
  const js = new Date(`${iso}T00:00:00`).getDay() // 0=dim … 6=sam
  return (js + 6) % 7
}

/** Grilles calendaires (1 par mois) couvrant les jours de l'event. */
export function buildMonths(eventDays: string[]): CalendarMonth[] {
  const months: CalendarMonth[] = []
  const seen = new Set<string>()
  for (const iso of eventDays) {
    const monthKey = iso.slice(0, 7) // yyyy-mm
    if (seen.has(monthKey)) continue
    seen.add(monthKey)
    const first = new Date(`${monthKey}-01T00:00:00`)
    const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
    const cells: (string | null)[] = []
    // padding initial pour aligner le 1er sur lundi→dimanche
    for (let i = 0; i < isoWeekdayIndex(`${monthKey}-01`); i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(`${monthKey}-${String(d).padStart(2, '0')}`)
    const label = first.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    months.push({ key: monthKey, label, cells })
  }
  return months
}

/** Libellé compact d'une date ISO : « sam. 12 juil. ». */
export function formatDayLabel(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}
