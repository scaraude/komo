export const TRANSPORT_MODES = [
  { value: 'car', label: 'Voiture', icon: '🚗' },
  { value: 'rental', label: 'Location', icon: '🚙' },
  { value: 'train', label: 'Train', icon: '🚆' },
  { value: 'bus', label: 'Bus', icon: '🚌' },
  { value: 'navette', label: 'Navette', icon: '🚐' },
] as const

export type TransportMode = (typeof TRANSPORT_MODES)[number]['value']

export const MODE_ICON = Object.fromEntries(
  TRANSPORT_MODES.map((m) => [m.value, m.icon]),
) as Record<TransportMode, string>

export function isTransportMode(value: string): value is TransportMode {
  return TRANSPORT_MODES.some((m) => m.value === value)
}
