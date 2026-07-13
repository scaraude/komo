'use client'

import { useEffect, useRef, useState } from 'react'
import type { PlaceSuggestion } from '@/app/api/places/route'
import { MapPinIcon } from '@/components/ui/icons'

const DEFAULT_INPUT_CLASS =
  'w-full rounded-[15px] border-[1.5px] border-line bg-card p-4 text-[15px] text-ink outline-none placeholder:text-disabled focus:border-terracotta'

/**
 * Champ texte avec autocomplétion de lieux (proxy Geoapify via /api/places).
 * Contrôlé : le parent détient la valeur (value/onValueChange) ; onPick est
 * appelé avec le libellé choisi quand une suggestion est sélectionnée.
 */
export function PlaceAutocomplete({
  value,
  onValueChange,
  onPick,
  placeholder,
  autoFocus,
  name,
  id,
  required,
  maxLength = 120,
  inputClassName = DEFAULT_INPUT_CLASS,
}: {
  value: string
  onValueChange: (v: string) => void
  onPick?: (display: string) => void
  placeholder?: string
  autoFocus?: boolean
  name?: string
  id?: string
  required?: boolean
  maxLength?: number
  inputClassName?: string
}) {
  const [places, setPlaces] = useState<PlaceSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(-1)
  const boxRef = useRef<HTMLDivElement>(null)
  const justPicked = useRef(false)

  useEffect(() => {
    if (justPicked.current) {
      justPicked.current = false
      return
    }
    const q = value.trim()
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      // Reset déplacé ici (et non en synchrone dans l'effet) : requête trop courte
      // → on vide les suggestions au lieu d'appeler l'API.
      if (q.length < 3) {
        setPlaces([])
        setOpen(false)
        return
      }
      setLoading(true)
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        const data: { places?: PlaceSuggestion[] } = await res.json()
        const next = data.places ?? []
        setPlaces(next)
        setOpen(next.length > 0)
        setActive(-1)
      } catch {
        /* abort / réseau — on ignore */
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [value])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function pick(p: PlaceSuggestion) {
    justPicked.current = true
    const display = p.line2 ? `${p.line1}, ${p.line2}` : p.line1
    onValueChange(display)
    onPick?.(display)
    setOpen(false)
    setPlaces([])
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || places.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, places.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault()
      const place = places[active]
      if (place) pick(place)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        id={id}
        name={name}
        type="text"
        required={required}
        autoComplete="off"
        autoFocus={autoFocus}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onFocus={() => places.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={inputClassName}
      />
      {loading && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-disabled">…</span>
      )}

      {open && places.length > 0 && (
        <ul className="animate-fade-in absolute z-20 mt-2 w-full overflow-hidden rounded-[15px] border-[1.5px] border-line bg-card shadow-[0_8px_24px_rgba(60,45,20,0.12)]">
          {places.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(p)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors ${
                  active === i ? 'bg-soft text-ink' : 'text-body'
                } ${i > 0 ? 'border-t border-line-2' : ''}`}
              >
                <MapPinIcon className="h-[14px] w-[14px] shrink-0 text-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px]">{p.line1}</span>
                  {p.line2 && <span className="block truncate text-[12px] text-faint">{p.line2}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
