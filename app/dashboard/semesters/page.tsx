import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { Semester } from '@/lib/types'

export default async function SemestersPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('semesters')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const semesters = (data ?? []) as Semester[]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Semesters</h1>

      {!semesters.length ? (
        <p className="text-gray-500 text-sm">No semesters yet.</p>
      ) : (
        <div className="space-y-3">
          {semesters.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{s.name}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {new Date(s.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {' – '}
                  {new Date(s.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              {s.is_active && (
                <span className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full font-medium">
                  Active
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
