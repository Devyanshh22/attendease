import type { SupabaseClient } from '@supabase/supabase-js'

export interface Todo {
  id: string
  user_id: string
  date: string       // YYYY-MM-DD
  text: string
  done: boolean
  created_at: string
}

// Todos for a single day
export async function getDayTodos(supabase: SupabaseClient, userId: string, date: string): Promise<Todo[]> {
  const { data } = await supabase
    .from('todos')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .order('created_at', { ascending: true })
  return (data ?? []) as Todo[]
}

// Todo counts per date for a full month (for calendar dot indicators)
export async function getMonthTodoCounts(
  supabase: SupabaseClient,
  userId: string,
  year: number,
  month: number, // 0-indexed
): Promise<Record<string, number>> {
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { data } = await supabase
    .from('todos')
    .select('date')
    .eq('user_id', userId)
    .gte('date', start)
    .lte('date', end)

  const counts: Record<string, number> = {}
  for (const row of (data ?? []) as { date: string }[]) {
    counts[row.date] = (counts[row.date] ?? 0) + 1
  }
  return counts
}

// All todos for a user, ordered by date desc then created_at
export async function getAllTodos(supabase: SupabaseClient, userId: string): Promise<Todo[]> {
  const { data } = await supabase
    .from('todos')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true })
    .order('created_at', { ascending: true })
  return (data ?? []) as Todo[]
}

export async function addTodo(supabase: SupabaseClient, userId: string, date: string, text: string): Promise<Todo | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('todos') as any).insert({ user_id: userId, date, text, done: false }).select().single()
  return data as Todo | null
}

export async function toggleTodo(supabase: SupabaseClient, id: string, done: boolean): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('todos') as any).update({ done }).eq('id', id)
}

export async function deleteTodo(supabase: SupabaseClient, id: string): Promise<void> {
  await supabase.from('todos').delete().eq('id', id)
}
