export const WEEKDAYS = [
  { key: 'monday', label: 'L' },
  { key: 'tuesday', label: 'M' },
  { key: 'wednesday', label: 'M' },
  { key: 'thursday', label: 'J' },
  { key: 'friday', label: 'V' },
  { key: 'saturday', label: 'S' },
  { key: 'sunday', label: 'D' },
] as const

export type CalendarMonth = {
  key: string
  label: string
  cells: (string | null)[]
}

export function localDate(iso: string): Date {
  return new Date(`${iso}T12:00:00`)
}

export function getDaysBetween(start: string, end: string): string[] {
  const days: string[] = []
  const current = localDate(start)
  const last = localDate(end)
  while (current <= last) {
    days.push(current.toISOString().slice(0, 10))
    current.setDate(current.getDate() + 1)
  }
  return days
}

export function isoWeekdayIndex(iso: string): number {
  return (localDate(iso).getDay() + 6) % 7
}

export function buildMonths(eventDays: string[]): CalendarMonth[] {
  const months: CalendarMonth[] = []
  const seen = new Set<string>()
  for (const iso of eventDays) {
    const monthKey = iso.slice(0, 7)
    if (seen.has(monthKey)) continue
    seen.add(monthKey)
    const firstOfMonth = localDate(`${monthKey}-01`)
    const daysInMonth = new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth() + 1, 0).getDate()
    const leadingPadding = isoWeekdayIndex(`${monthKey}-01`)
    const cells: (string | null)[] = []
    for (let i = 0; i < leadingPadding; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(`${monthKey}-${String(d).padStart(2, '0')}`)
    const label = firstOfMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    months.push({ key: monthKey, label, cells })
  }
  return months
}

export function formatDayLabel(iso: string): string {
  return localDate(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}
