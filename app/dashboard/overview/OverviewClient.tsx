'use client'

import { useState } from 'react'
import type { SubjectStats } from '@/lib/attendance'
import type { Subject } from '@/lib/types'
import { cn } from '@/lib/utils'

interface SubjectDatum {
  subject: Subject
  stats: SubjectStats
  sparkline: number[]
}

interface Props {
  semesterName: string
  currentWeek: number
  totalWeeks: number
  semProgress: number
  subjectData: SubjectDatum[]
  totAttended: number
  totMissed: number
  totScheduled: number
  overallPct: number
}

// ─── Ring ─────────────────────────────────────────────────────────────────────

function ProgressRing({ pct, status }: { pct: number; color?: string; status: string }) {
  const r = 34
  const cx = 40
  const circumference = 2 * Math.PI * r
  const stroke = pct === 0 ? 0 : Math.max(0, Math.min(1, pct / 100)) * circumference

  const arcColor =
    status === 'safe' ? '#1A9E5F' :
    status === 'borderline' ? '#D97706' : '#DC2626'

  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#EBEBEB" strokeWidth="6" />
      <circle
        cx={cx} cy={cx} r={r}
        fill="none"
        stroke={arcColor}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${stroke} ${circumference}`}
        transform="rotate(-90 40 40)"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text x={cx} y={cx + 5} textAnchor="middle" fontSize="13" fontWeight="600" fill="#111111">
        {pct}%
      </text>
    </svg>
  )
}

// ─── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 80, h = 28, barW = 14, gap = (w - barW * 4) / 3
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {data.map((val, i) => {
        const barH = Math.max(2, (val / 100) * (h - 2))
        const x = i * (barW + gap)
        const isCurrent = i === data.length - 1
        return (
          <rect
            key={i}
            x={x} y={h - barH} width={barW} height={barH}
            rx="2"
            fill={color}
            opacity={isCurrent ? 1 : 0.4}
          />
        )
      })}
    </svg>
  )
}

// ─── WhatIfCalculator ─────────────────────────────────────────────────────────

function WhatIfCalculator({ subjectData }: { subjectData: SubjectDatum[] }) {
  const [selectedId, setSelectedId] = useState(subjectData[0]?.subject.id ?? '')
  const [sliderPct, setSliderPct] = useState(100)

  const datum = subjectData.find(d => d.subject.id === selectedId)
  const stats = datum?.stats
  if (!stats) return null

  const remaining = stats.totalScheduled === 0
    ? 0
    : Math.max(0, stats.totalScheduled - stats.attended - stats.missed)
  // slider means "% of remaining I'll attend"
  const totalAfter = stats.totalScheduled
  const attendedAfter = stats.attended + Math.round((sliderPct / 100) * remaining)
  const projectedPct = totalAfter > 0 ? Math.round((attendedAfter / totalAfter) * 100) : stats.attendancePercent

  return (
    <div className="bg-white border border-[#EBEBEB] rounded-[10px] overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        onClick={() => {}}
      >
        <h3 className="text-[14px] font-[500] text-[#111111]">What-if calculator</h3>
      </button>
      <div className="px-5 pb-5 border-t border-[#EBEBEB] space-y-4 pt-4">
        {/* Subject selector */}
        <div>
          <label className="text-[12px] text-[#ABABAB] block mb-1.5">Subject</label>
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            className="w-full rounded-[8px] border border-[#EBEBEB] bg-[#FAFAFA] px-3 py-2 text-[13px] text-[#111111] outline-none focus:border-[#5B5BD6]"
          >
            {subjectData.map(d => (
              <option key={d.subject.id} value={d.subject.id}>{d.subject.name}</option>
            ))}
          </select>
        </div>

        {/* Current stats row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Current', value: `${stats.attendancePercent}%` },
            { label: 'Target', value: `${stats.target}%` },
            { label: 'Attended', value: stats.attended },
            { label: 'Remaining', value: remaining },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#FAFAFA] rounded-[8px] p-3 text-center">
              <p className="text-[11px] text-[#ABABAB]">{label}</p>
              <p className="text-[16px] font-[600] text-[#111111] mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        {/* Result cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className={cn(
            'rounded-[8px] p-3.5 border',
            stats.lecturesNeeded === 0
              ? 'bg-[rgba(26,158,95,0.05)] border-[rgba(26,158,95,0.2)]'
              : 'bg-[rgba(220,38,38,0.05)] border-[rgba(220,38,38,0.2)]'
          )}>
            <p className="text-[11px] text-[#ABABAB] mb-1">To reach {stats.target}%</p>
            {stats.lecturesNeeded === 0 ? (
              <p className="text-[14px] font-[600] text-[#1A9E5F]">You&apos;re already there ✓</p>
            ) : (
              <p className="text-[14px] font-[600] text-[#DC2626]">Attend next {stats.lecturesNeeded} lecture{stats.lecturesNeeded !== 1 ? 's' : ''}</p>
            )}
          </div>
          <div className={cn(
            'rounded-[8px] p-3.5 border',
            stats.lecturesSafeToMiss > 0
              ? 'bg-[rgba(26,158,95,0.05)] border-[rgba(26,158,95,0.2)]'
              : 'bg-[rgba(217,119,6,0.05)] border-[rgba(217,119,6,0.2)]'
          )}>
            <p className="text-[11px] text-[#ABABAB] mb-1">Safe to miss</p>
            {stats.lecturesSafeToMiss > 0 ? (
              <p className="text-[14px] font-[600] text-[#1A9E5F]">{stats.lecturesSafeToMiss} more lecture{stats.lecturesSafeToMiss !== 1 ? 's' : ''}</p>
            ) : (
              <p className="text-[14px] font-[600] text-[#D97706]">None — don&apos;t miss any</p>
            )}
          </div>
        </div>

        {/* Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[12px] text-[#ABABAB]">If I attend {sliderPct}% of remaining {remaining} lecture{remaining !== 1 ? 's' : ''}…</label>
            <span className="text-[12px] font-[600] text-[#111111]">{sliderPct}%</span>
          </div>
          <input
            type="range"
            min={0} max={100} value={sliderPct}
            onChange={e => setSliderPct(Number(e.target.value))}
            className="w-full accent-[#5B5BD6]"
          />
          <div className={cn(
            'rounded-[8px] p-3 text-center border',
            projectedPct >= stats.target
              ? 'bg-[rgba(26,158,95,0.05)] border-[rgba(26,158,95,0.2)]'
              : 'bg-[rgba(220,38,38,0.05)] border-[rgba(220,38,38,0.2)]'
          )}>
            <p className="text-[12px] text-[#ABABAB]">Projected final attendance</p>
            <p className={cn(
              'text-[22px] font-[600] mt-0.5',
              projectedPct >= stats.target ? 'text-[#1A9E5F]' : 'text-[#DC2626]'
            )}>
              {projectedPct}%
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function OverviewClient({
  semesterName, currentWeek, totalWeeks, semProgress,
  subjectData, totAttended, totMissed, totScheduled, overallPct,
}: Props) {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header + semester progress */}
      <div>
        <h1 className="text-[20px] font-[500] text-[#111111]">Dashboard</h1>
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-[12px] text-[#ABABAB]">
            <span>Week {currentWeek} of {totalWeeks} — {semesterName}</span>
            <span>{semProgress}% through semester</span>
          </div>
          <div className="h-1.5 bg-[#EBEBEB] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#5B5BD6] rounded-full transition-all duration-700"
              style={{ width: `${semProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Subject cards */}
      {subjectData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 border border-[#EBEBEB] border-dashed rounded-[10px] gap-2">
          <p className="text-[#ABABAB] text-[14px]">No subjects yet.</p>
          <a href="/dashboard/subjects" className="text-[13px] text-[#5B5BD6] hover:underline">Add subjects →</a>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {subjectData.map(({ subject: s, stats, sparkline }) => (
            <div key={s.id} className="bg-white border border-[#EBEBEB] rounded-[10px] p-4 space-y-3">
              {/* Top row */}
              <div className="flex items-start gap-3">
                {/* Left: name + badge */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className="text-[10px] font-[600] px-1.5 py-0.5 rounded-[3px] text-white"
                      style={{ backgroundColor: s.color }}
                    >
                      {s.short_code}
                    </span>
                    <span className={cn(
                      'text-[10px] font-[600] px-1.5 py-0.5 rounded-[4px]',
                      stats.status === 'safe'
                        ? 'bg-[rgba(26,158,95,0.1)] text-[#1A9E5F]'
                        : stats.status === 'borderline'
                        ? 'bg-[rgba(217,119,6,0.1)] text-[#D97706]'
                        : 'bg-[rgba(220,38,38,0.1)] text-[#DC2626]'
                    )}>
                      {stats.status === 'safe' ? 'Safe' : stats.status === 'borderline' ? 'Borderline' : 'At risk'}
                    </span>
                  </div>
                  <p className="text-[14px] font-[500] text-[#111111] truncate">{s.name}</p>
                </div>

                {/* Center: ring */}
                <ProgressRing pct={stats.attendancePercent} color={s.color} status={stats.status} />

                {/* Right: stats */}
                <div className="text-right shrink-0 min-w-[80px]">
                  <p className="text-[13px] font-[500] text-[#111111]">{stats.attended} / {stats.totalScheduled}</p>
                  <p className="text-[11px] text-[#ABABAB]">lectures</p>
                  <p className={cn('text-[11px] mt-1.5',
                    stats.status === 'safe' ? 'text-[#1A9E5F]' :
                    stats.status === 'borderline' ? 'text-[#D97706]' : 'text-[#DC2626]'
                  )}>
                    {stats.lecturesNeeded > 0
                      ? `Need ${stats.lecturesNeeded} more`
                      : `Safe to miss ${stats.lecturesSafeToMiss}`}
                  </p>
                </div>
              </div>

              {/* Sparkline */}
              <div className="flex items-end justify-between">
                <p className="text-[11px] text-[#ABABAB]">Last 4 weeks</p>
                <Sparkline data={sparkline} color={s.color} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Overall summary */}
      <div className="bg-white border border-[#EBEBEB] rounded-[10px] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-[500] text-[#111111]">Overall attendance</h3>
          <span className="text-[22px] font-[600] text-[#111111]">{overallPct}%</span>
        </div>
        {/* Stacked bar */}
        {totScheduled > 0 && (
          <div className="h-3 bg-[#EBEBEB] rounded-full overflow-hidden flex">
            <div
              className="h-full bg-[#1A9E5F] transition-all duration-700"
              style={{ width: `${(totAttended / totScheduled) * 100}%` }}
            />
            <div
              className="h-full bg-[#DC2626] transition-all duration-700"
              style={{ width: `${(totMissed / totScheduled) * 100}%` }}
            />
          </div>
        )}
        <div className="flex gap-5 text-[12px]">
          {[
            { dot: '#1A9E5F', label: 'Attended', val: totAttended },
            { dot: '#DC2626', label: 'Missed', val: totMissed },
            { dot: '#EBEBEB', label: 'Remaining', val: Math.max(0, totScheduled - totAttended - totMissed) },
          ].map(({ dot, label, val }) => (
            <div key={label} className="flex items-center gap-1.5 text-[#6B6B6B]">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dot }} />
              <span>{label}: <strong className="text-[#111111]">{val}</strong></span>
            </div>
          ))}
        </div>
      </div>

      {/* What-if calculator */}
      {subjectData.length > 0 && <WhatIfCalculator subjectData={subjectData} />}
    </div>
  )
}
