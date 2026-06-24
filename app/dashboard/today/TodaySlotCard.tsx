'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { AttendanceStatus } from '@/lib/types'
import { fmtTime } from '@/lib/utils'

interface Props {
  slotId: string
  subjectName: string
  shortCode: string
  color: string
  startTime: string
  endTime: string
  room: string | null
  faculty: string | null
  status: AttendanceStatus | null
  date: string
}

const BUTTONS: { status: AttendanceStatus; label: string; active: string; idle: string }[] = [
  { status: 'attended',  label: 'Present',   active: 'bg-[#1A9E5F] text-white border-transparent', idle: 'bg-white border-[#EBEBEB] text-[#6B6B6B] hover:border-[#1A9E5F] hover:text-[#1A9E5F]' },
  { status: 'missed',    label: 'Absent',    active: 'bg-[#DC2626] text-white border-transparent', idle: 'bg-white border-[#EBEBEB] text-[#6B6B6B] hover:border-[#DC2626] hover:text-[#DC2626]' },
  { status: 'cancelled', label: 'Cancelled', active: 'bg-[#6B6B6B] text-white border-transparent', idle: 'bg-white border-[#EBEBEB] text-[#6B6B6B] hover:border-[#6B6B6B]' },
]

export default function TodaySlotCard({
  slotId, subjectName, shortCode, color,
  startTime, endTime, room, faculty,
  status: initialStatus, date,
}: Props) {
  const router = useRouter()
  const [status, setStatus] = useState<AttendanceStatus | null>(initialStatus)
  const [loading, setLoading] = useState(false)

  async function mark(newStatus: AttendanceStatus) {
    if (loading) return
    setLoading(true)
    const supabase = createClient()

    if (status === newStatus) {
      await supabase.from('attendance_records').delete().eq('timetable_slot_id', slotId).eq('date', date)
      setStatus(null)
    } else {
      const { data: existing } = await supabase
        .from('attendance_records').select('id').eq('timetable_slot_id', slotId).eq('date', date).maybeSingle()
      if (existing) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await supabase.from('attendance_records').update({ status: newStatus, updated_at: new Date().toISOString() } as any).eq('id', (existing as any).id)
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await supabase.from('attendance_records').insert({ timetable_slot_id: slotId, date, status: newStatus } as any)
      }
      setStatus(newStatus)
    }

    setLoading(false)
    router.refresh()
  }

  return (
    <div className="bg-white border border-[#EBEBEB] rounded-[10px] flex overflow-hidden">
      {/* Color stripe */}
      <div className="w-1 shrink-0" style={{ backgroundColor: color }} />

      <div className="flex-1 px-4 py-3.5 flex items-center gap-4 min-w-0">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[11px] font-[600] px-1.5 py-0.5 rounded-[4px] text-white" style={{ backgroundColor: color }}>
              {shortCode}
            </span>
            <span className="text-[14px] font-[500] text-[#111111] truncate">{subjectName}</span>
          </div>
          <p className="text-[12px] text-[#ABABAB]">
            {fmtTime(startTime)} – {fmtTime(endTime)}
            {room && <span className="ml-2">· {room}</span>}
            {faculty && <span className="ml-2">· {faculty}</span>}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 shrink-0">
          {BUTTONS.map(btn => (
            <button
              key={btn.status}
              onClick={() => mark(btn.status)}
              disabled={loading}
              className={`text-[12px] font-[500] px-3 py-1.5 rounded-[6px] border transition-colors duration-150 disabled:opacity-50 ${status === btn.status ? btn.active : btn.idle}`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
