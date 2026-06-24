import type { SupabaseClient } from '@supabase/supabase-js'
import type { Subject } from './types'
import { getSubjectStats } from './attendance'

export interface WeeklySubjectStat {
  subjectId: string
  subjectName: string
  color: string
  shortCode: string
  scheduled: number
  attended: number
  missed: number
  weeklyPct: number
}

export interface WeekReport {
  weekStart: string   // YYYY-MM-DD Monday
  weekEnd: string     // YYYY-MM-DD Sunday
  scheduled: number
  attended: number
  missed: number
  weeklyPct: number
  subjects: WeeklySubjectStat[]
}

export interface SemesterSubjectRow {
  subjectId: string
  subjectName: string
  color: string
  shortCode: string
  totalScheduled: number
  attended: number
  missed: number
  pct: number
  trend: 'up' | 'down' | 'flat'
}

export interface ExportRow {
  date: string
  day: string
  subject: string
  startTime: string
  endTime: string
  status: string
  notes: string
}

// ─── Week helpers ─────────────────────────────────────────────────────────────

export function getWeekBounds(weekOffset = 0): { start: Date; end: Date } {
  const now = new Date()
  const day = now.getDay()               // 0=Sun
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((day + 6) % 7) + weekOffset * 7)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { start: monday, end: sunday }
}

export function toYMD(d: Date) {
  return d.toISOString().split('T')[0]
}

// ─── getWeekReport ─────────────────────────────────────────────────────────────

export async function getWeekReport(
  supabase: SupabaseClient,
  userId: string,
  semesterId: string,
  weekOffset = 0,
): Promise<WeekReport> {
  const { start, end } = getWeekBounds(weekOffset)
  const weekStart = toYMD(start)
  const weekEnd = toYMD(end)

  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name, short_code, color')
    .eq('semester_id', semesterId)
  const subjectList = (subjects ?? []) as Pick<Subject, 'id' | 'name' | 'short_code' | 'color'>[]

  const subjectRows: WeeklySubjectStat[] = []
  let totScheduled = 0, totAttended = 0, totMissed = 0

  for (const s of subjectList) {
    // Slots that fall on days within this week range
    const { data: slotsRaw } = await supabase
      .from('timetable_slots')
      .select('id, day_of_week')
      .eq('subject_id', s.id)
    const slots = (slotsRaw ?? []) as { id: string; day_of_week: number }[]

    // Dates in range matching each slot's day_of_week
    const slotDates: { slotId: string; date: string }[] = []
    const cur = new Date(start)
    while (cur <= end) {
      const jsDay = cur.getDay()  // 0=Sun..6=Sat
      const appDay = jsDay === 0 ? 7 : jsDay  // app: 1=Mon..6=Sat
      for (const slot of slots) {
        if (slot.day_of_week === appDay) {
          slotDates.push({ slotId: slot.id, date: toYMD(cur) })
        }
      }
      cur.setDate(cur.getDate() + 1)
    }

    // Extra lectures in range
    const { data: extrasRaw } = await supabase
      .from('extra_lectures')
      .select('id, date')
      .eq('subject_id', s.id)
      .eq('user_id', userId)
      .gte('date', weekStart)
      .lte('date', weekEnd)
    const extras = (extrasRaw ?? []) as { id: string; date: string }[]

    // Attendance records for slot dates
    let attended = 0, missed = 0
    const scheduled = slotDates.length + extras.length

    if (slotDates.length > 0) {
      const slotIds = slots.map(s => s.id)
      const { data: recs } = await supabase
        .from('attendance_records')
        .select('status, timetable_slot_id, date')
        .eq('user_id', userId)
        .in('timetable_slot_id', slotIds)
        .gte('date', weekStart)
        .lte('date', weekEnd)
      for (const r of (recs ?? []) as { status: string }[]) {
        if (r.status === 'attended') attended++
        else if (r.status === 'missed') missed++
      }
    }

    if (extras.length > 0) {
      const { data: erecs } = await supabase
        .from('attendance_records')
        .select('status, extra_lecture_id')
        .eq('user_id', userId)
        .in('extra_lecture_id', extras.map(e => e.id))
      for (const r of (erecs ?? []) as { status: string }[]) {
        if (r.status === 'attended') attended++
        else if (r.status === 'missed') missed++
      }
    }

    totScheduled += scheduled
    totAttended += attended
    totMissed += missed

    subjectRows.push({
      subjectId: s.id,
      subjectName: s.name,
      color: s.color,
      shortCode: s.short_code,
      scheduled,
      attended,
      missed,
      weeklyPct: scheduled > 0 ? Math.round((attended / scheduled) * 100) : 0,
    })
  }

  return {
    weekStart,
    weekEnd,
    scheduled: totScheduled,
    attended: totAttended,
    missed: totMissed,
    weeklyPct: totScheduled > 0 ? Math.round((totAttended / totScheduled) * 100) : 0,
    subjects: subjectRows,
  }
}

// ─── getSemesterReport ─────────────────────────────────────────────────────────

export async function getSemesterReport(
  supabase: SupabaseClient,
  userId: string,
  semesterId: string,
): Promise<SemesterSubjectRow[]> {
  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name, short_code, color, attendance_target_percent')
    .eq('semester_id', semesterId)
  const subjectList = (subjects ?? []) as Subject[]

  const rows: SemesterSubjectRow[] = []
  for (const s of subjectList) {
    const stats = await getSubjectStats(supabase, s.id, userId)

    // Trend: compare last-2-week avg vs overall avg
    const w0 = await getWeekReport(supabase, userId, semesterId, 0)
    const w1 = await getWeekReport(supabase, userId, semesterId, -1)
    const recent = [w0, w1].map(w => w.subjects.find(x => x.subjectId === s.id))
    const recentAvg = recent.reduce((sum, r) => sum + (r?.weeklyPct ?? 0), 0) / 2
    const trend: 'up' | 'down' | 'flat' =
      recentAvg > stats.attendancePercent + 5 ? 'up' :
      recentAvg < stats.attendancePercent - 5 ? 'down' : 'flat'

    rows.push({
      subjectId: s.id,
      subjectName: s.name,
      color: s.color,
      shortCode: s.short_code,
      totalScheduled: stats.totalScheduled,
      attended: stats.attended,
      missed: stats.missed,
      pct: stats.attendancePercent,
      trend,
    })
  }
  return rows
}

// ─── getSparklineData ─────────────────────────────────────────────────────────
// Returns last 4 weeks' attendance % for a subject

export async function getSparklineData(
  supabase: SupabaseClient,
  subjectId: string,
  userId: string,
): Promise<number[]> {
  const weeks: number[] = []
  for (let offset = -3; offset <= 0; offset++) {
    const { start, end } = getWeekBounds(offset)
    const weekStart = toYMD(start)
    const weekEnd = toYMD(end)

    const { data: slotsRaw } = await supabase
      .from('timetable_slots')
      .select('id, day_of_week')
      .eq('subject_id', subjectId)
    const slots = (slotsRaw ?? []) as { id: string; day_of_week: number }[]

    const datesInRange: string[] = []
    const cur = new Date(start)
    while (cur <= end) {
      const jsDay = cur.getDay()
      const appDay = jsDay === 0 ? 7 : jsDay
      if (slots.some(s => s.day_of_week === appDay)) datesInRange.push(toYMD(cur))
      cur.setDate(cur.getDate() + 1)
    }

    if (datesInRange.length === 0 || slots.length === 0) { weeks.push(0); continue }

    const slotIds = slots.map(s => s.id)
    const { data: recs } = await supabase
      .from('attendance_records')
      .select('status')
      .eq('user_id', userId)
      .in('timetable_slot_id', slotIds)
      .gte('date', weekStart)
      .lte('date', weekEnd)

    const recList = (recs ?? []) as { status: string }[]
    const attended = recList.filter(r => r.status === 'attended').length
    const total = recList.filter(r => r.status !== 'cancelled').length
    weeks.push(total > 0 ? Math.round((attended / total) * 100) : 0)
  }
  return weeks
}

// ─── getExportData ─────────────────────────────────────────────────────────────

export async function getExportData(
  supabase: SupabaseClient,
  userId: string,
  semesterId: string, // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<ExportRow[]> {
  const { data: records } = await supabase
    .from('attendance_records')
    .select(`
      date, status, note,
      timetable_slots:timetable_slot_id (start_time, end_time, subjects:subject_id (name)),
      extra_lectures:extra_lecture_id (start_time, end_time, subjects:subject_id (name))
    `)
    .eq('user_id', userId)
    .order('date', { ascending: true })

  const rows: ExportRow[] = []
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  for (const r of (records ?? []) as Record<string, unknown>[]) {
    const dateObj = new Date((r.date as string) + 'T12:00:00')
    const slot = r.timetable_slots as { start_time: string; end_time: string; subjects: { name: string } } | null
    const extra = r.extra_lectures as { start_time: string; end_time: string; subjects: { name: string } } | null
    const source = slot ?? extra
    if (!source) continue

    rows.push({
      date: r.date as string,
      day: DAY_NAMES[dateObj.getDay()],
      subject: source.subjects?.name ?? '',
      startTime: source.start_time,
      endTime: source.end_time,
      status: r.status as string,
      notes: (r.note as string) ?? '',
    })
  }
  return rows
}
