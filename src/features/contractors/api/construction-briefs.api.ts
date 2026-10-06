import { env } from '@/shared/config/env'
import { quotationApi } from '@/shared/quotations'
import { constructionSitesApi } from './construction-sites.api'
import { briefDrafts, requireBriefUserId, siteToBrief } from './brief-drafts'
import type { SaveBriefPayload } from './contractors.api'
import type { CreateBriefFromDesignPayload } from './contractors.api'
import type { SiteDetail } from '../types/construction-site.types'
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
  listBriefSummaries: async () =>
    Promise.all(
      (await constructionBriefsApi.listBriefs()).map(async (brief) => {
        if (!brief.constructionSiteId || env.NEXT_PUBLIC_USE_MOCK_API) return { brief, invitedCount: 0 }
        const summary = await quotationApi.summary(brief.constructionSiteId)
        requireBriefUserId(brief.userId)
        return { brief, invitedCount: summary.used, invitationLimit: summary.limit }
      })
    ),
  completeBrief: async (projectId: string) => constructionBriefsApi.getBrief(projectId)
}
