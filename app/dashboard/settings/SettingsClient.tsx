'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Semester } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Check, Plus, Trash2 } from 'lucide-react'

interface Props { semesters: Semester[]; email: string; userId: string }

export default function SettingsClient({ semesters, email }: Props) {
  const router = useRouter()

  // ── Password
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [pwSaving, setPwSaving] = useState(false)

  // ── Semesters
  const [newSem, setNewSem] = useState({ name: '', start: '', end: '' })
  const [semSaving, setSemSaving] = useState(false)
  const [semMsg, setSemMsg] = useState('')

  // ── Delete semester
  const [semToDelete, setSemToDelete] = useState<Semester | null>(null)
  const [semDeleting, setSemDeleting] = useState(false)

  // ── Delete account
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function changePassword() {
    if (pw.next !== pw.confirm) { setPwMsg({ text: 'Passwords do not match.', ok: false }); return }
    if (pw.next.length < 8) { setPwMsg({ text: 'Password must be at least 8 characters.', ok: false }); return }
    setPwSaving(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: pw.next })
    setPwSaving(false)
    setPwMsg(error ? { text: error.message, ok: false } : { text: 'Password updated.', ok: true })
    if (!error) setPw({ current: '', next: '', confirm: '' })
  }

  async function addSemester() {
    if (!newSem.name.trim() || !newSem.start || !newSem.end) { setSemMsg('All fields are required.'); return }
    setSemSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from('semesters').insert({ user_id: user!.id, name: newSem.name.trim(), start_date: newSem.start, end_date: newSem.end, is_active: false } as any)
    setSemSaving(false)
    setNewSem({ name: '', start: '', end: '' })
    setSemMsg('')
    router.refresh()
  }

  async function setActive(id: string) {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from('semesters').update({ is_active: false } as any).eq('user_id', (await supabase.auth.getUser()).data.user!.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from('semesters').update({ is_active: true } as any).eq('id', id)
    router.refresh()
  }

  async function deleteSemester() {
    if (!semToDelete) return
    setSemDeleting(true)
    const semId = semToDelete.id

    // API route handles Supabase deletion + Redis cache invalidation
    await fetch('/api/delete-semester', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ semesterId: semId }),
    })

    setSemDeleting(false)
    setSemToDelete(null)

    if (semToDelete.is_active) {
      router.push('/onboarding')
    } else {
      router.refresh()
    }
  }

  async function deleteAccount() {
    if (deleteConfirm !== 'DELETE') return
    setDeleting(true)
    const supabase = createClient()
    // Sign out — actual deletion requires a Supabase edge function with service role
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="max-w-xl space-y-6">

      {/* ── Semester management ───────────────────────── */}
      <Card>
        <h2 className="text-[14px] font-[500] text-[#111111] mb-4">Semester management</h2>

        <div className="space-y-2 mb-5">
          {semesters.map(s => (
            <div key={s.id} className="flex items-center gap-3 border border-[#EBEBEB] rounded-[8px] px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-[500] text-[#111111] truncate">{s.name}</p>
                <p className="text-[11px] text-[#ABABAB]">{s.start_date} → {s.end_date}</p>
              </div>
              {s.is_active
                ? <Badge variant="accent"><Check size={10} className="mr-1" />Active</Badge>
                : <Button size="sm" variant="secondary" onClick={() => setActive(s.id)}>Set active</Button>
              }
              <button
                onClick={() => setSemToDelete(s)}
                className="ml-1 p-1 rounded text-[#ABABAB] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                title="Delete semester"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-[#EBEBEB] pt-4 space-y-3">
          <p className="text-[12px] text-[#ABABAB]">Add a new semester</p>
          <Input label="Semester name" value={newSem.name} onChange={e => setNewSem(p => ({ ...p, name: e.target.value }))} placeholder="Semester 7 2026-27" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start date" type="date" value={newSem.start} onChange={e => setNewSem(p => ({ ...p, start: e.target.value }))} />
            <Input label="End date" type="date" value={newSem.end} onChange={e => setNewSem(p => ({ ...p, end: e.target.value }))} />
          </div>
          {semMsg && <p className="text-[12px] text-[#DC2626]">{semMsg}</p>}
          <Button size="sm" onClick={addSemester} disabled={semSaving} className="gap-1.5">
            <Plus size={13} />{semSaving ? 'Adding…' : 'Add semester'}
          </Button>
        </div>
      </Card>

      {/* ── Account ──────────────────────────────────── */}
      <Card>
        <h2 className="text-[14px] font-[500] text-[#111111] mb-4">Account</h2>
        <div className="mb-4">
          <p className="text-[12px] text-[#ABABAB] mb-1">Email</p>
          <p className="text-[14px] text-[#111111] bg-[#FAFAFA] border border-[#EBEBEB] rounded-[8px] px-3 py-2">{email}</p>
        </div>
        <div className="border-t border-[#EBEBEB] pt-4 space-y-3">
          <p className="text-[12px] text-[#ABABAB]">Change password</p>
          <Input label="New password" type="password" value={pw.next} onChange={e => setPw(p => ({ ...p, next: e.target.value }))} placeholder="Min. 8 characters" />
          <Input label="Confirm new password" type="password" value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} placeholder="••••••••" />
          {pwMsg && <p className={`text-[12px] ${pwMsg.ok ? 'text-[#1A9E5F]' : 'text-[#DC2626]'}`}>{pwMsg.text}</p>}
          <Button size="sm" onClick={changePassword} disabled={pwSaving}>{pwSaving ? 'Updating…' : 'Update password'}</Button>
        </div>
        <div className="border-t border-[#EBEBEB] pt-4 mt-4">
          <Button variant="secondary" size="sm" onClick={logout}>Sign out</Button>
        </div>
      </Card>

      {/* ── Danger zone ──────────────────────────────── */}
      <Card>
        <h2 className="text-[14px] font-[500] text-[#DC2626] mb-2">Danger zone</h2>
        <p className="text-[13px] text-[#6B6B6B] mb-4">Deleting your account is permanent. All data will be erased.</p>
        <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>Delete account</Button>
      </Card>

      <ConfirmModal
        open={!!semToDelete}
        onClose={() => setSemToDelete(null)}
        onConfirm={deleteSemester}
        title="Delete semester"
        description={`"${semToDelete?.name}" and all its subjects, timetable, and attendance records will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete semester"
        loading={semDeleting}
      />

      <Modal open={deleteOpen} onClose={() => { setDeleteOpen(false); setDeleteConfirm('') }} title="Delete account">
        <div className="space-y-4">
          <p className="text-[14px] text-[#6B6B6B]">This will permanently erase all your semesters, subjects, timetables, and attendance records. This cannot be undone.</p>
          <Input
            label='Type DELETE to confirm'
            value={deleteConfirm}
            onChange={e => setDeleteConfirm(e.target.value)}
            placeholder="DELETE"
          />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => { setDeleteOpen(false); setDeleteConfirm('') }} className="flex-1">Cancel</Button>
            <Button
              variant="danger"
              disabled={deleteConfirm !== 'DELETE' || deleting}
              onClick={deleteAccount}
              className="flex-1"
            >
              {deleting ? 'Deleting…' : 'Delete everything'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
