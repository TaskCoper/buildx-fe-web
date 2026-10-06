'use client'

import { Card, Label, RadioGroupItem } from '@/shared/components/ui'
import { cn } from '@/shared/lib/utils'
import type { ReactNode } from 'react'

interface RadioCardOptionProps {
  value: string
  title: string
  description?: string
  icon?: ReactNode
  invalid?: boolean
  className?: string
  children?: ReactNode
}

export function RadioCardOption({
  value,
  title,
  description,
  icon,
  invalid,
  className,
  children
}: RadioCardOptionProps) {
  return (
    <Card
      className={cn(
        'group relative flex flex-col rounded-lg p-1',
        'has-data-[state=checked]:ring-2 has-data-[state=checked]:ring-primary/50 has-data-[state=checked]:shadow-primary/5 has-data-[state=checked]:ring-offset-2',
        invalid ? 'border-destructive' : 'border-border/70',
        className
      )}
    >
      <Label className='flex cursor-pointer flex-row items-center gap-2'>
        {icon && (
          <div className='text-muted-foreground group-has-data-[state=checked]:text-primary shrink-0 transition-colors'>
            {icon}
          </div>
        )}

        <div className='min-w-0 flex-1'>
          <p className='text-foreground text-sm font-semibold'>{title}</p>
          {description && <p className='text-muted-foreground text-xs'>{description}</p>}
        </div>

        <RadioGroupItem value={value} aria-label={title} className='mt-0.5 shrink-0 hidden' />
      </Label>

      {children && (
        <div
          className={cn(
            'grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity,margin] duration-300 ease-out',
            'group-has-data-[state=checked]:mt-3 group-has-data-[state=checked]:grid-rows-[1fr] group-has-data-[state=checked]:opacity-100'
          )}
        >
          <div className='min-h-0 overflow-hidden'>{children}</div>
        </div>
      )}
    </Card>
  )
}
