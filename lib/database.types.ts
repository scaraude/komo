// Placeholder types — replaced by: supabase gen types typescript --linked > lib/database.types.ts
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type EventRow = {
  id: string
  slug: string
  creator_token: string
  title: string
  destination: string
  date_start: string
  date_end: string
  presence_deadline: string | null
  created_at: string
}

type ParticipantRow = {
  id: string
  event_id: string
  pseudo: string
  session_token: string
  presence_status: 'hot' | 'maybe' | 'unsure' | 'no' | null
  partial_days: Json | null
  departure_city: string | null
  luggage_size: 'light' | 'medium' | 'large' | null
  joined_at: string
}

type TransportLegRow = {
  id: string
  event_id: string
  direction: 'aller' | 'retour'
  mode: 'car' | 'rental' | 'train' | 'bus' | 'navette'
  driver_id: string | null
  label: string
  departure_city: string
  departure_time: string | null
  total_seats: number | null
  trunk_size: 'small' | 'medium' | 'large' | null
  link_url: string | null
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
        Insert: Omit<EventRow, 'id' | 'created_at' | 'creator_token'> & { creator_token?: string }
        Update: Partial<Omit<EventRow, 'id' | 'created_at'>>
        Relationships: []
      }
      participants: {
        Row: ParticipantRow
        Insert: {
          event_id: string
          pseudo: string
          session_token: string
          joined_at?: string
          presence_status?: 'hot' | 'maybe' | 'unsure' | 'no' | null
          partial_days?: Json | null
          departure_city?: string | null
          luggage_size?: 'light' | 'medium' | 'large' | null
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
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
