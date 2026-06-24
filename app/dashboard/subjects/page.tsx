import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase-server'
export const metadata: Metadata = { title: 'Subjects' }
import type { Subject } from '@/lib/types'
import SubjectsClient from './SubjectsClient'

export default async function SubjectsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: semester } = await supabase
    .from('semesters').select('id, name').eq('is_active', true).eq('user_id', user!.id).maybeSingle()

  const subjects: Subject[] = []
  const attended = new Map<string, number>()
  const total = new Map<string, number>()

  if (semester) {
    const { data } = await supabase.from('subjects').select('*').eq('semester_id', semester.id).order('name')
    subjects.push(...((data ?? []) as Subject[]))

    const { data: slots } = await supabase.from('timetable_slots').select('id, subject_id').eq('semester_id', semester.id)
    const slotToSubject = new Map((slots ?? []).map(s => [s.id, s.subject_id as string]))

    const { data: records } = await supabase
      .from('attendance_records').select('timetable_slot_id, status').eq('user_id', user!.id).neq('status', 'cancelled')
    for (const r of records ?? []) {
      const sid = r.timetable_slot_id ? slotToSubject.get(r.timetable_slot_id) : null
      if (!sid) continue
      total.set(sid, (total.get(sid) ?? 0) + 1)
      if (r.status === 'attended') attended.set(sid, (attended.get(sid) ?? 0) + 1)
    }
  }

  return (
    <SubjectsClient
      semesterId={semester?.id ?? null}
      subjects={subjects}
      attended={Object.fromEntries(attended)}
      total={Object.fromEntries(total)}
    />
  )
}
