import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { AttendanceRecord, AttendanceStatus } from '@/lib/types'

type RecordWithSlot = AttendanceRecord & {
  timetable_slots: {
    start_time: string
    end_time: string
    subjects: { name: string; short_code: string; color: string } | null
  } | null
}

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  attended: 'bg-green-100 text-green-700',
  missed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

export default async function HistoryPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('attendance_records')
    .select('*, timetable_slots(start_time, end_time, subjects(name, short_code, color))')
    .eq('user_id', user!.id)
    .order('date', { ascending: false })
    .limit(100)

  const records = (data ?? []) as RecordWithSlot[]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">History</h1>

      {!records.length ? (
        <p className="text-gray-500 text-sm">No attendance records yet.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wide">
                <th className="text-left px-5 py-3">Date</th>
                <th className="text-left px-5 py-3">Subject</th>
                <th className="text-left px-5 py-3">Time</th>
                <th className="text-left px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const slot = r.timetable_slots
                const subject = slot?.subjects
                return (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-600">
                      {new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-900">
                      <span className="flex items-center gap-2">
                        {subject?.color && (
                          <span className="w-2 h-2 rounded-full shrink-0 inline-block" style={{ backgroundColor: subject.color }} />
                        )}
                        {subject?.name ?? '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {slot ? `${slot.start_time.slice(0, 5)} – ${slot.end_time.slice(0, 5)}` : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${STATUS_COLORS[r.status]}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
