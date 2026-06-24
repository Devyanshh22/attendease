export interface Semester {
  id: string
  user_id: string
  name: string
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
}

export interface Subject {
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

export interface TimetableSlot {
  id: string
  user_id: string
  semester_id: string
  subject_id: string
  day_of_week: number // 1=Monday … 6=Saturday
  start_time: string
  end_time: string
  room: string | null
  faculty: string | null
}

export interface SpecialDay {
  id: string
  user_id: string
  semester_id: string
  date: string
  type: 'holiday' | 'no_college' | 'extra_working'
  label: string
}

export interface ExtraLecture {
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

export type AttendanceStatus = 'attended' | 'missed' | 'cancelled'

export interface AttendanceRecord {
  id: string
  user_id: string
  date: string
  timetable_slot_id: string | null
  extra_lecture_id: string | null
  status: AttendanceStatus
  note: string | null
  created_at: string
  updated_at: string
}

// Joined / computed helpers
export interface SubjectAttendanceSummary {
  subject: Subject
  attended: number
  total: number
  percentage: number
  needed_to_reach_target: number // classes to attend to hit target
  can_miss: number               // classes that can be missed while staying above target
}
