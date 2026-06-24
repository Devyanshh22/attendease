import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase-server'
export const metadata: Metadata = { title: 'Timetable' }
import type { TimetableSlot, Subject, SpecialDay, ExtraLecture } from '@/lib/types'
import TimetableClient from './TimetableClient'

export default async function TimetablePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: semester } = await supabase
    .from('semesters').select('*').eq('is_active', true).eq('user_id', user!.id).maybeSingle()

  let subjects: Subject[] = []
  let slots: TimetableSlot[] = []
  let specialDays: SpecialDay[] = []
  let extraLectures: ExtraLecture[] = []

  if (semester) {
    const [s, sl, sp, el] = await Promise.all([
      supabase.from('subjects').select('*').eq('semester_id', semester.id).order('name'),
      supabase.from('timetable_slots').select('*').eq('semester_id', semester.id),
      supabase.from('special_days').select('*').eq('semester_id', semester.id).order('date'),
      supabase.from('extra_lectures').select('*').eq('semester_id', semester.id).order('date'),
    ])
    subjects = (s.data ?? []) as Subject[]
    slots = (sl.data ?? []) as TimetableSlot[]
    specialDays = (sp.data ?? []) as SpecialDay[]
    extraLectures = (el.data ?? []) as ExtraLecture[]
  }

  return (
    <TimetableClient
      semesterId={semester?.id ?? null}
      subjects={subjects}
      slots={slots}
      specialDays={specialDays}
      extraLectures={extraLectures}
    />
  )
}
