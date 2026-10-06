import { http } from '@/shared/lib/api'
import type { PagedResult } from '@/shared/types'
import type { ConstructionSite, SiteInput, SupervisionGrant } from '../types/site.types'

/**
 * Công trình của khách (`/me/construction-sites`, TDD-SITE-001) và gói giám sát
 * (`/me/supervision-grants`, TDD-SUB-004). Cần phiên khách đã xác minh; nhân
 * viên gọi bị 403. Ghi kèm `Idempotency-Key`; sửa/gán dùng `expectedVersion`.
 */

/** Kết quả `POST /assign` — `wasAlreadyApplied=true` khi trả lại lần gửi trước. */
export interface AssignGrantResult {
  grantId: string
  constructionSiteId: string
  state: string
  version: number
  wasAlreadyApplied: boolean
}

const idempotent = () => ({ headers: { 'Idempotency-Key': crypto.randomUUID() } })

export const siteApi = {
  listSites: () =>
    http.get<PagedResult<ConstructionSite>>('/me/construction-sites', { params: { pageIndex: 1, pageSize: 100 } }),

  getSite: (id: string) => http.get<ConstructionSite>(`/me/construction-sites/${id}`),

  createSite: (body: SiteInput) => http.post<ConstructionSite>('/me/construction-sites', body, idempotent()),

  updateSite: (id: string, body: SiteInput & { expectedVersion: number }) =>
    http.put<ConstructionSite>(`/me/construction-sites/${id}`, body, idempotent()),

  deleteSite: (id: string) => http.delete<void>(`/me/construction-sites/${id}`),

  listGrants: () =>
    http.get<PagedResult<SupervisionGrant>>('/me/supervision-grants', { params: { pageIndex: 1, pageSize: 100 } }),

  getGrant: (id: string) => http.get<SupervisionGrant>(`/me/supervision-grants/${id}`),

  assignGrant: (grantId: string, constructionSiteId: string, expectedVersion: number) =>
    http.post<AssignGrantResult>(
      `/me/supervision-grants/${grantId}/assign`,
      { constructionSiteId, expectedVersion },
      idempotent()
    )
}
