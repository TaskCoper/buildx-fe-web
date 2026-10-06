import { Loader2 } from 'lucide-react'

import { cn } from '@/shared/lib/utils'

interface LoadingSpinnerProps {
  className?: string
  /** Accessible label announced to screen readers. */
  label?: string
}

/** Centered, accessible loading indicator. */
export function LoadingSpinner({ className, label = 'Loading' }: LoadingSpinnerProps) {
  return (
    <div role='status' aria-live='polite' className={cn('flex items-center justify-center p-6', className)}>
      <Loader2 className='text-muted-foreground size-5 animate-spin' />
      <span className='sr-only'>{label}</span>
    </div>
  )
}
