'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { TimetableSlot, Subject, SpecialDay, ExtraLecture } from '@/lib/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { DAY_NAMES, fmtTime } from '@/lib/utils'

const HOURS = Array.from({ length: 11 }, (_, i) => 8 + i)
const DAYS = [1, 2, 3, 4, 5, 6]
const DAY_SHORT = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface Props {
  semesterId: string | null
  subjects: Subject[]
  slots: TimetableSlot[]
  specialDays: SpecialDay[]
  extraLectures: ExtraLecture[]
}

type Tab = 'weekly' | 'special'

interface SlotModal { day: number; hour: number; existing?: TimetableSlot }

export default function TimetableClient({ semesterId, subjects, slots, specialDays, extraLectures }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('weekly')
  const [editMode, setEditMode] = useState(false)
  const [slotModal, setSlotModal] = useState<SlotModal | null>(null)
  const [slotSubject, setSlotSubject] = useState(subjects[0]?.id ?? '')
  const [slotStart, setSlotStart] = useState('09:00')
  const [slotEnd, setSlotEnd] = useState('10:00')
  const [slotRoom, setSlotRoom] = useState('')
  const [slotFaculty, setSlotFaculty] = useState('')
  const [slotSaving, setSlotSaving] = useState(false)

  // Special day modal
  const [sdOpen, setSdOpen] = useState(false)
  const [sdDate, setSdDate] = useState('')
  const [sdType, setSdType] = useState<'holiday' | 'no_college' | 'extra_working'>('holiday')
  const [sdLabel, setSdLabel] = useState('')
  const [sdSaving, setSdSaving] = useState(false)

  // Extra lecture modal
  const [elOpen, setElOpen] = useState(false)
  const [elSubject, setElSubject] = useState(subjects[0]?.id ?? '')
  const [elDate, setElDate] = useState('')
  const [elStart, setElStart] = useState('09:00')
  const [elEnd, setElEnd] = useState('10:00')
  const [elReason, setElReason] = useState('')
  const [elSaving, setElSaving] = useState(false)

  // Build slot lookup: day → hour → slot
  const slotMap = new Map<string, TimetableSlot>()
  for (const s of slots) {
    const h = parseInt(s.start_time.split(':')[0])
    slotMap.set(`${s.day_of_week}-${h}`, s)
  }
  const subjectById = new Map(subjects.map(s => [s.id, s]))

  function openCell(day: number, hour: number) {
    if (!editMode) return
    const existing = slotMap.get(`${day}-${hour}`)
    setSlotModal({ day, hour, existing })
    if (existing) {
      setSlotSubject(existing.subject_id)
      setSlotStart(existing.start_time.slice(0, 5))
      setSlotEnd(existing.end_time.slice(0, 5))
      setSlotRoom(existing.room ?? '')
      setSlotFaculty(existing.faculty ?? '')
    } else {
      setSlotSubject(subjects[0]?.id ?? '')
      setSlotStart(`${String(hour).padStart(2, '0')}:00`)
      setSlotEnd(`${String(hour + 1).padStart(2, '0')}:00`)
      setSlotRoom(''); setSlotFaculty('')
    }
  }

  async function saveSlot() {
    if (!slotModal || !semesterId) return
    setSlotSaving(true)
    const supabase = createClient()
    if (slotModal.existing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabase.from('timetable_slots').update({ subject_id: slotSubject, start_time: slotStart, end_time: slotEnd, room: slotRoom || null, faculty: slotFaculty || null } as any).eq('id', slotModal.existing.id)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabase.from('timetable_slots').insert({ semester_id: semesterId, subject_id: slotSubject, day_of_week: slotModal.day, start_time: slotStart, end_time: slotEnd, room: slotRoom || null, faculty: slotFaculty || null } as any)
    }
    setSlotSaving(false); setSlotModal(null); router.refresh()
  }

  async function deleteSlot() {
    if (!slotModal?.existing) return
    setSlotSaving(true)
    const supabase = createClient()
    await supabase.from('timetable_slots').delete().eq('id', slotModal.existing.id)
    setSlotSaving(false); setSlotModal(null); router.refresh()
  }

  async function saveSpecialDay() {
    if (!semesterId || !sdDate || !sdLabel.trim()) return
    setSdSaving(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from('special_days').insert({ semester_id: semesterId, date: sdDate, type: sdType, label: sdLabel.trim() } as any)
    setSdSaving(false); setSdOpen(false); setSdDate(''); setSdLabel(''); router.refresh()
  }

  async function saveExtraLecture() {
    if (!semesterId || !elDate || !elSubject) return
    setElSaving(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from('extra_lectures').insert({ semester_id: semesterId, subject_id: elSubject, date: elDate, start_time: elStart, end_time: elEnd, reason: elReason || null } as any)
    setElSaving(false); setElOpen(false); setElDate(''); setElReason(''); router.refresh()
  }

  const today = new Date().toISOString().split('T')[0]
  const upcomingSD = specialDays.filter(d => d.date >= today)
  const pastSD = specialDays.filter(d => d.date < today)

  const SD_TYPE_LABELS = { holiday: 'Holiday', no_college: 'No college', extra_working: 'Extra working' }
  const SD_VARIANTS = { holiday: 'neutral' as const, no_college: 'atrisk' as const, extra_working: 'accent' as const }

  return (
    <div className="max-w-5xl space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 bg-[#FAFAFA] border border-[#EBEBEB] rounded-[8px] p-1 w-fit">
        {(['weekly', 'special'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-[6px] text-[13px] font-[500] transition-colors duration-150 capitalize ${tab === t ? 'bg-white border border-[#EBEBEB] text-[#111111]' : 'text-[#6B6B6B] hover:text-[#111111]'}`}
          >
            {t === 'weekly' ? 'Weekly schedule' : 'Special days'}
          </button>
        ))}
      </div>

      {/* ── Weekly tab ─────────────────────────────────── */}
      {tab === 'weekly' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-[#ABABAB]">{editMode ? 'Click any cell to add or edit a slot.' : 'Enable edit mode to modify the schedule.'}</p>
            <Button size="sm" variant={editMode ? 'secondary' : 'secondary'} onClick={() => setEditMode(v => !v)}>
              {editMode ? 'Done' : <><Pencil size={13} /> Edit</>}
            </Button>
          </div>

          {/* Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[520px]">
              <div className="grid gap-px" style={{ gridTemplateColumns: '48px repeat(6, 1fr)' }}>
                <div />
                {DAYS.map(d => (
                  <div key={d} className="text-center text-[11px] text-[#ABABAB] py-1.5">{DAY_SHORT[d]}</div>
                ))}
                {HOURS.map(hour => (
                  <div key={hour} className="contents">
                    <div className="flex items-center justify-end pr-2 text-[11px] text-[#ABABAB]">{hour}:00</div>
                    {DAYS.map(day => {
                      const slot = slotMap.get(`${day}-${hour}`)
                      const subject = slot ? subjectById.get(slot.subject_id) : undefined
                      return (
                        <button
                          key={day}
                          onClick={() => openCell(day, hour)}
                          className={`h-9 rounded-[4px] border text-[10px] font-[500] transition-colors duration-100 ${editMode ? 'cursor-pointer' : 'cursor-default'} ${slot ? '' : 'border-[#EBEBEB] bg-[#FAFAFA] hover:border-[#5B5BD6]'}`}
                          style={subject ? { backgroundColor: subject.color, borderColor: subject.color, color: '#fff' } : {}}
                        >
                          {subject?.short_code ?? ''}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Legend */}
          {subjects.length > 0 && (
            <div className="flex flex-wrap gap-3 pt-1">
              {subjects.map(s => (
                <div key={s.id} className="flex items-center gap-1.5 text-[12px] text-[#6B6B6B]">
                  <span className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: s.color }} />
                  {s.name}
                </div>
              ))}
            </div>
          )}

          {/* Extra lectures section */}
          <div className="pt-4 border-t border-[#EBEBEB]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-[500] text-[#111111]">Extra lectures</h3>
              <Button size="sm" variant="secondary" onClick={() => setElOpen(true)} className="gap-1.5">
                <Plus size={13} /> Add extra lecture
              </Button>
            </div>
            {!extraLectures.length ? (
              <p className="text-[13px] text-[#ABABAB]">No extra lectures scheduled.</p>
            ) : (
              <div className="space-y-2">
                {extraLectures.map(el => {
                  const subj = subjectById.get(el.subject_id)
                  return (
                    <div key={el.id} className="bg-white border border-[#EBEBEB] rounded-[8px] px-4 py-3 flex items-center gap-3">
                      {subj && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: subj.color }} />}
                      <span className="font-[500] text-[#111111] text-[13px]">{subj?.name ?? '—'}</span>
                      <span className="text-[12px] text-[#ABABAB]">{el.date} · {fmtTime(el.start_time)} – {fmtTime(el.end_time)}</span>
                      {el.reason && <span className="text-[12px] text-[#6B6B6B] ml-auto">{el.reason}</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Special days tab ──────────────────────────── */}
      {tab === 'special' && (
        <div className="space-y-5">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setSdOpen(true)} className="gap-1.5">
              <Plus size={13} /> Add special day
            </Button>
          </div>

          <SpecialDayList title="Upcoming" days={upcomingSD} typeLabels={SD_TYPE_LABELS} variants={SD_VARIANTS} />
          {pastSD.length > 0 && (
            <div className="opacity-60">
              <SpecialDayList title="Past" days={pastSD} typeLabels={SD_TYPE_LABELS} variants={SD_VARIANTS} />
            </div>
          )}
        </div>
      )}

      {/* ── Slot modal ─────────────────────────────────── */}
      <Modal open={!!slotModal} onClose={() => setSlotModal(null)} title={slotModal?.existing ? 'Edit slot' : `Add slot — ${DAY_NAMES[slotModal?.day ?? 1]}`}>
        <div className="space-y-4">
          <div>
            <label className="text-[13px] font-[500] text-[#111111] block mb-1.5">Subject</label>
            <select
              value={slotSubject}
              onChange={e => setSlotSubject(e.target.value)}
              className="w-full rounded-[8px] border border-[#EBEBEB] bg-[#FAFAFA] px-3 py-2 text-[14px] text-[#111111] outline-none focus:border-[#5B5BD6] focus:ring-2 focus:ring-[rgba(91,91,214,0.18)]"
            >
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start time" type="time" value={slotStart} onChange={e => setSlotStart(e.target.value)} />
            <Input label="End time" type="time" value={slotEnd} onChange={e => setSlotEnd(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Room (optional)" value={slotRoom} onChange={e => setSlotRoom(e.target.value)} placeholder="A-101" />
            <Input label="Faculty (optional)" value={slotFaculty} onChange={e => setSlotFaculty(e.target.value)} placeholder="Dr. Smith" />
          </div>
          <div className="flex gap-3 pt-1">
            {slotModal?.existing && (
              <Button variant="danger" onClick={deleteSlot} disabled={slotSaving}>Delete</Button>
            )}
            <Button variant="secondary" onClick={() => setSlotModal(null)} className="flex-1">Cancel</Button>
            <Button onClick={saveSlot} disabled={slotSaving} className="flex-1">{slotSaving ? 'Saving…' : 'Save'}</Button>
          </div>
        </div>
      </Modal>

      {/* ── Special day modal ──────────────────────────── */}
      <Modal open={sdOpen} onClose={() => setSdOpen(false)} title="Add special day">
        <div className="space-y-4">
          <Input label="Date" type="date" value={sdDate} onChange={e => setSdDate(e.target.value)} />
          <div>
            <label className="text-[13px] font-[500] text-[#111111] block mb-1.5">Type</label>
            <select
              value={sdType}
              onChange={e => setSdType(e.target.value as typeof sdType)}
              className="w-full rounded-[8px] border border-[#EBEBEB] bg-[#FAFAFA] px-3 py-2 text-[14px] text-[#111111] outline-none focus:border-[#5B5BD6]"
            >
              <option value="holiday">Holiday</option>
              <option value="no_college">No college</option>
              <option value="extra_working">Extra working day</option>
            </select>
          </div>
          <Input label="Label" value={sdLabel} onChange={e => setSdLabel(e.target.value)} placeholder="Diwali break, etc." />
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={() => setSdOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={saveSpecialDay} disabled={sdSaving} className="flex-1">{sdSaving ? 'Saving…' : 'Add'}</Button>
          </div>
        </div>
      </Modal>

      {/* ── Extra lecture modal ────────────────────────── */}
      <Modal open={elOpen} onClose={() => setElOpen(false)} title="Add extra lecture">
        <div className="space-y-4">
          <div>
            <label className="text-[13px] font-[500] text-[#111111] block mb-1.5">Subject</label>
            <select value={elSubject} onChange={e => setElSubject(e.target.value)} className="w-full rounded-[8px] border border-[#EBEBEB] bg-[#FAFAFA] px-3 py-2 text-[14px] text-[#111111] outline-none focus:border-[#5B5BD6]">
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <Input label="Date" type="date" value={elDate} onChange={e => setElDate(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start time" type="time" value={elStart} onChange={e => setElStart(e.target.value)} />
            <Input label="End time" type="time" value={elEnd} onChange={e => setElEnd(e.target.value)} />
          </div>
          <Input label="Reason (optional)" value={elReason} onChange={e => setElReason(e.target.value)} placeholder="Make-up class" />
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={() => setElOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={saveExtraLecture} disabled={elSaving} className="flex-1">{elSaving ? 'Saving…' : 'Add'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function SpecialDayList({
  title, days, typeLabels, variants,
}: {
  title: string
  days: SpecialDay[]
  typeLabels: Record<string, string>
  variants: Record<string, 'neutral' | 'atrisk' | 'accent'>
}) {
  if (!days.length) return null
  return (
    <div>
      <h3 className="text-[12px] text-[#ABABAB] mb-2">{title}</h3>
      <div className="space-y-2">
        {days.map(d => (
          <div key={d.id} className="bg-white border border-[#EBEBEB] rounded-[8px] px-4 py-3 flex items-center gap-3">
            <span className="font-[500] text-[#111111] text-[13px]">{d.label}</span>
            <Badge variant={variants[d.type] ?? 'neutral'}>{typeLabels[d.type]}</Badge>
            <span className="ml-auto text-[12px] text-[#ABABAB]">{d.date}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
