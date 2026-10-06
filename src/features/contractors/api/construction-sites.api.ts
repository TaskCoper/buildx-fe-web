import { z } from 'zod'
import { env } from '@/shared/config/env'
import { http } from '@/shared/lib/api'
import {
  coordinatesSchema,
  locationsSchema,
  siteCatalogSchema,
  siteDetailSchema,
  siteSavedSchema,
  siteSourceSchema,
  sourcePageSchema,
  suggestionsSchema,
  wardsSchema,
  siteAttachmentSchema,
  type AttachmentGroup,
  type CreateSiteRequest,
  type UpdateSiteRequest
} from '../types/construction-site.types'
import { mockConstructionSitesApi } from './construction-sites.mock'

const base = '/me/construction-sites'
const uploadBase = '/me/construction-site-uploads'
const ticketSchema = z.object({
  uploadId: z.string().uuid(),
  state: z.string(),
  method: z.literal('PUT'),
  uploadUrl: z.string().url().nullable(),
  requiredHeaders: z.record(z.string(), z.string()),
  expiresAtUtc: z.string(),
  maxSizeBytes: z.number()
})
const statusSchema = z.object({
  uploadId: z.string().uuid(),
  state: z.string(),
  mediaType: z.string().nullable(),
  sizeBytes: z.number().nullable(),
  originalName: z.string()
})
const pageSchema = z.object({
  items: z.array(siteDetailSchema),
  pageIndex: z.number(),
  pageSize: z.number(),
  totalCount: z.number(),
  hasNextPage: z.boolean()
})

export const bmtConstructionSitesApi = {
  options: async () => siteCatalogSchema.parse(await http.get(`${base}/create-options`)),
  catalog: async (siteId: string) => siteCatalogSchema.parse(await http.get(`${base}/${siteId}/catalog`)),
  sources: async (pageIndex: number) =>
    sourcePageSchema.parse(await http.get(`${base}/estimate-sources`, { params: { pageIndex, pageSize: 20 } })),
  source: async (estimateId: string) =>
    siteSourceSchema.parse(await http.get(`${base}/estimate-sources/${estimateId}`)),
  create: async (body: CreateSiteRequest) => siteSavedSchema.parse(await http.post(base, body)),
  update: async (siteId: string, body: UpdateSiteRequest) =>
    siteSavedSchema.parse(await http.put(`${base}/${siteId}`, body)),
  detail: async (siteId: string) => siteDetailSchema.parse(await http.get(`${base}/${siteId}`)),
  list: async (pageIndex: number) => pageSchema.parse(await http.get(base, { params: { pageIndex, pageSize: 100 } })),
  provinces: async () => locationsSchema.parse(await http.get('/estimate-locations/provinces')),
  wards: async (provinceCode: string, datasetVersion: string) =>
    wardsSchema.parse(
      await http.get(`/estimate-locations/provinces/${encodeURIComponent(provinceCode)}/wards`, {
        params: { datasetVersion }
      })
    ),
  search: async (address: string, signal?: AbortSignal) =>
    suggestionsSchema.parse(await http.get('/maps/search', { params: { address }, signal })),
  place: async (refId: string, signal?: AbortSignal) =>
    coordinatesSchema.parse(await http.get('/maps/place', { params: { refId }, signal })),
  upload: async (file: File, attachmentGroup: AttachmentGroup, siteId?: string) => {
    const contentType =
      file.type ||
      ({ pdf: 'application/pdf', dwg: 'image/vnd.dwg', dxf: 'image/vnd.dxf' }[
        file.name.split('.').pop()?.toLowerCase() ?? ''
      ] ??
        'application/octet-stream')
    const ticket = ticketSchema.parse(
      await http.post(
        uploadBase,
        {
          targetKind: siteId ? 'ExistingSite' : 'NewSite',
          targetSiteId: siteId ?? null,
          attachmentGroup,
          fileName: file.name,
          contentType,
          sizeBytes: file.size
        },
        { headers: { 'Idempotency-Key': crypto.randomUUID() } }
      )
    )
    if (!ticket.uploadUrl || Date.parse(ticket.expiresAtUtc) <= Date.now() || file.size > ticket.maxSizeBytes)
      throw new Error('ConstructionSiteUploadUnavailable')
    // Only the signed staging PUT goes directly to storage, never with BMT cookies.
    const response = await fetch(ticket.uploadUrl, {
      method: ticket.method,
      headers: ticket.requiredHeaders,
      body: file,
      credentials: 'omit',
      signal: AbortSignal.timeout(120_000)
    })
    if (!response.ok) throw new Error('StoragePutFailed')
    let status = statusSchema.parse(await http.post(`${uploadBase}/${ticket.uploadId}/complete`))
    for (let attempt = 0; attempt < 8 && status.state === 'Validating'; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      status = statusSchema.parse(await http.get(`${uploadBase}/${ticket.uploadId}`))
    }
    if (status.state !== 'Completed') throw new Error('ConstructionSiteUploadUnavailable')
    return {
      uploadId: status.uploadId,
      attachmentGroup,
      name: status.originalName,
      sizeBytes: status.sizeBytes ?? file.size,
      mediaType: status.mediaType ?? contentType
    }
  },
  attach: async (siteId: string, uploadId: string, expectedVersion: number) =>
    z
      .object({ attachment: siteAttachmentSchema, siteVersion: z.number() })
      .parse(await http.post(`${base}/${siteId}/attachments`, { uploadId, expectedVersion })),
  removeFile: async (siteId: string, attachmentId: string, expectedVersion: number) =>
    http.delete<void>(`${base}/${siteId}/attachments/${attachmentId}`, { params: { expectedVersion } }),
  download: async (siteId: string, attachmentId: string) =>
    http.get<Blob>(`/construction-sites/${siteId}/attachments/${attachmentId}/content`, { responseType: 'blob' })
}
export const constructionSitesApi: typeof bmtConstructionSitesApi = env.NEXT_PUBLIC_USE_MOCK_API
  ? mockConstructionSitesApi
  : bmtConstructionSitesApi
