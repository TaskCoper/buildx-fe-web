import { env } from '@/shared/config/env'
import { http, isApiError } from '@/shared/lib/api'

import {
  render3dResultSchema,
  type Render3dResult,
  estimateResultSchema,
  lotVerificationSchema,
  plan2dResultSchema,
  stageRunAcceptedSchema,
  stagesSchema,
  type EstimateStageResult,
  type Plan2dResult,
  type StageRunAccepted
} from '../schemas/pipeline-api.schema'
import type { LotVerificationView, StageName, StageView } from '../services/pipeline.logic'

/**
 * API của luồng bốn chặng (TDD-PROJ-006/007) — mỏng, chỉ gọi và kiểm hình dạng phản hồi. Logic chọn câu lỗi, khóa
 * chống gửi lặp, chu kỳ hỏi lại nằm ở `services/pipeline.logic.ts` và các hook.
 */

/** Gốc API cho đường dẫn tệp dùng thẳng trong `<img src>` (đi qua rewrite cùng domain nên mang cookie). */
const apiBase = () => env.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, '')

export const estimatePipelineApi = {
  /** Trạng thái bốn chặng của bản dự toán. */
  getStages: async (estimateId: string, signal?: AbortSignal): Promise<StageView[]> =>
    stagesSchema.parse(await http.get<unknown>(`/estimates/${estimateId}/stages`, { signal })),

  /**
   * Bấm chạy một chặng. `key` giữ nguyên khi thử lại cùng một lần bấm (mất mạng, lỗi máy chủ) để BE trả lại lần chạy
   * cũ thay vì giữ thêm lượt; lần bấm mới dùng khóa mới. `inputVersion` bắt buộc với chặng 2D; chặng sau BE bỏ qua
   * thân yêu cầu (TDD-PROJ-009 Internal API), nên chỉ gửi khi có sẵn.
   */
  startRun: async (
    estimateId: string,
    stage: StageName,
    inputVersion: number | null | undefined,
    key: string
  ): Promise<StageRunAccepted> =>
    stageRunAcceptedSchema.parse(
      await http.post<unknown>(
        `/estimates/${estimateId}/stages/${stage}/runs`,
        inputVersion === null || inputVersion === undefined ? {} : { inputVersion },
        { headers: { 'Idempotency-Key': key } }
      )
    ),

  /** Kết quả chặng 2D gửi khách; chỉ có khi chặng đã thành công (409 `StageResultNotReady` nếu chưa). */
  getPlan2dResult: async (estimateId: string, signal?: AbortSignal): Promise<Plan2dResult> =>
    plan2dResultSchema.parse(await http.get<unknown>(`/estimates/${estimateId}/stages/Plan2d/result`, { signal })),

  /**
   * Phần gửi khách của chặng Dự toán (hợp đồng `estimate-v1`); chỉ có khi chặng đã thành công (409
   * `StageResultNotReady` nếu chưa). API không bao giờ trả phần nội bộ (BR-PROJ-017, TDD-PROJ-009 mục L).
   */
  getEstimateResult: async (estimateId: string, signal?: AbortSignal): Promise<EstimateStageResult> =>
    estimateResultSchema.parse(await http.get<unknown>(`/estimates/${estimateId}/stages/Estimate/result`, { signal })),

  getRender3dResult: async (estimateId: string, signal?: AbortSignal): Promise<Render3dResult> =>
    render3dResultSchema.parse(await http.get<unknown>(`/estimates/${estimateId}/stages/Render3d/result`, { signal })),

  /** Gửi yêu cầu soi ảnh lô đang gắn với bản (bất đồng bộ): 202 khi tạo mới, 200 khi đã có yêu cầu đang soi. */
  requestLotVerification: async (estimateId: string): Promise<LotVerificationView> =>
    lotVerificationSchema.parse(await http.post<unknown>(`/estimates/${estimateId}/lot-verifications`, {})),

  /** Yêu cầu soi mới nhất cho ảnh hiện tại; chưa từng soi (404 `LotVerificationRequired`) thì trả `null`. */
  getCurrentLotVerification: async (estimateId: string, signal?: AbortSignal): Promise<LotVerificationView | null> => {
    try {
      return lotVerificationSchema.parse(
        await http.get<unknown>(`/estimates/${estimateId}/lot-verifications/current`, { signal })
      )
    } catch (error) {
      if (isApiError(error) && error.status === 404 && (error.messageCode ?? error.code) === 'LotVerificationRequired')
        return null
      throw error
    }
  },

  /**
   * Đường dẫn tệp của chặng (`fileUrl` BE trả là route có kiểm quyền, trả 302 tới link tải có hạn 15 phút). Dùng thẳng
   * làm `src`/`href` mỗi lần hiển thị; không lưu lại link đích sau chuyển hướng vì nó hết hạn.
   */
  fileHref: (fileUrl: string): string => {
    if (/^https?:\/\//i.test(fileUrl)) return fileUrl
    const base = apiBase()
    // BE có thể trả kèm tiền tố `/api/v1` (đường dẫn tuyệt đối trong cùng domain) hoặc chỉ phần sau gốc API.
    if (fileUrl.startsWith('/api/')) return /^https?:\/\//i.test(base) ? `${new URL(base).origin}${fileUrl}` : fileUrl
    return `${base}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`
  },

  /** Link tải về (kèm `download=true` để BE đặt `Content-Disposition: attachment`). */
  downloadHref: (fileUrl: string): string => {
    const href = estimatePipelineApi.fileHref(fileUrl)
    return `${href}${href.includes('?') ? '&' : '?'}download=true`
  }
}
