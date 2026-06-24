'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { DayCalendarCell } from '@/lib/attendance'
import type { Subject } from '@/lib/types'
import { cn } from '@/lib/utils'
import DaySlideOver from './DaySlideOver'

interface Props {
  year: number
  month: number          // 0-indexed
  today: string          // YYYY-MM-DD
  calendarData: Record<string, DayCalendarCell>
  subjects: Pick<Subject, 'id' | 'name' | 'short_code' | 'color'>[]
  semesterId: string
  userId: string
  todoCounts: Record<string, number>
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const WEEKDAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

// Status indicator colors
const STATUS_DOT: Record<string, string> = {
  attended:   'bg-[#1A9E5F]',
  partial:    'bg-[#D97706]',
  missed:     'bg-[#DC2626]',
  holiday:    'bg-[#ABABAB]',
  no_college: 'bg-[#ABABAB]',
  future:     '',
  none:       '',
}

export default function CalendarClient({ year, month, today, calendarData, subjects, semesterId, userId, todoCounts }: Props) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  function navigate(delta: number) {
    let m = month + delta
    let y = year
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    router.push(`/dashboard/calendar?year=${y}&month=${m}`)
  }

  // Build calendar grid (Mon-start)
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  // getDay(): 0=Sun..6=Sat → convert to Mon-start: Mon=0..Sun=6
  const startOffset = (firstDay.getDay() + 6) % 7

  const cells: (string | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(year, month, i + 1)
      return d.toISOString().split('T')[0]
    }),
  ]
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="max-w-3xl space-y-5">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-[6px] border border-[#EBEBEB] text-[#6B6B6B] hover:text-[#111111] hover:bg-[#FAFAFA] transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <h2 className="text-[15px] font-[500] text-[#111111]">
          {MONTH_NAMES[month]} {year}
        </h2>
        <button
          onClick={() => navigate(1)}
          className="w-8 h-8 flex items-center justify-center rounded-[6px] border border-[#EBEBEB] text-[#6B6B6B] hover:text-[#111111] hover:bg-[#FAFAFA] transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Grid */}
      <div className="bg-white border border-[#EBEBEB] rounded-[10px] overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-[#EBEBEB]">
          {WEEKDAYS.map(d => (
            <div key={d} className="py-2.5 text-center text-[11px] text-[#ABABAB] font-[500]">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {cells.map((dateStr, idx) => {
            if (!dateStr) {
              return (
                <div
                  key={`empty-${idx}`}
                  className={cn(
                    'min-h-[76px] border-b border-r border-[#EBEBEB] bg-[#FAFAFA]',
                    idx % 7 === 6 && 'border-r-0',
                    idx >= cells.length - 7 && 'border-b-0'
                  )}
                />
              )
            }

            const cell = calendarData[dateStr]
            const isToday = dateStr === today
            const isFuture = dateStr > today
            const dayNum = new Date(dateStr + 'T12:00:00').getDate()
            const statusDot = cell?.status ? STATUS_DOT[cell.status] : ''
            const isLastRow = idx >= cells.length - 7
            const hasTodos = (todoCounts[dateStr] ?? 0) > 0

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={cn(
                  'min-h-[76px] border-b border-r border-[#EBEBEB] p-2 flex flex-col text-left transition-colors duration-100',
                  idx % 7 === 6 && 'border-r-0',
                  isLastRow && 'border-b-0',
                  isFuture ? 'opacity-50' : '',
                  isToday ? 'ring-2 ring-inset ring-[#5B5BD6]' : 'hover:bg-[rgba(91,91,214,0.03)]'
                )}
              >
                {/* Day number */}
                <span className={cn(
                  'text-[13px] font-[500] w-6 h-6 flex items-center justify-center rounded-full',
                  isToday ? 'bg-[#5B5BD6] text-white' : 'text-[#111111]'
                )}>
                  {dayNum}
                </span>

                {/* Subject color dots */}
                {cell && cell.subjectColors.length > 0 && (
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {cell.subjectColors.slice(0, 3).map((color, i) => (
                      <span
                        key={i}
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    {cell.lectureCount > 3 && (
                      <span className="text-[10px] text-[#ABABAB]">+{cell.lectureCount - 3}</span>
                    )}
                  </div>
                )}

                {/* Status + todo indicators */}
                <div className="mt-auto pt-1 flex items-center justify-between">
                  {statusDot
                    ? <span className={cn('w-1.5 h-1.5 rounded-full inline-block', statusDot)} />
                    : <span />
                  }
                  {hasTodos && (
                    <span className="w-1.5 h-1.5 rounded-[2px] inline-block bg-[#D97706]" title="Has tasks" />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {[
          { dot: 'bg-[#1A9E5F]', label: 'All attended' },
          { dot: 'bg-[#D97706]', label: 'Partial' },
          { dot: 'bg-[#DC2626]', label: 'Missed all' },
          { dot: 'bg-[#ABABAB]', label: 'Holiday / no college' },
          { dot: 'bg-[#D97706] rounded-[2px]', label: 'Has tasks' },
        ].map(({ dot, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-[12px] text-[#6B6B6B]">
            <span className={cn('w-2 h-2 rounded-full', dot)} />
            {label}
          </div>
        ))}
      </div>

      {/* Subject legend */}
      {subjects.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {subjects.map(s => (
            <div key={s.id} className="flex items-center gap-1.5 text-[12px] text-[#6B6B6B]">
              <span className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: s.color }} />
              {s.name}
            </div>
          ))}
        </div>
      )}

      {/* Day detail slide-over */}
      {selectedDate && (
        <DaySlideOver
          date={selectedDate}
          userId={userId}
          semesterId={semesterId}
          onClose={() => setSelectedDate(null)}
          onChanged={() => router.refresh()}
        />
      )}
    </div>
  )
}
