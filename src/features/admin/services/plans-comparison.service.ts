import { comparisonCopy, legacyComparisonGroups, readComparisonGroups } from '@/shared/cms/plans-comparison-content'
import { plansCopyField, plansCopyPath } from '@/shared/cms/plans-sections'
import type { PlanView } from '@/shared/cms/plans-merge'
import { defaultText, type HomeSectionDef } from './home-sections.service'

export const COMPARISON_HEADER_KEYS = [
  'title',
  'criterion',
  'choosePlanRow',
  'buttons.basic',
  'buttons.advanced',
  'buttons.pro'
] as const

const headers = (saved: Record<string, unknown> | null | undefined, messages: unknown) =>
  Object.fromEntries(
    COMPARISON_HEADER_KEYS.map((key) => [
      plansCopyField(key),
      comparisonCopy(saved ?? undefined, key, defaultText(messages, plansCopyPath('comparison', key)))
    ])
  )

export const comparisonContentAdapter: NonNullable<HomeSectionDef['contentAdapter']> = {
  formValues: (saved, messages) => {
    const root = messages as { plansComparisonDefaults?: PlanView[]; plansComparisonLocale?: string }
    const groups =
      readComparisonGroups(saved?.groups) ??
      legacyComparisonGroups(
        root.plansComparisonDefaults ?? [],
        (key, values) =>
          comparisonCopy(saved ?? undefined, key, defaultText(messages, plansCopyPath('comparison', key)), values),
        (plan) =>
          `${plan.gift?.title ?? ''} ${defaultText(messages, ['plans', 'gift', 'valuePrefix'])} ${new Intl.NumberFormat(root.plansComparisonLocale === 'en' ? 'en-US' : 'vi-VN').format(plan.gift?.value ?? 0)}đ`
      )
    return { ...headers(saved, messages), groups }
  },
  buildContent: (values, messages) => {
    const content: Record<string, unknown> = {}
    for (const key of COMPARISON_HEADER_KEYS) {
      const field = plansCopyField(key)
      const value = typeof values[field] === 'string' ? values[field].trim() : ''
      if (value && value !== defaultText(messages, plansCopyPath('comparison', key)).trim()) content[field] = value
    }
    // Không bỏ [] và không so với bảng mặc định: đây là toàn bộ nội dung CMS đã chọn.
    content.groups = values.groups
    return content
  }
}
