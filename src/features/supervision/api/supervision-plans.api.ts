import { readPlanMetadata } from '@/shared/cms'
import { http } from '@/shared/lib/api'
import type { PagedResult } from '@/shared/types'
import { mergeApiIntoPackages, type BmtSupervisionPlanItem } from './supervision.merge'

/** Keep transport and invalid-data errors visible; never turn them into legacy plans. */
export async function fetchPublishedSupervisionPlans(): Promise<BmtSupervisionPlanItem[]> {
  const page = await http.get<PagedResult<BmtSupervisionPlanItem>>('/plans', {
    params: { kind: 'Supervision', pageSize: 100 }
  })
  for (const item of page.items) readPlanMetadata(item.revision?.metadata)
  mergeApiIntoPackages([], page.items)
  return page.items
}
