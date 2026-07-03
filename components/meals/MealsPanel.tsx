'use client'

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from 'react'
import {
  DndContext, DragOverlay, MouseSensor, TouchSensor, pointerWithin,
  useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
  type DraggableAttributes, type DraggableSyntheticListeners,
} from '@dnd-kit/core'
import { createMeal, deleteMeal, addProduct, toggleProduct, deleteProduct, updateProduct, setMealDate, toggleMealOwner, editMeal } from '@/lib/actions/meals'
import { Sheet } from '@/components/ui/Sheet'
import { ConfirmButton } from '@/components/ui/ConfirmButton'
import { useUndo } from '@/components/ui/undo'
import { Button } from '@/components/ui/Button'
import { DashedAddButton } from '@/components/ui/DashedAddButton'
import { Card } from '@/components/ui/Card'
import { pseudoOf as resolvePseudo } from '@/lib/participants'
import { randomId } from '@/lib/uuid'
import { WEEKDAYS, getDaysBetween, buildMonths, formatDayLabel } from '@/lib/calendar'
import { groupByCategory } from '@/lib/meals/category'
import { normalizeUrl, linkIcon, linkHost } from '@/lib/meals/links'
import type { Meal, Product, MealOwner, Participant } from '@/lib/types'

const UNITS = ['unité', 'g', 'kg', 'L', 'cl', 'paquet', 'bouteille'] as const

const INPUT =
  'w-full bg-card border-[1.5px] border-line rounded-[13px] p-[13px] text-[14.5px] text-ink outline-none focus:border-terracotta placeholder:text-disabled'

// Bouton d'icône d'action (modifier / supprimer) : glyphe lisible + zone de clic
// tactile ~36px. Ajouter la couleur de hover par-dessus (olive, prune…).
const ICON_BTN =
  'shrink-0 flex h-[36px] w-[36px] items-center justify-center rounded-[11px] text-[17px] text-muted transition-colors'

// useSyncExternalStore sans mises à jour (sert juste à détecter le client).
const subscribeNoop = () => () => {}

function qtyLabel(p: { quantity: number | null; unit: string }) {
  if (p.quantity == null) return null
  return p.unit === 'unité' ? `×${p.quantity}` : `${p.quantity} ${p.unit}`
}


type DraftItem = { name: string; quantity: number | null; unit: string }
// Ingrédient existant modifié en place lors de l'édition d'un repas.
type EditedItem = { id: string; name: string; quantity: number | null; unit: string }

// État de la modale d'ajout :
//  - 'add'    : modale globale à 2 onglets (Produit | Repas)
//  - 'mealAt' : depuis un jour vide du calendrier → repas seul, date verrouillée
type SheetState =
  | { kind: 'add'; tab: 'product' | 'meal'; presetMeal: string | null }
  | { kind: 'mealAt'; date: string }

export function MealsPanel({
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
  const [sheet, setSheet] = useState<SheetState | null>(null)
  const [dateSheetMeal, setDateSheetMeal] = useState<string | null>(null)
  const [confirmDeleteMeal, setConfirmDeleteMeal] = useState<string | null>(null)
  const [editMealId, setEditMealId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const requestUndo = useUndo()
  // Repas créés en optimiste (id temporaire) pas encore persistés. Agir dessus
  // (je gère, + produit) ferait échouer la FK meal_id/meal_owners en base.
  const pendingMealIds = useRef<Set<string>>(new Set())

  const eventDays = dateStart && dateEnd ? getDaysBetween(dateStart, dateEnd) : []
  const pseudoOf = (id: string) => resolvePseudo(participants, id)

  function productsOf(mealId: string | null) {
    return products.filter((p) => p.meal_id === mealId)
  }

  function ownersOf(mealId: string) {
    return owners.filter((o) => o.meal_id === mealId)
  }

  function handleCreateMeal(
    label: string, items: DraftItem[], mealDate: string | null,
    isRestaurant = false, links: string[] = [],
  ) {
    const tempMealId = randomId()
    const cleanLinks = links.map(normalizeUrl).filter(Boolean)
    const optimisticMeal: Meal = {
      id: tempMealId, event_id: eventId, label, meal_date: mealDate,
      is_restaurant: isRestaurant, links: cleanLinks, created_by: participantId,
      created_at: new Date().toISOString(),
    }
    const optimisticProducts: Product[] = items.map((it) => ({
      id: randomId(), event_id: eventId, meal_id: tempMealId, name: it.name,
      quantity: it.quantity, unit: it.unit, tags: [label], checked: false,
      created_by: participantId, created_at: new Date().toISOString(),
    }))
    pendingMealIds.current.add(tempMealId)
    setMeals((m) => [...m, optimisticMeal])
    setProducts((p) => [...p, ...optimisticProducts])
    setSheet(null)
    startTransition(() =>
      createMeal(slug, eventId, participantId, label, items, mealDate, isRestaurant, cleanLinks)
        .then(({ mealId, productIds }) => {
          // Remplace les ids temporaires par les ids réels de la DB (même ordre).
          pendingMealIds.current.delete(tempMealId)
          const idMap = new Map(optimisticProducts.map((p, i) => [p.id, productIds[i] ?? p.id]))
          setMeals((m) => m.map((x) => (x.id === tempMealId ? { ...x, id: mealId } : x)))
          setProducts((p) => p.map((x) =>
            x.meal_id === tempMealId ? { ...x, id: idMap.get(x.id) ?? x.id, meal_id: mealId } : x))
        })
        .catch(() => {
          pendingMealIds.current.delete(tempMealId)
          setMeals((m) => m.filter((x) => x.id !== tempMealId))
          setProducts((p) => p.filter((x) => x.meal_id !== tempMealId))
        }),
    )
  }

  function handleSetMealDate(mealId: string, date: string | null) {
    const prev = meals
    setMeals((m) => m.map((x) => (x.id === mealId ? { ...x, meal_date: date } : x)))
    setDateSheetMeal(null)
    startTransition(() => setMealDate(slug, mealId, date).catch(() => setMeals(prev)))
  }

  function handleToggleOwner(mealId: string) {
    // Repas pas encore persisté (id temporaire) : meal_owners.meal_id échouerait.
    if (pendingMealIds.current.has(mealId)) return
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

  // Ajout d'un ou plusieurs produits d'un coup (onglet Produit ou « ＋ produit » d'un repas).
  function handleAddProducts(items: DraftItem[], mealId: string | null) {
    // Rattacher un produit à un repas pas encore persisté ferait échouer la FK
    // products.meal_id : on attend que le repas ait son id réel.
    if (mealId != null && pendingMealIds.current.has(mealId)) return
    const mealLabel = meals.find((m) => m.id === mealId)?.label
    const tags = mealLabel ? [mealLabel] : []
    const optimistic: Product[] = items.map((it) => ({
      id: randomId(), event_id: eventId, meal_id: mealId, name: it.name,
      quantity: it.quantity, unit: it.unit, tags, checked: false,
      created_by: participantId, created_at: new Date().toISOString(),
    }))
    const ids = new Set(optimistic.map((p) => p.id))
    setProducts((p) => [...p, ...optimistic])
    setSheet(null)
    startTransition(() => {
      Promise.all(
        optimistic.map((p) =>
          addProduct(slug, eventId, participantId, { name: p.name, quantity: p.quantity, unit: p.unit, tags, mealId }),
        ),
      )
        .then((realIds) => {
          // Remplace les ids temporaires par les ids réels de la DB (même ordre).
          const idMap = new Map(optimistic.map((p, i) => [p.id, realIds[i] ?? p.id]))
          setProducts((p) => p.map((x) => (idMap.has(x.id) ? { ...x, id: idMap.get(x.id)! } : x)))
        })
        .catch(() => setProducts((p) => p.filter((x) => !ids.has(x.id))))
    })
  }

  function handleToggle(prod: Product) {
    const next = !prod.checked
    setProducts((p) => p.map((x) => (x.id === prod.id ? { ...x, checked: next } : x)))
    startTransition(() => toggleProduct(slug, prod.id, next).catch(() =>
      setProducts((p) => p.map((x) => (x.id === prod.id ? { ...x, checked: !next } : x))),
    ))
  }

  function handleDeleteProduct(id: string) {
    const idx = products.findIndex((x) => x.id === id)
    const removed = products[idx]
    if (!removed) return
    const name = removed.name
    setProducts((p) => p.filter((x) => x.id !== id))
    requestUndo({
      message: name ? `« ${name} » retiré` : 'Produit retiré',
      commit: () => deleteProduct(slug, id),
      // Undo fonctionnel : réinsère uniquement le produit retiré (à sa position
      // d'origine), sans remplacer la liste — préserve les changements réalisés
      // entre-temps via le realtime. Le guard évite un doublon.
      undo: () =>
        setProducts((p) =>
          p.some((x) => x.id === id)
            ? p
            : [...p.slice(0, idx), removed, ...p.slice(idx)],
        ),
    })
  }

  // Édition en place d'un produit depuis la liste de courses (nom/quantité/unité).
  function handleUpdateProduct(id: string, patch: { name: string; quantity: number | null; unit: string }) {
    const prev = products
    setProducts((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)))
    startTransition(() => updateProduct(slug, id, patch).catch(() => setProducts(prev)))
  }

  // Édition complète d'un repas : renommage (+ retag des produits), suppression
  // d'ingrédients, modification en place et ajout de nouveaux, le tout en un appel.
  function handleEditMeal(
    mealId: string, label: string, removedIds: string[], newItems: DraftItem[], editedItems: EditedItem[],
    links: string[] | null = null,
  ) {
    // Repas pas encore persisté (id temporaire) : on attend son id réel.
    if (pendingMealIds.current.has(mealId)) return
    const clean = label.trim()
    if (!clean) return
    const cleanLinks = links == null ? null : links.map(normalizeUrl).filter(Boolean)
    const prevMeals = meals
    const prevProducts = products
    const oldLabel = meals.find((m) => m.id === mealId)?.label ?? null
    const editMap = new Map(editedItems.map((e) => [e.id, e]))

    const optimisticNew: Product[] = newItems.map((it) => ({
      id: randomId(), event_id: eventId, meal_id: mealId, name: it.name,
      quantity: it.quantity, unit: it.unit, tags: [clean], checked: false,
      created_by: participantId, created_at: new Date().toISOString(),
    }))

    setMeals((m) => m.map((x) => (x.id === mealId
      ? { ...x, label: clean, ...(cleanLinks == null ? {} : { links: cleanLinks }) }
      : x)))
    setProducts((p) => {
      let next = p.filter((x) => !removedIds.includes(x.id))
      // Applique les modifications en place (nom / quantité / unité).
      next = next.map((x) => {
        const ed = editMap.get(x.id)
        return ed ? { ...x, name: ed.name, quantity: ed.quantity, unit: ed.unit } : x
      })
      // Retag optimiste : remplace l'ancien label par le nouveau dans les tags.
      if (oldLabel && oldLabel !== clean) {
        next = next.map((x) =>
          x.meal_id === mealId ? { ...x, tags: (x.tags ?? []).map((t) => (t === oldLabel ? clean : t)) } : x,
        )
      }
      return [...next, ...optimisticNew]
    })
    setEditMealId(null)
    startTransition(() =>
      editMeal(slug, eventId, participantId, mealId, clean, removedIds, newItems, editedItems, cleanLinks)
        .then(({ productIds }) => {
          // Remplace les ids temporaires des nouveaux produits par les ids réels.
          const idMap = new Map(optimisticNew.map((p, i) => [p.id, productIds[i] ?? p.id]))
          setProducts((p) => p.map((x) => (idMap.has(x.id) ? { ...x, id: idMap.get(x.id)! } : x)))
        })
        .catch(() => {
          setMeals(prevMeals)
          setProducts(prevProducts)
        }),
    )
  }

  // Clic sur 🗑 : si le repas a des produits, on demande quoi en faire.
  // Sinon suppression directe.
  function requestDeleteMeal(id: string) {
    if (productsOf(id).length === 0) handleDeleteMeal(id, false)
    else setConfirmDeleteMeal(id)
  }

  function handleDeleteMeal(id: string, alsoProducts: boolean) {
    const mealIdx = meals.findIndex((m) => m.id === id)
    const removedMeal = meals[mealIdx]
    // Produits rattachés au repas + leur position d'origine, pour un undo ciblé.
    const affected = products
      .map((p, idx) => ({ product: p, idx }))
      .filter(({ product }) => product.meal_id === id)
    const affectedIds = new Set(affected.map(({ product }) => product.id))

    setMeals((m) => m.filter((x) => x.id !== id))
    setProducts((p) =>
      alsoProducts
        ? p.filter((x) => x.meal_id !== id)
        : p.map((x) => (x.meal_id === id ? { ...x, meal_id: null } : x)),
    )
    setConfirmDeleteMeal(null)
    const label = removedMeal?.label
    requestUndo({
      message: label ? `« ${label} » supprimé` : 'Repas supprimé',
      commit: () => deleteMeal(slug, id, alsoProducts),
      // Undo fonctionnel : restaure uniquement les lignes affectées, fusionnées
      // dans l'état courant — préserve les changements réalisés entre-temps via
      // le realtime, au lieu de remplacer les listes en bloc.
      undo: () => {
        if (removedMeal) {
          setMeals((m) =>
            m.some((x) => x.id === id)
              ? m
              : [...m.slice(0, mealIdx), removedMeal, ...m.slice(mealIdx)],
          )
        }
        if (alsoProducts) {
          // Réinsère les produits supprimés (guard anti-doublon par id).
          setProducts((p) => {
            const present = new Set(p.map((x) => x.id))
            const toRestore = affected.filter(({ product }) => !present.has(product.id))
            if (toRestore.length === 0) return p
            // Insère chacun à sa position d'origine (ordre croissant des idx).
            let next = p
            for (const { product, idx } of toRestore) {
              next = [...next.slice(0, idx), product, ...next.slice(idx)]
            }
            return next
          })
        } else {
          // Re-rattache les produits affectés au repas, sans toucher au reste.
          setProducts((p) =>
            p.map((x) => (affectedIds.has(x.id) ? { ...x, meal_id: id } : x)),
          )
        }
      },
    })
  }

  const checkedCount = products.filter((p) => p.checked).length

  const addButton = (
    <Button onClick={() => setSheet({ kind: 'add', tab: 'product', presetMeal: null })}
      className="w-full rounded-[16px] p-[15px] text-[15px]">
      ＋ Ajouter
    </Button>
  )

  return (
    <section>
      <div className="bg-track rounded-[13px] p-[5px] flex gap-[4px] mb-[16px]">
        {([['meals', 'Repas'], ['shopping', 'Liste de courses']] as const).map(([v, label]) => (
          <button key={v} onClick={() => setView(v)}
            className={`flex-1 text-center rounded-[9px] py-[9px] text-[13px] transition-colors ${
              view === v ? 'bg-ink text-white font-bold' : 'text-faint'
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
          eventDays={eventDays}
          productsOf={productsOf}
          ownersOf={ownersOf}
          pseudoOf={pseudoOf}
          participantId={participantId}
          addButton={addButton}
          onDeleteMeal={requestDeleteMeal}
          onAddProductTo={(mealId) => setSheet({ kind: 'add', tab: 'product', presetMeal: mealId })}
          onAddMealAt={(date) => setSheet({ kind: 'mealAt', date })}
          onToggleOwner={handleToggleOwner}
          onPickDate={(mealId) => setDateSheetMeal(mealId)}
          onMoveMeal={handleSetMealDate}
          onEditMeal={setEditMealId}
        />
      ) : (
        <>
          {/* Onglet Produits : bouton en haut, avant la liste. */}
          <div className="mb-[16px]">{addButton}</div>
          <ShoppingView
            products={products}
            mealLabel={(id) => meals.find((m) => m.id === id)?.label ?? null}
            onToggle={handleToggle}
            onDelete={handleDeleteProduct}
            onEdit={handleUpdateProduct}
          />
        </>
      )}

      {sheet?.kind === 'add' && (
        <Sheet onClose={() => setSheet(null)}>
          <AddForm
            initialMode={sheet.tab}
            lockedDate={null}
            presetMeal={sheet.presetMeal}
            meals={meals}
            eventDays={eventDays}
            onCreateMeal={handleCreateMeal}
            onAddProducts={handleAddProducts}
          />
        </Sheet>
      )}

      {sheet?.kind === 'mealAt' && (
        <Sheet onClose={() => setSheet(null)}>
          <AddForm
            initialMode="meal"
            lockedDate={sheet.date}
            presetMeal={null}
            meals={meals}
            eventDays={eventDays}
            onCreateMeal={handleCreateMeal}
            onAddProducts={handleAddProducts}
          />
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

      {confirmDeleteMeal && (
        <Sheet onClose={() => setConfirmDeleteMeal(null)}>
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="font-serif text-[20px] text-ink">
                Supprimer « {meals.find((m) => m.id === confirmDeleteMeal)?.label} »&nbsp;?
              </h3>
              <p className="mt-1 text-[14px] text-body">
                Veux-tu aussi supprimer ses produits de la liste de courses&nbsp;?
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => handleDeleteMeal(confirmDeleteMeal, true)}
                className="w-full rounded-[15px] bg-prune p-[14px] font-bold text-white active:translate-y-px transition-transform">
                Oui, supprimer aussi les produits
              </button>
              <button onClick={() => handleDeleteMeal(confirmDeleteMeal, false)}
                className="w-full rounded-[15px] border-[1.5px] border-line bg-card p-[14px] font-bold text-ink active:translate-y-px transition-transform">
                Non, garder les produits
              </button>
              <button onClick={() => setConfirmDeleteMeal(null)}
                className="w-full p-[10px] text-[14px] font-semibold text-muted hover:text-ink transition-colors">
                Annuler
              </button>
            </div>
          </div>
        </Sheet>
      )}

      {editMealId && (() => {
        const meal = meals.find((m) => m.id === editMealId)
        if (!meal) return null
        return (
          <Sheet onClose={() => setEditMealId(null)}>
            <EditMealForm
              label={meal.label}
              isRestaurant={meal.is_restaurant}
              initialLinks={meal.links}
              ingredients={productsOf(meal.id)}
              onCancel={() => setEditMealId(null)}
              onSave={(label, removedIds, newItems, editedItems, links) =>
                handleEditMeal(meal.id, label, removedIds, newItems, editedItems, links)}
            />
          </Sheet>
        )
      })()}
    </section>
  )
}

/* ---------------- Vue Repas : agenda par jour (drag & drop) ---------------- */
type CardProps = {
  productsOf: (mealId: string | null) => Product[]
  ownersOf: (mealId: string) => MealOwner[]
  pseudoOf: (id: string) => string
  participantId: string
  onDeleteMeal: (id: string) => void
  onAddProductTo: (mealId: string) => void
  onToggleOwner: (mealId: string) => void
  onPickDate: (mealId: string) => void
  onEditMeal: (mealId: string) => void
}

function MealsView({
  meals, eventDays, addButton, onAddMealAt, onMoveMeal, ...cardProps
}: CardProps & {
  meals: Meal[]
  eventDays: string[]
  addButton: React.ReactNode
  onAddMealAt: (date: string) => void
  onMoveMeal: (mealId: string, date: string | null) => void
}) {
  // Souris : drag dès 6px. Tactile : appui long 200ms (le tap reste un tap).
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )
  const [poolOpen, setPoolOpen] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  // @dnd-kit génère ses ids via un compteur module → mismatch d'hydratation.
  // useSyncExternalStore : false au SSR + à l'hydratation, true ensuite côté
  // client → on ne monte le DnD qu'après, sans setState dans un effet.
  const dndReady = useSyncExternalStore(subscribeNoop, () => true, () => false)

  const canPickDate = eventDays.length > 0
  const undated = meals.filter((m) => !m.meal_date)
  const mealsOn = (iso: string) => meals.filter((m) => m.meal_date === iso)
  const activeMeal = activeId ? meals.find((m) => m.id === activeId) ?? null : null

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    if (e.over == null) return
    const meal = meals.find((m) => m.id === e.active.id)
    if (!meal) return
    const overId = String(e.over.id)
    const newDate = overId === 'pool' ? null : overId.startsWith('day:') ? overId.slice(4) : undefined
    if (newDate === undefined || (meal.meal_date ?? null) === newDate) return
    onMoveMeal(meal.id, newDate)
  }

  // Pas de dates d'event : pas d'agenda ni de DnD → simple liste.
  if (!canPickDate) {
    if (meals.length === 0) {
      return (
        <>
          <p className="text-muted text-[13px] py-6 text-center">
            Aucun repas pour l&apos;instant. Ajoute un dîner, un apéro…
          </p>
          {addButton}
        </>
      )
    }
    return (
      <>
        <div className="flex flex-col gap-[11px]">
          {meals.map((meal) => <MealCard key={meal.id} meal={meal} showDate={false} {...cardProps} />)}
        </div>
        <div className="mt-[14px]">{addButton}</div>
      </>
    )
  }

  // Layout factorisé : `zone` (drop ou simple div) et `meal` (drag ou statique)
  // sont fournis selon qu'on est en mode DnD ou statique (serveur / 1er rendu).
  const layout = (
    zone: (id: string, className: string | undefined, render: (isOver: boolean) => React.ReactNode) => React.ReactNode,
    meal: (m: Meal, showDate: boolean) => React.ReactNode,
  ) => (
    <>
      {/* Accordéon « Tous les repas » (repas non datés) — aussi zone de drop */}
      {zone('pool', 'mb-[18px]', (isOver) => (
        <div className={`rounded-[16px] border-[1.5px] transition-colors ${
          isOver ? 'border-terracotta bg-terracotta-soft/50' : 'border-line-2 bg-track/50'
        }`}>
          <button type="button" onClick={() => setPoolOpen((o) => !o)}
            className="flex w-full items-center gap-2 px-[14px] py-[11px] text-left">
            <span className={`text-[11px] text-muted transition-transform ${poolOpen ? 'rotate-90' : ''}`}>▶</span>
            <span className="text-[12px] font-bold uppercase tracking-[0.8px] text-muted-2">Tous les repas</span>
            <span className="text-[11.5px] text-muted-2">· {undated.length}</span>
          </button>
          {poolOpen && (
            <div className="px-[10px] pb-[10px] flex flex-col gap-[11px]">
              {undated.length > 0
                ? undated.map((m) => meal(m, true))
                : <p className="px-[6px] pb-1 text-[12.5px] text-muted italic">Glisse un repas ici pour le sortir du planning.</p>}
            </div>
          )}
        </div>
      ))}

      {/* Bouton d'ajout : juste sous l'accordéon « Tous les repas ». */}
      <div className="mb-[18px]">{addButton}</div>

      <div className="flex flex-col gap-[14px]">
        {eventDays.map((day) => {
          const dayMeals = mealsOn(day)
          return zone(`day:${day}`, undefined, (isOver) => (
            <div className={`rounded-[14px] py-1 transition-colors ${isOver ? 'bg-terracotta-soft/50' : ''}`}>
              <DaySep label={formatDayLabel(day)} />
              {dayMeals.length > 0 ? (
                <div className="flex flex-col gap-[11px]">
                  {dayMeals.map((m) => meal(m, false))}
                  {/* Plusieurs repas par jour autorisés : bouton d'ajout toujours présent. */}
                  <DashedAddButton onClick={() => onAddMealAt(day)}
                    className="w-full rounded-[14px] px-[14px] py-[10px] text-left text-[12.5px]">
                    ＋ ajouter un repas
                  </DashedAddButton>
                </div>
              ) : (
                <DashedAddButton onClick={() => onAddMealAt(day)}
                  className="w-full rounded-[14px] px-[14px] py-[13px] text-left text-[13px]">
                  ＋ Aucun repas prévu — ajouter
                </DashedAddButton>
              )}
            </div>
          ))
        })}
      </div>
    </>
  )

  // Serveur + 1er rendu client : statique, sans @dnd-kit (rendu identique).
  if (!dndReady) {
    return (
      <div>
        {layout(
          (id, className, render) => <div key={id} className={className}>{render(false)}</div>,
          (m, showDate) => <MealCard key={m.id} meal={m} showDate={showDate} {...cardProps} />,
        )}
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={handleDragEnd}
    >
      {layout(
        (id, className, render) => <DropZone key={id} id={id} className={className}>{render}</DropZone>,
        (m, showDate) => <DraggableMeal key={m.id} meal={m} showDate={showDate} {...cardProps} />,
      )}
      <DragOverlay>
        {activeMeal ? <MealCardOverlay meal={activeMeal} ownersOf={cardProps.ownersOf} pseudoOf={cardProps.pseudoOf} /> : null}
      </DragOverlay>
    </DndContext>
  )
}

// Zone de dépôt générique (jour ou pool). children = (isOver) => JSX.
function DropZone({ id, className, children }: {
  id: string
  className?: string
  children: (isOver: boolean) => React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return <div ref={setNodeRef} className={className}>{children(isOver)}</div>
}

// Carte repas déplaçable : le drag est porté par l'en-tête lui-même
// (clic = plier/déplier, appui long = déplacer). Indice visuel ⠿.
function DraggableMeal({ meal, showDate, ...cardProps }: { meal: Meal; showDate: boolean } & CardProps) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: meal.id })
  return (
    <div ref={setNodeRef} className={isDragging ? 'opacity-40' : ''}>
      <MealCard meal={meal} showDate={showDate} dragProps={{ attributes, listeners }} {...cardProps} />
    </div>
  )
}

// Aperçu léger qui suit le curseur pendant le drag.
function MealCardOverlay({ meal, ownersOf, pseudoOf }: {
  meal: Meal
  ownersOf: (mealId: string) => MealOwner[]
  pseudoOf: (id: string) => string
}) {
  return (
    <div className="flex w-full items-center gap-2 rounded-[18px] border-[1.5px] border-terracotta bg-card px-[16px] py-[13px] shadow-[0_8px_24px_rgba(60,45,20,0.18)] cursor-grabbing">
      <span className="text-[15px] leading-none text-disabled-2">⠿</span>
      <span className="truncate text-[15.5px] font-bold text-ink">{meal.is_restaurant ? '🍴' : '🍽️'} {meal.label}</span>
      {ownersOf(meal.id).map((o) => (
        <span key={o.id} className="shrink-0 rounded-full bg-soft px-[8px] py-[2px] text-[11px] font-medium text-body">
          👤 {pseudoOf(o.participant_id)}
        </span>
      ))}
    </div>
  )
}

function DaySep({ label }: { label: string }) {
  return (
    <div className="mb-[9px] flex items-center gap-2">
      <h3 className="text-[12px] font-bold uppercase tracking-[0.8px] text-muted-2 capitalize">{label}</h3>
      <span className="h-px flex-1 bg-line-2" />
    </div>
  )
}

function MealCard({
  meal, showDate, dragProps, productsOf, ownersOf, pseudoOf, participantId,
  onDeleteMeal, onAddProductTo, onToggleOwner, onPickDate, onEditMeal,
}: CardProps & {
  meal: Meal
  showDate: boolean
  dragProps?: { attributes: DraggableAttributes; listeners: DraggableSyntheticListeners }
}) {
  const [open, setOpen] = useState(false)
  const items = productsOf(meal.id)
  const mealOwners = ownersOf(meal.id)
  const isOwner = mealOwners.some((o) => o.participant_id === participantId)
  // Repas au restaurant : on affiche des liens à la place des ingrédients.
  const links = meal.is_restaurant ? meal.links : []
  const count = meal.is_restaurant ? links.length : items.length
  return (
    <Card className="rounded-[18px] overflow-hidden">
      {/* En-tête : clic = plier/déplier, appui long = déplacer (drag) */}
      <div className="flex items-center gap-2 px-[16px] py-[13px]">
        <button onClick={() => setOpen((o) => !o)} {...dragProps?.attributes} {...dragProps?.listeners}
          className="flex flex-1 min-w-0 items-center gap-2 text-left" aria-expanded={open}>
          {dragProps && (
            <span aria-hidden className="shrink-0 text-[13px] leading-none text-disabled-2 cursor-grab active:cursor-grabbing">⠿</span>
          )}
          <span className={`shrink-0 text-[11px] text-muted transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
          <span className="shrink-0 text-[15.5px] font-bold text-ink truncate">{meal.is_restaurant ? '🍴' : '🍽️'} {meal.label}</span>
          {mealOwners.length > 0 && (
            <span className="flex flex-wrap items-center gap-1">
              {mealOwners.map((o) => (
                <span key={o.id} className="rounded-full bg-soft px-[8px] py-[2px] text-[11px] font-medium text-body">
                  👤 {pseudoOf(o.participant_id)}
                </span>
              ))}
            </span>
          )}
          {!open && count > 0 && (
            <span className="shrink-0 text-[11.5px] text-muted-2">· {count}</span>
          )}
        </button>
        <button onClick={() => onEditMeal(meal.id)} aria-label="Modifier le repas"
          className={`${ICON_BTN} hover:text-olive hover:bg-soft`}>✎</button>
        <button onClick={() => onDeleteMeal(meal.id)} aria-label="Supprimer le repas"
          className={`${ICON_BTN} hover:text-prune hover:bg-soft`}>🗑</button>
      </div>

      {open && (
        <>
          {/* Date (uniquement section « Sans date ») + bouton « je gère » */}
          <div className="px-[16px] pb-[10px] flex flex-wrap items-center gap-1.5">
            {showDate && (
              <button onClick={() => onPickDate(meal.id)}
                className="rounded-full px-[9px] py-[3px] text-[11.5px] font-semibold border-[1.5px] border-dashed border-[var(--color-dashed)] text-muted transition-colors">
                📅 ajouter une date
              </button>
            )}
            <button onClick={() => onToggleOwner(meal.id)}
              className={`rounded-full px-[9px] py-[3px] text-[11.5px] font-semibold transition-colors ${
                isOwner
                  ? 'bg-terracotta-soft text-terracotta'
                  : 'border-[1.5px] border-dashed border-[var(--color-dashed)] text-muted'
              }`}>
              {isOwner ? '✓ je gère' : '＋ je gère'}
            </button>
          </div>

          {meal.is_restaurant ? (
            <div className="px-[16px] pb-[14px] flex flex-col gap-1.5">
              {links.length === 0 ? (
                <p className="text-[12.5px] text-muted italic">Aucun lien pour l&apos;instant.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {links.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-full border-[1.5px] border-line-2 bg-card px-[10px] py-[4px] text-[12.5px] font-medium text-body hover:border-terracotta transition-colors">
                      <span className="leading-none">{linkIcon(url)}</span>
                      <span className="truncate max-w-[180px]">{linkHost(url)}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="px-[16px] pb-[14px] flex flex-col gap-1.5">
              {items.length === 0 && (
                <p className="text-[12.5px] text-muted italic">Pas encore de produit.</p>
              )}
              {items.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <span className="text-disabled-2 text-[14px] leading-none">•</span>
                  <span className="text-[14px] text-ink">{p.name}</span>
                  <Qty p={p} />
                </div>
              ))}
              <button onClick={() => onAddProductTo(meal.id)}
                className="mt-1 self-start text-[13px] text-terracotta font-semibold">＋ ingrédient</button>
            </div>
          )}
        </>
      )}
    </Card>
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
            {WEEKDAYS.map((w) => <div key={w.key}>{w.label}</div>)}
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

/* ---------------- Vue Liste de courses ----------------
   Les articles à acheter sont regroupés par rayon (ordre supermarché) ; les
   articles cochés tombent dans une section « Dans le panier » en bas. Chaque
   article est éditable en place (nom / quantité / unité). */
function ShoppingView({
  products, mealLabel, onToggle, onDelete, onEdit,
}: {
  products: Product[]
  mealLabel: (id: string) => string | null
  onToggle: (p: Product) => void
  onDelete: (id: string) => void
  onEdit: (id: string, patch: { name: string; quantity: number | null; unit: string }) => void
}) {
  if (products.length === 0) {
    return <p className="text-muted text-[13px] py-6 text-center">Rien à acheter pour l&apos;instant.</p>
  }
  const todo = products.filter((p) => !p.checked)
  const done = products.filter((p) => p.checked)
  const groups = groupByCategory(todo, (p) => p.name)
  const rowProps = { mealLabel, onToggle, onDelete, onEdit }
  return (
    <div className="flex flex-col gap-[18px]">
      {groups.map(({ category, items }) => (
        <div key={category.key} className="flex flex-col gap-[8px]">
          <SectionHeader emoji={category.emoji} label={category.label} count={items.length} />
          {items.map((p) => <ShoppingRow key={p.id} p={p} {...rowProps} />)}
        </div>
      ))}
      {done.length > 0 && (
        <div className="flex flex-col gap-[8px]">
          <SectionHeader label="Dans le panier" count={done.length} />
          {done.map((p) => <ShoppingRow key={p.id} p={p} {...rowProps} />)}
        </div>
      )}
    </div>
  )
}

function SectionHeader({ emoji, label, count }: { emoji?: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 px-[2px]">
      {emoji && <span className="text-[13px] leading-none">{emoji}</span>}
      <span className={COL}>{label}</span>
      <span className="text-[11px] text-muted-2">· {count}</span>
    </div>
  )
}

// Une ligne de la liste de courses : bascule cochée / édition inline / retrait.
function ShoppingRow({
  p, mealLabel, onToggle, onDelete, onEdit,
}: {
  p: Product
  mealLabel: (id: string) => string | null
  onToggle: (p: Product) => void
  onDelete: (id: string) => void
  onEdit: (id: string, patch: { name: string; quantity: number | null; unit: string }) => void
}) {
  const [editing, setEditing] = useState(false)
  if (editing) {
    return (
      <ProductEditRow
        p={p}
        onCancel={() => setEditing(false)}
        onSave={(patch) => { onEdit(p.id, patch); setEditing(false) }}
      />
    )
  }
  const ml = p.meal_id ? mealLabel(p.meal_id) : null
  return (
    <div className="flex items-center gap-2.5 rounded-[13px] border-[1.5px] border-line-2 bg-card px-[14px] py-[11px]">
      <button onClick={() => onToggle(p)} className="shrink-0"><CheckBox checked={p.checked} /></button>
      <button onClick={() => onToggle(p)} className="flex-1 min-w-0 text-left">
        <span className="flex items-center gap-2">
          <span className={`text-[14.5px] ${p.checked ? 'text-muted line-through' : 'text-ink font-medium'}`}>{p.name}</span>
          <Qty p={p} />
        </span>
        {ml && <span className="mt-0.5 block text-[11px] text-muted">🍽️ {ml}</span>}
      </button>
      <button onClick={() => setEditing(true)} aria-label="Modifier le produit"
        className={`${ICON_BTN} hover:text-olive hover:bg-soft`}>✎</button>
      <ConfirmButton onConfirm={() => onDelete(p.id)} confirmLabel="Retirer ?"
        ariaLabel="Supprimer le produit"
        className={`${ICON_BTN} hover:text-prune hover:bg-soft`}>🗑</ConfirmButton>
    </div>
  )
}

// Éditeur inline d'un produit (nom + quantité + unité).
function ProductEditRow({
  p, onCancel, onSave,
}: {
  p: Product
  onCancel: () => void
  onSave: (patch: { name: string; quantity: number | null; unit: string }) => void
}) {
  const [name, setName] = useState(p.name)
  const [qty, setQty] = useState(p.quantity == null ? '' : String(p.quantity))
  const [unit, setUnit] = useState(p.unit)

  function save() {
    const nm = name.trim()
    if (!nm) return
    onSave({ name: nm, quantity: qty ? Number(qty) : null, unit })
  }

  return (
    <div className="flex flex-col gap-2 rounded-[13px] border-[1.5px] border-terracotta bg-card px-[14px] py-[11px]">
      <div className="flex items-center gap-2">
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={60}
          aria-label="Nom du produit" className={`${INPUT} flex-1 min-w-0`} />
        <QtyUnit qty={qty} unit={unit} onQty={setQty} onUnit={setUnit} />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel}
          className="rounded-[11px] px-3 py-1.5 text-[13px] font-semibold text-muted hover:text-ink transition-colors">
          Annuler
        </button>
        <Button type="button" onClick={save} disabled={!name.trim()}
          className="rounded-[11px] px-3 py-1.5 text-[13px]">
          Enregistrer
        </Button>
      </div>
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
        className="w-[58px] bg-card border-[1.5px] border-line rounded-[13px] p-[13px] text-[14.5px] text-ink text-center outline-none focus:border-terracotta" />
      <select value={unit} onChange={(e) => onUnit(e.target.value)} aria-label="Unité"
        className="w-[100px] bg-card border-[1.5px] border-line rounded-[13px] px-[10px] text-[14px] text-ink outline-none focus:border-terracotta">
        {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
      </select>
    </div>
  )
}

/* ---------------- Modale d'ajout (produit / repas unifiés) ----------------
   L'onglet « Repas » EST l'onglet « Produit » + (nom du repas, date). Un seul
   composant, un seul state → on bascule d'un onglet à l'autre sans rien perdre. */
type Row = { name: string; qty: string; unit: string }
const blankRow = (): Row => ({ name: '', qty: '1', unit: 'unité' })

function rowsToItems(rows: Row[]): DraftItem[] {
  return rows
    .map((r) => ({ name: r.name.trim(), quantity: r.qty ? Number(r.qty) : null, unit: r.unit }))
    .filter((r) => r.name)
}

const COL = 'text-[10.5px] font-bold uppercase tracking-[0.6px] text-muted-2'

// Lignes éditables (nom + quantité + unité) avec en-têtes de colonnes.
// `noun` adapte le vocabulaire : « produit » ou « ingrédient ».
function ItemRows({ rows, setRows, noun }: {
  rows: Row[]
  setRows: React.Dispatch<React.SetStateAction<Row[]>>
  noun: 'produit' | 'ingrédient'
}) {
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const pendingFocus = useRef(false)
  const update = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  // Focus l'input de la ligne fraîchement ajoutée.
  useEffect(() => {
    if (!pendingFocus.current) return
    pendingFocus.current = false
    inputs.current[rows.length - 1]?.focus()
  }, [rows.length])

  const removable = rows.length > 1
  return (
    <div className="flex flex-col gap-2">
      {/* En-têtes de colonnes : seulement s'il y a au moins une ligne ouverte. */}
      {rows.length > 0 && (
        <div className="flex items-center gap-2">
          <span className={`flex-1 min-w-0 ${COL}`}>{noun === 'ingrédient' ? 'Ingrédient' : 'Produit'}</span>
          <div className="flex gap-2 shrink-0">
            <span className={`w-[58px] text-center ${COL}`}>Quantité</span>
            <span className={`w-[100px] ${COL}`}>Unité</span>
          </div>
          {removable && <span className="w-[18px] shrink-0" aria-hidden />}
        </div>
      )}
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <input ref={(el) => { inputs.current[i] = el }}
            value={row.name} onChange={(e) => update(i, { name: e.target.value })} maxLength={60}
            placeholder="ex : Pâtes" className={`${INPUT} flex-1 min-w-0`} />
          <QtyUnit qty={row.qty} unit={row.unit} onQty={(v) => update(i, { qty: v })} onUnit={(v) => update(i, { unit: v })} />
          {removable && (
            <button type="button" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
              aria-label={`Retirer ce ${noun}`} className="shrink-0 w-[18px] text-[14px] text-muted hover:text-prune">✕</button>
          )}
        </div>
      ))}
      <button type="button" onClick={() => { pendingFocus.current = true; setRows((rs) => [...rs, blankRow()]) }}
        className="self-start text-[13px] text-terracotta font-semibold">＋ ajouter un autre {noun}</button>
    </div>
  )
}

// Liste éditable de liens (URL seule) d'un repas au restaurant. Variante discrète
// d'ItemRows : bouton d'ajout en gris (text-muted), pas de quantité/unité, chaque
// ligne retirable. Démarre à [] → seul le « + ajouter un lien » est visible.
function LinkRows({ links, setLinks }: {
  links: string[]
  setLinks: React.Dispatch<React.SetStateAction<string[]>>
}) {
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const pendingFocus = useRef(false)

  // Focus le champ du lien fraîchement ajouté.
  useEffect(() => {
    if (!pendingFocus.current) return
    pendingFocus.current = false
    inputs.current[links.length - 1]?.focus()
  }, [links.length])

  return (
    <div className="flex flex-col gap-2">
      {links.length > 0 && <span className={COL}>Liens</span>}
      {links.map((url, i) => (
        <div key={i} className="flex items-center gap-2">
          <input ref={(el) => { inputs.current[i] = el }} type="url" inputMode="url"
            value={url} onChange={(e) => setLinks((ls) => ls.map((l, j) => (j === i ? e.target.value : l)))}
            placeholder="lien Google Maps, site du resto…" className={`${INPUT} flex-1 min-w-0`} />
          <button type="button" onClick={() => setLinks((ls) => ls.filter((_, j) => j !== i))}
            aria-label="Retirer ce lien" className="shrink-0 w-[18px] text-[14px] text-muted hover:text-prune">✕</button>
        </div>
      ))}
      <button type="button" onClick={() => { pendingFocus.current = true; setLinks((ls) => [...ls, '']) }}
        className="self-start text-[13px] text-muted font-medium hover:text-ink transition-colors">＋ ajouter un lien</button>
    </div>
  )
}

function AddForm({
  initialMode, lockedDate, presetMeal, meals, eventDays, onCreateMeal, onAddProducts,
}: {
  initialMode: 'product' | 'meal'
  lockedDate: string | null
  presetMeal: string | null
  meals: Meal[]
  eventDays: string[]
  onCreateMeal: (
    label: string, items: DraftItem[], mealDate: string | null,
    isRestaurant: boolean, links: string[],
  ) => void
  onAddProducts: (items: DraftItem[], mealId: string | null) => void
}) {
  const locked = lockedDate != null
  // Ajout depuis un repas (« ＋ ingrédient ») : produit forcé, pas d'onglets.
  const forcedProduct = !locked && presetMeal != null
  const [mode, setMode] = useState<'product' | 'meal'>(locked ? 'meal' : forcedProduct ? 'product' : initialMode)
  const [rows, setRows] = useState<Row[]>([blankRow()])
  const [mealLabel, setMealLabel] = useState('')
  const [mealDate, setMealDate] = useState<string | null>(lockedDate)
  const [showCal, setShowCal] = useState(false)
  // Repas au restaurant : liens au lieu d'ingrédients (uniquement en mode repas).
  const [isRestaurant, setIsRestaurant] = useState(false)
  const [links, setLinks] = useState<string[]>([])

  const targetMeal = presetMeal ? meals.find((m) => m.id === presetMeal) ?? null : null
  const items = rowsToItems(rows)
  // Dans un repas, on parle d'« ingrédient » ; en ajout libre, de « produit ».
  const noun: 'produit' | 'ingrédient' = mode === 'product' && !forcedProduct ? 'produit' : 'ingrédient'
  const canSubmit = mode === 'meal' ? mealLabel.trim().length > 0 : items.length > 0

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (mode === 'meal') {
      if (mealLabel.trim()) onCreateMeal(mealLabel.trim(), isRestaurant ? [] : items, mealDate, isRestaurant, links)
    } else if (items.length) {
      onAddProducts(items, presetMeal)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {locked ? (
        <h3 className="font-serif text-[20px] text-ink">Nouveau repas</h3>
      ) : forcedProduct ? (
        <h3 className="font-serif text-[20px] text-ink">Ajouter un ingrédient</h3>
      ) : (
        <div className="bg-track rounded-[13px] p-[5px] flex gap-[4px]">
          {([['product', '🛒 Produit'], ['meal', '🍽️ Repas']] as const).map(([t, label]) => (
            <button type="button" key={t} onClick={() => setMode(t)}
              className={`flex-1 text-center rounded-[9px] py-[9px] text-[13px] transition-colors ${
                mode === t ? 'bg-ink text-white font-bold' : 'text-faint'
              }`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {mode === 'meal' && (
        <div className="flex flex-col gap-3">
          {locked ? (
            <span className="self-start rounded-full bg-olive-soft px-[11px] py-[5px] text-[12.5px] font-semibold text-olive-text-dk">
              📅 {formatDayLabel(lockedDate!)}
            </span>
          ) : eventDays.length > 0 ? (
            <div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setShowCal((s) => !s)}
                  className={`rounded-full px-[11px] py-[5px] text-[12.5px] font-semibold transition-colors ${
                    mealDate
                      ? 'bg-olive-soft text-olive-text-dk'
                      : 'border-[1.5px] border-dashed border-[var(--color-dashed)] text-muted'
                  }`}>
                  📅 {mealDate ? formatDayLabel(mealDate) : 'Choisir un jour'}
                </button>
                {mealDate && (
                  <button type="button" onClick={() => { setMealDate(null); setShowCal(false) }}
                    className="text-[12px] text-muted hover:text-prune font-semibold">Retirer</button>
                )}
              </div>
              {showCal && (
                <div className="mt-3">
                  <DateCalendar eventDays={eventDays} value={mealDate}
                    onSelect={(iso) => { setMealDate((cur) => (cur === iso ? null : iso)); setShowCal(false) }} />
                </div>
              )}
            </div>
          ) : null}

          <input autoFocus value={mealLabel} onChange={(e) => setMealLabel(e.target.value)} maxLength={60}
            placeholder={isRestaurant ? 'ex : Chez Luigi, La Pizzeria…' : 'ex : Risotto, Gratin, Apéro, Dîner…'}
            className={INPUT} />

          {/* Maison (ingrédients) vs restaurant (liens). */}
          <div className="bg-track rounded-[13px] p-[5px] flex gap-[4px]">
            {([[false, '🏠 Maison'], [true, '🍴 Au restaurant']] as const).map(([val, label]) => (
              <button type="button" key={label}
                onClick={() => { setIsRestaurant(val); if (val && links.length === 0) setLinks(['']) }}
                className={`flex-1 text-center rounded-[9px] py-[9px] text-[13px] transition-colors ${
                  isRestaurant === val ? 'bg-ink text-white font-bold' : 'text-faint'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'product' && targetMeal && (
        <span className="self-start rounded-full bg-soft px-[11px] py-[5px] text-[12.5px] font-medium text-body">
          🍽️ Pour {targetMeal.label}
        </span>
      )}

      {mode === 'meal' && isRestaurant
        ? <LinkRows links={links} setLinks={setLinks} />
        : <ItemRows rows={rows} setRows={setRows} noun={noun} />}

      <Button type="submit" disabled={!canSubmit} className="mt-1 w-full rounded-[15px] p-[15px]">
        {mode === 'meal'
          ? 'Créer le repas'
          : items.length > 1
            ? `Ajouter les ${noun === 'ingrédient' ? 'ingrédients' : 'produits'} (${items.length})`
            : `Ajouter ${noun === 'ingrédient' ? "l'ingrédient" : 'le produit'}`}
      </Button>
    </form>
  )
}

/* ---------------- Modale d'édition de repas (nom + ingrédients) ----------------
   Le nom est éditable (les tags des produits suivent côté serveur). Les
   ingrédients existants sont modifiables en place (nom / quantité / unité),
   retirables (du repas ET de la liste), et on peut en ajouter de nouveaux. Rien
   n'est commité avant « Enregistrer » → Annuler ne touche à rien. */
function EditMealForm({ label, isRestaurant, initialLinks, ingredients, onCancel, onSave }: {
  label: string
  isRestaurant: boolean
  initialLinks: string[]
  ingredients: Product[]
  onCancel: () => void
  onSave: (
    label: string, removedIds: string[], newItems: DraftItem[], editedItems: EditedItem[],
    links: string[] | null,
  ) => void
}) {
  const [name, setName] = useState(label)
  // Repas au restaurant : au moins une ligne de lien ouverte par défaut.
  const [links, setLinks] = useState<string[]>(
    isRestaurant && initialLinks.length === 0 ? [''] : initialLinks,
  )
  const [removed, setRemoved] = useState<Set<string>>(() => new Set())
  // Valeurs éditables des ingrédients existants (nom + quantité + unité).
  const [edits, setEdits] = useState<Record<string, Row>>(() =>
    Object.fromEntries(ingredients.map((p) => [p.id, {
      name: p.name, qty: p.quantity == null ? '' : String(p.quantity), unit: p.unit,
    }])),
  )
  // Démarre sans ligne ouverte : seul le « + ajouter un ingrédient » est visible.
  const [rows, setRows] = useState<Row[]>([])

  const kept = ingredients.filter((p) => !removed.has(p.id))
  const newItems = rowsToItems(rows)
  // Valeurs courantes d'un ingrédient (edits[] est initialisé pour tous, mais on
  // garde un repli dérivé du produit pour satisfaire l'index-access strict).
  const rowFor = (p: Product): Row =>
    edits[p.id] ?? { name: p.name, qty: p.quantity == null ? '' : String(p.quantity), unit: p.unit }
  const setEdit = (id: string, patch: Partial<Row>) =>
    setEdits((s) => ({ ...s, [id]: { ...(s[id] ?? blankRow()), ...patch } }))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const clean = name.trim()
    if (!clean) return
    // Repas au restaurant : uniquement nom + liens, pas d'ingrédients.
    if (isRestaurant) {
      onSave(clean, [], [], [], links)
      return
    }
    // Ne renvoie que les ingrédients réellement modifiés (et au nom non vide).
    const editedItems: EditedItem[] = kept.flatMap((p) => {
      const ed = rowFor(p)
      const nm = ed.name.trim()
      const qty = ed.qty ? Number(ed.qty) : null
      if (!nm) return []
      const changed = nm !== p.name || qty !== p.quantity || ed.unit !== p.unit
      return changed ? [{ id: p.id, name: nm, quantity: qty, unit: ed.unit }] : []
    })
    onSave(clean, [...removed], newItems, editedItems, null)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <h3 className="font-serif text-[20px] text-ink">Modifier le repas</h3>

      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={60}
        placeholder="ex : Risotto, Gratin, Apéro…" className={INPUT} />

      {isRestaurant && <LinkRows links={links} setLinks={setLinks} />}

      {/* Ingrédients déjà dans le repas — éditables en place ou retirables. */}
      {!isRestaurant && kept.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className={COL}>Ingrédients du repas</span>
          {kept.map((p) => {
            const ed = rowFor(p)
            return (
              <div key={p.id} className="flex items-center gap-2">
                <input value={ed.name} onChange={(e) => setEdit(p.id, { name: e.target.value })}
                  maxLength={60} aria-label="Nom de l'ingrédient" className={`${INPUT} flex-1 min-w-0`} />
                <QtyUnit qty={ed.qty} unit={ed.unit}
                  onQty={(v) => setEdit(p.id, { qty: v })} onUnit={(v) => setEdit(p.id, { unit: v })} />
                <button type="button" onClick={() => setRemoved((s) => new Set(s).add(p.id))}
                  aria-label={`Retirer ${p.name}`}
                  className={`${ICON_BTN} hover:text-prune hover:bg-card`}>🗑</button>
              </div>
            )
          })}
        </div>
      )}

      {/* Ajout de nouveaux ingrédients : ligne(s) dépliée(s) via le « + ». */}
      {!isRestaurant && <ItemRows rows={rows} setRows={setRows} noun="ingrédient" />}

      <div className="flex gap-2">
        <button type="button" onClick={onCancel}
          className="flex-1 rounded-[15px] border-[1.5px] border-line-3 bg-card p-[14px] font-bold text-ink">Annuler</button>
        <Button type="submit" disabled={!name.trim()} className="flex-1 rounded-[15px] p-[14px]">
          Enregistrer
        </Button>
      </div>
    </form>
  )
}
