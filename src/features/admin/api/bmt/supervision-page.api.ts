import { http } from '@/shared/lib/api'
import { env } from '@/shared/config/env'
import { cmsDb, cmsSeedOf } from '@/shared/cms'
import { mergeApiIntoPackages, type BmtSupervisionPlanItem } from '@/shared/cms/supervision-merge'
import type { PagedResult } from '@/shared/types'
import type { BmtPageSectionAdmin, BmtPageSectionWrite } from './handbook.api'
const BASE = '/admin/pages/supervision/sections'
export const supervisionPageAdminApi = {
  defaultsPackages: async () => {
    const stored = cmsDb.list('supervisionPackages')
    const base = stored.length ? stored : cmsSeedOf('supervisionPackages')
    if (env.NEXT_PUBLIC_USE_MOCK_API) return base
    const response = await http.get<PagedResult<BmtSupervisionPlanItem>>('/plans', {
      params: { kind: 'Supervision', pageSize: 100 }
    })
    return mergeApiIntoPackages(base, response.items)
  },
  listSections: (locale: string) => http.get<BmtPageSectionAdmin[]>(BASE, { params: { locale } }),
  saveSection: (key: string, body: BmtPageSectionWrite) => http.put<BmtPageSectionAdmin>(`${BASE}/${key}`, body),
  deleteSection: (key: string, locale: string) => http.delete<void>(`${BASE}/${key}`, { params: { locale } })
}
