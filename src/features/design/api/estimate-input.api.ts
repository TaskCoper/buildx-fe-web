import { http } from '@/shared/lib/api'
import { estimateDetailSchema, estimateCatalogSchema } from '../schemas/estimate-api.schema'
import { normalizeCatalog, type EstimateCatalog, type EstimateInputBody } from '../services/estimate-input.logic'

/**
 * API đầu vào Bước 1 của bản dự toán thật (TDD-PROJ-001) — mỏng, chỉ khai kiểu và gọi.
 * Mọi logic (so sánh, kiểm hợp lệ) ở `estimate-input.logic.ts`.
 */

const idempotent = (key?: string) => ({ headers: { 'Idempotency-Key': key ?? crypto.randomUUID() } })

/** `input` BE trả có thêm tên tỉnh/xã để hiển thị. */
export interface EstimateInputView extends EstimateInputBody {
  provinceName?: string | null
  wardName?: string | null
}

/** Trạng thái tác vụ AI gần nhất: Draft (chưa gửi), Pending/Processing, Succeeded, Failed. */
export type EstimateState = string

export interface EstimateDetail {
  estimateId: string
  name: string
  canRename: boolean
  nameVersion: number
  inputVersion: number
  catalogRevisionId: string | null
  input: EstimateInputView
  state: EstimateState
  failureCode?: string | null
  /** Chỉ là gợi ý cho giao diện; mutation vẫn kiểm lại. */
  canEdit: boolean
  writeDeniedCode?: string | null
  missingFields?: string[]
}

export interface Province {
  code: string
  name: string
}

export interface ProvincesResult {
  datasetVersion: string
  provinces: Province[]
}

export interface Ward {
  code: string
  name: string
}

export interface DesignQuotaView {
  /** Chưa từng mua gói thiết kế. */
  planName: string | null
  hasSubscription: boolean
  canStart: boolean
  /** Lượt `design.generate` còn lại; null = không giới hạn. */
  available: number | null
  limit: number | null
  unlimited: boolean
}

interface RawSubscription {
  planName: string
  canStart?: boolean
  quotas?: { code: string; limit?: number | null; available?: number | null; isUnlimited?: boolean }[]
}

export const estimateInputApi = {
  getEstimate: async (estimateId: string, signal?: AbortSignal): Promise<EstimateDetail> =>
    estimateDetailSchema.parse(await http.get<unknown>(`/estimates/${estimateId}`, { signal })),

  getCatalog: async (estimateId: string): Promise<EstimateCatalog> =>
    normalizeCatalog(estimateCatalogSchema.parse(await http.get<unknown>(`/estimates/${estimateId}/catalog`))),

  listProvinces: () => http.get<ProvincesResult>('/estimate-locations/provinces'),

  listWards: async (provinceCode: string, datasetVersion: string): Promise<Ward[]> => {
    const res = await http.get<{ wards?: Ward[] }>(`/estimate-locations/provinces/${provinceCode}/wards`, {
      params: { datasetVersion }
    })
    return res.wards ?? []
  },

  saveInput: (
    estimateId: string,
    body: { expectedInputVersion: number; changedFields: string[]; input: EstimateInputBody },
    key?: string
  ) =>
    http.put<{ estimateId: string; savedInputVersion: number }>(
      `/estimates/${estimateId}/input`,
      body,
      idempotent(key)
    ),

  /** Hạn mức lượt thiết kế từ `GET /me/design-subscription` (`null` = chưa từng mua gói). */
  getDesignQuota: async (): Promise<DesignQuotaView> => {
    const sub = await http.get<RawSubscription | null>('/me/design-subscription')
    const generate = sub?.quotas?.find((quota) => quota.code === 'design.generate')
    return {
      planName: sub?.planName ?? null,
      hasSubscription: Boolean(sub),
      canStart: Boolean(sub?.canStart),
      available: generate?.isUnlimited ? null : (generate?.available ?? null),
      limit: generate?.isUnlimited ? null : (generate?.limit ?? null),
      unlimited: Boolean(generate?.isUnlimited)
    }
  }
}
