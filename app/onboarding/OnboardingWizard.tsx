'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SUBJECT_COLORS, autoShortCode } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────
interface SubjectDraft {
  name: string
  short_code: string
  total_hours: string
  target: string
  color: string
}

const EMPTY_SUBJECT = (): SubjectDraft => ({
  name: '', short_code: '', total_hours: '40', target: '80', color: SUBJECT_COLORS[0].hex,
})

// ─── Step indicator ─────────────────────────────────────
function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-[500] transition-colors duration-150 ${
            i < step
              ? 'bg-[#5B5BD6] text-white'
              : i === step
                ? 'border-2 border-[#5B5BD6] text-[#5B5BD6]'
                : 'border border-[#EBEBEB] text-[#ABABAB]'
          }`}>
            {i < step ? <Check size={11} /> : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`w-12 h-px ${i < step ? 'bg-[#5B5BD6]' : 'bg-[#EBEBEB]'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Step 1 — Semester ──────────────────────────────────
function StepSemester({
  onNext,
}: {
  onNext: (d: { name: string; start: string; end: string }) => void
}) {
  const [name, setName] = useState('Semester 1 2025-26')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [err, setErr] = useState('')

  function submit() {
    if (!name.trim()) return setErr('Semester name is required.')
    if (!start) return setErr('Start date is required.')
    if (!end) return setErr('End date is required.')
    if (end <= start) return setErr('End date must be after start date.')
    setErr('')
    onNext({ name: name.trim(), start, end })
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[20px] font-[500] text-[#111111]">Set up your semester</h2>
        <p className="text-[14px] text-[#6B6B6B] mt-1">This helps AttendEase track your attendance over the right period.</p>
      </div>
      <Input label="Semester name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Semester 6 2025-26" />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Start date" type="date" value={start} onChange={e => setStart(e.target.value)} />
        <Input label="End date" type="date" value={end} onChange={e => setEnd(e.target.value)} />
      </div>
      {err && <p className="text-[12px] text-[#DC2626]">{err}</p>}
      <div className="flex justify-end pt-2">
        <Button onClick={submit}>Continue</Button>
      </div>
    </div>
  )
}

// ─── Step 2 — Subjects ──────────────────────────────────
function StepSubjects({
  onNext, onBack,
}: {
  onNext: (subjects: SubjectDraft[]) => void
  onBack: () => void
}) {
  const [subjects, setSubjects] = useState<SubjectDraft[]>([EMPTY_SUBJECT()])
  const [err, setErr] = useState('')

  function updateSubject(i: number, patch: Partial<SubjectDraft>) {
    setSubjects(prev => prev.map((s, idx) => {
      if (idx !== i) return s
      const updated = { ...s, ...patch }
      if (patch.name !== undefined && !patch.short_code) {
        updated.short_code = autoShortCode(patch.name)
      }
      return updated
    }))
  }

  function addSubject() { setSubjects(prev => [...prev, EMPTY_SUBJECT()]) }
  function removeSubject(i: number) { setSubjects(prev => prev.filter((_, idx) => idx !== i)) }

  function submit() {
    if (subjects.length === 0) return setErr('Add at least one subject.')
    for (const s of subjects) {
      if (!s.name.trim()) return setErr('All subjects need a name.')
      if (!s.short_code.trim()) return setErr('All subjects need a short code.')
    }
    setErr('')
    onNext(subjects)
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[20px] font-[500] text-[#111111]">Add your subjects</h2>
        <p className="text-[14px] text-[#6B6B6B] mt-1">You can always add or edit subjects later.</p>
      </div>

      <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
        {subjects.map((s, i) => (
          <div key={i} className="border border-[#EBEBEB] rounded-[10px] p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5 flex-wrap">
                {SUBJECT_COLORS.map(c => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => updateSubject(i, { color: c.hex })}
                    className={`w-5 h-5 rounded-full transition-transform duration-150 ${s.color === c.hex ? 'ring-2 ring-offset-1 ring-[#5B5BD6] scale-110' : ''}`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
              </div>
              {subjects.length > 1 && (
                <button onClick={() => removeSubject(i)} className="ml-auto text-[#ABABAB] hover:text-[#DC2626] transition-colors">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Input
                  label="Subject name"
                  value={s.name}
                  onChange={e => updateSubject(i, { name: e.target.value })}
                  placeholder="Machine Learning"
                />
              </div>
              <Input
                label="Code"
                value={s.short_code}
                onChange={e => updateSubject(i, { short_code: e.target.value.toUpperCase().slice(0, 5) })}
                placeholder="ML"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Total hours"
                type="number"
                value={s.total_hours}
                onChange={e => updateSubject(i, { total_hours: e.target.value })}
                min="1"
              />
              <Input
                label="Target %"
                type="number"
                value={s.target}
                onChange={e => updateSubject(i, { target: e.target.value })}
                min="1"
                max="100"
              />
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addSubject}
        className="text-[13px] text-[#5B5BD6] hover:underline flex items-center gap-1.5"
      >
        <Plus size={13} /> Add another subject
      </button>

      {err && <p className="text-[12px] text-[#DC2626]">{err}</p>}

      <div className="flex justify-between pt-2">
        <Button variant="secondary" onClick={onBack}>Back</Button>
        <Button onClick={submit}>Continue</Button>
      </div>
    </div>
  )
}

// ─── Step 3 — Timetable (simplified grid) ───────────────
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = Array.from({ length: 11 }, (_, i) => 8 + i) // 8–18

interface SlotEntry {
  day: number  // 1-6
  hour: number // 8-18
  subjectIdx: number
}

function StepTimetable({
  subjects,
  onFinish,
  onBack,
  saving,
}: {
  subjects: SubjectDraft[]
  onFinish: (slots: SlotEntry[]) => void
  onBack: () => void
  saving: boolean
}) {
  const [slots, setSlots] = useState<SlotEntry[]>([])
  const [selected, setSelected] = useState(0)

  function toggle(day: number, hour: number) {
    const exists = slots.find(s => s.day === day && s.hour === hour)
    if (exists) {
      setSlots(prev => prev.filter(s => !(s.day === day && s.hour === hour)))
    } else {
      setSlots(prev => [...prev, { day, hour, subjectIdx: selected }])
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[20px] font-[500] text-[#111111]">Set up your timetable</h2>
        <p className="text-[14px] text-[#6B6B6B] mt-1">Click cells to assign a subject to that slot. You can refine this later.</p>
      </div>

      {/* Subject selector */}
      <div className="flex flex-wrap gap-2">
        {subjects.map((s, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className={`px-3 py-1 rounded-[6px] text-[12px] font-[500] border transition-all duration-150 ${
              selected === i ? 'border-transparent text-white' : 'border-[#EBEBEB] bg-white text-[#6B6B6B]'
            }`}
            style={selected === i ? { backgroundColor: s.color } : {}}
          >
            {s.short_code}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="overflow-x-auto -mx-1">
        <div className="min-w-[500px] px-1">
          {/* Day headers */}
          <div className="grid gap-px mb-px" style={{ gridTemplateColumns: '44px repeat(6, 1fr)' }}>
            <div />
            {DAYS.map(d => (
              <div key={d} className="text-center text-[11px] text-[#ABABAB] py-1">{d}</div>
            ))}
          </div>
          {/* Rows */}
          {HOURS.map(hour => (
            <div key={hour} className="grid gap-px mb-px" style={{ gridTemplateColumns: '44px repeat(6, 1fr)' }}>
              <div className="text-[11px] text-[#ABABAB] flex items-center pr-2 justify-end">{hour}:00</div>
              {[1, 2, 3, 4, 5, 6].map(day => {
                const slot = slots.find(s => s.day === day && s.hour === hour)
                const color = slot ? subjects[slot.subjectIdx]?.color : undefined
                return (
                  <button
                    key={day}
                    onClick={() => toggle(day, hour)}
                    className="h-8 rounded-[4px] border border-[#EBEBEB] text-[10px] font-[500] transition-colors duration-100 hover:border-[#5B5BD6]"
                    style={color ? { backgroundColor: color, borderColor: color, color: '#fff' } : { backgroundColor: '#FAFAFA' }}
                  >
                    {slot ? subjects[slot.subjectIdx]?.short_code : ''}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="secondary" onClick={onBack}>Back</Button>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => onFinish([])}>Skip for now</Button>
          <Button onClick={() => onFinish(slots)} disabled={saving}>
            {saving ? 'Saving…' : 'Finish setup'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Wizard coordinator ─────────────────────────────────
export default function OnboardingWizard() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [semesterData, setSemesterData] = useState<{ name: string; start: string; end: string } | null>(null)
  const [subjectData, setSubjectData] = useState<SubjectDraft[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function finish(slots: SlotEntry[]) {
    if (!semesterData) return
    setSaving(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1. Create semester
    const { data: sem, error: semErr } = await supabase
      .from('semesters')
      .insert({
        user_id: user.id,
        name: semesterData.name,
        start_date: semesterData.start,
        end_date: semesterData.end,
        is_active: true,
      })
      .select()
      .single()

    if (semErr || !sem) {
      setError('Failed to create semester. Please try again.')
      setSaving(false)
      return
    }

    // 2. Create subjects
    const subjectRows = subjectData.map(s => ({
      user_id: user.id,
      semester_id: sem.id,
      name: s.name,
      short_code: s.short_code,
      total_hours: parseInt(s.total_hours) || 40,
      attendance_target_percent: parseInt(s.target) || 80,
      color: s.color,
    }))

    const { data: createdSubjects } = await supabase
      .from('subjects')
      .insert(subjectRows)
      .select()

    // 3. Create timetable slots
    if (slots.length && createdSubjects) {
      const slotRows = slots.map(sl => ({
        user_id: user.id,
        semester_id: sem.id,
        subject_id: createdSubjects[sl.subjectIdx]?.id,
        day_of_week: sl.day,
        start_time: `${String(sl.hour).padStart(2, '0')}:00:00`,
        end_time: `${String(sl.hour + 1).padStart(2, '0')}:00:00`,
      })).filter(r => r.subject_id)

      await supabase.from('timetable_slots').insert(slotRows as Parameters<typeof supabase.from>[0] extends never ? never[] : never[])
    }

    setSaving(false)
    router.push('/dashboard/today')
    router.refresh()
  }

  return (
    <div className="bg-white border border-[#EBEBEB] rounded-[10px] w-full max-w-[540px] p-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] font-[500] text-[#5B5BD6]">AttendEase</span>
        <span className="text-[12px] text-[#ABABAB]">{step + 1} of 3</span>
      </div>

      <StepDots step={step} total={3} />

      {error && (
        <p className="mb-4 text-[12px] text-[#DC2626] bg-[rgba(220,38,38,0.06)] border border-[rgba(220,38,38,0.15)] rounded-[6px] px-3 py-2">
          {error}
        </p>
      )}

      {step === 0 && (
        <StepSemester onNext={d => { setSemesterData(d); setStep(1) }} />
      )}
      {step === 1 && (
        <StepSubjects
          onNext={d => { setSubjectData(d); setStep(2) }}
          onBack={() => setStep(0)}
        />
      )}
      {step === 2 && (
        <StepTimetable
          subjects={subjectData}
          onFinish={finish}
          onBack={() => setStep(1)}
          saving={saving}
        />
      )}
    </div>
  )
}
