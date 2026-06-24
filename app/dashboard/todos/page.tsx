import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAllTodos } from '@/lib/todos'
import TodosClient from './TodosClient'

export const metadata: Metadata = { title: 'Tasks' }

export default async function TodosPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const todos = await getAllTodos(supabase, user!.id)

  return <TodosClient todos={todos} userId={user!.id} />
}
