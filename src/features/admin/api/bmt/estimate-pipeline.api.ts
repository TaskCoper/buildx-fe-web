import { z } from 'zod'
import { http } from '@/shared/lib/api'

import {
  normalizePipelineConfig,
  normalizePipelineDetail,
  normalizePricingRegions,
  normalizeProviderModels,
  pipelineConfigBody,
  type PipelineConfig,
  type PipelineConfigView,
  type AiProvider,
  type PricingRegionRow
} from './estimate-pipeline.logic'

/**
 * API quản trị luồng AI tạo dự toán (TDD-PROJ-006/008). Quyền: cấu hình `estimate.pipeline.config.manage`; vùng giá
 * `estimate.pricing.manage`; xem lần chạy `estimate.pipeline.inspect`; đặt lại bộ đếm và đọc nhật ký thô
 * `estimate.pipeline.operate`.
 */

const idempotent = () => ({ headers: { 'Idempotency-Key': crypto.randomUUID() } })

export interface ConfigRevisionRow {
  number: number
  revisionId: string | null
  createdBy: string | null
  createdAtUtc: string | null
  note: string | null
}

const pipelineRunListItem = z.object({
  runId: z.guid(),
  estimateId: z.guid(),
  estimateCode: z.string(),
  estimateName: z.string(),
  estimateDeleted: z.boolean(),
  customerId: z.guid(),
  customerName: z.string(),
  customerEmail: z.string(),
  stage: z.enum(['Plan2d', 'Estimate', 'Render3d', 'Dossier']),
  state: z.enum(['Queued', 'Running', 'Succeeded', 'Failed', 'TimedOut']),
  acceptedAtUtc: z.string(),
  finishedAtUtc: z.string().nullable(),
  failureCode: z.string().nullable()
})
const pipelineRunList = z.object({
  items: z.array(pipelineRunListItem),
  pageIndex: z.number().int(),
  pageSize: z.number().int(),
  totalCount: z.number().int()
})
export type PipelineRunListItem = z.infer<typeof pipelineRunListItem>
export interface PipelineRunFilters {
  search: string
  stage?: string
  state?: string
  pageIndex: number
  pageSize: number
}

export const estimatePipelineAdminApi = {
  listRuns: async (filters: PipelineRunFilters) => {
    const query = new URLSearchParams({ pageIndex: String(filters.pageIndex), pageSize: String(filters.pageSize) })
    if (filters.search.trim()) query.set('search', filters.search.trim())
    if (filters.stage) query.set('stage', filters.stage)
    if (filters.state) query.set('state', filters.state)
    return pipelineRunList.parse(await http.get<unknown>(`/admin/estimate-pipeline/runs?${query}`))
  },
  getProviderModels: async (provider: AiProvider, signal?: AbortSignal) =>
    normalizeProviderModels(
      await http.get<unknown>('/admin/estimate-pipeline/models', { params: { provider }, signal })
    ),

  getConfig: async (): Promise<PipelineConfigView> =>
    normalizePipelineConfig(await http.get<unknown>('/admin/estimate-pipeline/config')),

  /** Tạo phiên bản cấu hình mới; `expectedVersion` cũ thì BE trả 409 `VersionConflict`. */
  saveConfig: (view: PipelineConfigView, edited: PipelineConfig, note: string) =>
    http.put<{ version: number; revisionId: string }>(
      '/admin/estimate-pipeline/config',
      pipelineConfigBody(view, edited, note),
      idempotent()
    ),

  listConfigRevisions: async (): Promise<ConfigRevisionRow[]> => {
    const raw = await http.get<unknown>('/admin/estimate-pipeline/config/revisions')
    const items = Array.isArray(raw)
      ? raw
      : raw && typeof raw === 'object' && Array.isArray((raw as { items?: unknown }).items)
        ? (raw as { items: unknown[] }).items
        : []
    return items
      .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      .map((item) => ({
        number: Number(item.number ?? 0),
        revisionId: typeof item.revisionId === 'string' ? item.revisionId : null,
        createdBy:
          typeof item.createdByName === 'string'
            ? item.createdByName
            : typeof item.createdBy === 'string'
              ? item.createdBy
              : null,
        createdAtUtc: typeof item.createdAtUtc === 'string' ? item.createdAtUtc : null,
        note: typeof item.note === 'string' ? item.note : null
      }))
  },

  getPricingRegions: async () => normalizePricingRegions(await http.get<unknown>('/admin/estimate-pricing/regions')),

  /** Chỉ gửi dòng đã đổi kèm `rowVersion` từng dòng. */
  savePricingRegions: (rows: Pick<PricingRegionRow, 'provinceCode' | 'region' | 'rowVersion'>[]) =>
    http.put<unknown>('/admin/estimate-pricing/regions', { provinces: rows }, idempotent()),

  getPipelineDetail: async (estimateCode: string) =>
    normalizePipelineDetail(
      await http.get<unknown>(`/admin/estimates/${encodeURIComponent(estimateCode.trim())}/pipeline`)
    ),

  resetStageFailures: (estimateId: string, stage: string) =>
    http.post<unknown>(`/admin/estimates/${estimateId}/stages/${stage}/reset-failures`, {}, idempotent()),

  /** Bản thô của một lời gọi AI; BE ghi vết người xem trước khi trả nội dung. */
  getAiCallRaw: (callId: string) => http.get<unknown>(`/admin/estimate-pipeline/ai-calls/${callId}/raw`)
}
