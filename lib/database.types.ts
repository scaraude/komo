// Placeholder types — replaced by: supabase gen types typescript --linked > lib/database.types.ts
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type EventType = 'weekend' | 'soiree' | 'concert' | 'road_trip' | 'sport' | 'autre'

type EventRow = {
  id: string
  slug: string
  creator_token: string
  created_by: string | null
  title: string
  destination: string
  date_start: string | null
  date_end: string | null
  event_type: EventType
  presence_deadline: string | null
  created_at: string
}

type ParticipantRow = {
  id: string
  event_id: string
  pseudo: string
  session_token: string | null
  user_id: string | null
  presence_status: 'hot' | 'maybe' | 'unsure' | 'no' | null
  partial_days: Json | null
  departure_city: string | null
  luggage_size: 'light' | 'medium' | 'large' | null
  role: 'créateur' | 'co_organisateur' | 'participant'
  joined_at: string
}

type TransportLegRow = {
  id: string
  event_id: string
  direction: 'aller' | 'retour'
  mode: 'car' | 'rental' | 'train' | 'bus' | 'navette'
  driver_id: string | null
  created_by: string | null
  label: string
  departure_city: string | null
  arrival_city: string | null
  vehicle_ref: string | null
  departure_time: string | null
  departure_time_end: string | null
  arrival_time: string | null
  total_seats: number | null
  trunk_size: 'small' | 'medium' | 'large' | null
  link_url: string | null
  comment: string | null
  created_at: string
}

type DateProposalRow = {
  id: string
  event_id: string
  proposed_date: string
  created_by: string
  votes: Record<string, boolean>
  created_at: string
}

type ActivityRow = {
  id: string
  event_id: string
  label: string
  activity_date: string | null
  start_time: string | null
  price: number | null
  price_type: 'total' | 'per_person' | 'per_group' | null
  group_size: number | null
  min_participants: number | null
  max_participants: number | null
  booking_url: string | null
  created_by: string | null
  created_at: string
}

type TransportOccupantRow = {
  id: string
  leg_id: string
  participant_id: string
  is_driver: boolean
  locked: boolean
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      events: {
        Row: EventRow
        Insert: Omit<EventRow, 'id' | 'created_at' | 'creator_token' | 'created_by' | 'presence_deadline' | 'event_type' | 'date_start' | 'date_end'> & {
          creator_token?: string
          created_by?: string | null
          presence_deadline?: string | null
          event_type?: EventType
          date_start?: string | null
          date_end?: string | null
        }
        Update: Partial<Omit<EventRow, 'id' | 'created_at'>>
        Relationships: []
      }
      participants: {
        Row: ParticipantRow
        Insert: {
          event_id: string
          pseudo: string
          session_token?: string | null
          user_id?: string | null
          joined_at?: string
          presence_status?: 'hot' | 'maybe' | 'unsure' | 'no' | null
          partial_days?: Json | null
          departure_city?: string | null
          luggage_size?: 'light' | 'medium' | 'large' | null
          role?: 'créateur' | 'co_organisateur' | 'participant'
        }
        Update: Partial<Omit<ParticipantRow, 'id' | 'joined_at'>>
        Relationships: []
      }
      transport_legs: {
        Row: TransportLegRow
        Insert: Omit<TransportLegRow, 'id' | 'created_at'> & { created_at?: string }
        Update: Partial<Omit<TransportLegRow, 'id' | 'created_at'>>
        Relationships: []
      }
      transport_occupants: {
        Row: TransportOccupantRow
        Insert: Omit<TransportOccupantRow, 'id' | 'created_at'> & { created_at?: string }
        Update: Partial<Omit<TransportOccupantRow, 'id' | 'created_at'>>
        Relationships: []
      }
      accommodation_options: {
        Row: {
          id: string; event_id: string; label: string; url: string | null
          price_per_night: number | null; proposed_by: string
          votes: Record<string, boolean>; created_at: string
        }
        Insert: { event_id: string; label: string; proposed_by: string; url?: string | null; price_per_night?: number | null; votes?: Record<string, boolean> }
        Update: Partial<{ label: string; url: string | null; price_per_night: number | null; votes: Record<string, boolean> }>
        Relationships: []
      }
      meals: {
        Row: { id: string; event_id: string; label: string; meal_date: string | null; created_by: string | null; created_at: string }
        Insert: { event_id: string; label: string; meal_date?: string | null; created_by?: string | null }
        Update: Partial<{ label: string; meal_date: string | null }>
        Relationships: []
      }
      meal_owners: {
        Row: { id: string; event_id: string; meal_id: string; participant_id: string; created_at: string }
        Insert: { event_id: string; meal_id: string; participant_id: string }
        Update: Partial<{ event_id: string; meal_id: string; participant_id: string }>
        Relationships: []
      }
      products: {
        Row: { id: string; event_id: string; meal_id: string | null; name: string; quantity: number | null; unit: string; tags: string[]; checked: boolean; created_by: string | null; created_at: string }
        Insert: { event_id: string; name: string; quantity?: number | null; unit?: string; meal_id?: string | null; tags?: string[]; checked?: boolean; created_by?: string | null }
        Update: Partial<{ name: string; quantity: number | null; unit: string; meal_id: string | null; tags: string[]; checked: boolean }>
        Relationships: []
      }
      date_proposals: {
        Row: DateProposalRow
        Insert: { event_id: string; proposed_date: string; created_by: string; votes?: Record<string, boolean> }
        Update: Partial<Omit<DateProposalRow, 'id' | 'created_at'>>
        Relationships: []
      }
      activities: {
        Row: ActivityRow
        Insert: {
          event_id: string; label: string
          activity_date?: string | null; start_time?: string | null
          price?: number | null; price_type?: 'total' | 'per_person' | 'per_group' | null
          group_size?: number | null; min_participants?: number | null; max_participants?: number | null
          booking_url?: string | null; created_by?: string | null
        }
        Update: Partial<Omit<ActivityRow, 'id' | 'event_id' | 'created_at'>>
        Relationships: []
      }
      activity_signups: {
        Row: { id: string; event_id: string; activity_id: string; participant_id: string; created_at: string }
        Insert: { event_id: string; activity_id: string; participant_id: string }
        Update: Partial<{ event_id: string; activity_id: string; participant_id: string }>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      email_is_registered: { Args: { p_email: string }; Returns: boolean }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
