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
export type AccommodationOption = Tables['accommodation_options']['Row']
