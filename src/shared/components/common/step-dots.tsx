import { cn } from '@/shared/lib/utils'

/** Status of a single step in a linear multi-step flow. */
export type StepStatus = 'locked' | 'active' | 'done'

/**
 * A compact row of step indicators (the BMT "floor" motif in miniature) used on
 * dashboard cards to show how far a design project has progressed. Pure
 * presentational — lives in `shared` so any feature can render it.
 */
export function StepDots({ statuses, className }: { statuses: readonly StepStatus[]; className?: string }) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {statuses.map((status, i) => (
        <span
          key={i}
          aria-hidden
          className={cn(
            'size-2.5 rounded-full transition-colors',
            status === 'done'
              ? 'bg-primary'
              : status === 'active'
                ? 'ring-primary/60 bg-primary/30 ring-2'
                : 'bg-border'
          )}
        />
      ))}
    </div>
  )
}
