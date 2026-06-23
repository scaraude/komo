// Formatage partagé d'une plage de dates d'event.
//
// Dates ISO `yyyy-mm-dd` ancrées à T12:00:00 pour éviter le décalage de jour
// en fuseau négatif (`new Date('yyyy-mm-dd')` = minuit UTC → jour précédent).
//
// Règles : un seul jour → « 5 juillet » ; même mois → « 5 → 7 juillet » ;
// mois différents → « 30 juin → 2 juillet ». `month` choisit la longueur du
// libellé (« juil. » vs « juillet »).
export function formatEventDates(
  start: string | null,
  end: string | null,
  { month = 'long', fallback = 'Dates à définir' }: { month?: 'short' | 'long'; fallback?: string } = {},
): string {
  if (!start) return fallback
  const s = new Date(`${start}T12:00:00`)
  const last = end ?? start
  const e = new Date(`${last}T12:00:00`)
  const monthName = (d: Date) => d.toLocaleDateString('fr-FR', { month })
  if (start === last) return `${s.getDate()} ${monthName(s)}`
  if (s.getMonth() === e.getMonth()) return `${s.getDate()} → ${e.getDate()} ${monthName(e)}`
  return `${s.getDate()} ${monthName(s)} → ${e.getDate()} ${monthName(e)}`
}
