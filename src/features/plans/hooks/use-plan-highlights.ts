'use client'

import { planHighlightLines, usePlanHighlightLabels } from '@/shared/cms'
import type { PlanView } from '../types/plan.types'

export function usePlanHighlights() {
  const labels = usePlanHighlightLabels()
  return (plan: PlanView): string[] => planHighlightLines(plan, plan.cycle ?? 'Month', labels)
}
