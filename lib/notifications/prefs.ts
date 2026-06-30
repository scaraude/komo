// Source de vérité partagée pour les préférences de notification (serveur + UI).
// Les valeurs par défaut DOIVENT rester alignées avec les DEFAULT de la
// migration 20260630000002_push_notifications.sql.

export type NotificationType =
  | 'activity_created'
  | 'transport_created'
  | 'meal_created'
  | 'participant_joined'

export type PrefKey =
  | 'on_activity_created'
  | 'on_transport_created'
  | 'on_meal_created'
  | 'on_participant_joined'

export type NotificationPrefValues = Record<PrefKey, boolean>

export const PREF_DEFAULTS: NotificationPrefValues = {
  on_activity_created: true,
  on_transport_created: true,
  on_meal_created: false,
  on_participant_joined: false,
}

// Libellés FR pour les toggles du menu utilisateur, dans l'ordre d'affichage.
export const PREF_LABELS: { key: PrefKey; label: string }[] = [
  { key: 'on_activity_created', label: 'Nouvelle activité' },
  { key: 'on_transport_created', label: 'Nouveau transport' },
  { key: 'on_meal_created', label: 'Nouveau repas' },
  { key: 'on_participant_joined', label: 'Quelqu’un rejoint le Komo' },
]

export const PREF_COLUMN: Record<NotificationType, PrefKey> = {
  activity_created: 'on_activity_created',
  transport_created: 'on_transport_created',
  meal_created: 'on_meal_created',
  participant_joined: 'on_participant_joined',
}
