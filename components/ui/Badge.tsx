import { cn } from '@/lib/utils'

type Variant = 'safe' | 'borderline' | 'atrisk' | 'neutral' | 'accent'

const VARIANTS: Record<Variant, string> = {
  safe:       'bg-[rgba(26,158,95,0.12)] text-[#1A9E5F]',
  borderline: 'bg-[rgba(217,119,6,0.12)] text-[#D97706]',
  atrisk:     'bg-[rgba(220,38,38,0.12)] text-[#DC2626]',
  neutral:    'bg-[rgba(107,107,107,0.10)] text-[#6B6B6B]',
  accent:     'bg-[rgba(91,91,214,0.10)] text-[#5B5BD6]',
}

export function Badge({ variant = 'neutral', children, className }: {
  variant?: Variant
  children: React.ReactNode
  className?: string
}) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 text-[12px] font-[500] rounded-[6px] leading-tight',
      VARIANTS[variant],
      className
    )}>
      {children}
    </span>
  )
}

export function attendanceBadge(pct: number, target: number) {
  if (pct >= target) return 'safe'
  if (pct >= target - 5) return 'borderline'
  return 'atrisk'
}
