import { env } from '@/shared/config/env'
import { quotationApi } from '@/shared/quotations'
import type { PagedResult } from '@/shared/types'
import { constructionSitesApi } from './construction-sites.api'
import { briefDrafts, requireBriefUserId, siteToBrief } from './brief-drafts'
import type { SaveBriefPayload } from './contractors.api'
import type { CreateBriefFromDesignPayload } from './contractors.api'
import type { SiteDetail } from '../types/construction-site.types'
import type { ProjectBrief, ProjectBriefSummary } from '../types/contractor.types'
const guid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i

export async function allConstructionSites(userId = requireBriefUserId()): Promise<SiteDetail[]> {
  const items: SiteDetail[] = []
  for (let pageIndex = 1; ; pageIndex++) {
    const page = await constructionSitesApi.list(pageIndex)
    requireBriefUserId(userId)
    items.push(...page.items)
    if (!page.hasNextPage) return items
  }
}
/** Thêm số lời mời đã gửi của công trình vào hồ sơ (mỗi công trình một lần gọi `quotationApi.summary`). */
async function summarize(brief: ProjectBrief): Promise<ProjectBriefSummary> {
  if (!brief.constructionSiteId || env.NEXT_PUBLIC_USE_MOCK_API) return { brief, invitedCount: 0 }
  const summary = await quotationApi.summary(brief.constructionSiteId)
  requireBriefUserId(brief.userId)
  return { brief, invitedCount: summary.used, invitationLimit: summary.limit }
}

export const constructionBriefsApi = {
  createBrief: async () => briefDrafts.put(briefDrafts.empty()),
  createBriefFromDesign: async (payload: CreateBriefFromDesignPayload) => {
    const draft = briefDrafts.empty()
    // Selecting the actual eligible source happens on S10; design route IDs are not SITE source IDs.
    return briefDrafts.put({ ...draft, name: payload.name })
  },
  getBrief: async (projectId: string) => {
    const userId = requireBriefUserId()
    const draft = briefDrafts.serverCandidate(projectId, userId) ?? briefDrafts.get(projectId, userId)
    const siteId = draft?.constructionSiteId ?? (guid.test(projectId) ? projectId : undefined)
    if (siteId) return briefDrafts.put(siteToBrief(await constructionSitesApi.detail(siteId), draft, projectId, userId))
    return draft ?? briefDrafts.empty(projectId)
  },
  /**
   * Xoá hồ sơ dự án. Đã tạo công trình trên server thì gọi `DELETE /me/construction-sites/{id}` TRƯỚC (BE từ chối thì
   * giữ nguyên bản nháp), rồi mới dọn bản nháp trên thiết bị. Hồ sơ chỉ có bản nháp thì chỉ xoá trên thiết bị.
   */
  deleteBrief: async (projectId: string) => {
    const userId = requireBriefUserId()
    const draft = briefDrafts.serverCandidate(projectId, userId) ?? briefDrafts.get(projectId, userId)
    const siteId = draft?.constructionSiteId ?? (guid.test(projectId) ? projectId : undefined)
    if (siteId) await constructionSitesApi.remove(siteId)
    requireBriefUserId(userId)
    briefDrafts.remove(projectId, siteId, userId)
  },
  saveBrief: async (projectId: string, payload: SaveBriefPayload) => {
    const current = briefDrafts.get(projectId) ?? briefDrafts.empty(projectId)
    return briefDrafts.put({ ...current, ...payload, id: projectId, updatedAt: new Date().toISOString() })
  },
  listBriefs: async () => {
    const userId = requireBriefUserId()
    const sites = await allConstructionSites(userId)
    const drafts = briefDrafts.list(userId)
    return [
      ...sites.map((site) => {
        const draft = briefDrafts.candidateForSite(site.constructionSiteId, userId)
        return briefDrafts.put(siteToBrief(site, draft, draft?.id, userId))
      }),
      ...drafts.filter((draft) => !draft.constructionSiteId)
    ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },
  listBriefSummaries: async () => Promise.all((await constructionBriefsApi.listBriefs()).map(summarize)),
  /**
   * Một trang "Hồ sơ của tôi": `GET /me/construction-sites?pageIndex&pageSize` (mới tạo trước), chỉ đếm lời mời cho các
   * công trình của trang này. Bản nháp chỉ có trên thiết bị (chưa tạo công trình) không nằm trong phân trang của BE nên
   * hiện ở đầu trang 1; `totalCount` chỉ đếm công trình trên server.
   */
  listBriefSummariesPage: async (pageIndex: number, pageSize: number): Promise<PagedResult<ProjectBriefSummary>> => {
    const userId = requireBriefUserId()
    const page = await constructionSitesApi.list(pageIndex, pageSize)
    requireBriefUserId(userId)
    const briefs = page.items.map((site) => {
      const draft = briefDrafts.candidateForSite(site.constructionSiteId, userId)
      return briefDrafts.put(siteToBrief(site, draft, draft?.id, userId))
    })
    const localDrafts =
      pageIndex === 1
        ? briefDrafts
            .list(userId)
            .filter((draft) => !draft.constructionSiteId)
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        : []
    return {
      items: await Promise.all([...localDrafts, ...briefs].map(summarize)),
      pageIndex: page.pageIndex,
      pageSize: page.pageSize,
      totalCount: page.totalCount,
      hasNextPage: page.hasNextPage,
      hasPreviousPage: pageIndex > 1
    }
  },
  completeBrief: async (projectId: string) => constructionBriefsApi.getBrief(projectId)
}
