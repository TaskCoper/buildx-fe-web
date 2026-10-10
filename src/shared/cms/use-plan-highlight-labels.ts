'use client'

import { useTranslations } from 'next-intl'
import type { PlanHighlightLabels } from './plan-metadata'

export function usePlanHighlightLabels(): PlanHighlightLabels {
  const rows = useTranslations('plans.comparison.rows')
  const values = useTranslations('plans.comparison.values')
  const highlights = useTranslations('plans.highlights')
  return {
    row: (key) => rows(key as Parameters<typeof rows>[0]),
    level: (key) => values(key as Parameters<typeof values>[0]),
    quota: (key, count) => highlights(key, { count }),
    unlimited: (key) => highlights(key === 'designCredits' ? 'designUnlimited' : 'libraryUnlimited')
  }
}
