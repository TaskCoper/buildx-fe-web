import { http } from '@/shared/lib/api'
import type { PagedResult } from '@/shared/types'
import type { PlanView } from '../types/plan.types'
import { mergeApiIntoPlans, type BmtPublishedPlanItem } from './plans.merge'

/** Errors propagate to the query; empty API results stay empty. No CMS or mock reads. */
export const bmtPlansApi = {
  listPlans: async (): Promise<PlanView[]> => {
    const page = await http.get<PagedResult<BmtPublishedPlanItem>>('/plans', {
      params: { kind: 'Design', pageSize: 100 }
    })
    return mergeApiIntoPlans([], page.items)
  }
}
