import { localDate } from './calendar'

export function formatEventDates(
  start: string | null,
  end: string | null,
  { month = 'long', fallback = 'Dates à définir' }: { month?: 'short' | 'long'; fallback?: string } = {},
): string {
  if (!start) return fallback
  const last = end ?? start
  const startDate = localDate(start)
  const endDate = localDate(last)
  const monthName = (d: Date) => d.toLocaleDateString('fr-FR', { month })
  if (start === last) return `${startDate.getDate()} ${monthName(startDate)}`
  if (startDate.getMonth() === endDate.getMonth()) {
    return `${startDate.getDate()} → ${endDate.getDate()} ${monthName(endDate)}`
  }
  return `${startDate.getDate()} ${monthName(startDate)} → ${endDate.getDate()} ${monthName(endDate)}`
}

export function hhmm(isoDateTime: string | null | undefined): string | undefined {
  return isoDateTime ? isoDateTime.slice(11, 16) : undefined
}
