import { cn } from '@/lib/utils'

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white border border-[#EBEBEB] rounded-[10px] p-5', className)}>
      {children}
    </div>
  )
}
