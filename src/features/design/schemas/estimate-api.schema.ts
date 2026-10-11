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
  longitude: z.number().min(-180).max(180).nullable(),
  // Luồng bốn chặng (TDD-PROJ-007 mục A). Tuỳ chọn để BE chưa có các trường này vẫn đọc được; có khoá
  // `desiredBedrooms` (kể cả null) là BE đã hỗ trợ. Giá trị null phải giữ nguyên, không bỏ khoá.
  lotFrontageM: nullableText.optional(),
  lotDepthM: nullableText.optional(),
  entranceSide: z.enum(['Left', 'Right', 'Top', 'Bottom']).nullable().optional(),
  desiredBedrooms: z.number().int().nullable().optional(),
  hasGarage: z.boolean().nullable().optional()
})

export const estimateDetailSchema = z.object({
  estimateId: z.string().uuid(),
  name: z.string(),
  nameVersion: z.number().int().nonnegative(),
  canRename: z.boolean(),
  inputVersion: z.number().int().nonnegative(),
  catalogRevisionId: nullableText,
  input,
  // Luồng cũ: Draft/Processing/Succeeded/Failed. Luồng bốn chặng có thể trả thêm InProgress/Completed (BR-PROJ-008).
  state: z.string(),
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
      // Mã gốc của app demo (TDD-PROJ-007 mục B); BE cũ không trả.
      baseCode: z.string().nullable().optional(),
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
