'use client'

import { useState, useTransition } from 'react'
import { createMeal, deleteMeal, addProduct, toggleProduct, deleteProduct } from '@/lib/actions/meals'
import { randomId } from '@/lib/uuid'
import type { Database } from '@/lib/database.types'

type Meal = Database['public']['Tables']['meals']['Row']
type Product = Database['public']['Tables']['products']['Row']

const UNITS = ['unité', 'g', 'kg', 'L', 'cl', 'paquet', 'bouteille'] as const

const INPUT =
  'w-full bg-card border-[1.5px] border-line rounded-[13px] p-[13px] text-[14.5px] text-ink outline-none focus:border-terracotta placeholder:text-disabled'

function qtyLabel(p: Pick<Product, 'quantity' | 'unit'>) {
  if (p.quantity == null) return null
  return p.unit === 'unité' ? `×${p.quantity}` : `${p.quantity} ${p.unit}`
}

export function BouffePanel({
  slug,
  eventId,
  participantId,
  initialMeals,
  initialProducts,
}: {
  slug: string
  eventId: string
  participantId: string
  initialMeals: Meal[]
  initialProducts: Product[]
}) {
  const [meals, setMeals] = useState(initialMeals)
  const [products, setProducts] = useState(initialProducts)
  const [view, setView] = useState<'meals' | 'shopping'>('meals')
  const [sheet, setSheet] = useState<null | 'choose' | 'meal' | 'product'>(null)
  const [presetMeal, setPresetMeal] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function productsOf(mealId: string | null) {
    return products.filter((p) => p.meal_id === mealId)
  }

  function handleCreateMeal(label: string, items: DraftItem[]) {
    const mealId = randomId()
    const optimisticMeal: Meal = {
      id: mealId, event_id: eventId, label, created_by: participantId,
      created_at: new Date().toISOString(),
    }
    const optimisticProducts: Product[] = items.map((it) => ({
      id: randomId(), event_id: eventId, meal_id: mealId, name: it.name,
      quantity: it.quantity, unit: it.unit, tags: [label], checked: false,
      created_by: participantId, created_at: new Date().toISOString(),
    }))
    setMeals((m) => [...m, optimisticMeal])
    setProducts((p) => [...p, ...optimisticProducts])
    setSheet(null)
    startTransition(() => createMeal(slug, eventId, participantId, label, items).catch(() => {
      setMeals((m) => m.filter((x) => x.id !== mealId))
      setProducts((p) => p.filter((x) => x.meal_id !== mealId))
    }))
  }

  function handleAddProduct(name: string, opts: { quantity: number | null; unit: string; tags: string[]; mealId: string | null }) {
    const optimistic: Product = {
      id: randomId(), event_id: eventId, meal_id: opts.mealId, name,
      quantity: opts.quantity, unit: opts.unit, tags: opts.tags, checked: false,
      created_by: participantId, created_at: new Date().toISOString(),
    }
    setProducts((p) => [...p, optimistic])
    setSheet(null)
    setPresetMeal(null)
    startTransition(() => addProduct(slug, eventId, participantId, { name, ...opts }).catch(() =>
      setProducts((p) => p.filter((x) => x.id !== optimistic.id)),
    ))
  }

  function handleToggle(prod: Product) {
    const next = !prod.checked
    setProducts((p) => p.map((x) => (x.id === prod.id ? { ...x, checked: next } : x)))
    startTransition(() => toggleProduct(slug, prod.id, next).catch(() =>
      setProducts((p) => p.map((x) => (x.id === prod.id ? { ...x, checked: !next } : x))),
    ))
  }

  function handleDeleteProduct(id: string) {
    const prev = products
    setProducts((p) => p.filter((x) => x.id !== id))
    startTransition(() => deleteProduct(slug, id).catch(() => setProducts(prev)))
  }

  function handleDeleteMeal(id: string) {
    const prev = products
    setMeals((m) => m.filter((x) => x.id !== id))
    setProducts((p) => p.map((x) => (x.meal_id === id ? { ...x, meal_id: null } : x)))
    startTransition(() => deleteMeal(slug, id).catch(() => { setMeals((m) => [...m]); setProducts(prev) }))
  }

  const checkedCount = products.filter((p) => p.checked).length

  return (
    <section>
      <div className="bg-track rounded-[13px] p-[5px] flex gap-[4px] mb-[16px]">
        {([['meals', 'Repas'], ['shopping', 'Liste de courses']] as const).map(([v, label]) => (
          <button key={v} onClick={() => setView(v)}
            className={`flex-1 text-center rounded-[9px] py-[9px] text-[13px] transition-colors ${
              view === v ? 'bg-ink text-white font-bold' : 'text-[#6b665c]'
            }`}>
            {label}
            {v === 'shopping' && products.length > 0 && (
              <span className="ml-1.5 opacity-70">{checkedCount}/{products.length}</span>
            )}
          </button>
        ))}
      </div>

      {view === 'meals' ? (
        <MealsView
          meals={meals}
          productsOf={productsOf}
          onDeleteMeal={handleDeleteMeal}
          onAddProductTo={(mealId) => { setPresetMeal(mealId); setSheet('product') }}
          onToggle={handleToggle}
        />
      ) : (
        <ShoppingView
          products={products}
          mealLabel={(id) => meals.find((m) => m.id === id)?.label ?? null}
          onToggle={handleToggle}
          onDelete={handleDeleteProduct}
        />
      )}

      <button onClick={() => setSheet('choose')}
        className="mt-[14px] w-full rounded-[16px] bg-terracotta p-[15px] text-center text-[15px] font-bold text-white shadow-[0_4px_0_var(--color-terracotta-dk)] active:translate-y-1 active:shadow-none transition-all">
        ＋ Ajouter
      </button>

      {sheet && (
        <Sheet onClose={() => { setSheet(null); setPresetMeal(null) }}>
          {sheet === 'choose' && (
            <div className="flex flex-col gap-3">
              <h3 className="font-serif text-[20px] text-ink mb-1">Ajouter…</h3>
              <button onClick={() => setSheet('meal')}
                className="flex items-center gap-3 rounded-[15px] border-[1.5px] border-line bg-card p-[16px] text-left">
                <span className="text-[24px]">🍽️</span>
                <div>
                  <div className="text-[15px] font-bold text-ink">Un repas</div>
                  <div className="text-[12.5px] text-muted">Un moment + ses produits</div>
                </div>
              </button>
              <button onClick={() => { setPresetMeal(null); setSheet('product') }}
                className="flex items-center gap-3 rounded-[15px] border-[1.5px] border-line bg-card p-[16px] text-left">
                <span className="text-[24px]">🛒</span>
                <div>
                  <div className="text-[15px] font-bold text-ink">Un produit</div>
                  <div className="text-[12.5px] text-muted">À acheter — seul ou dans un repas</div>
                </div>
              </button>
            </div>
          )}
          {sheet === 'meal' && <MealForm onSubmit={handleCreateMeal} />}
          {sheet === 'product' && (
            <ProductForm meals={meals} presetMeal={presetMeal} onSubmit={handleAddProduct} />
          )}
        </Sheet>
      )}
    </section>
  )
}

/* ---------------- Vue Repas ---------------- */
function MealsView({
  meals, productsOf, onDeleteMeal, onAddProductTo, onToggle,
}: {
  meals: Meal[]
  productsOf: (mealId: string | null) => Product[]
  onDeleteMeal: (id: string) => void
  onAddProductTo: (mealId: string) => void
  onToggle: (p: Product) => void
}) {
  if (meals.length === 0) {
    return (
      <p className="text-muted text-[13px] py-6 text-center">
        Aucun repas pour l&apos;instant. Ajoute un dîner, un apéro…
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-[11px]">
      {meals.map((meal) => {
        const items = productsOf(meal.id)
        return (
          <div key={meal.id} className="bg-card border-[1.5px] border-line-2 rounded-[18px] overflow-hidden shadow-[0_2px_8px_rgba(60,45,20,0.04)]">
            <div className="flex items-center justify-between gap-2 px-[16px] pt-[14px] pb-[10px]">
              <p className="text-[15.5px] font-bold text-ink">🍽️ {meal.label}</p>
              <button onClick={() => onDeleteMeal(meal.id)}
                className="text-[12px] text-muted hover:text-prune transition-colors shrink-0">🗑</button>
            </div>
            <div className="px-[16px] pb-[14px] flex flex-col gap-1.5">
              {items.length === 0 && (
                <p className="text-[12.5px] text-muted italic">Pas encore de produit.</p>
              )}
              {items.map((p) => (
                <button key={p.id} onClick={() => onToggle(p)} className="flex items-center gap-2 text-left">
                  <CheckBox checked={p.checked} />
                  <span className={`text-[14px] ${p.checked ? 'text-muted line-through' : 'text-ink'}`}>{p.name}</span>
                  <Qty p={p} />
                </button>
              ))}
              <button onClick={() => onAddProductTo(meal.id)}
                className="mt-1 self-start text-[13px] text-terracotta font-semibold">＋ produit</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ---------------- Vue Liste de courses ---------------- */
function ShoppingView({
  products, mealLabel, onToggle, onDelete,
}: {
  products: Product[]
  mealLabel: (id: string) => string | null
  onToggle: (p: Product) => void
  onDelete: (id: string) => void
}) {
  if (products.length === 0) {
    return <p className="text-muted text-[13px] py-6 text-center">Rien à acheter pour l&apos;instant.</p>
  }
  const todo = products.filter((p) => !p.checked)
  const done = products.filter((p) => p.checked)
  return (
    <div className="flex flex-col gap-[8px]">
      {[...todo, ...done].map((p) => {
        const ml = p.meal_id ? mealLabel(p.meal_id) : null
        return (
          <div key={p.id} className="flex items-center gap-2.5 rounded-[13px] border-[1.5px] border-line-2 bg-card px-[14px] py-[11px]">
            <button onClick={() => onToggle(p)} className="shrink-0"><CheckBox checked={p.checked} /></button>
            <button onClick={() => onToggle(p)} className="flex-1 min-w-0 text-left">
              <span className="flex items-center gap-2">
                <span className={`text-[14.5px] ${p.checked ? 'text-muted line-through' : 'text-ink font-medium'}`}>{p.name}</span>
                <Qty p={p} />
              </span>
              <span className="flex items-center gap-1.5 mt-0.5">
                {ml && <span className="text-[11px] text-muted">🍽️ {ml}</span>}
                <Tags tags={p.tags} />
              </span>
            </button>
            <button onClick={() => onDelete(p.id)}
              className="shrink-0 text-[12px] text-muted hover:text-prune transition-colors">🗑</button>
          </div>
        )
      })}
    </div>
  )
}

/* ---------------- Bits ---------------- */
function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span className={`flex h-[22px] w-[22px] items-center justify-center rounded-[7px] border-[1.5px] transition-colors ${
      checked ? 'bg-olive border-olive text-white' : 'border-[var(--color-dashed)] bg-card'
    }`}>
      {checked && <span className="text-[12px] leading-none">✓</span>}
    </span>
  )
}

function Qty({ p }: { p: Product }) {
  const label = qtyLabel(p)
  if (!label) return null
  return <span className="shrink-0 rounded-full bg-soft px-[7px] py-[1px] text-[11px] font-semibold text-body">{label}</span>
}

function Tags({ tags }: { tags: string[] }) {
  if (!tags.length) return null
  return (
    <span className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <span key={t} className="rounded-full bg-soft px-[7px] py-[1px] text-[10.5px] font-medium text-body">{t}</span>
      ))}
    </span>
  )
}

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-paper rounded-[22px] shadow-[0_8px_40px_rgba(60,45,20,0.18)] p-6 max-h-[90vh] overflow-y-auto animate-sheet-up">
        {children}
      </div>
    </div>
  )
}

/* Champ compact quantité + unité : [ 2 ] [unité ▾] */
function QtyUnit({
  qty, unit, onQty, onUnit,
}: {
  qty: string
  unit: string
  onQty: (v: string) => void
  onUnit: (v: string) => void
}) {
  return (
    <div className="flex gap-2 shrink-0">
      <input type="number" min="0" step="any" inputMode="decimal" value={qty}
        onChange={(e) => onQty(e.target.value)} aria-label="Quantité"
        className="w-[64px] bg-card border-[1.5px] border-line rounded-[13px] p-[13px] text-[14.5px] text-ink text-center outline-none focus:border-terracotta" />
      <select value={unit} onChange={(e) => onUnit(e.target.value)} aria-label="Unité"
        className="bg-card border-[1.5px] border-line rounded-[13px] px-[10px] text-[14px] text-ink outline-none focus:border-terracotta">
        {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
      </select>
    </div>
  )
}

type DraftItem = { name: string; quantity: number | null; unit: string }

function MealForm({ onSubmit }: { onSubmit: (label: string, items: DraftItem[]) => void }) {
  const [label, setLabel] = useState('')
  const [items, setItems] = useState<DraftItem[]>([])
  const [pname, setPname] = useState('')
  const [pqty, setPqty] = useState('1')
  const [punit, setPunit] = useState('unité')

  function addItem() {
    if (!pname.trim()) return
    setItems((xs) => [...xs, { name: pname.trim(), quantity: pqty ? Number(pqty) : null, unit: punit }])
    setPname(''); setPqty('1'); setPunit('unité')
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (label.trim()) onSubmit(label.trim(), items) }}
      className="flex flex-col gap-3">
      <h3 className="font-serif text-[20px] text-ink">Nouveau repas</h3>
      <input autoFocus value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60}
        placeholder="ex : Dîner samedi, Apéro vendredi…" className={INPUT} />

      <p className="text-[12px] font-bold uppercase tracking-[0.8px] text-muted-2">Produits</p>
      {items.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-2 rounded-[11px] bg-soft px-[12px] py-[9px]">
              <span className="text-[14px] text-ink flex-1">{it.name}</span>
              <span className="text-[12px] text-muted">{qtyLabel(it)}</span>
              <button type="button" onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))}
                className="text-[13px] text-muted hover:text-prune">✕</button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input value={pname} onChange={(e) => setPname(e.target.value)} maxLength={60}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }}
          placeholder="ex : Pâtes" className={INPUT} />
        <QtyUnit qty={pqty} unit={punit} onQty={setPqty} onUnit={setPunit} />
      </div>
      <button type="button" onClick={addItem} disabled={!pname.trim()}
        className="self-start text-[13px] text-terracotta font-semibold disabled:opacity-40">＋ ajouter à la liste</button>

      <button type="submit" disabled={!label.trim()}
        className="mt-1 w-full rounded-[15px] bg-terracotta p-[15px] font-bold text-white shadow-[0_4px_0_var(--color-terracotta-dk)] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50">
        Créer le repas{items.length > 0 ? ` (${items.length})` : ''}
      </button>
    </form>
  )
}

function ProductForm({
  meals, presetMeal, onSubmit,
}: {
  meals: Meal[]
  presetMeal: string | null
  onSubmit: (name: string, opts: { quantity: number | null; unit: string; tags: string[]; mealId: string | null }) => void
}) {
  const [name, setName] = useState('')
  const [qty, setQty] = useState('1')
  const [unit, setUnit] = useState('unité')
  const [tagsRaw, setTagsRaw] = useState('')
  const [mealId, setMealId] = useState<string>(presetMeal ?? '')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const tags = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
    onSubmit(name.trim(), { quantity: qty ? Number(qty) : null, unit, tags, mealId: mealId || null })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <h3 className="font-serif text-[20px] text-ink">Nouveau produit</h3>
      <div className="flex gap-2">
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={60}
          placeholder="ex : Pâtes, Bière…" className={INPUT} />
        <QtyUnit qty={qty} unit={unit} onQty={setQty} onUnit={setUnit} />
      </div>
      <input value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} maxLength={80}
        placeholder="Tags séparés par des virgules (goûter, apéro…)" className={INPUT} />
      <div>
        <p className="text-[12px] font-bold uppercase tracking-[0.8px] text-muted-2 mb-2">Rattacher à un repas&nbsp;?</p>
        <select value={mealId} onChange={(e) => setMealId(e.target.value)} className={INPUT}>
          <option value="">Aucun (juste la liste de courses)</option>
          {meals.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
      </div>
      <button type="submit" disabled={!name.trim()}
        className="mt-1 w-full rounded-[15px] bg-terracotta p-[15px] font-bold text-white shadow-[0_4px_0_var(--color-terracotta-dk)] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50">
        Ajouter le produit
      </button>
    </form>
  )
}
