import { describe, it, expect } from 'vitest'
import { formatEventDates } from './format'

describe('formatEventDates', () => {
  it('renvoie le fallback quand la date de début est absente', () => {
    expect(formatEventDates(null, null)).toBe('Dates à définir')
    expect(formatEventDates(null, '2026-07-05', { fallback: 'Date à définir' })).toBe('Date à définir')
  })

  it('affiche un seul jour quand start == end (ou end absent)', () => {
    expect(formatEventDates('2026-07-05', '2026-07-05')).toBe('5 juillet')
    expect(formatEventDates('2026-07-05', null)).toBe('5 juillet')
  })

  it('regroupe le mois quand la plage est dans le même mois', () => {
    expect(formatEventDates('2026-07-05', '2026-07-07')).toBe('5 → 7 juillet')
  })

  it('affiche les deux mois quand la plage les traverse', () => {
    expect(formatEventDates('2026-06-30', '2026-07-02')).toBe('30 juin → 2 juillet')
  })

  it('respecte le format court du mois', () => {
    expect(formatEventDates('2026-07-05', '2026-07-07', { month: 'short' })).toBe('5 → 7 juil.')
  })

  it("n'est pas décalé par le fuseau (ancrage midi)", () => {
    // Sans ancrage T12:00:00, un fuseau négatif renverrait « 4 » au lieu de « 5 ».
    expect(formatEventDates('2026-07-05', '2026-07-05')).toBe('5 juillet')
  })
})
