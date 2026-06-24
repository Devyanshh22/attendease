import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const metadata: Metadata = { title: 'Today' }
import { getDaySchedule, getOverallStats, getSubjectStats } from '@/lib/attendance'
import type { Subject } from '@/lib/types'
import TodayClient from './TodayClient'

export default async function TodayPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const todayJs = new Date()
  const todayStr = todayJs.toISOString().split('T')[0]

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

  // Compute week number within semester
  const semStart = new Date(semester.start_date)
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const weekNum = Math.max(1, Math.ceil((todayJs.getTime() - semStart.getTime()) / msPerWeek))

  const [dayResult, overallStats] = await Promise.all([
    getDaySchedule(supabase, todayStr, user!.id, semester.id),
    getOverallStats(supabase, semester.id, user!.id),
  ])

  // Per-subject stats for alert banners (only subjects appearing today)
  const { data: subjectsRaw } = await supabase
    .from('subjects').select('*').eq('semester_id', semester.id)
  const subjects = (subjectsRaw ?? []) as Subject[]

  const subjectStatsArr = await Promise.all(
    subjects.map(s => getSubjectStats(supabase, s.id, user!.id))
  )

  // Map subject id → name/color for banners
  const subjectMeta = new Map(subjects.map(s => [s.id, { name: s.name, color: s.color }]))

  return (
    <TodayClient
      date={todayStr}
      semesterName={semester.name}
      weekNum={weekNum}
      dayResult={dayResult}
      overallStats={overallStats}
      subjectStats={subjectStatsArr}
      subjectMeta={Object.fromEntries(subjectMeta)}
      semesterId={semester.id}
      userId={user!.id}
    />
  )
}
