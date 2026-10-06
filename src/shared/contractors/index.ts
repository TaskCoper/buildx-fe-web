import { z } from 'zod'
import { http } from '@/shared/lib/api'

export const serviceRegionSchema = z.enum(['north', 'central', 'south'])
export type RegionCode = z.infer<typeof serviceRegionSchema>
const category = z.object({ id: z.string(), name: z.string() })
const filterOptionsSchema = z.object({
  buildingTypes: z.array(category),
  scopes: z.array(category),
  regions: z.array(z.object({ code: serviceRegionSchema, name: z.string() })),
  provinces: z.array(z.object({ code: z.string(), name: z.string(), regionCode: serviceRegionSchema })),
  provinceRegionVersion: z.string()
})
export type ContractorFilterOptions = z.infer<typeof filterOptionsSchema>
export async function getContractorFilterOptions(signal?: AbortSignal): Promise<ContractorFilterOptions> {
  return filterOptionsSchema.parse(await http.get<unknown>('/contractors/filter-options', { signal }))
}
export interface ContractorSearchFilters {
  region?: RegionCode
  radiusKm?: number
  constructionSiteId?: string
  buildingTypeIds?: string[]
  scopeIds?: string[]
  floorCount?: number
  minSimilarProjects?: number
  maxSimilarProjects?: number
}
