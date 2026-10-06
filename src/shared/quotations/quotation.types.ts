import { z } from 'zod'

export const QUOTATION_STATUSES = ['Sent', 'Received', 'ContractorReceived', 'Completed'] as const
const named = z.object({ id: z.string().uuid(), name: z.string() })
export const quotationItemSchema = z.object({
  id: z.string().uuid(),
  constructionSiteId: z.string().uuid(),
  siteName: z.string(),
  contractorId: z.string().uuid(),
  contractorName: z.string(),
  status: z.enum(QUOTATION_STATUSES),
  desiredAtUtc: z.string().datetime({ offset: true }),
  appointmentAtUtc: z.string().datetime({ offset: true }),
  createdAtUtc: z.string().datetime({ offset: true })
})
export const quotationPageSchema = z.object({
  items: z.array(quotationItemSchema),
  pageIndex: z.number().int(),
  pageSize: z.number().int(),
  totalCount: z.number().int().nonnegative(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean()
})
export const quotationSummarySchema = z.object({
  limit: z.number().int().positive(),
  used: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative(),
  requests: quotationPageSchema
})
export const quotationDetailSchema = z.object({
  request: quotationItemSchema,
  contactPhone: z.string(),
  surveyNote: z.string().nullable(),
  snapshot: z.object({
    siteName: z.string(),
    siteVersion: z.number().int().positive(),
    schemaVersion: z.literal(1),
    profile: z.object({
      areaM2: z.string().regex(/^\d+(?:\.\d+)?$/),
      budgetVnd: z.string().regex(/^\d+$/),
      plannedStart: z.enum(['ASAP', 'Within1To3Months', 'Within3To6Months', 'Undecided']),
      address: z.object({
        provinceName: z.string(),
        wardName: z.string(),
        addressDetail: z.string(),
        formattedAddress: z.string(),
        latitude: z.number(),
        longitude: z.number()
      }),
      condition: named,
      buildingType: named,
      floorCount: z.number().int().nullable(),
      hasTum: z.boolean().nullable(),
      architectureStyle: named.nullable(),
      interiorStyle: named.nullable(),
      sourceEstimateId: z.string().uuid().nullable(),
      sourceGenerationOperationId: z.string().uuid().nullable(),
      siteCreatedAtUtc: z.string(),
      siteUpdatedAtUtc: z.string(),
      catalogRevisionId: z.string().uuid()
    }),
    attachments: z.array(
      z.object({
        id: z.string().uuid(),
        attachmentGroup: z.string(),
        originalName: z.string(),
        mediaType: z.string(),
        sizeBytes: z.number().int().nonnegative(),
        contentPath: z.string()
      })
    )
  })
})
export const quotationAdminDetailSchema = z.object({
  request: quotationDetailSchema,
  customerId: z.string().guid(),
  customerEmail: z.string(),
  internalNote: z.string().nullable(),
  version: z.number().int().positive(),
  updatedAtUtc: z.string(),
  // .NET accepts fixed user GUIDs (including the bootstrap admin seed), which
  // do not necessarily carry an RFC UUID version/variant.
  updatedBy: z.string().guid().nullable()
})
export type QuotationItem = z.infer<typeof quotationItemSchema>
export type QuotationDetail = z.infer<typeof quotationDetailSchema>
export type QuotationSummary = z.infer<typeof quotationSummarySchema>
export type QuotationStatus = QuotationItem['status']
export interface SubmitQuotation {
  contractorId: string
  desiredAt: string
  contactPhone: string | null
  surveyNote: string | null
}
