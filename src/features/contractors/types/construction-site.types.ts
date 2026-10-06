import { z } from 'zod'

export const PLANNED_STARTS = ['ASAP', 'Within1To3Months', 'Within3To6Months', 'Undecided'] as const
export const ATTACHMENT_GROUPS = ['Drawing', 'ConditionPhoto'] as const
const id = z.string().uuid()
const nullableId = id.nullable()

export const siteProfileSchema = z.object({
  areaM2: z.string(),
  provinceCode: z.string(),
  wardCode: z.string(),
  locationDatasetVersion: z.string(),
  addressDetail: z.string(),
  buildingTypeId: id,
  floorCount: z.number().int().positive().nullable(),
  hasTum: z.boolean().nullable(),
  architectureStyleId: nullableId,
  interiorStyleId: nullableId
})
export const siteCatalogSchema = z.object({
  catalogRevisionId: id,
  types: z.array(
    z.object({
      id,
      name: z.string(),
      floorsEnabled: z.boolean(),
      tumEnabled: z.boolean(),
      architectureEnabled: z.boolean(),
      interiorEnabled: z.boolean(),
      floorCounts: z.array(z.number().int().positive()),
      architectureStyleIds: z.array(id),
      interiorStyleIds: z.array(id)
    })
  ),
  styles: z.array(
    z.object({ id, group: z.enum(['Architecture', 'Interior']), name: z.string(), imageUrl: z.string() })
  ),
  conditions: z.array(
    z.object({ id, name: z.string(), displayOrder: z.number(), isSelectable: z.boolean(), version: z.number() })
  ),
  plannedStarts: z.array(z.enum(PLANNED_STARTS))
})
export const siteSourceSchema = z.object({
  estimateId: id,
  operationId: id,
  profile: siteProfileSchema,
  provinceName: z.string(),
  wardName: z.string(),
  catalog: siteCatalogSchema
})
export const siteAttachmentSchema = z.object({
  id,
  attachmentGroup: z.enum(ATTACHMENT_GROUPS),
  originalName: z.string(),
  mediaType: z.string(),
  sizeBytes: z.number(),
  createdAtUtc: z.string(),
  contentPath: z.string()
})
export const siteDetailSchema = z.object({
  constructionSiteId: id,
  name: z.string(),
  address: z.string(),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  version: z.number().int().positive(),
  createdAtUtc: z.string(),
  updatedAtUtc: z.string(),
  profile: siteProfileSchema,
  catalogRevisionId: id,
  conditionId: id,
  conditionName: z.string(),
  budgetVnd: z.string(),
  plannedStart: z.enum(PLANNED_STARTS),
  provinceName: z.string(),
  wardName: z.string(),
  sourceEstimateId: nullableId,
  sourceResultPath: z.string().nullable().optional(),
  buildingTypeName: z.string(),
  architectureStyleName: z.string().nullable(),
  interiorStyleName: z.string().nullable(),
  files: z.array(siteAttachmentSchema),
  canEdit: z.boolean(),
  canDelete: z.boolean(),
  lockedFields: z.array(z.string())
})
export const siteSavedSchema = siteDetailSchema.pick({
  constructionSiteId: true,
  name: true,
  address: true,
  latitude: true,
  longitude: true,
  version: true,
  createdAtUtc: true,
  updatedAtUtc: true
})
export const locationsSchema = z.object({
  datasetVersion: z.string(),
  provinces: z.array(z.object({ code: z.string(), name: z.string() }))
})
export const wardsSchema = z.object({
  datasetVersion: z.string(),
  provinceCode: z.string(),
  wards: z.array(z.object({ code: z.string(), name: z.string() }))
})
export const suggestionsSchema = z.array(
  z.object({ refId: z.string(), name: z.string(), address: z.string(), display: z.string() })
)
export const coordinatesSchema = z.object({
  refId: z.string(),
  display: z.string(),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180)
})
export const sourcePageSchema = z.object({
  items: z.array(z.object({ estimateId: id, name: z.string(), operationId: id })),
  pageIndex: z.number(),
  pageSize: z.number(),
  totalCount: z.number(),
  hasNextPage: z.boolean()
})
export type SiteProfile = z.infer<typeof siteProfileSchema>
export type SiteCatalog = z.infer<typeof siteCatalogSchema>
export type SiteSource = z.infer<typeof siteSourceSchema>
export type SiteDetail = z.infer<typeof siteDetailSchema>
export type SiteSaved = z.infer<typeof siteSavedSchema>
export type SiteAttachment = z.infer<typeof siteAttachmentSchema>
export type AttachmentGroup = (typeof ATTACHMENT_GROUPS)[number]
export type PlannedStart = (typeof PLANNED_STARTS)[number]
export interface SiteFields {
  name: string
  conditionId: string
  budgetVnd: string
  plannedStart: PlannedStart
}
export type CreateSiteRequest = SiteFields & { latitude: number; longitude: number; uploadIds: string[] } & (
    | { sourceEstimateId: string; profile?: never; expectedCatalogRevisionId?: never }
    | { sourceEstimateId?: never; profile: SiteProfile; expectedCatalogRevisionId: string }
  )
export type UpdateSiteRequest = SiteFields & {
  expectedVersion: number
  profile?: SiteProfile
  latitude?: number
  longitude?: number
}
export interface SiteFormValues extends SiteFields, SiteProfile {
  sourceEstimateId: string
  scope: string
  scopeNote: string
}
export interface PendingSiteFile {
  uploadId: string
  attachmentGroup: AttachmentGroup
  name: string
  sizeBytes: number
  mediaType: string
}
export interface SiteDraft {
  values: SiteFormValues
  catalog?: SiteCatalog
  source?: SiteSource
  location?: { addressKey: string; latitude: number; longitude: number; display: string }
  uploads: PendingSiteFile[]
  /** Write before POST; an interrupted response must be reconciled before retry. */
  pendingCreation?: { request: CreateSiteRequest; startedAt: string }
}
