'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { addTodo, toggleTodo, deleteTodo } from '@/lib/todos'
import type { Todo } from '@/lib/todos'
import { Plus, Trash2, CheckSquare, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props { todos: Todo[]; userId: string }

type Filter = 'upcoming' | 'all' | 'done'

function toYMD(d: Date) {
  return d.toISOString().split('T')[0]
}

function formatDateLabel(dateStr: string, todayStr: string): string {
  const tomorrow = new Date(todayStr + 'T12:00:00')
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (dateStr === todayStr) return 'Today'
  if (dateStr === toYMD(tomorrow)) return 'Tomorrow'
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function TodosClient({ todos: initial, userId }: Props) {
  const router = useRouter()
  const [todos, setTodos] = useState<Todo[]>(initial)
  const [filter, setFilter] = useState<Filter>('upcoming')
  const [newDate, setNewDate] = useState(toYMD(new Date()))
  const [newText, setNewText] = useState('')
  const [adding, setAdding] = useState(false)

  const todayStr = toYMD(new Date())

  async function handleAdd() {
    const text = newText.trim()
    if (!text || !newDate) return
    setAdding(true)
    const supabase = createClient()
    const created = await addTodo(supabase, userId, newDate, text)
    if (created) {
      setTodos(prev => [...prev, created].sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at)))
    }
    setNewText('')
    setAdding(false)
    router.refresh()
  }

  async function handleToggle(todo: Todo) {
    const supabase = createClient()
    await toggleTodo(supabase, todo.id, !todo.done)
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, done: !t.done } : t))
    router.refresh()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await deleteTodo(supabase, id)
    setTodos(prev => prev.filter(t => t.id !== id))
    router.refresh()
  }

  // Filter
  const filtered = todos.filter(t => {
    if (filter === 'upcoming') return !t.done && t.date >= todayStr
    if (filter === 'done') return t.done
    return true
  })

  // Group by date
  const grouped: Record<string, Todo[]> = {}
  for (const t of filtered) {
    if (!grouped[t.date]) grouped[t.date] = []
    grouped[t.date].push(t)
  }
  const sortedDates = Object.keys(grouped).sort()

  const counts = {
    upcoming: todos.filter(t => !t.done && t.date >= todayStr).length,
    all: todos.length,
    done: todos.filter(t => t.done).length,
  }

  return (
    <div className="max-w-xl space-y-5">
      {/* Add task */}
      <div className="bg-white border border-[#EBEBEB] rounded-[10px] p-4 space-y-3">
        <p className="text-[12px] font-[500] text-[#6B6B6B]">New task</p>
        <div className="flex gap-2">
          <input
            type="date"
            value={newDate}
            onChange={e => setNewDate(e.target.value)}
            className="text-[13px] bg-[#FAFAFA] border border-[#EBEBEB] rounded-[6px] px-2.5 py-1.5 outline-none focus:border-[#D97706] text-[#111111] shrink-0"
          />
          <input
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="What do you need to do?"
            className="flex-1 text-[13px] bg-[#FAFAFA] border border-[#EBEBEB] rounded-[6px] px-2.5 py-1.5 outline-none focus:border-[#D97706] placeholder:text-[#ABABAB] text-[#111111]"
            disabled={adding}
          />
          <button
            onClick={handleAdd}
            disabled={!newText.trim() || !newDate || adding}
            className="w-8 h-8 flex items-center justify-center rounded-[6px] bg-[#D97706] text-white disabled:opacity-40 hover:bg-[#B45309] transition-colors shrink-0"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-[#FAFAFA] border border-[#EBEBEB] rounded-[8px] p-1">
        {(['upcoming', 'all', 'done'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'flex-1 py-1.5 text-[12px] font-[500] rounded-[6px] capitalize transition-colors',
              filter === f
                ? 'bg-white text-[#111111] shadow-sm'
                : 'text-[#ABABAB] hover:text-[#6B6B6B]'
            )}
          >
            {f} {counts[f] > 0 && <span className="ml-1 opacity-60">{counts[f]}</span>}
          </button>
        ))}
      </div>

      {/* Task list */}
      {sortedDates.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 border border-[#EBEBEB] border-dashed rounded-[10px] gap-2">
          <CheckSquare size={20} className="text-[#ABABAB]" />
          <p className="text-[13px] text-[#ABABAB]">
            {filter === 'upcoming' ? 'No upcoming tasks. Add one above.' : 'Nothing here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDates.map(date => (
            <div key={date}>
              {/* Date header */}
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={12} className={cn(
                  date < todayStr ? 'text-[#ABABAB]' : date === todayStr ? 'text-[#D97706]' : 'text-[#5B5BD6]'
                )} />
                <span className={cn(
                  'text-[12px] font-[500]',
                  date < todayStr ? 'text-[#ABABAB]' : date === todayStr ? 'text-[#D97706]' : 'text-[#5B5BD6]'
                )}>
                  {formatDateLabel(date, todayStr)}
                </span>
                {date < todayStr && <span className="text-[10px] text-[#ABABAB]">overdue</span>}
              </div>

              {/* Tasks for this date */}
              <div className="bg-white border border-[#EBEBEB] rounded-[10px] divide-y divide-[#EBEBEB]">
                {grouped[date].map(todo => (
                  <div key={todo.id} className="flex items-center gap-3 px-4 py-3 group">
                    <button
                      onClick={() => handleToggle(todo)}
                      className={cn(
                        'w-4 h-4 rounded-[3px] border flex items-center justify-center shrink-0 transition-colors',
                        todo.done
                          ? 'bg-[#D97706] border-[#D97706] text-white'
                          : 'border-[#EBEBEB] hover:border-[#D97706]'
                      )}
                    >
                      {todo.done && <span className="text-[9px] font-bold">✓</span>}
                    </button>
                    <span className={cn(
                      'flex-1 text-[14px]',
                      todo.done ? 'line-through text-[#ABABAB]' : 'text-[#111111]'
                    )}>
                      {todo.text}
                    </span>
                    <button
                      onClick={() => handleDelete(todo.id)}
                      className="opacity-0 group-hover:opacity-100 text-[#ABABAB] hover:text-[#DC2626] transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
