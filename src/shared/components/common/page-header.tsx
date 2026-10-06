import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  /** Right-aligned actions (buttons, menus). */
  actions?: ReactNode
  className?: string
}

/** Standard page heading block used at the top of dashboard pages. */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className='space-y-1'>
        <h1 className='text-title font-semibold tracking-tight'>{title}</h1>
        {description ? <p className='text-muted-foreground text-sm'>{description}</p> : null}
      </div>
      {actions ? <div className='flex items-center gap-2'>{actions}</div> : null}
    </div>
  )
}
