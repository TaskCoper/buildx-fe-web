import { http, httpClient } from '@/shared/lib/api'
import type { PagedResult } from '@/shared/types'
import { normalizeSite, type AdminConstructionSite } from './construction-sites.logic'

/**
 * CÔNG TRÌNH — góc nhìn NHÂN VIÊN (STORY-SITE-002, TDD-SITE-001). Chỉ có hai route đọc:
 * khách tự tạo / sửa / xoá công trình ở `/me/construction-sites`, nhân viên kể cả admin
 * không được ghi hộ (BR-SITE-002).
 *
 * Phạm vi xem do BE tính từ quyền: `assignment.manage` (admin luôn có) thấy mọi công trình;
 * chỉ có `supervision.complete` thì chỉ thấy công trình của gói mình đang phụ trách; không
 * có cả hai → 403. Không có tham số lọc / tìm kiếm / sắp xếp, thứ tự mặc định mới nhất
 * trước. Logic chuẩn hoá nằm ở `construction-sites.logic.ts`.
 */
const BASE = '/admin/construction-sites'

export const constructionSitesAdminApi = {
  async list(params: { pageIndex: number; pageSize: number }): Promise<PagedResult<AdminConstructionSite>> {
    const page = await http.get<PagedResult<unknown>>(BASE, { params })
    return { ...page, items: (page.items ?? []).map(normalizeSite) }
  },

  async download(siteId: string, attachmentId: string): Promise<Blob> {
    const response = await httpClient.get<Blob>(
      `/construction-sites/${encodeURIComponent(siteId)}/attachments/${encodeURIComponent(attachmentId)}/content`,
      { responseType: 'blob' }
    )
    return response.data
  },

  async get(siteId: string): Promise<AdminConstructionSite> {
    return normalizeSite(await http.get<unknown>(`${BASE}/${siteId}`))
  }
}
