import { http } from '@/shared/lib/api'
import { mergeApiIntoPlans, type BmtPublishedPlanItem } from '@/shared/cms/plans-merge'
import type { PagedResult } from '@/shared/types'
import type { BmtPageSectionAdmin, BmtPageSectionWrite } from './handbook.api'

/** CMS trang bảng giá: quyền news.manage, version và validation theo PageSectionCatalog. */
const BASE = '/admin/pages/plans/sections'

export const plansPageAdminApi = {
  /** Chỉ đọc bản gói công khai để khởi tạo bảng cũ; CMS không ghi vào API gói. */
  comparisonDefaultsPlans: async () => {
    const published = await http.get<PagedResult<BmtPublishedPlanItem>>('/plans', {
      params: { kind: 'Design', pageSize: 100 }
    })
    return mergeApiIntoPlans([], published.items)
  },
  listSections: (locale: string) => http.get<BmtPageSectionAdmin[]>(BASE, { params: { locale } }),
  saveSection: (sectionKey: string, body: BmtPageSectionWrite) =>
    http.put<BmtPageSectionAdmin>(`${BASE}/${sectionKey}`, body),
  deleteSection: (sectionKey: string, locale: string) =>
    http.delete<void>(`${BASE}/${sectionKey}`, { params: { locale } })
}
