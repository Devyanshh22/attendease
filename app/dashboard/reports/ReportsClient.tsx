'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Download, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react'
import type { WeekReport, SemesterSubjectRow, ExportRow } from '@/lib/analytics'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'

interface Props {
  semesterName: string
  semStartDate: string
  semEndDate: string
  weekReport: WeekReport
  weekOffset: number
  semesterRows: SemesterSubjectRow[]
  exportData: ExportRow[]
}

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function generateInsights(report: WeekReport): string[] {
  const insights: string[] = []
  const perfect = report.subjects.filter(s => s.scheduled > 0 && s.attended === s.scheduled)
  const zero = report.subjects.filter(s => s.scheduled > 0 && s.attended === 0)
  const low = report.subjects.filter(s => s.scheduled > 0 && s.weeklyPct < 80 && s.attended > 0)

  for (const s of zero) {
    insights.push(`You missed all ${s.subjectName} lectures this week — at ${s.weeklyPct}% weekly attendance.`)
  }
  for (const s of low) {
    insights.push(`${s.subjectName} had ${s.attended} of ${s.scheduled} lectures attended (${s.weeklyPct}%) this week.`)
  }
  for (const s of perfect) {
    insights.push(`Perfect week for ${s.subjectName} — keep it up!`)
  }
  if (report.weeklyPct >= 90) {
    insights.unshift(`Great week overall — ${report.weeklyPct}% attendance across all subjects.`)
  }
  return insights.slice(0, 3)
}

export default function ReportsClient({
  semesterName, semStartDate, semEndDate, weekReport, weekOffset, semesterRows, exportData,
}: Props) {
  const [tab, setTab] = useState<'week' | 'semester'>('week')
  const [exportOpen, setExportOpen] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const atRisk = semesterRows.filter(r => r.pct < 80)
  const insights = generateInsights(weekReport)

  function navigate(delta: number) {
    const next = weekOffset + delta
    router.push(`/dashboard/reports?weekOffset=${next}`)
  }

  function exportCSV() {
    const header = ['Date', 'Day', 'Subject', 'Start Time', 'End Time', 'Status', 'Notes']
    const rows = exportData.map(r => [r.date, r.day, r.subject, r.startTime, r.endTime, r.status, r.notes].map(v => `"${v}"`).join(','))
    const csv = [header.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const today = new Date().toISOString().split('T')[0]
    a.download = `AttendEase_${semesterName.replace(/\s+/g, '_')}_${today}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExportOpen(false)
    toast('CSV exported successfully', 'success')
  }

  async function exportPDF() {
    setExportOpen(false)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()
      const today = new Date().toISOString().split('T')[0]
      const margin = 14

      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('AttendEase — Attendance Report', margin, 20)

      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100)
      doc.text(`Semester: ${semesterName}`, margin, 30)
      doc.text(`Period: ${semStartDate} to ${semEndDate}`, margin, 37)
      doc.text(`Generated: ${today}`, margin, 44)

      // Summary table
      doc.setTextColor(0)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text('Subject Summary', margin, 58)

      const headers = ['Subject', 'Scheduled', 'Attended', 'Missed', '%']
      const colWidths = [70, 25, 25, 25, 20]
      const colX = colWidths.reduce((acc, w, i) => { acc.push((acc[i - 1] ?? margin) + (i === 0 ? 0 : colWidths[i - 1])); return acc }, [] as number[])

      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      let y = 66
      headers.forEach((h, i) => doc.text(h, colX[i], y))
      doc.setLineWidth(0.5)
      doc.line(margin, y + 2, 195, y + 2)

      doc.setFont('helvetica', 'normal')
      for (const row of semesterRows) {
        y += 8
        const vals = [row.subjectName, row.totalScheduled, row.attended, row.missed, `${row.pct}%`]
        vals.forEach((v, i) => doc.text(String(v), colX[i], y))
      }

      // Day-by-day log
      y += 14
      if (y > 250) { doc.addPage(); y = 20 }
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text('Attendance Log', margin, y)

      y += 8
      const logHeaders = ['Date', 'Day', 'Subject', 'Time', 'Status']
      const logWidths = [22, 22, 55, 30, 22]
      const logX = logWidths.reduce((acc, w, i) => { acc.push((acc[i - 1] ?? margin) + (i === 0 ? 0 : logWidths[i - 1])); return acc }, [] as number[])

      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      logHeaders.forEach((h, i) => doc.text(h, logX[i], y))
      doc.line(margin, y + 2, 195, y + 2)

      doc.setFont('helvetica', 'normal')
      for (const row of exportData.slice(0, 200)) {
        y += 6
        if (y > 280) { doc.addPage(); y = 20 }
        const vals = [row.date, row.day.slice(0, 3), row.subject.slice(0, 28), `${row.startTime}–${row.endTime}`, row.status]
        vals.forEach((v, i) => doc.text(v, logX[i], y))
      }

      doc.save(`AttendEase_Report_${today}.pdf`)
      toast('PDF exported successfully', 'success')
    } catch {
      toast('PDF export failed. Please try again.', 'error')
    }
  }

  return (
    <div className="max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-[500] text-[#111111]">Reports</h1>
        <div className="relative">
          <button
            onClick={() => setExportOpen(!exportOpen)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-[8px] border border-[#EBEBEB] text-[13px] text-[#6B6B6B] hover:text-[#111111] hover:border-[#111111] transition-colors"
          >
            <Download size={13} />
            Export
          </button>
          {exportOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
              <div className="absolute right-0 top-full mt-1.5 z-20 bg-white border border-[#EBEBEB] rounded-[8px] shadow-lg overflow-hidden w-40">
                <button onClick={exportCSV} className="w-full text-left px-4 py-2.5 text-[13px] text-[#111111] hover:bg-[#FAFAFA] transition-colors">
                  Export CSV
                </button>
                <button onClick={exportPDF} className="w-full text-left px-4 py-2.5 text-[13px] text-[#111111] hover:bg-[#FAFAFA] transition-colors border-t border-[#EBEBEB]">
                  Export PDF
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* At-risk banner */}
      {atRisk.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-[8px] border bg-[rgba(220,38,38,0.05)] border-[rgba(220,38,38,0.18)]">
          <AlertTriangle size={15} className="text-[#DC2626] mt-0.5 shrink-0" />
          <p className="text-[13px] text-[#DC2626]">
            <strong>{atRisk.length} subject{atRisk.length > 1 ? 's' : ''} below 80%:</strong>{' '}
            {atRisk.map(r => r.subjectName).join(', ')}
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-[#EBEBEB] rounded-[8px] p-1 w-fit">
        {(['week', 'semester'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-1.5 rounded-[6px] text-[13px] transition-colors duration-150',
              tab === t ? 'bg-white text-[#111111] font-[500] shadow-sm' : 'text-[#6B6B6B] hover:text-[#111111]'
            )}
          >
            {t === 'week' ? 'This week' : 'This semester'}
          </button>
        ))}
      </div>

      {tab === 'week' && (
        <div className="space-y-4">
          {/* Week navigator */}
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-[6px] border border-[#EBEBEB] text-[#6B6B6B] hover:text-[#111111] transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-[14px] font-[500] text-[#111111]">
              {fmtDate(weekReport.weekStart)} – {fmtDate(weekReport.weekEnd)}
            </span>
            <button onClick={() => navigate(1)} disabled={weekOffset >= 0} className="w-8 h-8 flex items-center justify-center rounded-[6px] border border-[#EBEBEB] text-[#6B6B6B] hover:text-[#111111] disabled:opacity-30 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Scheduled', value: weekReport.scheduled },
              { label: 'Attended', value: weekReport.attended, color: '#1A9E5F' },
              { label: 'Missed', value: weekReport.missed, color: '#DC2626' },
              { label: 'Weekly %', value: `${weekReport.weeklyPct}%` },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white border border-[#EBEBEB] rounded-[10px] px-4 py-3">
                <p className="text-[11px] text-[#ABABAB]">{label}</p>
                <p className="text-[20px] font-[600] mt-0.5" style={{ color: color ?? '#111111' }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Per-subject table */}
          <div className="bg-white border border-[#EBEBEB] rounded-[10px] overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#EBEBEB] text-[#ABABAB] text-[11px]">
                  <th className="text-left px-5 py-3 font-[500]">Subject</th>
                  <th className="text-right px-4 py-3 font-[500]">Scheduled</th>
                  <th className="text-right px-4 py-3 font-[500]">Attended</th>
                  <th className="text-right px-4 py-3 font-[500]">Missed</th>
                  <th className="text-right px-5 py-3 font-[500]">Weekly %</th>
                </tr>
              </thead>
              <tbody>
                {weekReport.subjects.filter(s => s.scheduled > 0).map(s => (
                  <tr
                    key={s.subjectId}
                    className={cn(
                      'border-b border-[#EBEBEB] last:border-0',
                      s.attended === s.scheduled && s.scheduled > 0 ? 'bg-[rgba(26,158,95,0.03)]' :
                      s.attended === 0 && s.scheduled > 0 ? 'bg-[rgba(220,38,38,0.03)]' : ''
                    )}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="font-[500] text-[#111111]">{s.subjectName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-[#6B6B6B]">{s.scheduled}</td>
                    <td className="px-4 py-3 text-right text-[#1A9E5F] font-[500]">{s.attended}</td>
                    <td className="px-4 py-3 text-right text-[#DC2626] font-[500]">{s.missed}</td>
                    <td className="px-5 py-3 text-right font-[600] text-[#111111]">{s.weeklyPct}%</td>
                  </tr>
                ))}
                {weekReport.subjects.filter(s => s.scheduled > 0).length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-6 text-center text-[#ABABAB] text-[13px]">No classes scheduled this week</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Insights */}
          {insights.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[13px] font-[500] text-[#111111]">Insights</h3>
              <div className="space-y-1.5">
                {insights.map((ins, i) => (
                  <div key={i} className="flex items-start gap-2.5 bg-white border border-[#EBEBEB] rounded-[8px] px-4 py-3">
                    <span className="text-[#5B5BD6] mt-0.5 text-[14px]">•</span>
                    <p className="text-[13px] text-[#6B6B6B]">{ins}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'semester' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#EBEBEB] rounded-[10px] overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#EBEBEB] text-[#ABABAB] text-[11px]">
                  <th className="text-left px-5 py-3 font-[500]">Subject</th>
                  <th className="text-right px-4 py-3 font-[500]">Scheduled</th>
                  <th className="text-right px-4 py-3 font-[500]">Attended</th>
                  <th className="text-right px-4 py-3 font-[500]">Missed</th>
                  <th className="text-right px-4 py-3 font-[500]">%</th>
                  <th className="text-right px-5 py-3 font-[500]">Trend</th>
                </tr>
              </thead>
              <tbody>
                {semesterRows.map(r => (
                  <tr key={r.subjectId} className="border-b border-[#EBEBEB] last:border-0 hover:bg-[#FAFAFA]">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                        <span className="font-[500] text-[#111111]">{r.subjectName}</span>
                        <span className="text-[11px] text-[#ABABAB]">{r.shortCode}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-[#6B6B6B]">{r.totalScheduled}</td>
                    <td className="px-4 py-3 text-right text-[#1A9E5F] font-[500]">{r.attended}</td>
                    <td className="px-4 py-3 text-right text-[#DC2626] font-[500]">{r.missed}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn(
                        'font-[600]',
                        r.pct >= 80 ? 'text-[#1A9E5F]' : r.pct >= 70 ? 'text-[#D97706]' : 'text-[#DC2626]'
                      )}>
                        {r.pct}%
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {r.trend === 'up' ? (
                        <span className="inline-flex items-center gap-1 text-[#1A9E5F] text-[12px]">
                          <TrendingUp size={13} /> Improving
                        </span>
                      ) : r.trend === 'down' ? (
                        <span className="inline-flex items-center gap-1 text-[#DC2626] text-[12px]">
                          <TrendingDown size={13} /> Declining
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#ABABAB] text-[12px]">
                          <Minus size={13} /> Stable
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {semesterRows.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-6 text-center text-[#ABABAB] text-[13px]">No subjects yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
