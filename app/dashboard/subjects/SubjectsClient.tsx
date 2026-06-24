'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { Subject } from '@/lib/types'
import { SlideOver } from '@/components/ui/SlideOver'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge, attendanceBadge } from '@/components/ui/Badge'
import { attendancePct, SUBJECT_COLORS, autoShortCode } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'

interface Props {
  semesterId: string | null
  subjects: Subject[]
  attended: Record<string, number>
  total: Record<string, number>
}

interface SubjectForm {
  name: string; short_code: string; total_hours: string; attendance_target_percent: string; color: string
}

const EMPTY_FORM = (): SubjectForm => ({
  name: '', short_code: '', total_hours: '40', attendance_target_percent: '80', color: SUBJECT_COLORS[0].hex,
})

export default function SubjectsClient({ semesterId, subjects, attended, total }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [slideOpen, setSlideOpen] = useState(false)
  const [editing, setEditing] = useState<Subject | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null)
  const [form, setForm] = useState<SubjectForm>(EMPTY_FORM())
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  function openAdd() { setEditing(null); setForm(EMPTY_FORM()); setError(''); setSlideOpen(true) }
  function openEdit(s: Subject) {
    setEditing(s)
    setForm({ name: s.name, short_code: s.short_code, total_hours: String(s.total_hours), attendance_target_percent: String(s.attendance_target_percent), color: s.color })
    setError('')
    setSlideOpen(true)
  }

  const update = useCallback((patch: Partial<SubjectForm>) => {
    setForm(f => {
      const next = { ...f, ...patch }
      if (patch.name !== undefined && !editing) next.short_code = autoShortCode(patch.name)
      return next
    })
  }, [editing])

  async function save() {
    if (!form.name.trim()) return setError('Name is required.')
    if (!semesterId) return setError('No active semester.')
    setSaving(true)
    setError('')
    const supabase = createClient()
    const payload = {
      name: form.name.trim(),
      short_code: form.short_code.trim().toUpperCase(),
      total_hours: parseInt(form.total_hours) || 40,
      attendance_target_percent: parseInt(form.attendance_target_percent) || 80,
      color: form.color,
    }
    if (editing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabase.from('subjects').update(payload as any).eq('id', editing.id)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabase.from('subjects').insert({ ...payload, semester_id: semesterId } as any)
    }
    setSaving(false)
    setSlideOpen(false)
    toast(editing ? 'Subject updated' : 'Subject added', 'success')
    router.refresh()
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('subjects').delete().eq('id', deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    if (error) toast('Failed to delete subject', 'error')
    else toast('Subject deleted', 'success')
    router.refresh()
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div />
        <Button size="sm" onClick={openAdd} className="gap-1.5">
          <Plus size={14} />
          Add subject
        </Button>
      </div>

      {!subjects.length && (
        <div className="flex items-center justify-center h-48 border border-[#EBEBEB] border-dashed rounded-[10px]">
          <div className="text-center">
            <p className="text-[#ABABAB] text-[14px]">No subjects yet</p>
            <button onClick={openAdd} className="text-[13px] text-[#5B5BD6] hover:underline mt-1">Add your first subject</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {subjects.map(s => {
          const att = attended[s.id] ?? 0
          const tot = total[s.id] ?? 0
          const pct = attendancePct(att, tot)
          const variant = attendanceBadge(pct, s.attendance_target_percent)
          const barWidth = Math.min(100, pct)

          return (
            <div
              key={s.id}
              className="group bg-white border border-[#EBEBEB] rounded-[10px] overflow-hidden flex"
            >
              {/* Color bar */}
              <div className="w-1 shrink-0" style={{ backgroundColor: s.color }} />

              <div className="flex-1 p-4 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0">
                    <p className="font-[500] text-[#111111] truncate">{s.name}</p>
                    <p className="text-[11px] text-[#ABABAB]">{s.short_code} · {s.total_hours}h · target {s.attendance_target_percent}%</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
                    <button onClick={() => openEdit(s)} className="p-1.5 text-[#ABABAB] hover:text-[#5B5BD6] rounded-[6px] hover:bg-[rgba(91,91,214,0.08)]">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setDeleteTarget(s)} className="p-1.5 text-[#ABABAB] hover:text-[#DC2626] rounded-[6px] hover:bg-[rgba(220,38,38,0.08)]">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-3">
                  <div className="flex-1 h-1.5 bg-[#EBEBEB] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${barWidth}%`, backgroundColor: s.color }}
                    />
                  </div>
                  <span className="text-[14px] font-[600] text-[#111111] shrink-0">{pct}%</span>
                  <Badge variant={variant}>
                    {variant === 'safe' ? 'Safe' : variant === 'borderline' ? 'Borderline' : 'At risk'}
                  </Badge>
                </div>

                <p className="text-[11px] text-[#ABABAB] mt-1">{att} / {tot} classes attended</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add / Edit slide-over */}
      <SlideOver
        open={slideOpen}
        onClose={() => setSlideOpen(false)}
        title={editing ? 'Edit subject' : 'Add subject'}
      >
        <div className="space-y-4">
          <div className="flex gap-1.5 flex-wrap">
            {SUBJECT_COLORS.map(c => (
              <button
                key={c.hex}
                type="button"
                onClick={() => update({ color: c.hex })}
                className={`w-6 h-6 rounded-full transition-transform duration-150 ${form.color === c.hex ? 'ring-2 ring-offset-1 ring-[#5B5BD6] scale-110' : ''}`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))}
          </div>
          <Input label="Subject name" value={form.name} onChange={e => update({ name: e.target.value })} placeholder="Machine Learning" />
          <Input label="Short code" value={form.short_code} onChange={e => update({ short_code: e.target.value.toUpperCase().slice(0, 5) })} placeholder="ML" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Total hours" type="number" value={form.total_hours} onChange={e => update({ total_hours: e.target.value })} min="1" />
            <Input label="Target %" type="number" value={form.attendance_target_percent} onChange={e => update({ attendance_target_percent: e.target.value })} min="1" max="100" />
          </div>
          {error && <p className="text-[12px] text-[#DC2626]">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setSlideOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={save} disabled={saving} className="flex-1">{saving ? 'Saving…' : editing ? 'Save changes' : 'Add subject'}</Button>
          </div>
        </div>
      </SlideOver>

      {/* Delete confirmation modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete subject">
        <div className="space-y-4">
          <p className="text-[14px] text-[#6B6B6B]">
            Are you sure you want to delete <strong className="text-[#111111]">{deleteTarget?.name}</strong>?
            All attendance records for this subject will also be removed.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} className="flex-1">Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleting} className="flex-1">
              {deleting ? 'Deleting…' : 'Delete subject'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
