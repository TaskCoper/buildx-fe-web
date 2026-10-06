import { env } from '@/shared/config/env'
import { http, httpClient } from '@/shared/lib/api'
import { generationSchema } from '../schemas/estimate-api.schema'

/**
 * Gửi AI, kết quả, xuất tệp và chia sẻ của bản dự toán THẬT (TDD-PROJ-002/003) — mỏng, chỉ khai kiểu và gọi.
 * Logic (ánh xạ kết quả, chờ trạng thái) ở `services/estimate-result.logic.ts` và `api/design.bmt.ts`.
 */

const idempotent = (key: string = crypto.randomUUID()) => ({ headers: { 'Idempotency-Key': key } })

export interface GenerationStarted {
  operationId: string
  /** `Pending` khi vừa tiếp nhận. */
  state: string
  acceptedAtUtc: string
  deadlineUtc: string | null
}

export interface ResultFile {
  fileId: string
  /** `cover-image`, `floor-plan-2d`, `perspective`, `dossier-pdf`, `estimate-xlsx` (hợp đồng `mock-v1`). */
  roleKey: string
  ordinal: number
}

export interface ExportAvailability {
  format: string
  exportId?: string | null
  state?: string | null
  attemptNumber?: number | null
  failureCode?: string | null
}

/** `GET /estimates/{id}/result`. `dossier.content` theo hợp đồng AI nên giữ `unknown` rồi đọc phòng thủ. */
export interface EstimateResultRaw {
  operationId: string
  contractVersion: string
  estimateName: string
  dossier: { content?: unknown; files?: ResultFile[] }
  exportAvailability?: ExportAvailability[]
}

export interface ExportStatus {
  exportId: string
  format: string
  /** Pending, Ready, Failed… */
  state: string
  attemptNumber?: number
  failureCode?: string | null
  /** Route của backend (không phải URL tệp gốc). */
  downloadUrl?: string | null
}

export type ExportFormat = 'Pdf' | 'Xlsx'

export interface ShareLink {
  shareId: string
  url: string
  expiryDate?: string | null
  expiresAtUtc: string
  /** Active, Expired, Revoked. */
  state: string
  requestedExpiryApplied?: boolean
}

export interface GenerationStatus {
  operationId: string
  /** Pending, Succeeded, Failed, TimedOut. */
  state: string
  acceptedAtUtc: string
  deadlineUtc: string | null
  settledAtUtc?: string | null
  failureCode?: string | null
  /** Route backend của kết quả, chỉ có khi Succeeded. */
  resultUrl?: string | null
}

const SHARE_TOKEN_HEADER = 'X-Estimate-Share-Token'

export const sleep = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms))

const EXPORT_POLL_MS = 2_000
const EXPORT_MAX_WAIT_MS = 2 * 60_000

/** Chờ tệp xuất xong (Ready) hoặc hỏng (Failed). Quá hạn chờ thì coi là hỏng `ExportTimedOut`. */
export async function waitForExport(
  fetchStatus: () => Promise<ExportStatus>,
  { signal }: { signal?: AbortSignal } = {}
): Promise<ExportStatus> {
  const startedAt = Date.now()
  for (;;) {
    const status = await fetchStatus()
    if (status.state === 'Ready' || status.state === 'Failed') return status
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    if (Date.now() - startedAt > EXPORT_MAX_WAIT_MS) throw new Error('ExportPollingTimeout')
    await sleep(EXPORT_POLL_MS)
  }
}

/* Mã tác vụ AI vừa gửi được nhớ theo phiên: trang chờ hỏi đúng tác vụ đó (`GET …/generations/{id}`) thay vì đoán. */
const operationKey = (estimateId: string) => `savico.generation.${estimateId}`

export const rememberOperation = (estimateId: string, operationId: string) => {
  try {
    sessionStorage.setItem(operationKey(estimateId), operationId)
  } catch {
    // Không có sessionStorage: trang chờ rơi về hỏi trạng thái bản dự toán.
  }
}

export const recallOperation = (estimateId: string): string | null => {
  try {
    return sessionStorage.getItem(operationKey(estimateId))
  } catch {
    return null
  }
}

export const forgetOperation = (estimateId: string) => {
  try {
    sessionStorage.removeItem(operationKey(estimateId))
  } catch {
    // Bỏ qua.
  }
}

/** Gốc API cho `fetch` thô (tệp nhị phân cần header riêng nên không đi qua Axios `http`). */
const apiBase = () => env.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, '')

/**
 * Tải một tệp CÔNG KHAI của link chia sẻ thành Blob. Token đi ở header nên không dùng được `<img src>` hay link tải
 * trực tiếp; không gửi cookie đăng nhập (quyền qua link chỉ gồm xem và tải, BR-PROJ-006 khoản 5).
 */
export async function fetchSharedBlob(path: string, token: string): Promise<{ blob: Blob; fileName: string | null }> {
  const response = await fetch(`${apiBase()}${path}`, { headers: { [SHARE_TOKEN_HEADER]: token }, credentials: 'omit' })
  if (!response.ok) throw new Error(`SharedFile${response.status}`)
  const disposition = response.headers.get('Content-Disposition') ?? ''
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1]
  const plain = /filename="?([^";]+)"?/i.exec(disposition)?.[1]
  let fileName: string | null = null
  try {
    fileName = encoded ? decodeURIComponent(encoded) : (plain ?? null)
  } catch {
    fileName = plain ?? null
  }
  return { blob: await response.blob(), fileName }
}

export const estimateGenerationApi = {
  /** `GET …/generations/{operationId}` — trạng thái đúng tác vụ vừa gửi (kèm mã lỗi khi Failed / TimedOut). */
  getGeneration: async (estimateId: string, operationId: string, signal?: AbortSignal): Promise<GenerationStatus> =>
    generationSchema.parse(await http.get<unknown>(`/estimates/${estimateId}/generations/${operationId}`, { signal })),

  /** `POST /estimates/{id}/generations` — giữ một lượt, khoá đầu vào. `key` cố định để bấm đúp không giữ hai lượt. */
  start: async (estimateId: string, inputVersion: number, key?: string): Promise<GenerationStarted> =>
    generationSchema.parse(
      await http.post<unknown>(`/estimates/${estimateId}/generations`, { inputVersion }, idempotent(key))
    ),

  getResult: (estimateId: string, signal?: AbortSignal) =>
    http.get<EstimateResultRaw>(`/estimates/${estimateId}/result`, { signal }),

  /** Đường dẫn tệp kết quả (ảnh, bản vẽ, PDF, Excel) — BE chuyển tiếp nội dung, dùng được trong `<img src>`. */
  resultFileUrl: (estimateId: string, fileId: string) => `${apiBase()}/estimates/${estimateId}/result-files/${fileId}`,

  requestExport: (estimateId: string, format: ExportFormat, key?: string) =>
    http.post<{ exportId: string; state: string; attemptNumber: number }>(
      `/estimates/${estimateId}/exports`,
      { format },
      idempotent(key)
    ),

  getExport: (estimateId: string, exportId: string) =>
    http.get<ExportStatus>(`/estimates/${estimateId}/exports/${exportId}`),

  exportFileUrl: (estimateId: string, exportId: string) =>
    `${apiBase()}/estimates/${estimateId}/exports/${exportId}/file`,

  createShare: (estimateId: string, expiryDate: string) =>
    http.post<ShareLink>(`/estimates/${estimateId}/shares`, { expiryDate }, idempotent()),

  getCurrentShare: (estimateId: string) => http.get<ShareLink | null>(`/estimates/${estimateId}/shares/current`),

  revokeShare: (estimateId: string, shareId: string) =>
    http.post<{ state: string }>(`/estimates/${estimateId}/shares/${shareId}/revoke`, {}, idempotent()),

  /** Xuất tệp qua LINK công khai (không AI, không lượt): header token + khoá idempotency. */
  publicRequestExport: (shareId: string, token: string, format: ExportFormat, key?: string) =>
    http.post<{ exportId: string; state: string; attemptNumber: number }>(
      `/public/estimate-shares/${shareId}/exports`,
      { format },
      {
        withCredentials: false,
        headers: { [SHARE_TOKEN_HEADER]: token, 'Idempotency-Key': key ?? crypto.randomUUID() }
      }
    ),

  publicGetExport: (shareId: string, token: string, exportId: string) =>
    http.get<ExportStatus>(`/public/estimate-shares/${shareId}/exports/${exportId}`, {
      withCredentials: false,
      headers: { [SHARE_TOKEN_HEADER]: token }
    }),

  /** Đường dẫn tệp xuất / ảnh kết quả của link công khai (dùng với `fetchSharedBlob`). */
  publicExportFilePath: (shareId: string, exportId: string) =>
    `/public/estimate-shares/${shareId}/exports/${exportId}/file`,
  publicFilePath: (shareId: string, fileId: string) => `/public/estimate-shares/${shareId}/files/${fileId}`,

  /** Trạng thái gửi email: Queued, Accepted (SMTP đã nhận), Unknown (không biết), Failed. */
  getEmailStatus: (estimateId: string, emailRequestId: string) =>
    http.get<{ state: string; failureCode?: string | null }>(`/estimates/${estimateId}/emails/${emailRequestId}`),

  /** Xem hồ sơ qua link chia sẻ — công khai, gửi token ở header `X-Estimate-Share-Token`. */
  getShared: (shareId: string, token: string) =>
    http.get<{
      shareId: string
      estimateName: string
      dossier: { content?: unknown; files?: ResultFile[] }
      exportAvailability?: ExportAvailability[]
    }>(`/public/estimate-shares/${shareId}`, { withCredentials: false, headers: { 'X-Estimate-Share-Token': token } }),

  shareQrUrl: (estimateId: string, shareId: string) => `${apiBase()}/estimates/${estimateId}/shares/${shareId}/qr`,

  emailShare: (estimateId: string, shareId: string, recipient: string) =>
    http.post<{ emailRequestId: string; state: string }>(
      `/estimates/${estimateId}/shares/${shareId}/emails`,
      { recipient },
      idempotent()
    )
}

/** Tải tệp của chủ sở hữu qua cookie/refresh hiện có; tên tệp lấy từ backend. */
export async function downloadEstimateExport(
  estimateId: string,
  exportId: string,
  fallbackName: string
): Promise<void> {
  const response = await httpClient.get<Blob>(`/estimates/${estimateId}/exports/${exportId}/file`, {
    responseType: 'blob'
  })
  const disposition: string = response.headers['content-disposition'] ?? ''
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1]
  const plain = /filename="?([^";]+)"?/i.exec(disposition)?.[1]
  let name = plain ?? fallbackName
  if (encoded) {
    try {
      name = decodeURIComponent(encoded)
    } catch {
      /* Giữ tên dự phòng. */
    }
  }
  const url = URL.createObjectURL(response.data)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
