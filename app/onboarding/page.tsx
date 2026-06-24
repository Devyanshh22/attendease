import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import OnboardingWizard from './OnboardingWizard'

export default async function OnboardingPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Already onboarded
  const { count } = await supabase
    .from('semesters')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if (count && count > 0) redirect('/dashboard/today')

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4">
      <OnboardingWizard />
    </div>
  )
}
