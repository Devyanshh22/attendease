import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, error, className, id, ...props }, ref
) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-[13px] font-[500] text-[#111111]">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        {...props}
        className={cn(
          'w-full rounded-[8px] border border-[#EBEBEB] bg-[#FAFAFA] px-3 py-2 text-[14px] text-[#111111] placeholder:text-[#ABABAB]',
          'outline-none focus:border-[#5B5BD6] focus:ring-2 focus:ring-[rgba(91,91,214,0.18)] transition-colors duration-150',
          error && 'border-[#DC2626] focus:ring-[rgba(220,38,38,0.15)]',
          className
        )}
      />
      {error && <p className="text-[12px] text-[#DC2626]">{error}</p>}
    </div>
  )
})
