'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { proposeActivity, updateActivity, toggleActivitySignup, deleteActivity, type ActivityInput } from '@/lib/actions/activities'
import type { Activity, ActivitySignup } from '@/lib/types'
import { randomId } from '@/lib/uuid'
import { perPerson, totalCost, formatEuro } from '@/lib/activities/cost'
import { Button } from '@/components/ui/Button'
import { DashedAddButton } from '@/components/ui/DashedAddButton'
import { Avatar } from '@/components/ui/Avatar'
import { ConfirmButton } from '@/components/ui/ConfirmButton'
import { useUndo } from '@/components/ui/undo'
import { formatDayLabel } from '@/lib/calendar'
import { CalendarIcon, ClockIcon, UsersIcon, PencilIcon } from '@/components/ui/icons'

type Person = { id: string; pseudo: string; avatar_url: string | null }

// Postgres `numeric` revient en string via PostgREST (précision préservée) :
// on le ramène en number, sinon formatEuro affiche « 40,00€ » au lieu de « 40€ ».
function normalizeActivity(a: Activity): Activity {
  return { ...a, price: a.price == null ? null : Number(a.price) }
}

function priceTypeLabel(a: Activity): string {
  if (a.price == null || !a.price_type) return ''
  if (a.price_type === 'per_person') return `${formatEuro(a.price)} / personne`
  if (a.price_type === 'total') return `total ${formatEuro(a.price)}`
  return `${formatEuro(a.price)} / groupe de ${a.group_size ?? '?'}`
}

function formatTime(t: string | null): string | null {
  if (!t) return null
  return t.slice(0, 5) // 'HH:MM:SS' → 'HH:MM'
}

function formatDate(d: string | null): string | null {
  return d ? formatDayLabel(d) : null
}

export function ActivityPanel({
  slug,
  eventId,
  participantId,
  initialActivities,
  initialSignups,
  participants,
  isAdmin,
  dateStart,
  dateEnd,
}: {
  slug: string
  eventId: string
  participantId: string
  initialActivities: Activity[]
  initialSignups: ActivitySignup[]
  participants: Person[]
  isAdmin: boolean
  dateStart: string | null
  dateEnd: string | null
}) {
  const [activities, setActivities] = useState(() => initialActivities.map(normalizeActivity))
  const [signups, setSignups] = useState(initialSignups)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const requestUndo = useUndo()
  // Ids des activités ajoutées en optimiste (temp uuid) en attente de leur ligne
  // réelle via realtime — sert à remplacer le placeholder au lieu de doublonner.
  // Ref (lu dans le handler realtime et handleToggle, hors render) + state miroir
  // pour le rendu (désactiver l'inscription tant que la carte n'est pas persistée).
  const optimisticActivityIds = useRef<Set<string>>(new Set())
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set())

  // Realtime : la liste et les inscriptions se mettent à jour sans recharger.
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`activities:${eventId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'activities', filter: `event_id=eq.${eventId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = normalizeActivity(payload.new as Activity)
            setActivities((prev) => {
              if (prev.some((a) => a.id === row.id)) return prev
              // Remplace le placeholder optimiste correspondant (même auteur + label)
              // plutôt que d'ajouter un doublon.
              const idx = prev.findIndex(
                (a) => optimisticActivityIds.current.has(a.id) && a.created_by === row.created_by && a.label === row.label,
              )
              if (idx === -1) return [...prev, row]
              optimisticActivityIds.current.delete(prev[idx]!.id)
              const next = [...prev]
              next[idx] = row
              return next
            })
          } else if (payload.eventType === 'UPDATE') {
            const row = normalizeActivity(payload.new as Activity)
            setActivities((prev) => prev.map((a) => (a.id === row.id ? row : a)))
          } else if (payload.eventType === 'DELETE') {
            setActivities((prev) => prev.filter((a) => a.id !== (payload.old as Activity).id))
          }
        })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'activity_signups', filter: `event_id=eq.${eventId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new as ActivitySignup
            // Réconcilie sur la clé métier (activity_id, participant_id) : remplace
            // toute ligne optimiste (id temporaire) par la vraie, sans doublonner.
            setSignups((prev) => [
              ...prev.filter((s) => !(s.activity_id === row.activity_id && s.participant_id === row.participant_id)),
              row,
            ])
          } else if (payload.eventType === 'DELETE') {
            setSignups((prev) => prev.filter((s) => s.id !== (payload.old as ActivitySignup).id))
          }
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [eventId])

  function signupsFor(activityId: string) {
    return signups.filter((s) => s.activity_id === activityId)
  }
  function isSignedUp(activityId: string) {
    return signups.some((s) => s.activity_id === activityId && s.participant_id === participantId)
  }

  function handleToggle(activity: Activity) {
    // L'activité n'est pas encore persistée (id temporaire) : s'inscrire ferait
    // échouer la FK activity_signups.activity_id. On attend la vraie ligne.
    if (optimisticActivityIds.current.has(activity.id)) return
    const joined = isSignedUp(activity.id)
    const count = signupsFor(activity.id).length
    if (!joined && activity.max_participants != null && count >= activity.max_participants) return

    if (joined) {
      setSignups((prev) => prev.filter((s) => !(s.activity_id === activity.id && s.participant_id === participantId)))
    } else {
      setSignups((prev) => [
        ...prev,
        { id: randomId(), event_id: eventId, activity_id: activity.id, participant_id: participantId, created_at: new Date().toISOString() },
      ])
    }
    startTransition(async () => {
      try {
        await toggleActivitySignup(slug, eventId, activity.id, participantId, !joined)
      } catch {
        // Revert optimiste (ex : complet entre-temps).
        setSignups(signups)
      }
    })
  }

  function handleDelete(activityId: string) {
    const idx = activities.findIndex((a) => a.id === activityId)
    const removed = activities[idx]
    if (!removed) return
    const label = removed.label
    setActivities((prev) => prev.filter((a) => a.id !== activityId))
    requestUndo({
      message: label ? `« ${label} » supprimée` : 'Activité supprimée',
      commit: () => deleteActivity(slug, activityId),
      // Undo fonctionnel : réinsère uniquement la ligne retirée (à sa position
      // d'origine), sans remplacer la liste — préserve les ajouts/édits arrivés
      // entre-temps via le realtime. Le guard évite un doublon si la ligne a déjà
      // été ré-ajoutée.
      undo: () =>
        setActivities((prev) =>
          prev.some((a) => a.id === activityId)
            ? prev
            : [...prev.slice(0, idx), removed, ...prev.slice(idx)],
        ),
    })
  }

  function handlePropose(input: ActivityInput) {
    const tempId = randomId()
    const optimistic: Activity = {
      id: tempId,
      event_id: eventId,
      label: input.label.trim(),
      activity_date: input.activityDate || null,
      start_time: input.startTime || null,
      price: input.price && input.price > 0 ? input.price : null,
      price_type: input.price && input.price > 0 ? (input.priceType ?? 'total') : null,
      group_size: input.priceType === 'per_group' ? input.groupSize ?? null : null,
      min_participants: input.minParticipants ?? null,
      max_participants: input.maxParticipants ?? null,
      booking_url: input.bookingUrl?.trim() || null,
      comment: input.comment?.trim() || null,
      created_by: participantId,
      created_at: new Date().toISOString(),
    }
    optimisticActivityIds.current.add(tempId)
    setPendingIds((s) => new Set(s).add(tempId))
    setActivities((prev) => [...prev, optimistic])
    setShowForm(false)
    const clearPending = () => {
      optimisticActivityIds.current.delete(tempId)
      setPendingIds((s) => {
        const next = new Set(s)
        next.delete(tempId)
        return next
      })
    }
    startTransition(async () => {
      try {
        // On remplace la carte optimiste par la vraie ligne (vrai id) dès le retour
        // serveur — plus fiable que d'attendre le realtime, et l'inscription peut
        // alors viser un activity_id qui existe vraiment.
        const row = normalizeActivity(await proposeActivity(slug, eventId, participantId, input))
        clearPending()
        setActivities((prev) => {
          const withoutTemp = prev.filter((a) => a.id !== tempId)
          // Si le realtime a déjà inséré la vraie ligne, on évite le doublon.
          if (withoutTemp.some((a) => a.id === row.id)) return withoutTemp
          return [...withoutTemp, row]
        })
      } catch {
        // Échec : on retire la carte optimiste.
        clearPending()
        setActivities((prev) => prev.filter((a) => a.id !== tempId))
      }
    })
  }

  function handleUpdate(activityId: string, input: ActivityInput) {
    const prev = activities
    // Patch optimiste : l'id existe déjà, pas de réconciliation, juste un rollback.
    setActivities((list) =>
      list.map((a) =>
        a.id === activityId
          ? {
              ...a,
              label: input.label.trim(),
              activity_date: input.activityDate || null,
              start_time: input.startTime || null,
              price: input.price && input.price > 0 ? input.price : null,
              price_type: input.price && input.price > 0 ? (input.priceType ?? 'total') : null,
              max_participants: input.maxParticipants ?? null,
              booking_url: input.bookingUrl?.trim() || null,
            }
          : a,
      ),
    )
    setEditingId(null)
    startTransition(async () => {
      try {
        const row = normalizeActivity(await updateActivity(slug, activityId, input))
        setActivities((list) => list.map((a) => (a.id === activityId ? row : a)))
      } catch {
        setActivities(prev)
      }
    })
  }

  const sorted = [...activities].sort((a, b) => signupsFor(b.id).length - signupsFor(a.id).length)

  return (
    <section>
      <h1 className="mb-1 font-serif text-[30px] text-ink">Activités</h1>
      <p className="mb-6 text-[14px] text-muted">Proposez, inscrivez-vous, voyez ce que ça coûte.</p>

      <div className="mb-5 flex flex-col gap-3">
        {sorted.length === 0 && (
          <p className="py-6 text-center text-sm text-muted">Aucune activité proposée pour l&apos;instant.</p>
        )}
        {sorted.map((a) =>
          editingId === a.id ? (
            <ActivityForm
              key={a.id}
              initial={a}
              dateStart={dateStart}
              dateEnd={dateEnd}
              onCancel={() => setEditingId(null)}
              onSubmit={(input) => handleUpdate(a.id, input)}
            />
          ) : (
            <ActivityCard
              key={a.id}
              activity={a}
              pending={pendingIds.has(a.id)}
              signedPeople={signupsFor(a.id).map((s) => participants.find((p) => p.id === s.participant_id)).filter((p): p is Person => p != null)}
              mine={isSignedUp(a.id)}
              canDelete={isAdmin || a.created_by === participantId}
              canEdit={!pendingIds.has(a.id)}
              onToggle={() => handleToggle(a)}
              onDelete={() => handleDelete(a.id)}
              onEdit={() => setEditingId(a.id)}
            />
          ),
        )}
      </div>

      {showForm ? (
        <ActivityForm dateStart={dateStart} dateEnd={dateEnd} onCancel={() => setShowForm(false)} onSubmit={handlePropose} />
      ) : (
        <DashedAddButton
          accent="olive"
          onClick={() => setShowForm(true)}
          className="w-full rounded-[18px] py-3 text-sm"
        >
          + Proposer une activité
        </DashedAddButton>
      )}
    </section>
  )
}

// ============================================================
function ActivityCard({
  activity,
  pending,
  signedPeople,
  mine,
  canDelete,
  canEdit,
  onToggle,
  onDelete,
  onEdit,
}: {
  activity: Activity
  pending: boolean
  signedPeople: Person[]
  mine: boolean
  canDelete: boolean
  canEdit: boolean
  onToggle: () => void
  onDelete: () => void
  onEdit: () => void
}) {
  const count = signedPeople.length
  const max = activity.max_participants
  const full = max != null && count >= max && !mine
  const priced = activity.price != null && activity.price_type != null

  // Simulateur : « si on est N ». Démarre au nb d'inscrits (ou au minimum requis).
  const [simN, setSimN] = useState(Math.max(count, activity.min_participants ?? 0, 1))

  const date = formatDate(activity.activity_date)
  const time = formatTime(activity.start_time)
  const missingForMin =
    activity.min_participants != null && count < activity.min_participants
      ? activity.min_participants - count
      : 0

  // Message « groupes » pour le mode par groupe.
  let groupMsg: string | null = null
  if (activity.price_type === 'per_group' && activity.group_size && activity.group_size > 1) {
    const g = activity.group_size
    const fullGroups = Math.floor(count / g)
    const rem = count % g
    if (count === 0) groupMsg = `groupes de ${g}`
    else if (rem === 0) groupMsg = `${fullGroups} groupe${fullGroups > 1 ? 's' : ''} complet${fullGroups > 1 ? 's' : ''}`
    else groupMsg = `${fullGroups > 0 ? `${fullGroups} groupe${fullGroups > 1 ? 's' : ''} · ` : ''}il manque ${g - rem} pour compléter un groupe`
  }

  return (
    <div className="overflow-hidden rounded-[18px] border-[1.5px] border-line-2 bg-card shadow-card">
      <div className="flex items-start justify-between gap-3 px-4 pt-3.5">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-ink">{activity.label}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-muted">
            {date && (
              <span className="inline-flex items-center gap-1">
                <CalendarIcon className="h-[11px] w-[11px] shrink-0" /> {date}{time ? ` · ${time}` : ''}
              </span>
            )}
            {!date && time && (
              <span className="inline-flex items-center gap-1">
                <ClockIcon className="h-[11px] w-[11px] shrink-0" /> {time}
              </span>
            )}
            {priced && <span className="font-semibold text-ink">{priceTypeLabel(activity)}</span>}
          </div>
          {activity.comment && (
            <p className="mt-1 text-[13px] italic text-body">« {activity.comment} »</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          {canEdit && (
            <button onClick={onEdit} className="text-muted transition-colors hover:text-olive" aria-label="Modifier l'activité" title="Modifier">
              <PencilIcon className="h-[13px] w-[13px]" />
            </button>
          )}
          {canDelete && (
            <ConfirmButton
              onConfirm={onDelete}
              confirmLabel="Supprimer ?"
              ariaLabel="Supprimer l'activité"
              className="text-xs text-muted transition-colors hover:text-terracotta"
            >
              ✕
            </ConfirmButton>
          )}
        </div>
      </div>

      {/* Inscrits + capacité */}
      <div className="px-4 pt-2.5">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>
            {count} inscrit{count > 1 ? 's' : ''}
            {max != null ? ` / ${max}` : ' · illimité'}
          </span>
          {missingForMin > 0 && (
            <span className="text-terracotta">il manque {missingForMin} pour le minimum</span>
          )}
        </div>
        {max != null && (
          <div
            className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line"
            role="progressbar"
            aria-label={`${count} inscrit${count > 1 ? 's' : ''} sur ${max} places`}
            aria-valuenow={count}
            aria-valuemin={0}
            aria-valuemax={max}
          >
            <div className="h-full rounded-full bg-olive transition-all" style={{ width: `${Math.min(100, (count / max) * 100)}%` }} />
          </div>
        )}
        {signedPeople.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {signedPeople.map((p) => (
              <div
                key={p.id}
                className="inline-flex items-center gap-1 rounded-full border-[1.5px] border-line-2 bg-card py-0.5 pl-0.5 pr-2 text-xs font-medium text-body"
              >
                <Avatar pseudo={p.pseudo} avatarUrl={p.avatar_url} className="h-5 w-5 bg-ink text-[10px] text-paper" />
                {p.pseudo}
              </div>
            ))}
          </div>
        )}
        {groupMsg && (
          <p className="mt-2 flex items-center gap-1 text-xs text-muted">
            <UsersIcon className="h-[11px] w-[11px] shrink-0" /> {groupMsg}
          </p>
        )}
      </div>

      {/* Simulateur de coût */}
      {priced && (
        <div className="mx-4 mt-3 rounded-xl bg-soft px-3 py-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">Si on est</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setSimN((n) => Math.max(1, n - 1))} aria-label="Un participant de moins" className="flex h-6 w-6 items-center justify-center rounded-full border-[1.5px] border-line-3 text-sm font-bold leading-none">–</button>
              <span className="w-6 text-center text-sm font-bold text-ink">{simN}</span>
              <button onClick={() => setSimN((n) => n + 1)} aria-label="Un participant de plus" className="flex h-6 w-6 items-center justify-center rounded-full border-[1.5px] border-line-3 text-sm font-bold leading-none">+</button>
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="font-serif text-xl text-ink">{formatEuro(perPerson(activity, simN) ?? 0)}<span className="text-xs font-sans text-muted"> /pers</span></span>
            <span className="text-xs text-muted">total {formatEuro(totalCost(activity, simN) ?? 0)}</span>
          </div>
          {count > 0 && (
            <p className="mt-1 text-[11px] text-muted">
              Actuellement {count} inscrit{count > 1 ? 's' : ''} → {formatEuro(perPerson(activity, count) ?? 0)}/pers
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          onClick={onToggle}
          disabled={full || pending}
          className={`flex-1 rounded-full border-[1.5px] py-2 text-sm font-bold transition-colors ${
            mine
              ? 'border-ink bg-ink text-paper'
              : full || pending
                ? 'cursor-not-allowed border-line bg-card text-disabled'
                : 'border-line-3 bg-card hover:border-terracotta hover:text-terracotta'
          }`}
        >
          {pending ? 'Création…' : mine ? '✓ Inscrit' : full ? 'Complet' : "Je m'inscris"}
        </button>
        {activity.booking_url && (
          <a
            href={activity.booking_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border-[1.5px] border-line-3 bg-card px-4 py-2 text-sm font-bold text-sky transition-colors hover:border-sky"
          >
            Réserver →
          </a>
        )}
      </div>
    </div>
  )
}

// ============================================================
function ActivityForm({
  initial,
  dateStart,
  dateEnd,
  onCancel,
  onSubmit,
}: {
  initial?: Activity
  dateStart: string | null
  dateEnd: string | null
  onCancel: () => void
  onSubmit: (input: ActivityInput) => void
}) {
  const isEdit = initial != null
  const [priceMode, setPriceMode] = useState<'none' | 'total' | 'per_person'>(() =>
    initial?.price_type === 'per_person' ? 'per_person' : initial?.price_type ? 'total' : 'none',
  )

  const inputBase =
    'rounded-[13px] border-[1.5px] border-line bg-card px-3 py-2.5 text-sm focus:border-terracotta focus:outline-none'
  const inputCls = `w-full ${inputBase}`

  return (
    <form
      action={(fd) => {
        const label = fd.get('label')?.toString().trim() ?? ''
        if (!label) return
        const num = (k: string) => {
          const v = fd.get(k)?.toString().trim()
          return v ? Number(v) : null
        }
        onSubmit({
          label,
          activityDate: fd.get('activity_date')?.toString() || null,
          startTime: fd.get('start_time')?.toString() || null,
          price: priceMode === 'none' ? null : num('price'),
          priceType: priceMode === 'none' ? null : priceMode,
          maxParticipants: num('max_participants'),
          bookingUrl: fd.get('booking_url')?.toString() || null,
          comment: fd.get('comment')?.toString() || null,
        })
      }}
      className="flex flex-col gap-3 rounded-[18px] border-[1.5px] border-line-2 bg-card p-4 shadow-card"
    >
      <input name="label" type="text" required maxLength={80} defaultValue={initial?.label ?? ''} placeholder="Padel, accrobranche, resto…" className={inputCls} autoFocus />

      <div className="flex gap-2">
        <input name="activity_date" type="date" min={dateStart ?? undefined} max={dateEnd ?? undefined} defaultValue={initial?.activity_date ?? undefined} className={`${inputCls} flex-1`} />
        <input name="start_time" type="time" defaultValue={initial?.start_time?.slice(0, 5) ?? undefined} className={`${inputCls} w-32`} />
      </div>

      {/* Prix + mode de découpage */}
      <div className="rounded-[13px] border-[1.5px] border-line-2 p-3">
        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-muted">Prix</label>
        <div className="mb-2 grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Mode de prix">
          {([
            ['none', 'Gratuit'],
            ['total', 'Total à diviser'],
            ['per_person', 'Par personne'],
          ] as const).map(([val, lbl]) => (
            <button
              key={val}
              type="button"
              role="radio"
              aria-checked={priceMode === val}
              onClick={() => setPriceMode(val)}
              className={`rounded-full border-[1.5px] py-1.5 text-xs font-bold transition-colors ${
                priceMode === val ? 'border-ink bg-ink text-paper' : 'border-line-2 text-muted hover:border-line-3'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
        {priceMode !== 'none' && (
          <input name="price" type="number" min="0" step="0.01" required defaultValue={initial?.price ?? undefined} placeholder={priceMode === 'per_person' ? '€ par personne' : '€ total à diviser'} className={inputCls} />
        )}
      </div>

      {/* Nombre max de participants (places) */}
      <input name="max_participants" type="number" min="1" step="1" defaultValue={initial?.max_participants ?? undefined} placeholder="Nombre max de participants (optionnel)" aria-label="Nombre maximum de participants" className={inputCls} />

      <input name="booking_url" type="url" defaultValue={initial?.booking_url ?? undefined} placeholder="Lien de réservation (optionnel)" className={inputCls} />

      <textarea name="comment" maxLength={200} rows={2} defaultValue={initial?.comment ?? undefined} placeholder="Commentaire (optionnel) — ex : prévoir des chaussures de rando…" className={`${inputCls} resize-none`} />

      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 rounded-[15px] border-[1.5px] border-line-3 bg-card py-2.5 text-sm font-bold">
          Annuler
        </button>
        <Button type="submit" className="flex-1 rounded-[15px] py-2.5 text-sm">
          {isEdit ? 'Enregistrer →' : 'Proposer →'}
        </Button>
      </div>
    </form>
  )
}
