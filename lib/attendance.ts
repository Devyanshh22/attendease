import type { SupabaseClient } from '@supabase/supabase-js'
import type { AttendanceStatus, Subject, TimetableSlot, ExtraLecture, SpecialDay } from './types'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AttendanceStatStatus = 'safe' | 'borderline' | 'at_risk'

export interface SubjectStats {
  subjectId: string
  totalScheduled: number   // non-cancelled lectures
  attended: number
  missed: number
  cancelled: number
  attendancePercent: number
  target: number
  lecturesNeeded: number        // to reach target
  lecturesSafeToMiss: number    // while staying above target
  status: AttendanceStatStatus
}

export type LectureType = 'slot' | 'extra'

export interface DayLecture {
  id: string                    // timetable_slot_id or extra_lecture_id
  type: LectureType
  subjectId: string
  subjectName: string
  shortCode: string
  color: string
  startTime: string
  endTime: string
  room: string | null
  faculty: string | null
  reason: string | null         // only on extra lectures
  attendance: {
    recordId: string | null
    status: AttendanceStatus | null
    note: string | null
  }
}

export type DayScheduleResult =
  | { kind: 'holiday'; label: string; specialDayId: string }
  | { kind: 'no_college'; label: string; specialDayId: string }
  | { kind: 'schedule'; lectures: DayLecture[]; specialDay: SpecialDay | null }

export interface DayCalendarCell {
  date: string                  // YYYY-MM-DD
  status: 'attended' | 'partial' | 'missed' | 'holiday' | 'no_college' | 'none' | 'future'
  lectureCount: number
  subjectColors: string[]
}

export interface OverallStats {
  overallPercent: number
  subjectsAtRisk: number
  totalScheduled: number
  totalAttended: number
  totalMissed: number
}

// ─── getSubjectStats ──────────────────────────────────────────────────────────

export async function getSubjectStats(
  supabase: SupabaseClient,
  subjectId: string,
  userId: string,
): Promise<SubjectStats> {
  // Get subject details
  const { data: subject } = await supabase
    .from('subjects')
    .select('attendance_target_percent')
    .eq('id', subjectId)
    .single()

  const target = (subject as Subject | null)?.attendance_target_percent ?? 80

  // Get all slots for this subject
  const { data: slotsRaw } = await supabase
    .from('timetable_slots')
    .select('id')
    .eq('subject_id', subjectId)

  const slotIds = (slotsRaw ?? []).map((s: { id: string }) => s.id)

  // Get all extra lectures for this subject
  const { data: extrasRaw } = await supabase
    .from('extra_lectures')
    .select('id')
    .eq('subject_id', subjectId)
    .eq('user_id', userId)

  const extraIds = (extrasRaw ?? []).map((e: { id: string }) => e.id)

  let attended = 0, missed = 0, cancelled = 0

  if (slotIds.length > 0) {
    const { data: slotRecords } = await supabase
      .from('attendance_records')
      .select('status')
      .in('timetable_slot_id', slotIds)
      .eq('user_id', userId)

    for (const r of slotRecords ?? []) {
      if (r.status === 'attended') attended++
      else if (r.status === 'missed') missed++
      else if (r.status === 'cancelled') cancelled++
    }
  }

  if (extraIds.length > 0) {
    const { data: extraRecords } = await supabase
      .from('attendance_records')
      .select('status')
      .in('extra_lecture_id', extraIds)
      .eq('user_id', userId)

    for (const r of extraRecords ?? []) {
      if (r.status === 'attended') attended++
      else if (r.status === 'missed') missed++
      else if (r.status === 'cancelled') cancelled++
    }
  }

  const totalScheduled = attended + missed
  const t = target / 100
  const attendancePercent = totalScheduled > 0 ? Math.round((attended / totalScheduled) * 100) : 0

  const lecturesNeeded = Math.max(
    0,
    Math.ceil((t * totalScheduled - attended) / (1 - t)),
  )
  const lecturesSafeToMiss = totalScheduled > 0
    ? Math.max(0, Math.floor((attended - t * totalScheduled) / t))
    : 0

  const status: AttendanceStatStatus =
    attendancePercent >= target ? 'safe'
    : attendancePercent >= 65 ? 'borderline'
    : 'at_risk'

  return {
    subjectId,
    totalScheduled,
    attended,
    missed,
    cancelled,
    attendancePercent,
    target,
    lecturesNeeded,
    lecturesSafeToMiss,
    status,
  }
}

// ─── getDaySchedule ───────────────────────────────────────────────────────────

export async function getDaySchedule(
  supabase: SupabaseClient,
  date: string,           // YYYY-MM-DD
  userId: string,
  semesterId: string,
): Promise<DayScheduleResult> {
  // Check for special day
  const { data: specialDay } = await supabase
    .from('special_days')
    .select('*')
    .eq('date', date)
    .eq('semester_id', semesterId)
    .maybeSingle()

  const sd = specialDay as SpecialDay | null

  if (sd && (sd.type === 'holiday' || sd.type === 'no_college')) {
    return { kind: sd.type, label: sd.label, specialDayId: sd.id }
  }

  // JS day: 0=Sun..6=Sat → our 1=Mon..6=Sat
  const jsDay = new Date(date + 'T12:00:00').getDay()
  const dayOfWeek = jsDay === 0 ? 7 : jsDay

  // Regular slots
  const { data: slotsRaw } = await supabase
    .from('timetable_slots')
    .select('*, subjects(id, name, short_code, color)')
    .eq('semester_id', semesterId)
    .eq('day_of_week', dayOfWeek <= 6 ? dayOfWeek : 0)
    .order('start_time')

  // Extra lectures for this date
  const { data: extrasRaw } = await supabase
    .from('extra_lectures')
    .select('*, subjects(id, name, short_code, color)')
    .eq('date', date)
    .eq('semester_id', semesterId)
    .order('start_time')

  const slots = (slotsRaw ?? []) as (TimetableSlot & { subjects: Subject | null })[]
  const extras = (extrasRaw ?? []) as (ExtraLecture & { subjects: Subject | null })[]

  // Fetch attendance records for this date
  const slotIds = slots.map(s => s.id)
  const extraIds = extras.map(e => e.id)

  const slotRecordMap = new Map<string, { id: string; status: AttendanceStatus; note: string | null }>()
  const extraRecordMap = new Map<string, { id: string; status: AttendanceStatus; note: string | null }>()

  if (slotIds.length) {
    const { data } = await supabase
      .from('attendance_records')
      .select('id, timetable_slot_id, status, note')
      .eq('date', date)
      .eq('user_id', userId)
      .in('timetable_slot_id', slotIds)
    for (const r of data ?? []) {
      slotRecordMap.set(r.timetable_slot_id, { id: r.id, status: r.status, note: r.note })
    }
  }

  if (extraIds.length) {
    const { data } = await supabase
      .from('attendance_records')
      .select('id, extra_lecture_id, status, note')
      .eq('user_id', userId)
      .in('extra_lecture_id', extraIds)
    for (const r of data ?? []) {
      extraRecordMap.set(r.extra_lecture_id, { id: r.id, status: r.status, note: r.note })
    }
  }

  const lectures: DayLecture[] = []

  for (const s of slots) {
    const rec = slotRecordMap.get(s.id)
    lectures.push({
      id: s.id,
      type: 'slot',
      subjectId: s.subjects?.id ?? s.subject_id,
      subjectName: s.subjects?.name ?? 'Unknown',
      shortCode: s.subjects?.short_code ?? '',
      color: s.subjects?.color ?? '#5B5BD6',
      startTime: s.start_time,
      endTime: s.end_time,
      room: s.room,
      faculty: s.faculty,
      reason: null,
      attendance: { recordId: rec?.id ?? null, status: rec?.status ?? null, note: rec?.note ?? null },
    })
  }

  for (const e of extras) {
    const rec = extraRecordMap.get(e.id)
    lectures.push({
      id: e.id,
      type: 'extra',
      subjectId: e.subjects?.id ?? e.subject_id,
      subjectName: e.subjects?.name ?? 'Unknown',
      shortCode: e.subjects?.short_code ?? '',
      color: e.subjects?.color ?? '#5B5BD6',
      startTime: e.start_time,
      endTime: e.end_time,
      room: null,
      faculty: null,
      reason: e.reason,
      attendance: { recordId: rec?.id ?? null, status: rec?.status ?? null, note: rec?.note ?? null },
    })
  }

  // Sort combined list by start time
  lectures.sort((a, b) => a.startTime.localeCompare(b.startTime))

  return { kind: 'schedule', lectures, specialDay: sd }
}

// ─── getMonthCalendarData ─────────────────────────────────────────────────────

export async function getMonthCalendarData(
  supabase: SupabaseClient,
  year: number,
  month: number,          // 0-indexed (JS Date)
  userId: string,
  semesterId: string,
): Promise<Record<string, DayCalendarCell>> {
  const today = new Date().toISOString().split('T')[0]

  // Date range for this month
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startStr = firstDay.toISOString().split('T')[0]
  const endStr = lastDay.toISOString().split('T')[0]

  // All special days in month
  const { data: specialDaysRaw } = await supabase
    .from('special_days')
    .select('date, type, label')
    .eq('semester_id', semesterId)
    .gte('date', startStr)
    .lte('date', endStr)
  const specialDayMap = new Map<string, { type: string; label: string }>()
  for (const sd of specialDaysRaw ?? []) specialDayMap.set(sd.date, sd)

  // All timetable slots (to know which days have classes)
  const { data: allSlots } = await supabase
    .from('timetable_slots')
    .select('id, day_of_week, subject_id, subjects(color)')
    .eq('semester_id', semesterId)
  const slots = (allSlots ?? []) as unknown as (TimetableSlot & { subjects: { color: string } | null })[]

  // All extra lectures in month
  const { data: extrasRaw } = await supabase
    .from('extra_lectures')
    .select('id, date, subject_id, subjects(color)')
    .eq('semester_id', semesterId)
    .gte('date', startStr)
    .lte('date', endStr)
  const extrasMap = new Map<string, { id: string; subjectId: string; color: string }[]>()
  for (const e of extrasRaw ?? []) {
    const color = (e as unknown as ExtraLecture & { subjects: { color: string } | null }).subjects?.color ?? '#5B5BD6'
    const arr = extrasMap.get(e.date) ?? []
    arr.push({ id: e.id, subjectId: e.subject_id, color })
    extrasMap.set(e.date, arr)
  }

  // All attendance records in month
  const { data: recordsRaw } = await supabase
    .from('attendance_records')
    .select('date, status, timetable_slot_id, extra_lecture_id')
    .eq('user_id', userId)
    .gte('date', startStr)
    .lte('date', endStr)
  // Group by date
  const recordsByDate = new Map<string, { status: string; slotId: string | null; extraId: string | null }[]>()
  for (const r of recordsRaw ?? []) {
    const arr = recordsByDate.get(r.date) ?? []
    arr.push({ status: r.status, slotId: r.timetable_slot_id, extraId: r.extra_lecture_id })
    recordsByDate.set(r.date, arr)
  }

  // Build cell for each day
  const result: Record<string, DayCalendarCell> = {}

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateObj = new Date(year, month, d)
    const dateStr = dateObj.toISOString().split('T')[0]
    const jsDay = dateObj.getDay()
    const dayOfWeek = jsDay === 0 ? 7 : jsDay
    const isFuture = dateStr > today

    // Special day?
    const sd = specialDayMap.get(dateStr)
    if (sd && (sd.type === 'holiday' || sd.type === 'no_college')) {
      result[dateStr] = { date: dateStr, status: sd.type as 'holiday' | 'no_college', lectureCount: 0, subjectColors: [] }
      continue
    }

    // Collect today's slot colors (regular)
    const daySlots = dayOfWeek <= 6
      ? slots.filter(s => s.day_of_week === dayOfWeek)
      : []
    const slotColors = daySlots.map(s => s.subjects?.color ?? '#5B5BD6')

    // Extra lecture colors
    const dayExtras = extrasMap.get(dateStr) ?? []
    const extraColors = dayExtras.map(e => e.color)

    const allColors = [...slotColors, ...extraColors]
    const lectureCount = allColors.length

    if (!lectureCount) {
      result[dateStr] = { date: dateStr, status: 'none', lectureCount: 0, subjectColors: [] }
      continue
    }

    if (isFuture) {
      result[dateStr] = { date: dateStr, status: 'future', lectureCount, subjectColors: allColors.slice(0, 3) }
      continue
    }

    // Calculate attendance status
    const records = recordsByDate.get(dateStr) ?? []
    const slotIdSet = new Set(daySlots.map(s => s.id))
    const extraIdSet = new Set(dayExtras.map(e => e.id))

    const relevant = records.filter(r =>
      (r.slotId && slotIdSet.has(r.slotId)) ||
      (r.extraId && extraIdSet.has(r.extraId))
    )
    const attended = relevant.filter(r => r.status === 'attended').length
    const missed = relevant.filter(r => r.status === 'missed').length

    let status: DayCalendarCell['status'] = 'none'
    if (attended > 0 && missed === 0) status = 'attended'
    else if (attended > 0 && missed > 0) status = 'partial'
    else if (missed > 0 && attended === 0) status = 'missed'

    result[dateStr] = { date: dateStr, status, lectureCount, subjectColors: allColors.slice(0, 3) }
  }

  return result
}

// ─── markAttendance ───────────────────────────────────────────────────────────

export async function markAttendance(
  supabase: SupabaseClient,
  params: {
    userId: string
    date: string
    slotId?: string
    extraLectureId?: string
    status: AttendanceStatus
    note?: string
  }
): Promise<void> {
  const { userId, date, slotId, extraLectureId, status, note } = params

  if (!slotId && !extraLectureId) throw new Error('Provide slotId or extraLectureId')
  if (slotId && extraLectureId) throw new Error('Provide only one of slotId or extraLectureId')

  const filter = slotId
    ? { timetable_slot_id: slotId }
    : { extra_lecture_id: extraLectureId! }

  const { data: existing } = await supabase
    .from('attendance_records')
    .select('id')
    .eq('date', date)
    .eq('user_id', userId)
    .match(filter)
    .maybeSingle()

  const payload = {
    ...filter,
    user_id: userId,
    date,
    status,
    note: note ?? null,
    updated_at: new Date().toISOString(),
  }

  if (existing) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from('attendance_records').update(payload as any).eq('id', (existing as any).id)
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from('attendance_records').insert(payload as any)
  }
}

// ─── deleteAttendance ─────────────────────────────────────────────────────────

export async function deleteAttendance(
  supabase: SupabaseClient,
  params: { userId: string; date: string; slotId?: string; extraLectureId?: string }
): Promise<void> {
  const { userId, date, slotId, extraLectureId } = params
  const filter = slotId ? { timetable_slot_id: slotId } : { extra_lecture_id: extraLectureId! }
  await supabase.from('attendance_records').delete().eq('date', date).eq('user_id', userId).match(filter)
}

// ─── getOverallStats ──────────────────────────────────────────────────────────

export async function getOverallStats(
  supabase: SupabaseClient,
  semesterId: string,
  userId: string,
): Promise<OverallStats> {
  // All subjects in semester
  const { data: subjectsRaw } = await supabase
    .from('subjects')
    .select('id, attendance_target_percent')
    .eq('semester_id', semesterId)
  const subjects = (subjectsRaw ?? []) as Pick<Subject, 'id' | 'attendance_target_percent'>[]

  // All slots
  const { data: slotsRaw } = await supabase
    .from('timetable_slots')
    .select('id, subject_id')
    .eq('semester_id', semesterId)
  const slotIds = (slotsRaw ?? []).map((s: { id: string }) => s.id)
  const slotSubjectMap = new Map((slotsRaw ?? []).map((s: { id: string; subject_id: string }) => [s.id, s.subject_id]))

  // All attendance records
  const { data: recordsRaw } = await supabase
    .from('attendance_records')
    .select('status, timetable_slot_id, extra_lecture_id')
    .eq('user_id', userId)
    .in('timetable_slot_id', slotIds.length ? slotIds : ['__none__'])

  const records = recordsRaw ?? []

  const attendedBySubject = new Map<string, number>()
  const totalBySubject = new Map<string, number>()

  for (const s of subjects) { attendedBySubject.set(s.id, 0); totalBySubject.set(s.id, 0) }

  for (const r of records) {
    const sid = r.timetable_slot_id ? slotSubjectMap.get(r.timetable_slot_id) : null
    if (!sid) continue
    if (r.status !== 'cancelled') totalBySubject.set(sid, (totalBySubject.get(sid) ?? 0) + 1)
    if (r.status === 'attended') attendedBySubject.set(sid, (attendedBySubject.get(sid) ?? 0) + 1)
  }

  const totalAttended = Array.from(attendedBySubject.values()).reduce((a, b) => a + b, 0)
  const totalScheduled = Array.from(totalBySubject.values()).reduce((a, b) => a + b, 0)
  const totalMissed = totalScheduled - totalAttended
  const overallPercent = totalScheduled ? Math.round((totalAttended / totalScheduled) * 100) : 0

  const subjectsAtRisk = subjects.filter(s => {
    const att = attendedBySubject.get(s.id) ?? 0
    const tot = totalBySubject.get(s.id) ?? 0
    if (!tot) return false
    return Math.round((att / tot) * 100) < s.attendance_target_percent
  }).length

  return { overallPercent, subjectsAtRisk, totalScheduled, totalAttended, totalMissed }
}
