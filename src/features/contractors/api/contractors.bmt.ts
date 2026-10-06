import { http } from '@/shared/lib/api'
import { serviceRegionSchema, type ContractorSearchFilters } from '@/shared/contractors'
import type { Contractor } from '../types/contractor.types'
import { contractorFromApi, isUuid, normalizeContractor, normalizeProject, type ApiProject } from './contractors.logic'

/** Public contractor directory uses the BMT API. Mock mode is selected only in contractors.api.ts. */
interface PublicContractorItem {
  contractorId: string
  name: string
  shortDescription?: string | null
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  logoUrl?: string | null
  buildingTypes: { id: string; name: string }[]
  scopes: { id: string; name: string }[]
  rating?: number | null
  ratingCount?: number | null
  projectCount: number
  similarProjectCount?: number
  distanceKm?: number | null
  provinceCode?: string | null
  regionCode?: string | null
  serviceAreaText?: string | null
  surveyHours?: number | null
  acceptingProjects?: boolean | null
}

/** PublicContractorItem → Contractor (type UI). Field không có nguồn API để mặc định. */
function toContractor(item: PublicContractorItem): Contractor {
  return {
    id: item.contractorId,
    name: item.name,
    ...(item.logoUrl ? { logoUrl: item.logoUrl } : {}),
    kind: '',
    // Hồ sơ công khai = đã Hiện = đã kiểm (BR-CTR-002 "publish = verified").
    verified: true,
    rating: item.rating ?? 0,
    reviewCount: item.ratingCount ?? 0,
    ratingKnown: item.rating != null,
    reviewCountKnown: item.ratingCount != null,
    similarProjects: item.similarProjectCount ?? 0,
    completedProjects: item.projectCount ?? 0,
    distanceKm: item.distanceKm ?? 0,
    serviceAreas: (item.serviceAreaText ?? '')
      .split(/[,;\n]/)
      .map((part) => part.trim())
      .filter(Boolean),
    region: item.regionCode == null ? null : serviceRegionSchema.parse(item.regionCode),
    provinceCode: item.provinceCode ?? null,
    distanceKnown: item.distanceKm != null,
    surveyWithinHours: item.surveyHours ?? 0,
    surveyTimeKnown: item.surveyHours != null,
    acceptingProjects: item.acceptingProjects ?? false,
    acceptingProjectsKnown: item.acceptingProjects != null,
    intro: '',
    strengths: [],
    photos: [],
    buildingTypeIds: (item.buildingTypes ?? []).map((b) => b.id),
    // API dùng phạm vi GUID động, FE dùng 4 mã cứng → không map, để trống.
    scopes: [],
    ...(item.shortDescription ? { shortDescription: item.shortDescription } : {}),
    officeAddress: item.address ?? '',
    foundedYear: 0,
    teamSize: 0,
    warrantyMonths: 0,
    legalChecks: [],
    featuredProjects: [],
    verifiedProjects: 0,
    partnership: { verified: false, since: '', contractCode: '', signedAt: '', pageCount: 0 },
    hidden: false
  }
}

async function listDirectory(filters: ContractorSearchFilters = {}, signal?: AbortSignal): Promise<Contractor[]> {
  const params = new URLSearchParams()
  if (filters.region) params.set('region', filters.region)
  if (filters.radiusKm !== undefined) params.set('radiusKm', String(filters.radiusKm))
  if (filters.constructionSiteId) params.set('constructionSiteId', filters.constructionSiteId)
  for (const id of filters.buildingTypeIds ?? []) params.append('buildingTypeIds', id)
  for (const id of filters.scopeIds ?? []) params.append('scopeIds', id)
  if (filters.floorCount !== undefined) params.set('floorCount', String(filters.floorCount))
  if (filters.minSimilarProjects !== undefined) params.set('minSimilarProjects', String(filters.minSimilarProjects))
  if (filters.maxSimilarProjects !== undefined) params.set('maxSimilarProjects', String(filters.maxSimilarProjects))
  const res = await http.get<{ items: PublicContractorItem[]; totalCount: number }>('/contractors', {
    params,
    signal
  })
  return res.items.map(toContractor)
}

export const bmtContractorsApi = {
  listDirectory,
  listContractors(
    _projectId: string,
    filters: ContractorSearchFilters = {},
    signal?: AbortSignal
  ): Promise<Contractor[]> {
    return listDirectory(filters, signal)
  },

  async getContractor(contractorId: string): Promise<Contractor> {
    const detail = normalizeContractor(await http.get<unknown>(`/contractors/${contractorId}`))
    if (!detail) throw new Error('InvalidContractorResponse')
    return contractorFromApi(detail)
  },

  /**
   * Chi tiết MỘT dự án của nhà thầu (`GET /contractors/{id}/projects/{projectId}`, công khai, hồ sơ cha
   * phải Hiện). `null` khi không có gì để bổ sung: id là của bản mock (BE không có, thẻ trong danh sách
   * đã đủ dữ liệu nên khỏi gọi), hoặc 404 `ContractorProjectNotFound` / lỗi mạng — giao diện giữ nguyên
   * dữ liệu thẻ.
   */
  async getContractorProject(contractorId: string, projectId: string): Promise<ApiProject | null> {
    if (!isUuid(contractorId) || !isUuid(projectId)) return null
    try {
      return normalizeProject(await http.get<unknown>(`/contractors/${contractorId}/projects/${projectId}`))
    } catch {
      return null
    }
  }
}
