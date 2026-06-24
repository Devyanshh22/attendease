'use client'

import { usePathname } from 'next/navigation'
import { Button } from './ui/Button'
import { CalendarCheck } from 'lucide-react'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard/today':     'Today',
  '/dashboard/calendar':  'Calendar',
  '/dashboard/overview':  'Dashboard',
  '/dashboard/subjects':  'Subjects',
  '/dashboard/timetable': 'Timetable',
  '/dashboard/reports':   'Reports',
  '/dashboard/todos':     'Tasks',
  '/dashboard/settings':  'Settings',
}

interface Props {
  semesterName?: string | null
  hasUnmarkedToday?: boolean
  onMarkToday?: () => void
}

export function TopBar({ semesterName, hasUnmarkedToday, onMarkToday }: Props) {
  const pathname = usePathname()

  // find the closest matching key
  const titleKey = Object.keys(PAGE_TITLES)
    .filter(k => pathname === k || pathname.startsWith(k + '/'))
    .sort((a, b) => b.length - a.length)[0]

  const title = PAGE_TITLES[titleKey ?? ''] ?? ''

  return (
    <header className="h-[56px] shrink-0 flex items-center justify-between px-6 bg-white border-b border-[#EBEBEB]">
      <div className="flex items-center gap-2.5">
        <img src="/icon.svg" alt="" className="md:hidden w-[26px] h-[26px] rounded-[6px]" />
        <h1 className="text-[15px] font-[500] text-[#111111]">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {semesterName && (
          <span className="hidden sm:inline text-[12px] text-[#ABABAB] bg-[#FAFAFA] border border-[#EBEBEB] rounded-[6px] px-2.5 py-1">
            {semesterName}
          </span>
        )}
        {hasUnmarkedToday && (
          <Button size="sm" onClick={onMarkToday} className="gap-1.5">
            <CalendarCheck size={14} />
            Mark today
          </Button>
        )}
      </div>
    </header>
  )
}
