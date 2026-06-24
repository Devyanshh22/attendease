import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { invalidateUserCache } from '@/lib/redis'

export async function POST(req: NextRequest) {
  const { semesterId } = await req.json()
  if (!semesterId) return NextResponse.json({ error: 'Missing semesterId' }, { status: 400 })

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify ownership
  const { data: sem } = await supabase
    .from('semesters').select('id, user_id').eq('id', semesterId).maybeSingle()
  if (!sem || sem.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Get subject IDs to find slots + extras
  const { data: subjects } = await supabase
    .from('subjects').select('id').eq('semester_id', semesterId)
  const subjectIds = (subjects ?? []).map((s: { id: string }) => s.id)

  if (subjectIds.length > 0) {
    const [{ data: slots }, { data: extras }] = await Promise.all([
      supabase.from('timetable_slots').select('id').in('subject_id', subjectIds),
      supabase.from('extra_lectures').select('id').in('subject_id', subjectIds),
    ])
    const slotIds = (slots ?? []).map((s: { id: string }) => s.id)
    const extraIds = (extras ?? []).map((e: { id: string }) => e.id)

    // attendance_records uses on delete set null — must delete manually
    await Promise.all([
      slotIds.length > 0
        ? supabase.from('attendance_records').delete().in('timetable_slot_id', slotIds)
        : Promise.resolve(),
      extraIds.length > 0
        ? supabase.from('attendance_records').delete().in('extra_lecture_id', extraIds)
        : Promise.resolve(),
    ])
  }

  // Delete semester — CASCADE removes subjects, slots, extras, special_days
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('semesters') as any).delete().eq('id', semesterId)

  // Bust Redis cache
  await invalidateUserCache(user.id, semesterId)

  return NextResponse.json({ ok: true })
}
