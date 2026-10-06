import { useAuthStore } from '@/shared/auth'
import type { ProjectBrief, ProjectScale } from '../types/contractor.types'
import { emptyBrief, isBlankBrief } from '../services/brief.service'
import type { SiteDetail } from '../types/construction-site.types'

/** Explicit browser drafts and contractor needs, isolated by account. Never a server mock. */
export function requireBriefUserId(expectedUserId?: string) {
  const userId = useAuthStore.getState().user?.id
  if (!userId) throw new Error('AuthenticationRequired')
  if (expectedUserId && expectedUserId !== userId) throw new Error('ConstructionSiteDraftOwnerMismatch')
  return userId
}
function key(userId: string) {
  return `savico.construction-site-drafts.${userId}`
}
function read(userId: string): Record<string, ProjectBrief> {
  requireBriefUserId(userId)
  const raw = localStorage.getItem(key(userId))
  return raw ? (JSON.parse(raw) as Record<string, ProjectBrief>) : {}
}
export const briefDrafts = {
  get: (id: string, userId = requireBriefUserId()) => {
    const brief = read(userId)[id]
    if (brief && (brief.userId !== userId || brief.ownershipVersion !== 1))
      throw new Error('ConstructionSiteDraftOwnerMismatch')
    return brief
  },
  list: (userId = requireBriefUserId()) =>
    Object.values(read(userId)).filter(
      (brief) => brief.userId === userId && brief.ownershipVersion === 1 && !isBlankBrief(brief)
    ),
  // These candidates only locate an owned API request. Never display them before its response.
  serverCandidate: (id: string, userId = requireBriefUserId()) => {
    const brief = read(userId)[id]
    return brief?.constructionSiteId && (brief.userId === undefined || brief.userId === userId) ? brief : undefined
  },
  candidateForSite: (siteId: string, userId = requireBriefUserId()) =>
    Object.values(read(userId)).find(
      (brief) => brief.constructionSiteId === siteId && (brief.userId === undefined || brief.userId === userId)
    ),
  put: (brief: ProjectBrief) => {
    const userId = requireBriefUserId()
    if (brief.userId !== userId || brief.ownershipVersion !== 1) throw new Error('ConstructionSiteDraftOwnerMismatch')
    const store = read(userId)
    const existing = store[brief.id]
    if (
      existing &&
      ((existing.userId !== undefined && existing.userId !== userId) ||
        (existing.ownershipVersion !== 1 &&
          (!brief.constructionSiteId || existing.constructionSiteId !== brief.constructionSiteId)))
    )
      throw new Error('ConstructionSiteDraftOwnerMismatch')
    const owned = { ...brief, userId }
    store[brief.id] = owned
    localStorage.setItem(key(userId), JSON.stringify(store))
    return owned
  },
  empty: (id = `local-${crypto.randomUUID()}`, userId = requireBriefUserId()): ProjectBrief => ({
    ...emptyBrief(),
    userId: requireBriefUserId(userId),
    ownershipVersion: 1,
    id,
    status: 'ready',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })
}
export function siteToBrief(
  site: SiteDetail,
  current?: ProjectBrief,
  id = site.constructionSiteId,
  userId = requireBriefUserId()
): ProjectBrief {
  requireBriefUserId(userId)
  if (current?.userId !== undefined && current.userId !== userId) throw new Error('ConstructionSiteDraftOwnerMismatch')
  const starts = {
    ASAP: 'asap',
    Within1To3Months: 'in-1-3-months',
    Within3To6Months: 'in-3-6-months',
    Undecided: 'undecided'
  } as const
  return {
    ...(current ?? briefDrafts.empty(id, userId)),
    userId,
    ownershipVersion: 1,
    id,
    constructionSiteId: site.constructionSiteId,
    constructionSite: site,
    name: site.name,
    buildingType: site.buildingTypeName,
    landArea: Number(site.profile.areaM2),
    // Compatibility labels only. Review reads the authoritative names/strings from constructionSite.
    siteCondition: current?.siteCondition ?? 'empty',
    scale:
      site.profile.floorCount && site.profile.floorCount <= 5
        ? ((site.profile.floorCount === 1 ? 'ground' : `ground+${site.profile.floorCount - 1}`) as ProjectScale)
        : 'ground',
    hasAttic: site.profile.hasTum,
    address: {
      provinceCode: Number(site.profile.provinceCode),
      provinceName: site.provinceName,
      wardCode: Number(site.profile.wardCode),
      wardName: site.wardName,
      street: site.profile.addressDetail
    },
    budget: Number(site.budgetVnd),
    startWindow: starts[site.plannedStart],
    selfCreated: !site.sourceEstimateId,
    documents: site.files.map((file) => ({
      id: file.id,
      name: file.originalName,
      sizeBytes: file.sizeBytes,
      kind: file.mediaType.startsWith('image/') && !file.mediaType.includes('vnd.') ? 'image' : 'document',
      attachmentGroup: file.attachmentGroup,
      contentPath: file.contentPath
    })),
    version: site.version,
    createdAt: site.createdAtUtc,
    updatedAt: site.updatedAtUtc
  }
}
