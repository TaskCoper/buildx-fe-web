import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  /** Primary action (e.g. a "Create" button). */
  action?: ReactNode
  className?: string
}

/**
 * Consistent empty-state placeholder used across feature lists and tables.
 */
export function EmptyState({ icon: Icon = Inbox, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-12 text-center',
        className
      )}
    >
      <div className='bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full'>
        <Icon className='size-6' />
      </div>
      <h3 className='mt-4 text-sm font-semibold'>{title}</h3>
      {description ? <p className='text-muted-foreground mt-1 max-w-sm text-sm'>{description}</p> : null}
      {action ? <div className='mt-6'>{action}</div> : null}
    </div>
  )
}
