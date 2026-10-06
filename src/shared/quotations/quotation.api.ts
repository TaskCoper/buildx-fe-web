import { z } from 'zod'
import { http, httpClient } from '@/shared/lib/api'
import {
  quotationAdminDetailSchema,
  quotationDetailSchema,
  quotationPageSchema,
  quotationSummarySchema,
  type SubmitQuotation,
  type QuotationStatus
} from './quotation.types'

export const quotationApi = {
  summary: async (siteId: string, pageIndex = 1) =>
    quotationSummarySchema.parse(
      await http.get(`/me/construction-sites/${siteId}/quotation-requests`, { params: { pageIndex, pageSize: 100 } })
    ),
  detail: async (id: string) => quotationDetailSchema.parse(await http.get(`/me/quotation-requests/${id}`)),
  submit: async (siteId: string, body: SubmitQuotation, key: string) =>
    z
      .object({ id: z.string().uuid(), status: z.literal('Sent'), createdAtUtc: z.string(), wasReplay: z.boolean() })
      .parse(
        await http.post(`/me/construction-sites/${siteId}/quotation-requests`, body, {
          headers: { 'Idempotency-Key': key }
        })
      ),
  adminList: async (params: {
    pageIndex: number
    pageSize: number
    status?: QuotationStatus
    contractorId?: string
    siteId?: string
  }) => quotationPageSchema.parse(await http.get('/admin/quotation-requests', { params })),
  adminDetail: async (id: string) =>
    quotationAdminDetailSchema.parse(await http.get(`/admin/quotation-requests/${id}`)),
  update: async (
    id: string,
    body: { status: QuotationStatus; appointmentAt: string; internalNote: string | null; expectedVersion: number }
  ) =>
    z
      .object({ id: z.string().uuid(), version: z.number().int().positive(), changed: z.boolean() })
      .parse(await http.patch(`/admin/quotation-requests/${id}`, body)),
  download: async (requestId: string, attachmentId: string) =>
    (
      await httpClient.get<Blob>(`/quotation-requests/${requestId}/attachments/${attachmentId}/content`, {
        responseType: 'blob'
      })
    ).data
}
