export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      semesters: {
        Row: {
          id: string
          user_id: string
          name: string
          start_date: string
          end_date: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          name: string
          start_date: string
          end_date: string
          is_active?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['semesters']['Insert']>
      }
      subjects: {
        Row: {
          id: string
          user_id: string
          semester_id: string
          name: string
          short_code: string
          total_hours: number
          attendance_target_percent: number
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          semester_id: string
          name: string
          short_code: string
          total_hours: number
          attendance_target_percent?: number
          color: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['subjects']['Insert']>
      }
      timetable_slots: {
        Row: {
          id: string
          user_id: string
          semester_id: string
          subject_id: string
          day_of_week: number
          start_time: string
          end_time: string
          room: string | null
          faculty: string | null
        }
        Insert: {
          id?: string
          user_id?: string
          semester_id: string
          subject_id: string
          day_of_week: number
          start_time: string
          end_time: string
          room?: string | null
          faculty?: string | null
        }
        Update: Partial<Database['public']['Tables']['timetable_slots']['Insert']>
      }
      special_days: {
        Row: {
          id: string
          user_id: string
          semester_id: string
          date: string
          type: 'holiday' | 'no_college' | 'extra_working'
          label: string
        }
        Insert: {
          id?: string
          user_id?: string
          semester_id: string
          date: string
          type: 'holiday' | 'no_college' | 'extra_working'
          label: string
        }
        Update: Partial<Database['public']['Tables']['special_days']['Insert']>
      }
      extra_lectures: {
        Row: {
          id: string
          user_id: string
          semester_id: string
          subject_id: string
          date: string
          start_time: string
          end_time: string
          reason: string | null
          original_timetable_slot_id: string | null
        }
        Insert: {
          id?: string
          user_id?: string
          semester_id: string
          subject_id: string
          date: string
          start_time: string
          end_time: string
          reason?: string | null
          original_timetable_slot_id?: string | null
        }
        Update: Partial<Database['public']['Tables']['extra_lectures']['Insert']>
      }
      attendance_records: {
        Row: {
          id: string
          user_id: string
          date: string
          timetable_slot_id: string | null
          extra_lecture_id: string | null
          status: 'attended' | 'missed' | 'cancelled'
          note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          date: string
          timetable_slot_id?: string | null
          extra_lecture_id?: string | null
          status: 'attended' | 'missed' | 'cancelled'
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['attendance_records']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
