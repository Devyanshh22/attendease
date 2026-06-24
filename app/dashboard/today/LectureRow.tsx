'use client'

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { markAttendance, deleteAttendance } from '@/lib/attendance'
import type { DayLecture } from '@/lib/attendance'
import type { AttendanceStatus } from '@/lib/types'
import { fmtTime } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface Props {
  lecture: DayLecture
  date: string
  userId: string
  semesterId: string
  onMarked: () => void
}

const STATUS_BTNS: { status: AttendanceStatus; label: string; activeClass: string; idleClass: string }[] = [
  {
    status: 'attended',
    label: '✓ Attended',
    activeClass: 'bg-[#1A9E5F] text-white border-transparent',
    idleClass: 'bg-white border-[#EBEBEB] text-[#6B6B6B] hover:border-[#1A9E5F] hover:text-[#1A9E5F]',
  },
  {
    status: 'missed',
    label: '✗ Missed',
    activeClass: 'bg-[#DC2626] text-white border-transparent',
    idleClass: 'bg-white border-[#EBEBEB] text-[#6B6B6B] hover:border-[#DC2626] hover:text-[#DC2626]',
  },
]

export default function LectureRow({ lecture, date, userId, semesterId, onMarked }: Props) {
  const [status, setStatus] = useState<AttendanceStatus | null>(lecture.attendance.status)
  const [loading, setLoading] = useState(false)
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [newStartTime, setNewStartTime] = useState(lecture.startTime.slice(0, 5))
  const [newEndTime, setNewEndTime] = useState(lecture.endTime.slice(0, 5))
  const [rescheduling, setRescheduling] = useState(false)

  async function mark(newStatus: AttendanceStatus) {
    if (loading) return
    setLoading(true)
    const supabase = createClient()

    if (status === newStatus) {
      await deleteAttendance(supabase, {
        userId,
        date,
        ...(lecture.type === 'slot' ? { slotId: lecture.id } : { extraLectureId: lecture.id }),
      })
      setStatus(null)
    } else {
      await markAttendance(supabase, {
        userId,
        date,
        status: newStatus,
        ...(lecture.type === 'slot' ? { slotId: lecture.id } : { extraLectureId: lecture.id }),
      })
      setStatus(newStatus)
    }

    setLoading(false)
    onMarked()
  }

  async function reschedule() {
    if (!newDate || lecture.type !== 'slot') return
    setRescheduling(true)
    const supabase = createClient()

    // Create extra lecture on new date
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from('extra_lectures').insert({
      user_id: userId,
      semester_id: semesterId,
      subject_id: lecture.subjectId,
      date: newDate,
      start_time: newStartTime || lecture.startTime.slice(0, 5),
      end_time: newEndTime || lecture.endTime.slice(0, 5),
      reason: `Rescheduled from ${date}`,
      original_timetable_slot_id: lecture.id,
    } as any) // eslint-disable-line @typescript-eslint/no-explicit-any

    // Mark original as cancelled
    await markAttendance(supabase, {
      userId,
      date,
      slotId: lecture.id,
      status: 'cancelled',
    })

    setStatus('cancelled')
    setRescheduling(false)
    setRescheduleOpen(false)
    onMarked()
  }

  const isCancelled = status === 'cancelled'

  return (
    <>
      <div className={`bg-white border border-[#EBEBEB] rounded-[10px] flex overflow-hidden transition-opacity duration-150 ${isCancelled ? 'opacity-50' : ''}`}>
        {/* Color stripe */}
        <div className="w-1 shrink-0" style={{ backgroundColor: lecture.color }} />

        <div className="flex-1 px-4 py-3.5 min-w-0">
          <div className="flex items-start gap-4">
            {/* Subject info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className="text-[11px] font-[600] px-1.5 py-0.5 rounded-[4px] text-white shrink-0"
                  style={{ backgroundColor: lecture.color }}
                >
                  {lecture.shortCode}
                </span>
                <span className="text-[14px] font-[500] text-[#111111] truncate">{lecture.subjectName}</span>
                {lecture.type === 'extra' && (
                  <span className="text-[10px] text-[#5B5BD6] bg-[rgba(91,91,214,0.08)] px-1.5 py-0.5 rounded-[4px] shrink-0">extra</span>
                )}
              </div>
              <p className="text-[12px] text-[#ABABAB]">
                {fmtTime(lecture.startTime)} – {fmtTime(lecture.endTime)}
                {lecture.room && <span className="ml-2">· {lecture.room}</span>}
                {lecture.faculty && <span className="ml-2">· {lecture.faculty}</span>}
                {lecture.reason && <span className="ml-2">· {lecture.reason}</span>}
              </p>
            </div>

            {/* Actions */}
            {!isCancelled && (
              <div className="flex items-center gap-2 shrink-0">
                {STATUS_BTNS.map(btn => (
                  <button
                    key={btn.status}
                    onClick={() => mark(btn.status)}
                    disabled={loading}
                    className={`text-[12px] font-[500] px-3 py-1.5 rounded-[6px] border transition-colors duration-150 disabled:opacity-50 whitespace-nowrap ${
                      status === btn.status ? btn.activeClass : btn.idleClass
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}

                {/* Reschedule — only for regular slots */}
                {lecture.type === 'slot' && (
                  <button
                    onClick={() => setRescheduleOpen(true)}
                    disabled={loading}
                    title="Reschedule"
                    className="p-1.5 text-[#ABABAB] hover:text-[#5B5BD6] rounded-[6px] hover:bg-[rgba(91,91,214,0.08)] transition-colors duration-150 disabled:opacity-50"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
              </div>
            )}

            {/* Cancelled state */}
            {isCancelled && (
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[12px] text-[#ABABAB]">Cancelled</span>
                <button
                  onClick={() => mark('cancelled')} // toggle off
                  className="text-[11px] text-[#5B5BD6] hover:underline"
                >
                  Undo
                </button>
              </div>
            )}
          </div>

          {/* Already marked — show edit hint */}
          {status && status !== 'cancelled' && (
            <div className="mt-1.5 flex items-center gap-1">
              <span className={`text-[11px] ${status === 'attended' ? 'text-[#1A9E5F]' : 'text-[#DC2626]'}`}>
                Marked as {status}
              </span>
              <span className="text-[11px] text-[#ABABAB]">· click again to unmark</span>
            </div>
          )}
        </div>
      </div>

      {/* Reschedule modal */}
      <Modal
        open={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        title={`Reschedule ${lecture.subjectName}`}
      >
        <div className="space-y-4">
          <p className="text-[13px] text-[#6B6B6B]">
            Moving this lecture to a new date. The original will be marked as cancelled and a new extra lecture will be created.
          </p>
          <Input
            label="New date"
            type="date"
            value={newDate}
            onChange={e => setNewDate(e.target.value)}
            min={date}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start time"
              type="time"
              value={newStartTime}
              onChange={e => setNewStartTime(e.target.value)}
            />
            <Input
              label="End time"
              type="time"
              value={newEndTime}
              onChange={e => setNewEndTime(e.target.value)}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={() => setRescheduleOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={reschedule} disabled={!newDate || rescheduling} className="flex-1">
              {rescheduling ? 'Rescheduling…' : 'Confirm reschedule'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
