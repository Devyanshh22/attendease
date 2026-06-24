import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

const VARIANTS: Record<Variant, string> = {
  primary:   'bg-[#5B5BD6] text-white hover:bg-[#4949b8] active:bg-[#3b3b9e]',
  secondary: 'bg-white border border-[#EBEBEB] text-[#111111] hover:bg-[#FAFAFA] active:bg-[#F0F0F0]',
  danger:    'bg-white border border-[#EBEBEB] text-[#DC2626] hover:bg-[rgba(220,38,38,0.06)]',
  ghost:     'text-[#6B6B6B] hover:text-[#111111] hover:bg-[rgba(0,0,0,0.04)]',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md'
}

export function Button({ variant = 'primary', size = 'md', className, children, ...props }: Props) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-[500] rounded-[8px] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed select-none',
        size === 'md' ? 'px-4 py-2 text-[14px]' : 'px-3 py-1.5 text-[13px]',
        VARIANTS[variant],
        className
      )}
    >
      {children}
    </button>
  )
}
