import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { Sidebar, BottomTabBar } from '@/components/Sidebar'
import { TopBar } from '@/components/TopBar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: semester } = await supabase
    .from('semesters')
    .select('name')
    .eq('is_active', true)
    .eq('user_id', user.id)
    .maybeSingle()

  // Check for semesters at all — if none, redirect to onboarding
  const { count } = await supabase
    .from('semesters')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const noSemesters = !count || count === 0

  return (
    <div className="flex min-h-screen bg-[#FAFAFA]">
      <Sidebar semesterName={noSemesters ? null : (semester?.name ?? 'No active semester')} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar semesterName={noSemesters ? null : semester?.name} />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 pb-20 md:pb-8">
          {children}
        </main>
      </div>

      <BottomTabBar />
    </div>
  )
}
