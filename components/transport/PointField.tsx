'use client'

import { useState } from 'react'
import { PlaceAutocomplete } from '@/components/PlaceAutocomplete'

const INPUT_CLASS =
  'w-full bg-card border-[1.5px] border-line rounded-[13px] p-[14px] text-[14.5px] text-ink outline-none focus:border-terracotta placeholder:text-disabled'
const LABEL_CLASS = 'text-[12px] font-bold uppercase tracking-[0.8px] text-muted-2 mb-2'

/**
 * Un point d'un trajet (départ ou arrivée), avec autocomplete Geoapify.
 *
 * - Sans `defaultValue` → côté participant : input requis, soumet la valeur saisie.
 * - Avec `defaultValue` (= lieu de l'event) → côté event : pill pré-remplie
 *   (✕ pour personnaliser → autocomplete + « ↩ Remettre {défaut} »). Soumet ''
 *   tant qu'on garde le défaut → null en DB → hérite de events.destination.
 */
export function PointField({
  name,
  label,
  defaultValue,
  placeholder,
}: {
  name: string
  label: string
  defaultValue?: string
  placeholder?: string
}) {
  const hasDefault = !!defaultValue
  const [text, setText] = useState('') // texte courant de l'input
  const [override, setOverride] = useState<string | null>(null) // valeur custom validée (côté event)
  const [editing, setEditing] = useState(!hasDefault) // côté participant démarre en saisie

  // Côté participant : l'input porte le name (soumis directement).
  // Côté event : un input caché porte le name (vide tant qu'on garde le défaut).
  const submitValue = editing ? text.trim() : override ?? ''

  return (
    <div>
      <p className={LABEL_CLASS}>{label}</p>
      {hasDefault && <input type="hidden" name={name} value={submitValue} />}

      {editing ? (
        <div className="flex flex-col gap-2">
          <PlaceAutocomplete
            autoFocus={hasDefault}
            name={hasDefault ? undefined : name}
            required={!hasDefault}
            maxLength={60}
            value={text}
            onValueChange={setText}
            onPick={
              hasDefault
                ? (v) => {
                    setOverride(v)
                    setEditing(false)
                  }
                : undefined
            }
            placeholder={placeholder ?? 'ex : Lyon'}
            inputClassName={INPUT_CLASS}
          />
          {hasDefault && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                setOverride(null)
                setText('')
                setEditing(false)
              }}
              className="self-start text-[12.5px] text-terracotta font-semibold hover:underline"
            >
              ↩ Remettre {defaultValue}
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 bg-soft border-[1.5px] border-line rounded-[13px] py-[11px] px-[14px]">
          <span className="flex items-center gap-2 min-w-0 text-[14.5px] text-ink">
            <span aria-hidden>📍</span>
            <span className="truncate">{override ?? defaultValue}</span>
            {!override && (
              <span className="shrink-0 text-[11.5px] text-muted">· lieu de l&apos;event</span>
            )}
          </span>
          <button
            type="button"
            onClick={() => {
              setOverride(null)
              setText('')
              setEditing(true)
            }}
            aria-label="Changer le point"
            className="shrink-0 w-[26px] h-[26px] rounded-full border border-line-3 flex items-center justify-center text-[13px] text-muted hover:text-terracotta hover:border-terracotta transition-colors"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
