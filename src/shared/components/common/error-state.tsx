'use client'

import { AlertTriangle } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'

interface ErrorStateProps {
  title: string
  description?: string
  /** Label for the retry button. When omitted, no button is shown. */
  retryLabel?: string
  onRetry?: () => void
  action?: ReactNode
  className?: string
}

/** Consistent inline error display with an optional retry action. */
export function ErrorState({ title, description, retryLabel, onRetry, action, className }: ErrorStateProps) {
  return (
    <div
      role='alert'
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-12 text-center',
        className
      )}
    >
      <div className='bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-full'>
        <AlertTriangle className='size-6' />
      </div>
      <h3 className='mt-4 text-sm font-semibold'>{title}</h3>
      {description ? <p className='text-muted-foreground mt-1 max-w-sm text-sm'>{description}</p> : null}
      {(retryLabel && onRetry) || action ? (
        <div className='mt-6 flex items-center gap-2'>
          {retryLabel && onRetry ? (
            <Button variant='outline' onClick={onRetry}>
              {retryLabel}
            </Button>
          ) : null}
          {action}
        </div>
      ) : null}
    </div>
  )
}
