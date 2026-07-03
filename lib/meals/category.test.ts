import { describe, it, expect } from 'vitest'
import { categorize, groupByCategory, CATEGORIES } from './category'

describe('categorize', () => {
  it('classe les fruits et légumes', () => {
    expect(categorize('Tomates').key).toBe('produce')
    expect(categorize('pommes de terre').key).toBe('produce')
    expect(categorize('Bananes bio').key).toBe('produce')
  })

  it('classe viandes et poissons', () => {
    expect(categorize('Poulet fermier').key).toBe('butchery')
    expect(categorize('Saumon fumé').key).toBe('butchery')
    expect(categorize('steak haché').key).toBe('butchery')
  })

  it('classe la crèmerie', () => {
    expect(categorize('Lait demi-écrémé').key).toBe('dairy')
    expect(categorize('Yaourts nature').key).toBe('dairy')
    expect(categorize('œufs').key).toBe('dairy')
  })

  it('distingue épicerie salée et sucrée', () => {
    expect(categorize('Pâtes').key).toBe('grocery_savory')
    expect(categorize('Riz basmati').key).toBe('grocery_savory')
    expect(categorize('Chocolat noir').key).toBe('grocery_sweet')
    expect(categorize('Sucre en poudre').key).toBe('grocery_sweet')
  })

  it('classe les boissons', () => {
    expect(categorize('Eau plate').key).toBe('drinks')
    expect(categorize('Bière blonde').key).toBe('drinks')
  })

  it('gère les collisions via la correspondance la plus spécifique', () => {
    // « fruits de mer » (butchery) doit battre « fruit » (produce)
    expect(categorize('fruits de mer').key).toBe('butchery')
    // « jus de fruit » (drinks) doit battre « fruit » (produce)
    expect(categorize('jus de fruit multivitaminé').key).toBe('drinks')
    // « veau » (butchery) doit battre « eau » (drinks)
    expect(categorize('rôti de veau').key).toBe('butchery')
    // « the glace » (drinks) doit battre « the » (grocery_sweet)
    expect(categorize('thé glacé pêche').key).toBe('drinks')
  })

  it('retombe sur « Divers » pour un produit inconnu ou vide', () => {
    expect(categorize('gadget mystère').key).toBe('other')
    expect(categorize('   ').key).toBe('other')
  })
})

describe('groupByCategory', () => {
  it('regroupe dans l’ordre supermarché et ignore les rayons vides', () => {
    const names = ['Chocolat', 'Tomates', 'Poulet', 'gadget mystère']
    const groups = groupByCategory(names, (n) => n)
    expect(groups.map((g) => g.category.key)).toEqual([
      'produce', 'butchery', 'grocery_sweet', 'other',
    ])
    expect(groups.find((g) => g.category.key === 'produce')?.items).toEqual(['Tomates'])
  })

  it('respecte l’ordre déclaré des catégories', () => {
    const keys = CATEGORIES.map((c) => c.key)
    expect(keys.indexOf('produce')).toBeLessThan(keys.indexOf('drinks'))
    expect(keys.indexOf('other')).toBe(keys.length - 1)
  })
})
