import { PLANS_COPY_KEYS, plansCopyField, plansCopyPath, type PlansSectionKey } from '@/shared/cms/plans-sections'
import type { HomeSectionDef } from './home-sections.service'
import { COMPARISON_HEADER_KEYS, comparisonContentAdapter } from './plans-comparison.service'
import { valueContentAdapter } from './plans-value.service'

export const PLANS_SECTIONS: readonly HomeSectionDef[] = (Object.keys(PLANS_COPY_KEYS) as PlansSectionKey[]).map(
  (key) => ({
    key,
    textKey: `plans_${key}`,
    fields: (key === 'comparison' ? COMPARISON_HEADER_KEYS : key === 'value' ? ['title'] : PLANS_COPY_KEYS[key]).map(
      (field) => ({
        name: plansCopyField(field),
        kind: key === 'notes' || field === 'subtitle' || field.startsWith('cells.') ? 'textarea' : 'text',
        defaultPath: plansCopyPath(key, field)
      })
    ),
    lists: [],
    ...(key === 'comparison'
      ? { contentAdapter: comparisonContentAdapter }
      : key === 'value'
        ? { contentAdapter: valueContentAdapter }
        : {})
  })
)
