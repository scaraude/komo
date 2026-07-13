// Icônes : voir TransportModeIcon dans components/ui/icons.tsx.
export const TRANSPORT_MODES = [
  { value: 'car', label: 'Voiture' },
  { value: 'rental', label: 'Location' },
  { value: 'train', label: 'Train' },
  { value: 'bus', label: 'Bus' },
  { value: 'navette', label: 'Navette' },
] as const

export type TransportMode = (typeof TRANSPORT_MODES)[number]['value']

export function isTransportMode(value: string): value is TransportMode {
  return TRANSPORT_MODES.some((m) => m.value === value)
}
