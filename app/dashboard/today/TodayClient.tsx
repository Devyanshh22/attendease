'use client'

import { useRouter } from 'next/navigation'
import { CalendarIcon, X } from 'lucide-react'
import type { DayScheduleResult, OverallStats, SubjectStats } from '@/lib/attendance'
import LectureRow from './LectureRow'
import { useEffect, useState } from 'react'

interface Props {
  date: string
  semesterName: string
  weekNum: number
  dayResult: DayScheduleResult
  overallStats: OverallStats
  subjectStats: SubjectStats[]
  subjectMeta: Record<string, { name: string; color: string }>
  semesterId: string
  userId: string
}

export default function TodayClient({
  date, semesterName, weekNum, dayResult, overallStats, subjectStats, subjectMeta, semesterId, userId,
}: Props) {
  const router = useRouter()
  const [dismissedKey] = useState(() => `dismissed-banners-${date}`)
  const [dismissed, setDismissed] = useState<string[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(dismissedKey)
      if (stored) setDismissed(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [dismissedKey])

  function dismiss(subjectId: string) {
    const next = [...dismissed, subjectId]
    setDismissed(next)
    try { localStorage.setItem(dismissedKey, JSON.stringify(next)) } catch { /* ignore */ }
  }

  // Date formatting
  const dateObj = new Date(date + 'T12:00:00')
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' })
  const dateLabel = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'long' })

  // Alert banners — subjects not in safe zone
  const banners = subjectStats.filter(s =>
    s.status !== 'safe' &&
    s.totalScheduled > 0 &&
    !dismissed.includes(s.subjectId)
  )

  const isHoliday = dayResult.kind === 'holiday' || dayResult.kind === 'no_college'
  const lectures = dayResult.kind === 'schedule' ? dayResult.lectures : []

  // 5PM reminder: unmarked lectures
  const now = new Date()
  const isPast5PM = now.getHours() >= 17
  const unmarked = lectures.filter(l => !l.attendance.status)
  const showReminder = isPast5PM && unmarked.length > 0

  return (
    <div className="max-w-2xl space-y-5">

      {/* ── Date header ───────────────────────────────── */}
      <div>
        <h1 className="text-[22px] font-[500] text-[#111111]">{dayName}, {dateLabel}</h1>
        <p className="text-[13px] text-[#ABABAB] mt-0.5">Week {weekNum} of {semesterName}</p>
      </div>

      {/* ── Holiday card ──────────────────────────────── */}
      {isHoliday && (
        <div className="bg-white border border-[#EBEBEB] rounded-[10px] p-5 flex items-center gap-4">
          <div className="w-9 h-9 rounded-[8px] bg-[rgba(91,91,214,0.08)] flex items-center justify-center shrink-0">
            <CalendarIcon size={18} className="text-[#5B5BD6]" />
          </div>
          <div>
            <p className="text-[14px] font-[500] text-[#111111]">
              {(dayResult as { label: string }).label}
            </p>
            <p className="text-[12px] text-[#ABABAB]">
              {dayResult.kind === 'holiday' ? 'Holiday' : 'No college'} — no classes today
            </p>
          </div>
        </div>
      )}

      {/* ── 5PM reminder ─────────────────────────────── */}
      {showReminder && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-[8px] border bg-[rgba(217,119,6,0.05)] border-[rgba(217,119,6,0.18)] text-[#D97706] text-[13px]">
          <span className="mt-0.5">⏰</span>
          <p className="flex-1">
            You have <strong>{unmarked.length} unmarked lecture{unmarked.length !== 1 ? 's' : ''}</strong> today — mark them before the day ends.
          </p>
        </div>
      )}

      {/* ── Alert banners ─────────────────────────────── */}
      {!isHoliday && banners.length > 0 && (
        <div className="space-y-2">
          {banners.map(s => {
            const meta = subjectMeta[s.subjectId]
            const isAtRisk = s.status === 'at_risk'
            return (
              <div
                key={s.subjectId}
                className={`flex items-start gap-3 px-4 py-3 rounded-[8px] border text-[13px] ${
                  isAtRisk
                    ? 'bg-[rgba(220,38,38,0.05)] border-[rgba(220,38,38,0.18)] text-[#DC2626]'
                    : 'bg-[rgba(217,119,6,0.05)] border-[rgba(217,119,6,0.18)] text-[#D97706]'
                }`}
              >
                <div
                  className="w-1 self-stretch rounded-full shrink-0"
                  style={{ backgroundColor: meta?.color ?? (isAtRisk ? '#DC2626' : '#D97706') }}
                />
                <p className="flex-1">
                  <strong>{meta?.name ?? 'Subject'}</strong> is at {s.attendancePercent}%
                  {isAtRisk
                    ? ` — attend next ${s.lecturesNeeded} lecture${s.lecturesNeeded !== 1 ? 's' : ''} to recover`
                    : ` — can miss at most ${s.lecturesSafeToMiss} more lecture${s.lecturesSafeToMiss !== 1 ? 's' : ''}`
                  }
                </p>
                <button
                  onClick={() => dismiss(s.subjectId)}
                  className="text-current opacity-50 hover:opacity-100 transition-opacity shrink-0 mt-0.5"
                >
                  <X size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Schedule ──────────────────────────────────── */}
      {!isHoliday && (
        <>
          {lectures.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 border border-[#EBEBEB] border-dashed rounded-[10px] gap-2">
              <div className="w-10 h-10 rounded-full bg-[#FAFAFA] border border-[#EBEBEB] flex items-center justify-center">
                <CalendarIcon size={18} className="text-[#ABABAB]" />
              </div>
              <p className="text-[#ABABAB] text-[14px]">No lectures today</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {lectures.map(lecture => (
                <LectureRow
                  key={`${lecture.type}-${lecture.id}`}
                  lecture={lecture}
                  date={date}
                  userId={userId}
                  semesterId={semesterId}
                  onMarked={() => router.refresh()}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Bottom stats ──────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        {[
          { label: 'Overall', value: `${overallStats.overallPercent}%` },
          { label: 'At risk', value: overallStats.subjectsAtRisk, danger: overallStats.subjectsAtRisk > 0 },
          { label: 'Scheduled this week', value: overallStats.totalScheduled },
          { label: 'Attended this week', value: overallStats.totalAttended },
        ].map(({ label, value, danger }) => (
          <div key={label} className="bg-white border border-[#EBEBEB] rounded-[10px] px-4 py-3">
            <p className="text-[11px] text-[#ABABAB]">{label}</p>
            <p className={`text-[20px] font-[600] mt-0.5 ${danger ? 'text-[#DC2626]' : 'text-[#111111]'}`}>
              {value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
