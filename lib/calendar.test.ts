import { describe, it, expect } from 'vitest'
import { getDaysBetween, isoWeekdayIndex, buildMonths } from './calendar'

describe('getDaysBetween', () => {
  it('inclut les bornes', () => {
    expect(getDaysBetween('2026-07-05', '2026-07-07')).toEqual([
      '2026-07-05', '2026-07-06', '2026-07-07',
    ])
  })

  it('renvoie un seul jour quand start == end', () => {
    expect(getDaysBetween('2026-07-05', '2026-07-05')).toEqual(['2026-07-05'])
  })

  it('traverse les frontières de mois', () => {
    expect(getDaysBetween('2026-06-30', '2026-07-01')).toEqual(['2026-06-30', '2026-07-01'])
  })
})

describe('isoWeekdayIndex', () => {
  it('place lundi à 0 et dimanche à 6', () => {
    expect(isoWeekdayIndex('2026-07-06')).toBe(0) // lundi
    expect(isoWeekdayIndex('2026-07-12')).toBe(6) // dimanche
  })
})

describe('buildMonths', () => {
  it('aligne le 1er jour avec le bon padding et couvre le mois entier', () => {
    const [month] = buildMonths(getDaysBetween('2026-07-01', '2026-07-03'))
    expect(month).toBeDefined()
    expect(month!.key).toBe('2026-07')
    // 1er juillet 2026 = mercredi → index 2 → 2 cellules de padding
    expect(month!.cells.slice(0, 3)).toEqual([null, null, '2026-07-01'])
    // 31 jours + 2 de padding
    expect(month!.cells.length).toBe(33)
  })

  it('produit une grille par mois traversé', () => {
    const months = buildMonths(getDaysBetween('2026-06-29', '2026-07-02'))
    expect(months.map((m) => m.key)).toEqual(['2026-06', '2026-07'])
  })
})
