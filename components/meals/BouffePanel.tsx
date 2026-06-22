'use client'

import { useState, useTransition } from 'react'
import { createMeal, deleteMeal, addProduct, toggleProduct, deleteProduct, setMealDate, toggleMealOwner } from '@/lib/actions/meals'
import { randomId } from '@/lib/uuid'
import type { Database } from '@/lib/database.types'

type Meal = Database['public']['Tables']['meals']['Row']
type Product = Database['public']['Tables']['products']['Row']
type MealOwner = Database['public']['Tables']['meal_owners']['Row']
type Participant = Database['public']['Tables']['participants']['Row']

const UNITS = ['unité', 'g', 'kg', 'L', 'cl', 'paquet', 'bouteille'] as const

const INPUT =
  'w-full bg-card border-[1.5px] border-line rounded-[13px] p-[13px] text-[14.5px] text-ink outline-none focus:border-terracotta placeholder:text-disabled'

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

function qtyLabel(p: Pick<Product, 'quantity' | 'unit'>) {
  if (p.quantity == null) return null
  return p.unit === 'unité' ? `×${p.quantity}` : `${p.quantity} ${p.unit}`
}

// Libellé compact d'une date ISO pour le tag : « sam. 12 juil. »
function mealDateLabel(iso: string) {
  return new Date(`${iso}T12:00:00`)
    .toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

// Jours de l'event (ISO yyyy-mm-dd) entre start et end inclus.
function getDaysBetween(start: string, end: string): string[] {
  const days: string[] = []
  const current = new Date(`${start}T12:00:00`)
  const last = new Date(`${end}T12:00:00`)
  while (current <= last) {
    days.push(current.toISOString().slice(0, 10))
    current.setDate(current.getDate() + 1)
  }
  return days
}

// Index lundi=0 … dimanche=6 à partir d'une date ISO.
function isoWeekdayIndex(iso: string): number {
  const js = new Date(`${iso}T00:00:00`).getDay() // 0=dim … 6=sam
  return (js + 6) % 7
}

type CalendarMonth = { key: string; label: string; cells: (string | null)[] }

// Grilles calendaires (1 par mois) couvrant les jours de l'event.
function buildMonths(eventDays: string[]): CalendarMonth[] {
  const months: CalendarMonth[] = []
  const seen = new Set<string>()
  for (const iso of eventDays) {
    const monthKey = iso.slice(0, 7)
    if (seen.has(monthKey)) continue
    seen.add(monthKey)
    const first = new Date(`${monthKey}-01T00:00:00`)
    const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
    const cells: (string | null)[] = []
    for (let i = 0; i < isoWeekdayIndex(`${monthKey}-01`); i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(`${monthKey}-${String(d).padStart(2, '0')}`)
    const label = first.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    months.push({ key: monthKey, label, cells })
  }
  return months
}

export function BouffePanel({
  slug,
  eventId,
  participantId,
  initialMeals,
  initialProducts,
  initialMealOwners,
  participants,
  dateStart,
  dateEnd,
}: {
  slug: string
  eventId: string
  participantId: string
  initialMeals: Meal[]
  initialProducts: Product[]
  initialMealOwners: MealOwner[]
  participants: Participant[]
  dateStart: string | null
  dateEnd: string | null
}) {
  const [meals, setMeals] = useState(initialMeals)
  const [products, setProducts] = useState(initialProducts)
  const [owners, setOwners] = useState(initialMealOwners)
  const [view, setView] = useState<'meals' | 'shopping'>('meals')
  const [sheet, setSheet] = useState<null | 'choose' | 'meal' | 'product'>(null)
  const [presetMeal, setPresetMeal] = useState<string | null>(null)
  const [dateSheetMeal, setDateSheetMeal] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const eventDays = dateStart && dateEnd ? getDaysBetween(dateStart, dateEnd) : []
  const pseudoOf = (id: string) => participants.find((p) => p.id === id)?.pseudo ?? '?'

  function productsOf(mealId: string | null) {
    return products.filter((p) => p.meal_id === mealId)
  }

  function ownersOf(mealId: string) {
    return owners.filter((o) => o.meal_id === mealId)
  }

  function handleCreateMeal(label: string, items: DraftItem[], mealDate: string | null) {
    const mealId = randomId()
    const optimisticMeal: Meal = {
      id: mealId, event_id: eventId, label, meal_date: mealDate, created_by: participantId,
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
    startTransition(() => createMeal(slug, eventId, participantId, label, items, mealDate).catch(() => {
      setMeals((m) => m.filter((x) => x.id !== mealId))
      setProducts((p) => p.filter((x) => x.meal_id !== mealId))
    }))
  }

  function handleSetMealDate(mealId: string, date: string | null) {
    const prev = meals
    setMeals((m) => m.map((x) => (x.id === mealId ? { ...x, meal_date: date } : x)))
    setDateSheetMeal(null)
    startTransition(() => setMealDate(slug, mealId, date).catch(() => setMeals(prev)))
  }

  function handleToggleOwner(mealId: string) {
    const mine = owners.find((o) => o.meal_id === mealId && o.participant_id === participantId)
    const join = !mine
    const prev = owners
    if (join) {
      setOwners((o) => [...o, {
        id: randomId(), event_id: eventId, meal_id: mealId,
        participant_id: participantId, created_at: new Date().toISOString(),
      }])
    } else {
      setOwners((o) => o.filter((x) => x !== mine))
    }
    startTransition(() => toggleMealOwner(slug, eventId, mealId, participantId, join).catch(() => setOwners(prev)))
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
          ownersOf={ownersOf}
          pseudoOf={pseudoOf}
          participantId={participantId}
          canPickDate={eventDays.length > 0}
          onDeleteMeal={handleDeleteMeal}
          onAddProductTo={(mealId) => { setPresetMeal(mealId); setSheet('product') }}
          onToggle={handleToggle}
          onToggleOwner={handleToggleOwner}
          onPickDate={(mealId) => setDateSheetMeal(mealId)}
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
          {sheet === 'meal' && <MealForm eventDays={eventDays} onSubmit={handleCreateMeal} />}
          {sheet === 'product' && (
            <ProductForm meals={meals} presetMeal={presetMeal} onSubmit={handleAddProduct} />
          )}
        </Sheet>
      )}

      {dateSheetMeal && (
        <Sheet onClose={() => setDateSheetMeal(null)}>
          <div className="flex flex-col gap-3">
            <h3 className="font-serif text-[20px] text-ink">Date du repas</h3>
            <DateCalendar
              eventDays={eventDays}
              value={meals.find((m) => m.id === dateSheetMeal)?.meal_date ?? null}
              onSelect={(iso) => handleSetMealDate(dateSheetMeal, iso)}
            />
            {meals.find((m) => m.id === dateSheetMeal)?.meal_date && (
              <button onClick={() => handleSetMealDate(dateSheetMeal, null)}
                className="self-start text-[13px] text-muted hover:text-prune font-semibold">
                Retirer la date
              </button>
            )}
          </div>
        </Sheet>
      )}
    </section>
  )
}

/* ---------------- Vue Repas ---------------- */
function MealsView({
  meals, productsOf, ownersOf, pseudoOf, participantId, canPickDate,
  onDeleteMeal, onAddProductTo, onToggle, onToggleOwner, onPickDate,
}: {
  meals: Meal[]
  productsOf: (mealId: string | null) => Product[]
  ownersOf: (mealId: string) => MealOwner[]
  pseudoOf: (id: string) => string
  participantId: string
  canPickDate: boolean
  onDeleteMeal: (id: string) => void
  onAddProductTo: (mealId: string) => void
  onToggle: (p: Product) => void
  onToggleOwner: (mealId: string) => void
  onPickDate: (mealId: string) => void
}) {
  const [layout, setLayout] = useState<'list' | 'grouped'>('list')

  if (meals.length === 0) {
    return (
      <p className="text-muted text-[13px] py-6 text-center">
        Aucun repas pour l&apos;instant. Ajoute un dîner, un apéro…
      </p>
    )
  }

  const cardProps = {
    productsOf, ownersOf, pseudoOf, participantId, canPickDate,
    onDeleteMeal, onAddProductTo, onToggle, onToggleOwner, onPickDate,
  }

  return (
    <div>
      <div className="mb-[14px] flex items-center justify-end gap-[6px]">
        {([['list', 'Liste', '☰'], ['grouped', 'Par date', '🗓️']] as const).map(([mode, label, icon]) => (
          <button key={mode} onClick={() => setLayout(mode)} aria-label={label} title={label}
            className={`rounded-[10px] px-[11px] py-[7px] text-[14px] transition-colors ${
              layout === mode ? 'bg-ink text-white' : 'bg-track text-[#6b665c]'
            }`}>
            {icon}
          </button>
        ))}
      </div>

      {layout === 'list' ? (
        <div className="flex flex-col gap-[11px]">
          {meals.map((meal) => <MealCard key={meal.id} meal={meal} {...cardProps} />)}
        </div>
      ) : (
        <div className="flex flex-col gap-[18px]">
          {groupByDate(meals).map((group) => (
            <div key={group.key}>
              <div className="mb-[9px] flex items-center gap-2">
                <h3 className="text-[12px] font-bold uppercase tracking-[0.8px] text-muted-2 capitalize">
                  {group.label}
                </h3>
                <span className="h-px flex-1 bg-line-2" />
              </div>
              <div className="flex flex-col gap-[11px]">
                {group.meals.map((meal) => <MealCard key={meal.id} meal={meal} {...cardProps} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Regroupe les repas par date (datés triés croissant, « Sans date » en dernier).
function groupByDate(meals: Meal[]): { key: string; label: string; meals: Meal[] }[] {
  const buckets = new Map<string, Meal[]>()
  for (const meal of meals) {
    const key = meal.meal_date ?? '__none__'
    const arr = buckets.get(key) ?? []
    arr.push(meal)
    buckets.set(key, arr)
  }
  const keys = [...buckets.keys()].sort((a, b) => {
    if (a === '__none__') return 1
    if (b === '__none__') return -1
    return a < b ? -1 : 1
  })
  return keys.map((key) => ({
    key,
    label: key === '__none__' ? 'Sans date' : mealDateLabel(key),
    meals: buckets.get(key)!,
  }))
}

function MealCard({
  meal, productsOf, ownersOf, pseudoOf, participantId, canPickDate,
  onDeleteMeal, onAddProductTo, onToggle, onToggleOwner, onPickDate,
}: {
  meal: Meal
  productsOf: (mealId: string | null) => Product[]
  ownersOf: (mealId: string) => MealOwner[]
  pseudoOf: (id: string) => string
  participantId: string
  canPickDate: boolean
  onDeleteMeal: (id: string) => void
  onAddProductTo: (mealId: string) => void
  onToggle: (p: Product) => void
  onToggleOwner: (mealId: string) => void
  onPickDate: (mealId: string) => void
}) {
  const items = productsOf(meal.id)
  const mealOwners = ownersOf(meal.id)
  const isOwner = mealOwners.some((o) => o.participant_id === participantId)
  return (
    <div className="bg-card border-[1.5px] border-line-2 rounded-[18px] overflow-hidden shadow-[0_2px_8px_rgba(60,45,20,0.04)]">
      <div className="flex items-center justify-between gap-2 px-[16px] pt-[14px] pb-[8px]">
        <p className="text-[15.5px] font-bold text-ink">🍽️ {meal.label}</p>
        <button onClick={() => onDeleteMeal(meal.id)}
          className="text-[12px] text-muted hover:text-prune transition-colors shrink-0">🗑</button>
      </div>

      {/* Date (tag) + responsables */}
      <div className="px-[16px] pb-[10px] flex flex-wrap items-center gap-1.5">
        {canPickDate ? (
          <button onClick={() => onPickDate(meal.id)}
            className={`rounded-full px-[9px] py-[3px] text-[11.5px] font-semibold transition-colors ${
              meal.meal_date
                ? 'bg-olive-soft text-olive-text-dk'
                : 'border-[1.5px] border-dashed border-[var(--color-dashed)] text-muted'
            }`}>
            📅 {meal.meal_date ? mealDateLabel(meal.meal_date) : 'ajouter une date'}
          </button>
        ) : meal.meal_date ? (
          <span className="rounded-full bg-olive-soft px-[9px] py-[3px] text-[11.5px] font-semibold text-olive-text-dk">
            📅 {mealDateLabel(meal.meal_date)}
          </span>
        ) : null}
        {mealOwners.map((o) => (
          <span key={o.id} className="rounded-full bg-soft px-[9px] py-[3px] text-[11.5px] font-medium text-body">
            👤 {pseudoOf(o.participant_id)}
          </span>
        ))}
        <button onClick={() => onToggleOwner(meal.id)}
          className={`rounded-full px-[9px] py-[3px] text-[11.5px] font-semibold transition-colors ${
            isOwner
              ? 'bg-terracotta-soft text-terracotta'
              : 'border-[1.5px] border-dashed border-[var(--color-dashed)] text-muted'
          }`}>
          {isOwner ? '✓ je gère' : '＋ je gère'}
        </button>
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
}

/* ---------------- Calendrier (sélection unique, jours de l'event) ---------------- */
function DateCalendar({
  eventDays, value, onSelect,
}: {
  eventDays: string[]
  value: string | null
  onSelect: (iso: string) => void
}) {
  const inEvent = new Set(eventDays)
  const months = buildMonths(eventDays)
  if (months.length === 0) return null
  return (
    <div className="flex flex-col gap-5">
      {months.map((m) => (
        <div key={m.key}>
          <div className="text-center text-[14px] font-bold text-ink mb-[12px] capitalize">{m.label}</div>
          <div className="grid grid-cols-7 gap-[4px] text-[11px] text-disabled font-bold text-center mb-1">
            {WEEKDAYS.map((w, i) => <div key={i}>{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-[6px]">
            {m.cells.map((iso, idx) => {
              if (!iso) return <div key={`pad-${idx}`} aria-hidden />
              const dayNum = Number(iso.slice(8, 10))
              if (!inEvent.has(iso)) {
                return (
                  <div key={iso} className="py-[10px] rounded-[11px] text-center text-[14px] font-semibold text-disabled-2">
                    {dayNum}
                  </div>
                )
              }
              const selected = value === iso
              return (
                <button key={iso} onClick={() => onSelect(iso)}
                  className={`py-[10px] rounded-[11px] text-center text-[14px] font-semibold cursor-pointer transition-colors ${
                    selected ? 'bg-olive text-white' : 'bg-olive-soft text-olive-text-dk'
                  }`}>
                  {dayNum}
                </button>
              )
            })}
          </div>
        </div>
      ))}
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
              {ml && <span className="mt-0.5 block text-[11px] text-muted">🍽️ {ml}</span>}
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

function MealForm({
  eventDays, onSubmit,
}: {
  eventDays: string[]
  onSubmit: (label: string, items: DraftItem[], mealDate: string | null) => void
}) {
  const [label, setLabel] = useState('')
  const [items, setItems] = useState<DraftItem[]>([])
  const [mealDate, setMealDate] = useState<string | null>(null)
  const [pname, setPname] = useState('')
  const [pqty, setPqty] = useState('1')
  const [punit, setPunit] = useState('unité')

  function addItem() {
    if (!pname.trim()) return
    setItems((xs) => [...xs, { name: pname.trim(), quantity: pqty ? Number(pqty) : null, unit: punit }])
    setPname(''); setPqty('1'); setPunit('unité')
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (label.trim()) onSubmit(label.trim(), items, mealDate) }}
      className="flex flex-col gap-3">
      <h3 className="font-serif text-[20px] text-ink">Nouveau repas</h3>
      <input autoFocus value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60}
        placeholder="ex : Dîner samedi, Apéro vendredi…" className={INPUT} />

      {eventDays.length > 0 && (
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.8px] text-muted-2 mb-2">
            Quel jour&nbsp;? <span className="font-medium normal-case tracking-normal text-muted">(optionnel)</span>
          </p>
          <DateCalendar
            eventDays={eventDays}
            value={mealDate}
            onSelect={(iso) => setMealDate((cur) => (cur === iso ? null : iso))}
          />
        </div>
      )}

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
  const [mealId, setMealId] = useState<string>(presetMeal ?? '')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    // Plus de tags libres : le seul tag est le repas associé (s'il y en a un),
    // comme pour les produits saisis directement dans un repas.
    const mealLabel = meals.find((m) => m.id === mealId)?.label
    const tags = mealLabel ? [mealLabel] : []
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
