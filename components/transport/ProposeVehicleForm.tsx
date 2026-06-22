'use client'

import { useState, useTransition } from 'react'
import { createLeg } from '@/lib/actions/transport'
import { PointField } from './PointField'

const MODES = [
  { value: 'car', label: '🚗 Voiture' },
  { value: 'rental', label: '🚙 Location' },
  { value: 'train', label: '🚆 Train' },
  { value: 'bus', label: '🚌 Bus' },
  { value: 'navette', label: '🚐 Navette' },
] as const

type Mode = (typeof MODES)[number]['value']

const INPUT_CLASS =
  'w-full bg-card border-[1.5px] border-line rounded-[13px] p-[14px] text-[14.5px] text-ink outline-none focus:border-terracotta placeholder:text-disabled'
const LABEL_CLASS = 'text-[12px] font-bold uppercase tracking-[0.8px] text-muted-2 mb-2'

export function ProposeVehicleForm({
  slug,
  eventId,
  participantId,
  direction,
  eventDestination,
  eventDateStart,
  eventDateEnd,
  onClose,
}: {
  slug: string
  eventId: string
  participantId: string
  direction: 'aller' | 'retour'
  eventDestination: string
  eventDateStart: string | null
  eventDateEnd: string | null
  onClose: () => void
}) {
  const [mode, setMode] = useState<Mode>('car')
  const [seats, setSeats] = useState(4)
  const [isDriver, setIsDriver] = useState(true)
  const [rangeMode, setRangeMode] = useState(false) // false = heure fixe, true = plage
  const [isPending, startTransition] = useTransition()

  // Seules voiture/location ont des places (+ chauffeur·euse + plage horaire).
  const hasSeats = mode === 'car' || mode === 'rental'
  const hasDriver = mode === 'car' || mode === 'rental'
  const hasBillet = mode === 'train' || mode === 'bus'
  const hasTrainNumber = mode === 'train'
  const hasArrival = mode === 'train' // heure d'arrivée (départ → arrivée)
  const hasLink = mode === 'train' || mode === 'bus' || mode === 'navette'

  // Trajet orienté départ → arrivée. Le côté participant (input requis) est le
  // départ pour un aller, l'arrivée pour un retour ; l'autre côté hérite du
  // lieu de l'event (pill pré-remplie).
  const departureIsHome = direction === 'aller'
  const noun = hasBillet ? 'Gare / arrêt' : 'Ville'
  const depLabel = `${departureIsHome ? noun : 'Point'} de départ`
  const arrLabel = `${departureIsHome ? 'Point' : noun} d'arrivée`
  const cityPlaceholder = hasBillet ? 'ex : Gare de Lyon' : 'ex : Lyon'

  // Date pré-remplie : début de l'event pour un aller, fin pour un retour.
  const defaultDate = (direction === 'retour' ? eventDateEnd : eventDateStart) ?? ''
  const useRange = hasSeats && rangeMode

  function handleSubmit(formData: FormData) {
    // Label optionnel : si vide, on le déduit (départ → arrivée, sinon le mode)
    // pour ne pas imposer à l'utilisateur de nommer son trajet.
    if (!formData.get('label')?.toString().trim()) {
      const dep = formData.get('departure_city')?.toString().trim()
      const arr = formData.get('arrival_city')?.toString().trim()
      const from = dep || (departureIsHome ? '' : eventDestination)
      const to = arr || (departureIsHome ? eventDestination : '')
      const modeLabel = MODES.find((m) => m.value === mode)?.label.replace(/^\S+\s/, '') ?? 'Trajet'
      formData.set('label', from && to ? `${from} → ${to}` : from || to || modeLabel)
    }
    startTransition(async () => {
      await createLeg(slug, eventId, participantId, direction, formData)
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-paper rounded-[22px] shadow-[0_8px_40px_rgba(60,45,20,0.18)] p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="font-serif text-[22px] text-ink mb-5">
          Je propose un trajet {direction === 'aller' ? '→' : '←'}
        </h3>

        <form action={handleSubmit} className="flex flex-col gap-4">
          {/* Hidden inputs that feed the server action */}
          <input type="hidden" name="mode" value={mode} />
          {hasSeats && <input type="hidden" name="total_seats" value={seats} />}
          {hasDriver && <input type="hidden" name="is_driver" value={isDriver ? 'true' : 'false'} />}

          {/* Mode */}
          <div className="flex flex-wrap gap-[8px]">
            {MODES.map((m) => {
              const active = mode === m.value
              return (
                <button key={m.value} type="button" onClick={() => setMode(m.value)}
                  className={`rounded-[20px] px-[14px] py-[9px] text-[13px] transition-colors ${
                    active
                      ? 'bg-terracotta text-white font-bold'
                      : 'bg-card border-[1.5px] border-line text-body'
                  }`}>
                  {m.label}
                </button>
              )
            })}
          </div>

          {/* Label — optionnel : déduit du trajet si laissé vide */}
          <input name="label" type="text" maxLength={60}
            placeholder={hasBillet ? 'Nom (ex : TGV 8h12) — optionnel' : 'Nom du trajet (optionnel)'}
            className={INPUT_CLASS} />

          {/* Trajet : départ → arrivée. Le côté event hérite du lieu de l'event. */}
          <PointField
            name="departure_city"
            label={depLabel}
            placeholder={cityPlaceholder}
            defaultValue={departureIsHome ? undefined : eventDestination}
          />
          <PointField
            name="arrival_city"
            label={arrLabel}
            placeholder={cityPlaceholder}
            defaultValue={departureIsHome ? eventDestination : undefined}
          />

          {/* Date + heure(s) */}
          <div>
            <p className={LABEL_CLASS}>
              {hasArrival ? 'Date & horaires (départ → arrivée)' : 'Date & heure de départ'}
            </p>
            <div className="flex flex-col gap-2">
              <input name="departure_date" type="date" defaultValue={defaultDate}
                aria-label="Date de départ" className={INPUT_CLASS} />

              {hasSeats && (
                <div className="bg-track rounded-[11px] p-[4px] flex gap-[3px]">
                  <button type="button" onClick={() => setRangeMode(false)}
                    className={`flex-1 rounded-[8px] py-[8px] text-[13px] transition-colors ${
                      !rangeMode ? 'bg-ink text-white font-bold' : 'text-[#6b665c]'
                    }`}>Heure fixe</button>
                  <button type="button" onClick={() => setRangeMode(true)}
                    className={`flex-1 rounded-[8px] py-[8px] text-[13px] transition-colors ${
                      rangeMode ? 'bg-ink text-white font-bold' : 'text-[#6b665c]'
                    }`}>Plage</button>
                </div>
              )}

              {useRange ? (
                <div className="flex items-center gap-2">
                  <input name="departure_time" type="time" aria-label="Heure de début"
                    className={INPUT_CLASS} />
                  <span aria-hidden className="shrink-0 text-muted text-[14px]">→</span>
                  <input name="departure_time_end" type="time" aria-label="Heure de fin"
                    className={INPUT_CLASS} />
                </div>
              ) : hasArrival ? (
                <div className="flex items-center gap-2">
                  <input name="departure_time" type="time" aria-label="Heure de départ"
                    className={INPUT_CLASS} />
                  <span aria-hidden className="shrink-0 text-muted text-[14px]">→</span>
                  <input name="arrival_time" type="time" aria-label="Heure d'arrivée"
                    className={INPUT_CLASS} />
                </div>
              ) : (
                <input name="departure_time" type="time" aria-label="Heure de départ"
                  className={INPUT_CLASS} />
              )}
            </div>
          </div>

          {/* Stepper places (voiture/location) */}
          {hasSeats && (
            <div className="bg-card border-[1.5px] border-line rounded-[13px] py-[11px] px-[14px] flex items-center justify-between">
              <div className="text-[14.5px] text-ink font-semibold">Places passagers</div>
              <div className="flex items-center gap-[16px]">
                <button type="button" onClick={() => setSeats(Math.max(1, seats - 1))}
                  className="w-[32px] h-[32px] rounded-full border-[1.5px] border-line-3 flex items-center justify-center text-[18px] leading-none">−</button>
                <span className="text-[16px] font-bold min-w-[14px] text-center">{seats}</span>
                <button type="button" onClick={() => setSeats(Math.min(8, seats + 1))}
                  className="w-[32px] h-[32px] rounded-full border-[1.5px] border-line-3 flex items-center justify-center text-[18px] leading-none">+</button>
              </div>
            </div>
          )}

          {/* Suis-je le chauffeur ? Si oui, ma place s'ajoute en plus. */}
          {hasDriver && (
            <button type="button" onClick={() => setIsDriver((v) => !v)}
              className="bg-card border-[1.5px] border-line rounded-[13px] py-[11px] px-[14px] flex items-center justify-between gap-3 text-left">
              <div className="min-w-0">
                <div className="text-[14.5px] text-ink font-semibold">🚗 Je suis le chauffeur·euse</div>
                <div className="text-[12px] text-muted mt-0.5 leading-[1.35]">
                  {isDriver
                    ? 'Ta place est comptée en plus des places passagers.'
                    : 'Tu proposes le trajet sans y monter.'}
                </div>
              </div>
              <span aria-hidden className={`relative shrink-0 w-[44px] h-[26px] rounded-full transition-colors ${isDriver ? 'bg-terracotta' : 'bg-line-3'}`}>
                <span className={`absolute top-[3px] h-[20px] w-[20px] rounded-full bg-white shadow-sm transition-all ${isDriver ? 'left-[21px]' : 'left-[3px]'}`} />
              </span>
            </button>
          )}

          {/* N° de train */}
          {hasTrainNumber && (
            <input name="vehicle_ref" type="text" maxLength={20}
              placeholder="N° du train (ex : 6612) — optionnel"
              className={INPUT_CLASS} />
          )}

          {/* Lien (train / bus / navette) */}
          {hasLink && (
            <input name="link_url" type="url" placeholder="Lien (optionnel)"
              className={INPUT_CLASS} />
          )}

          {/* Commentaire (tous modes) */}
          <textarea name="comment" maxLength={200} rows={2}
            placeholder="Commentaire (optionnel) — ex : je peux faire un détour par…"
            className={`${INPUT_CLASS} resize-none`} />

          {/* Info billet (train / bus) */}
          {hasBillet && (
            <div className="bg-soft rounded-[13px] py-[12px] px-[14px] text-[12.5px] text-muted leading-[1.4]">
              🚆 Pas de « places » ici — chacun prend son billet, on garde juste l&apos;horaire commun.
            </div>
          )}

          {/* Boutons */}
          <div className="flex gap-3 mt-1">
            <button type="button" onClick={onClose}
              className="flex-1 bg-card border-[1.5px] border-line-3 rounded-[15px] p-[16px] font-bold text-ink">
              Annuler
            </button>
            <button type="submit" disabled={isPending}
              className="flex-[1.5] rounded-[15px] bg-terracotta text-white p-[16px] text-center font-bold shadow-[0_4px_0_var(--color-terracotta-dk)] active:translate-y-1 active:shadow-none transition-all disabled:opacity-60">
              {isPending ? '…' : 'Proposer →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
