// Logique de découpage du coût d'une activité, isolée et pure pour être testée.
// price_type : 'total' (prix fixe divisé entre N), 'per_person' (prix × N),
// 'per_group' (un groupe = group_size pers, chacun paie price / group_size ;
// le total facture ceil(N / group_size) groupes).

export type Pricing = {
  price: number | null
  price_type: 'total' | 'per_person' | 'per_group' | null
  group_size: number | null
}

export function formatEuro(n: number): string {
  const s = Number.isInteger(n) ? String(n) : (Math.round(n * 100) / 100).toFixed(2).replace('.', ',')
  return `${s}€`
}

export function perPerson(a: Pricing, n: number): number | null {
  if (a.price == null || !a.price_type) return null
  if (a.price_type === 'per_person') return a.price
  if (a.price_type === 'total') return n > 0 ? a.price / n : null
  // per_group : chacun paie sa part d'un groupe complet (prix ÷ taille de groupe).
  const g = a.group_size && a.group_size > 0 ? a.group_size : 1
  return a.price / g
}

export function totalCost(a: Pricing, n: number): number | null {
  if (a.price == null || !a.price_type) return null
  if (a.price_type === 'per_person') return a.price * n
  if (a.price_type === 'total') return a.price
  const g = a.group_size && a.group_size > 0 ? a.group_size : 1
  return a.price * Math.ceil(n / g)
}
