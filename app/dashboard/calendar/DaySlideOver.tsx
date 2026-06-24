'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Plus, CalendarIcon, Trash2, CheckSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { getDaySchedule, markAttendance, deleteAttendance } from '@/lib/attendance'
import type { DayScheduleResult, DayLecture } from '@/lib/attendance'
import { getDayTodos, addTodo, toggleTodo, deleteTodo } from '@/lib/todos'
import type { Todo } from '@/lib/todos'
import type { Subject, AttendanceStatus } from '@/lib/types'
import { fmtTime } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'

interface Props {
  date: string
  userId: string
  semesterId: string
  onClose: () => void
  onChanged: () => void
}

const STATUS_BTNS: { status: AttendanceStatus; label: string; activeClass: string; idleClass: string }[] = [
  {
    status: 'attended',
    label: '✓',
    activeClass: 'bg-[#1A9E5F] text-white border-transparent',
    idleClass: 'bg-white border-[#EBEBEB] text-[#6B6B6B] hover:border-[#1A9E5F] hover:text-[#1A9E5F]',
  },
  {
    status: 'missed',
    label: '✗',
    activeClass: 'bg-[#DC2626] text-white border-transparent',
    idleClass: 'bg-white border-[#EBEBEB] text-[#6B6B6B] hover:border-[#DC2626] hover:text-[#DC2626]',
  },
]

export default function DaySlideOver({ date, userId, semesterId, onClose, onChanged }: Props) {
  const [result, setResult] = useState<DayScheduleResult | null>(null)
  const [localStatuses, setLocalStatuses] = useState<Record<string, AttendanceStatus | null>>({})
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState<string | null>(null)

  // Tasks
  const [todos, setTodos] = useState<Todo[]>([])
  const [todoText, setTodoText] = useState('')
  const [todoAdding, setTodoAdding] = useState(false)
  const todoInputRef = useRef<HTMLInputElement>(null)

  // Extra lecture modal
  const [elOpen, setElOpen] = useState(false)
  const [subjects, setSubjects] = useState<Pick<Subject, 'id' | 'name'>[]>([])
  const [elSubject, setElSubject] = useState('')
  const [elStart, setElStart] = useState('09:00')
  const [elEnd, setElEnd] = useState('10:00')
  const [elReason, setElReason] = useState('')
  const [elSaving, setElSaving] = useState(false)

  const supabase = createClient()

  async function load() {
    setLoading(true)
    const [r, todosData] = await Promise.all([
      getDaySchedule(supabase, date, userId, semesterId),
      getDayTodos(supabase, userId, date),
    ])
    setResult(r)
    setTodos(todosData)
    if (r.kind === 'schedule') {
      const initial: Record<string, AttendanceStatus | null> = {}
      for (const l of r.lectures) initial[l.id] = l.attendance.status
      setLocalStatuses(initial)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    // Load subjects for extra lecture form
    supabase.from('subjects').select('id, name').eq('semester_id', semesterId).then(({ data }) => {
      if (data) {
        setSubjects(data as Pick<Subject, 'id' | 'name'>[])
        if (data.length) setElSubject(data[0].id)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  async function handleAddTodo() {
    const text = todoText.trim()
    if (!text) return
    setTodoAdding(true)
    const created = await addTodo(supabase, userId, date, text)
    if (created) setTodos(prev => [...prev, created])
    setTodoText('')
    setTodoAdding(false)
    onChanged()  // refreshes calendar dot
    todoInputRef.current?.focus()
  }

  async function handleToggle(todo: Todo) {
    await toggleTodo(supabase, todo.id, !todo.done)
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, done: !t.done } : t))
    onChanged()
  }

  async function handleDeleteTodo(id: string) {
    await deleteTodo(supabase, id)
    setTodos(prev => prev.filter(t => t.id !== id))
    onChanged()
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function mark(lecture: DayLecture, newStatus: AttendanceStatus) {
    const current = localStatuses[lecture.id]
    setMarking(lecture.id)

    if (current === newStatus) {
      await deleteAttendance(supabase, {
        userId, date,
        ...(lecture.type === 'slot' ? { slotId: lecture.id } : { extraLectureId: lecture.id }),
      })
      setLocalStatuses(p => ({ ...p, [lecture.id]: null }))
    } else {
      await markAttendance(supabase, {
        userId, date, status: newStatus,
        ...(lecture.type === 'slot' ? { slotId: lecture.id } : { extraLectureId: lecture.id }),
      })
      setLocalStatuses(p => ({ ...p, [lecture.id]: newStatus }))
    }

    setMarking(null)
    onChanged()
  }

  async function removeHoliday() {
    if (result?.kind !== 'holiday' && result?.kind !== 'no_college') return
    await supabase.from('special_days').delete().eq('id', result.specialDayId)
    onChanged()
    load()
  }

  async function addExtraLecture() {
    if (!elSubject || !elStart || !elEnd) return
    setElSaving(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase client lacks typed schema
    await (supabase.from('extra_lectures') as any).insert({
      user_id: userId,
      semester_id: semesterId,
      subject_id: elSubject,
      date,
      start_time: elStart,
      end_time: elEnd,
      reason: elReason || null,
    })
    setElSaving(false)
    setElOpen(false)
    setElReason('')
    onChanged()
    load()
  }

  const dateObj = new Date(date + 'T12:00:00')
  const dateLabel = dateObj.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const isHoliday = result?.kind === 'holiday' || result?.kind === 'no_college'
  const lectures = result?.kind === 'schedule' ? result.lectures : []

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-[420px] bg-white border-l border-[#EBEBEB] flex flex-col transition-transform duration-200">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-[#EBEBEB]">
          <div>
            <p className="text-[11px] text-[#ABABAB] mb-0.5">Day detail</p>
            <h2 className="text-[14px] font-[500] text-[#111111]">{dateLabel}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#ABABAB] hover:text-[#111111] transition-colors rounded-[6px] p-1 mt-0.5"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading && (
            <div className="space-y-2.5">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-[#FAFAFA] border border-[#EBEBEB] rounded-[8px] animate-pulse" />
              ))}
            </div>
          )}

          {!loading && isHoliday && (
            <div className="bg-white border border-[#EBEBEB] rounded-[10px] p-4 flex items-center gap-3">
              <CalendarIcon size={16} className="text-[#5B5BD6] shrink-0" />
              <div className="flex-1">
                <p className="text-[13px] font-[500] text-[#111111]">{(result as { label: string }).label}</p>
                <p className="text-[12px] text-[#ABABAB]">
                  {result?.kind === 'holiday' ? 'Holiday' : 'No college'}
                </p>
              </div>
              <button
                onClick={removeHoliday}
                className="text-[11px] text-[#DC2626] hover:underline shrink-0"
              >
                Remove
              </button>
            </div>
          )}

          {!loading && !isHoliday && lectures.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 border border-[#EBEBEB] border-dashed rounded-[10px] gap-1.5">
              <CalendarIcon size={18} className="text-[#ABABAB]" />
              <p className="text-[13px] text-[#ABABAB]">No classes scheduled</p>
            </div>
          )}

          {!loading && !isHoliday && lectures.map(lecture => {
            const currentStatus = localStatuses[lecture.id] ?? null
            const isMarking = marking === lecture.id
            const isCancelled = currentStatus === 'cancelled'

            return (
              <div
                key={`${lecture.type}-${lecture.id}`}
                className={`bg-white border border-[#EBEBEB] rounded-[10px] flex overflow-hidden ${isCancelled ? 'opacity-50' : ''}`}
              >
                <div className="w-1 shrink-0" style={{ backgroundColor: lecture.color }} />
                <div className="flex-1 px-3.5 py-3 flex items-center gap-3 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span
                        className="text-[10px] font-[600] px-1 py-0.5 rounded-[3px] text-white shrink-0"
                        style={{ backgroundColor: lecture.color }}
                      >
                        {lecture.shortCode}
                      </span>
                      <span className="text-[13px] font-[500] text-[#111111] truncate">{lecture.subjectName}</span>
                    </div>
                    <p className="text-[11px] text-[#ABABAB]">
                      {fmtTime(lecture.startTime)} – {fmtTime(lecture.endTime)}
                      {lecture.room && ` · ${lecture.room}`}
                    </p>
                  </div>

                  {!isCancelled && (
                    <div className="flex gap-1.5 shrink-0">
                      {STATUS_BTNS.map(btn => (
                        <button
                          key={btn.status}
                          onClick={() => mark(lecture, btn.status)}
                          disabled={isMarking}
                          className={`w-8 h-8 flex items-center justify-center rounded-[6px] border text-[13px] font-[600] transition-colors duration-150 disabled:opacity-50 ${
                            currentStatus === btn.status ? btn.activeClass : btn.idleClass
                          }`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {isCancelled && (
                    <span className="text-[11px] text-[#ABABAB] shrink-0">Cancelled</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Tasks section */}
        {!loading && (
          <div className="border-t border-[#EBEBEB] pt-4 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <CheckSquare size={13} className="text-[#D97706]" />
              <p className="text-[12px] font-[500] text-[#6B6B6B]">Tasks</p>
            </div>

            {todos.map(todo => (
              <div key={todo.id} className="flex items-center gap-2 group">
                <button
                  onClick={() => handleToggle(todo)}
                  className={`w-4 h-4 rounded-[3px] border flex items-center justify-center shrink-0 transition-colors ${
                    todo.done
                      ? 'bg-[#D97706] border-[#D97706] text-white'
                      : 'border-[#EBEBEB] hover:border-[#D97706]'
                  }`}
                >
                  {todo.done && <span className="text-[9px] font-bold">✓</span>}
                </button>
                <span className={`flex-1 text-[13px] ${todo.done ? 'line-through text-[#ABABAB]' : 'text-[#111111]'}`}>
                  {todo.text}
                </span>
                <button
                  onClick={() => handleDeleteTodo(todo.id)}
                  className="opacity-0 group-hover:opacity-100 text-[#ABABAB] hover:text-[#DC2626] transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}

            <div className="flex gap-2 pt-1">
              <input
                ref={todoInputRef}
                value={todoText}
                onChange={e => setTodoText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddTodo()}
                placeholder="Add a task…"
                className="flex-1 text-[13px] bg-[#FAFAFA] border border-[#EBEBEB] rounded-[6px] px-2.5 py-1.5 outline-none focus:border-[#D97706] placeholder:text-[#ABABAB]"
                disabled={todoAdding}
              />
              <button
                onClick={handleAddTodo}
                disabled={!todoText.trim() || todoAdding}
                className="w-7 h-7 flex items-center justify-center rounded-[6px] bg-[#D97706] text-white disabled:opacity-40 hover:bg-[#B45309] transition-colors shrink-0"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-[#EBEBEB] px-5 py-4 mt-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setElOpen(true)}
            className="w-full gap-1.5"
          >
            <Plus size={13} />
            Add extra lecture
          </Button>
        </div>
      </div>

      {/* Add extra lecture modal */}
      <Modal open={elOpen} onClose={() => setElOpen(false)} title="Add extra lecture">
        <div className="space-y-4">
          <div>
            <label className="text-[13px] font-[500] text-[#111111] block mb-1.5">Subject</label>
            <select
              value={elSubject}
              onChange={e => setElSubject(e.target.value)}
              className="w-full rounded-[8px] border border-[#EBEBEB] bg-[#FAFAFA] px-3 py-2 text-[14px] text-[#111111] outline-none focus:border-[#5B5BD6]"
            >
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start time" type="time" value={elStart} onChange={e => setElStart(e.target.value)} />
            <Input label="End time" type="time" value={elEnd} onChange={e => setElEnd(e.target.value)} />
          </div>
          <Input label="Reason (optional)" value={elReason} onChange={e => setElReason(e.target.value)} placeholder="Make-up class" />
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={() => setElOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={addExtraLecture} disabled={elSaving} className="flex-1">
              {elSaving ? 'Adding…' : 'Add lecture'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
