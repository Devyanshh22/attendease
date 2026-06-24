import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getWeekReport, getSemesterReport, getExportData } from '@/lib/analytics'
import type { Semester } from '@/lib/types'
import ReportsClient from './ReportsClient'

export const metadata: Metadata = { title: 'Reports' }

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { weekOffset?: string }
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

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

  const sem = semester as Semester
  const weekOffset = parseInt(searchParams.weekOffset ?? '0')

  const [weekReport, semesterRows, exportData] = await Promise.all([
    getWeekReport(supabase, user!.id, sem.id, weekOffset),
    getSemesterReport(supabase, user!.id, sem.id),
    getExportData(supabase, user!.id, sem.id),
  ])

  return (
    <ReportsClient
      semesterName={sem.name}
      semStartDate={sem.start_date}
      semEndDate={sem.end_date}
      weekReport={weekReport}
      weekOffset={weekOffset}
      semesterRows={semesterRows}
      exportData={exportData}
    />
  )
}
