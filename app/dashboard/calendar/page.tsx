import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const metadata: Metadata = { title: 'Calendar' }
import { getMonthCalendarData } from '@/lib/attendance'
import { getMonthTodoCounts } from '@/lib/todos'
import type { Subject } from '@/lib/types'
import CalendarClient from './CalendarClient'

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { month?: string; year?: string }
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date()
  const year = parseInt(searchParams.year ?? String(today.getFullYear()))
  const month = parseInt(searchParams.month ?? String(today.getMonth())) // 0-indexed

  const { data: semester } = await supabase
    .from('semesters').select('*').eq('is_active', true).eq('user_id', user!.id).maybeSingle()

  if (!semester) {
    return (
      <div className="flex items-center justify-center h-48 border border-[#EBEBEB] border-dashed rounded-[10px]">
        <p className="text-[#ABABAB] text-[14px]">
          No active semester.{' '}
          <a href="/onboarding" className="text-[#5B5BD6] hover:underline">Set one up</a>.
        </p>
      </div>
    )
  }

  const { data: subjectsRaw } = await supabase
    .from('subjects').select('id, name, short_code, color').eq('semester_id', semester.id)
  const subjects = (subjectsRaw ?? []) as Pick<Subject, 'id' | 'name' | 'short_code' | 'color'>[]

  const [calendarData, todoCounts] = await Promise.all([
    getMonthCalendarData(supabase, year, month, user!.id, semester.id),
    getMonthTodoCounts(supabase, user!.id, year, month),
  ])

  return (
    <CalendarClient
      year={year}
      month={month}
      today={today.toISOString().split('T')[0]}
      calendarData={calendarData}
      subjects={subjects}
      semesterId={semester.id}
      userId={user!.id}
      todoCounts={todoCounts}
    />
  )
}
