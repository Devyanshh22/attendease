import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase-server'
export const metadata: Metadata = { title: 'Settings' }
import type { Semester } from '@/lib/types'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('semesters').select('*').eq('user_id', user!.id).order('created_at', { ascending: false })

  return (
    <SettingsClient
      semesters={(data ?? []) as Semester[]}
      email={user!.email ?? ''}
      userId={user!.id}
    />
  )
}
