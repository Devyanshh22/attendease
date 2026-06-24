'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  CalendarDays, LayoutDashboard, BookOpen,
  Clock, BarChart2, Settings, Sun, MoreHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/dashboard/today',     label: 'Today',     Icon: Sun },
  { href: '/dashboard/calendar',  label: 'Calendar',  Icon: CalendarDays },
  { href: '/dashboard/overview',  label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/dashboard/subjects',  label: 'Subjects',  Icon: BookOpen },
  { href: '/dashboard/timetable', label: 'Timetable', Icon: Clock },
  { href: '/dashboard/reports',   label: 'Reports',   Icon: BarChart2 },
  { href: '/dashboard/settings',  label: 'Settings',  Icon: Settings },
]

interface Props {
  semesterName?: string | null
}

export function Sidebar({ semesterName }: Props) {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex w-[240px] shrink-0 flex-col bg-white border-r border-[#EBEBEB] h-screen sticky top-0">
      {/* Brand */}
      <div className="px-5 pt-6 pb-5">
        <span className="text-[16px] font-[500] text-[#111111] tracking-tight">AttendEase</span>
        {semesterName && (
          <p className="text-[12px] text-[#ABABAB] mt-0.5 truncate">{semesterName}</p>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-[8px] text-[14px] transition-colors duration-150',
                active
                  ? 'bg-[rgba(91,91,214,0.08)] text-[#5B5BD6] font-[500]'
                  : 'text-[#6B6B6B] hover:text-[#111111] hover:bg-[rgba(0,0,0,0.04)]'
              )}
            >
              <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

// Mobile bottom tab bar — Today, Calendar, Dashboard, More (dropdown)
const MOBILE_TABS = [
  { href: '/dashboard/today',    label: 'Today',    Icon: Sun },
  { href: '/dashboard/calendar', label: 'Calendar', Icon: CalendarDays },
  { href: '/dashboard/overview', label: 'Dashboard', Icon: LayoutDashboard },
]

const MORE_ITEMS = [
  { href: '/dashboard/timetable', label: 'Timetable', Icon: Clock },
  { href: '/dashboard/subjects',  label: 'Subjects',  Icon: BookOpen },
  { href: '/dashboard/reports',   label: 'Reports',   Icon: BarChart2 },
  { href: '/dashboard/settings',  label: 'Settings',  Icon: Settings },
]

export function BottomTabBar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const moreActive = MORE_ITEMS.some(({ href }) => pathname === href || pathname.startsWith(href + '/'))

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#EBEBEB] flex" ref={ref}>
      {MOBILE_TABS.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors duration-150',
              active ? 'text-[#5B5BD6]' : 'text-[#ABABAB]'
            )}
          >
            <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
            {label}
          </Link>
        )
      })}

      {/* More button */}
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors duration-150',
          open || moreActive ? 'text-[#5B5BD6]' : 'text-[#ABABAB]'
        )}
      >
        <MoreHorizontal size={20} strokeWidth={open || moreActive ? 2.2 : 1.8} />
        More
      </button>

      {/* Popup menu */}
      {open && (
        <div className="absolute bottom-[calc(100%+6px)] right-2 bg-white border border-[#EBEBEB] rounded-[12px] shadow-lg py-1.5 min-w-[160px] z-50">
          {MORE_ITEMS.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 text-[14px] transition-colors',
                  active
                    ? 'text-[#5B5BD6] font-[500] bg-[rgba(91,91,214,0.06)]'
                    : 'text-[#111111] hover:bg-[#F5F5F5]'
                )}
              >
                <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </Link>
            )
          })}
        </div>
      )}
    </nav>
  )
}
