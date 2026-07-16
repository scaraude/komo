import type { Database } from '@/lib/database.types'

type Tables = Database['public']['Tables']

export type Event = Tables['events']['Row']
export type Participant = Tables['participants']['Row']
export type Leg = Tables['transport_legs']['Row']
export type Occupant = Tables['transport_occupants']['Row']
export type Meal = Tables['meals']['Row']
export type Product = Tables['products']['Row']
export type MealOwner = Tables['meal_owners']['Row']
export type Activity = Tables['activities']['Row']
export type ActivitySignup = Tables['activity_signups']['Row']
export type DateProposal = Tables['date_proposals']['Row']

/**
 * « Le plan » tient en 2-3 lignes — même limite qu'en base (CHECK
 * event_pitch_length). Vit ici et pas dans `lib/actions/events.ts` : un module
 * `'use server'` ne peut exporter que des fonctions async.
 */
export const PITCH_MAX_LENGTH = 280

/**
 * Une période : un intervalle de dates (bornes incluses), au format ISO
 * `YYYY-MM-DD`. Brique réutilisable — un séjour, un créneau de sondage, etc.
 * Voir `formatPeriod` dans `lib/format.ts`.
 */
export type Period = { start: string; end: string }
export type AccommodationOption = Tables['accommodation_options']['Row']
export type PushSubscriptionRow = Tables['push_subscriptions']['Row']
export type NotificationPrefs = Tables['notification_prefs']['Row']
export type Notification = Tables['notifications']['Row']
