import type { ReactNode } from 'react'

// Set d'icônes monochromes du hub (trait arrondi, couleur via currentColor).
// Remplace les emojis pour un langage graphique unique — voir charte KOMO.

function IconBase({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  )
}

export function CompassIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </IconBase>
  )
}

export function CalendarIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </IconBase>
  )
}

export function UsersIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </IconBase>
  )
}

export function CarIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </IconBase>
  )
}

export function BasketIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="m5 11 4-7" />
      <path d="m19 11-4-7" />
      <path d="M2 11h20" />
      <path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.6-7.4" />
      <path d="m9 15 .5 2" />
      <path d="m15 15-.5 2" />
    </IconBase>
  )
}

export function TicketIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2M13 11v2M13 17v2" />
    </IconBase>
  )
}

export function BanknoteIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 12h.01M18 12h.01" />
    </IconBase>
  )
}

export function LinkIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </IconBase>
  )
}

export function MapPinIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </IconBase>
  )
}

export function ClockIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </IconBase>
  )
}

export function UserIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </IconBase>
  )
}

export function TrashIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M10 11v6M14 11v6" />
    </IconBase>
  )
}

export function PencilIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" />
    </IconBase>
  )
}

export function SparklesIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="m12 4 1.8 4.9a2 2 0 0 0 1.2 1.2l4.9 1.8-4.9 1.8a2 2 0 0 0-1.2 1.2L12 19.8l-1.8-4.9a2 2 0 0 0-1.2-1.2L4.1 11.9 9 10.1a2 2 0 0 0 1.2-1.2L12 4Z" />
      <path d="M19 2v4M17 4h4" />
    </IconBase>
  )
}

export function HomeIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="m3 10 9-7 9 7" />
      <path d="M5 8.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.5" />
      <path d="M10 21v-6h4v6" />
    </IconBase>
  )
}

export function MapIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="m9 3.5-6 2v15l6-2 6 2 6-2v-15l-6 2-6-2Z" />
      <path d="M9 3.5v15M15 5.5v15" />
    </IconBase>
  )
}

export function UtensilsIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 0 0-5 5v6a2 2 0 0 0 2 2h3Z" />
      <path d="M21 15v7" />
    </IconBase>
  )
}

export function CookingPotIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M2 12h20" />
      <path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7" />
      <path d="m4 8 16-4" />
      <path d="m8.9 6.8-.5-1.8a2 2 0 0 1 1.4-2.4l2-.5a2 2 0 0 1 2.4 1.4l.5 1.8" />
    </IconBase>
  )
}

export function TrainIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect x="4" y="3" width="16" height="16" rx="2" />
      <path d="M4 11h16" />
      <path d="M12 3v8" />
      <path d="M8 15h.01M16 15h.01" />
      <path d="m8 19-2 3M16 19l2 3" />
    </IconBase>
  )
}

export function BusIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 4h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
      <path d="M2 10h20" />
      <path d="M8 4v6M16 4v6" />
      <circle cx="7" cy="18.5" r="1.7" />
      <circle cx="17" cy="18.5" r="1.7" />
    </IconBase>
  )
}

export function VanIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M3 6h11c.7 0 1.4.3 1.8.9l3.7 4.6c.3.4.5.8.5 1.3V15a1 1 0 0 1-1 1h-1.5" />
      <path d="M2 7v8a1 1 0 0 0 1 1h2" />
      <path d="M14 6v5H2" />
      <path d="M9 16h6" />
      <circle cx="7" cy="16.5" r="1.7" />
      <circle cx="17" cy="16.5" r="1.7" />
    </IconBase>
  )
}

export function KeyIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="m11 12 10-10" />
      <path d="m16 7 3 3" />
    </IconBase>
  )
}

export function BeerIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M6 8h9a1 1 0 0 1 1 1v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a1 1 0 0 1 1-1Z" />
      <path d="M16 10h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2" />
      <path d="M5 11.5h11" />
      <path d="M8 8V6a2.5 2.5 0 0 1 5 0v2" />
    </IconBase>
  )
}

export function FlagIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 22V4" />
      <path d="M4 4c2-1.3 4-1.3 6 0s4 1.3 6 0v9c-2 1.3-4 1.3-6 0s-4-1.3-6 0" />
    </IconBase>
  )
}

export function MountainIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="m8 3 4 8 5-5 5 15H2L8 3Z" />
    </IconBase>
  )
}

export function PartyPopperIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M5.8 11.3 2 22l10.7-3.8" />
      <path d="M5.8 11.3c2.2.6 4.6 3 6.9 6.9" />
      <path d="M13 6.5V4" />
      <path d="m16.5 8.5 1.8-1.8" />
      <path d="M19.5 12H22" />
    </IconBase>
  )
}

export function MusicIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </IconBase>
  )
}

export function BallIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M19.1 5.1C15.2 9.1 10 10.4 2.3 10.9" />
      <path d="M21.8 12.8c-6.6-1.4-12.1 1-16.4 6.3" />
      <path d="M8.6 2.8c4.4 6 6 9.4 8 17.7" />
    </IconBase>
  )
}

export function FlameIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </IconBase>
  )
}

export function MessageIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </IconBase>
  )
}

export function BackpackIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M5 10a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M8 14h8" />
      <path d="M8 14v3a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-3" />
    </IconBase>
  )
}

export function SuitcaseIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect x="4" y="7" width="16" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M8 7v13M16 7v13" />
    </IconBase>
  )
}

export function PackageIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </IconBase>
  )
}

/** Icône d'un type d'event (weekend, soiree, concert, road_trip, sport, autre). */
export function EventTypeIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case 'weekend': return <MountainIcon className={className} />
    case 'soiree': return <PartyPopperIcon className={className} />
    case 'concert': return <MusicIcon className={className} />
    case 'road_trip': return <CarIcon className={className} />
    case 'sport': return <BallIcon className={className} />
    default: return <SparklesIcon className={className} />
  }
}

/** Icône d'un mode de transport (car, rental, train, bus, navette). */
export function TransportModeIcon({ mode, className }: { mode: string; className?: string }) {
  switch (mode) {
    case 'train': return <TrainIcon className={className} />
    case 'bus': return <BusIcon className={className} />
    case 'navette': return <VanIcon className={className} />
    case 'rental': return <KeyIcon className={className} />
    default: return <CarIcon className={className} />
  }
}
