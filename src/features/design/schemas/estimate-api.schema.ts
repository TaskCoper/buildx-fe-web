import { z } from 'zod'

const nullableText = z.string().nullable()
const input = z.object({
  buildingTypeId: nullableText,
  areaM2: nullableText,
  description: nullableText,
  provinceCode: nullableText,
  provinceName: nullableText.optional(),
  wardCode: nullableText,
  wardName: nullableText.optional(),
  locationDatasetVersion: nullableText,
  addressDetail: nullableText,
  finishPackage: z.enum(['Basic', 'Standard', 'Vip']).nullable(),
  floorCount: z.number().int().positive().nullable(),
  hasTum: z.boolean().nullable(),
  architectureStyleId: nullableText,
  interiorStyleId: nullableText,
  inputImageUrl: nullableText,
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable()
})

export const estimateDetailSchema = z.object({
  estimateId: z.string().uuid(),
  name: z.string(),
  nameVersion: z.number().int().nonnegative(),
  canRename: z.boolean(),
  inputVersion: z.number().int().nonnegative(),
  catalogRevisionId: nullableText,
  input,
  state: z.enum(['Draft', 'Processing', 'Succeeded', 'Failed']),
  failureCode: nullableText.optional(),
  canEdit: z.boolean(),
  writeDeniedCode: nullableText.optional(),
  missingFields: z.array(z.string())
})

const style = z.object({ styleId: z.string().uuid(), name: z.string(), imageUrl: z.string().url() })
export const estimateCatalogSchema = z.object({
  catalogRevisionId: nullableText,
  buildingTypes: z.array(
    z.object({
      buildingTypeId: z.string().uuid(),
      name: z.string(),
      floorsEnabled: z.boolean(),
      tumEnabled: z.boolean(),
      architectureEnabled: z.boolean(),
      interiorEnabled: z.boolean(),
      floorCounts: z.array(z.number().int().positive()),
      architectureStyleIds: z.array(z.string().uuid()),
      interiorStyleIds: z.array(z.string().uuid())
    })
  ),
  architectureStyles: z.array(style),
  interiorStyles: z.array(style)
})

export const generationSchema = z.object({
  operationId: z.string().uuid(),
  state: z.enum(['Pending', 'Succeeded', 'Failed', 'TimedOut']),
  acceptedAtUtc: z.string(),
  deadlineUtc: nullableText,
  settledAtUtc: nullableText.optional(),
  failureCode: nullableText.optional(),
  resultUrl: nullableText.optional()
})
