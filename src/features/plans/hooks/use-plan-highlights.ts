'use client'

import { useTranslations } from 'next-intl'

import { isBenefitEnabled, levelDisplay, toggleDisplay, type PlanHighlightKey } from '@/shared/cms'

import type { PlanView } from '../types/plan.types'

const LEVEL_LABELS = {
  layout: { basic: 'layoutBasic', '2d3d': 'layout2d3d', '2d3dPlus': 'layout2d3dPlus' },
  interiorEstimate: { rough: 'estimateRough', detailed: 'estimateDetailed', optimized: 'estimateOptimized' },
  advisory: { online: 'advisoryOnline', priority: 'advisoryPriority', expert: 'advisoryExpert' }
} as const

/**
 * Dòng "quyền lợi nổi bật" trên thẻ gói (epic DesignPackageManagement §3, §5) —
 * đọc từ `highlights` admin chọn. Quyền lợi theo lượt tự kèm con số; quyền lợi
 * có nội dung hiện nội dung; quyền lợi đã tắt tự rời khỏi danh sách.
 */
export function usePlanHighlights() {
  const tRows = useTranslations('plans.comparison.rows')
  const tValues = useTranslations('plans.comparison.values')
  const tHighlights = useTranslations('plans.highlights')

  const lineOf = (plan: PlanView, key: PlanHighlightKey): string | null => {
    if (!isBenefitEnabled(plan, key)) return null
    if (key === 'designCredits') return tHighlights('designCredits', { count: plan.designCredits })
    if (key === 'libraryCredits') return tHighlights('libraryCredits', { count: plan.libraryCredits })

    if (key === 'layout' || key === 'interiorEstimate' || key === 'advisory') {
      const display = levelDisplay(plan.benefits[key])
      if (display.kind === 'text') return display.text
      if (display.kind === 'level') {
        const labels: Record<string, string> = LEVEL_LABELS[key]
        const valueKey = labels[display.level]
        return valueKey ? `${tRows(key)}: ${tValues(valueKey as Parameters<typeof tValues>[0])}` : tRows(key)
      }
      return tRows(key)
    }

    const display = toggleDisplay(plan.benefits.toggles[key])
    return display.kind === 'text' ? display.text : tRows(key)
  }

  return (plan: PlanView): string[] =>
    plan.highlights.map((key) => lineOf(plan, key)).filter((line): line is string => Boolean(line))
}
