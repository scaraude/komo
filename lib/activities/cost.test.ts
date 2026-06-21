import { describe, it, expect } from 'vitest'
import { perPerson, totalCost, formatEuro, type Pricing } from './cost'

const total = (price: number): Pricing => ({ price, price_type: 'total', group_size: null })
const perPers = (price: number): Pricing => ({ price, price_type: 'per_person', group_size: null })
const perGroup = (price: number, group_size: number): Pricing => ({ price, price_type: 'per_group', group_size })

describe('perPerson', () => {
  it('divides a total price by the number of people', () => {
    expect(perPerson(total(90), 6)).toBe(15)
    expect(perPerson(total(90), 9)).toBe(10)
  })

  it('returns null for a total price with zero people (no division by zero)', () => {
    expect(perPerson(total(90), 0)).toBeNull()
  })

  it('keeps a per-person price constant', () => {
    expect(perPerson(perPers(12), 8)).toBe(12)
    expect(perPerson(perPers(12), 1)).toBe(12)
  })

  it('charges price / group_size for a per-group price', () => {
    expect(perPerson(perGroup(40, 2), 6)).toBe(20)
    expect(perPerson(perGroup(40, 2), 5)).toBe(20)
  })

  it('returns null when there is no price', () => {
    expect(perPerson({ price: null, price_type: null, group_size: null }, 4)).toBeNull()
  })
})

describe('totalCost', () => {
  it('keeps a total price fixed regardless of headcount', () => {
    expect(totalCost(total(90), 6)).toBe(90)
    expect(totalCost(total(90), 100)).toBe(90)
  })

  it('scales a per-person price with headcount', () => {
    expect(totalCost(perPers(12), 8)).toBe(96)
  })

  it('bills ceil(N / group_size) groups for a per-group price', () => {
    expect(totalCost(perGroup(40, 2), 6)).toBe(120) // 3 groupes pleins
    expect(totalCost(perGroup(40, 2), 5)).toBe(120) // 3 groupes (le dernier incomplet est facturé)
    expect(totalCost(perGroup(40, 2), 1)).toBe(40)
  })
})

describe('formatEuro', () => {
  it('omits decimals for whole amounts', () => {
    expect(formatEuro(40)).toBe('40€')
  })

  it('formats cents with a comma', () => {
    expect(formatEuro(12.5)).toBe('12,50€')
    expect(formatEuro(15)).toBe('15€')
  })
})
