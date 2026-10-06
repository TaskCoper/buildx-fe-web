'use client'

import { Info } from 'lucide-react'
import type { ReactNode } from 'react'

import { Label } from '@/shared/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/lib/utils'

interface FieldLabelProps {
  htmlFor?: string
  children: ReactNode
  /** Nội dung tooltip (i) — bảng mục III.2. */
  hint: string
  required?: boolean
  className?: string
}

/**
 * Nhãn trường kèm biểu tượng (i) (quy ước xuyên suốt, mục I).
 * Di chuột / chạm vào hiện tooltip giải thích ngắn phải nhập gì.
 */
export function FieldLabel({ htmlFor, children, hint, required, className }: FieldLabelProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Label htmlFor={htmlFor} className='text-sm font-medium'>
        {children}
        {required ? <span className='text-destructive ml-0.5'>*</span> : null}
      </Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type='button'
            aria-label={hint}
            className='text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none'
          >
            <Info className='size-4' />
          </button>
        </TooltipTrigger>
        <TooltipContent className='max-w-xs text-pretty'>{hint}</TooltipContent>
      </Tooltip>
    </div>
  )
}
