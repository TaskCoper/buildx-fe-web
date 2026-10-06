import { http, isApiError } from '@/shared/lib/api'
import type { PagedResult } from '@/shared/types'

import {
  EstimateFlowError,
  estimateStateKind,
  mapEstimateContent,
  stepOfState
} from '../services/estimate-result.logic'
import { projectStatus } from '../services/project-list.service'
import type { DesignInput, Dossier, DossierImages, EstimateResult, Project, SharedDossier } from '../types/design.types'
import type { CreateProjectPayload } from './design.api'
import { estimateInputApi } from './estimate-input.api'
import {
  estimateGenerationApi,
  forgetOperation,
  recallOperation,
  sleep as sleepMs,
  waitForExport as pollExport,
  type ResultFile,
  type ShareLink
} from './estimate-generation.api'

/** Client dự toán thật; chế độ mock chỉ được chọn tại design.api.ts. */

interface BmtEstimateListItem {
  estimateId: string
  name: string
  buildingType?: { id: string; name: string } | null
  /** Draft, Processing, Failed, Succeeded — trạng thái tác vụ tạo thiết kế gần nhất. */
  state: string
  createdAtUtc: string
  modifiedAtUtc: string
}

const idem = (key?: string) => ({ headers: { 'Idempotency-Key': key ?? crypto.randomUUID() } })
const nowIso = () => new Date().toISOString()

/** DTO đầu vào Bước 1 (`Response`/`Command` của `/estimates/{id}/input`, TDD-PROJ-001). */
interface BmtEstimateInput {
  buildingTypeId: string | null
  areaM2: string | null
  description: string | null
  provinceCode: string | null
  wardCode: string | null
  locationDatasetVersion: string | null
  addressDetail: string | null
  finishPackage: string | null
  floorCount: number | null
  hasTum: boolean | null
  architectureStyleId: string | null
  interiorStyleId: string | null
  inputImageUrl: string | null
}

/** `GET /estimates/{id}` (TDD-PROJ-001). Không có createdAt/updatedAt trong DTO này. */
interface BmtEstimateDetail {
  estimateId: string
  name: string
  nameVersion: number
  canRename: boolean
  inputVersion: number
  catalogRevisionId: string | null
  input: BmtEstimateInput
  state: string
  failureCode?: string | null
  canEdit: boolean
  writeDeniedCode?: string | null
  missingFields?: string[]
}

function toProject(item: BmtEstimateListItem): Project {
  const currentStep = stepOfState(item.state)
  return {
    id: item.estimateId,
    name: item.name,
    createdAt: item.createdAtUtc,
    updatedAt: item.modifiedAtUtc,
    currentStep,
    status: projectStatus(currentStep),
    // API list chưa trả ảnh render và diện tích sàn → để trống (thẻ tự bớt vế).
    coverUrl: null,
    // UI dùng enum loại công trình; API trả {id,name} động → giữ riêng tên để hiển thị.
    buildingType: null,
    buildingTypeLabel: item.buildingType?.name ?? null,
    floorArea: null
  }
}

export const bmtDesignApi = {
  getQuota: async () => {
    const quota = await estimateInputApi.getDesignQuota()
    return {
      planName: quota.planName,
      remaining: quota.unlimited ? Infinity : (quota.available ?? 0),
      total: quota.limit
    }
  },
  getInput: async (_projectId: string): Promise<DesignInput> => {
    throw new Error('LegacyEstimateInputUnsupported')
  },
  saveInput: async (_projectId: string, _input: DesignInput): Promise<DesignInput> => {
    throw new Error('LegacyEstimateInputUnsupported')
  },
  getSharedDossier: async (_token: string): Promise<SharedDossier | null> => null,
  listProjects: async (): Promise<Project[]> => {
    const items: Project[] = []
    let pageIndex = 1
    for (;;) {
      const page = await http.get<PagedResult<BmtEstimateListItem>>('/estimates', {
        params: { pageIndex, pageSize: 100 }
      })
      items.push(...page.items.map(toProject))
      if (!page.hasNextPage) return [...new Map(items.map((item) => [item.id, item])).values()]
      pageIndex++
    }
  },

  deleteProject: async (projectId: string): Promise<void> => {
    const deleted = await http.post<{ results: { estimateId: string; status: string }[] }>(
      '/estimates/bulk-delete',
      { estimateIds: [projectId] },
      { headers: { 'Idempotency-Key': crypto.randomUUID() } }
    )
    const status = deleted.results.find((item) => item.estimateId === projectId)?.status
    if (status !== 'Deleted' && status !== 'AlreadyDeleted') {
      throw { status: 409, code: status, message: status ?? 'InvalidDeletionResult' }
    }
  },

  /** Tạo dự toán thật `POST /estimates` → trả receipt {estimateId,inputVersion,nameVersion}. */
  createProject: async (payload: CreateProjectPayload, key?: string): Promise<Project> => {
    const saved = await http.post<{ estimateId: string; inputVersion: number; nameVersion: number }>(
      '/estimates',
      {
        name: payload.name.trim(),
        ...(payload.description !== undefined ? { description: payload.description } : {}),
        // Tạo nhanh được bỏ tọa độ; nếu có thì gửi đủ cặp.
        ...(payload.latitude !== undefined && payload.longitude !== undefined
          ? { latitude: payload.latitude, longitude: payload.longitude }
          : {})
      },
      idem(key)
    )
    return {
      id: saved.estimateId,
      name: payload.name.trim(),
      ...(payload.description ? { description: payload.description } : {}),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      currentStep: 1,
      status: projectStatus(1),
      coverUrl: null,
      buildingType: null,
      floorArea: null
    }
  },

  /** `GET /estimates/{id}`. DTO không có mốc thời gian → tạm dùng hiện tại (thẻ danh sách lấy mốc thật từ `/estimates`). */
  getProject: async (projectId: string): Promise<Project> => {
    const e = await estimateInputApi.getEstimate(projectId)
    const step = stepOfState(e.state)
    return {
      id: e.estimateId,
      name: e.name,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      currentStep: step,
      status: projectStatus(step),
      coverUrl: e.input?.inputImageUrl ?? null,
      buildingType: null,
      floorArea: null
    }
  },

  /** Đổi tên: đọc `nameVersion` hiện hành rồi `PATCH /estimates/{id}/name` (khoá lạc quan tên). */
  renameProject: async (projectId: string, name: string): Promise<Project> => {
    const e = await estimateInputApi.getEstimate(projectId)
    const res = await http.patch<{ name: string; nameVersion: number }>(`/estimates/${projectId}/name`, {
      name,
      nameVersion: e.nameVersion
    })
    const step = stepOfState(e.state)
    return {
      id: projectId,
      name: res.name,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      currentStep: step,
      status: projectStatus(step),
      coverUrl: e.input?.inputImageUrl ?? null,
      buildingType: null,
      floorArea: null
    }
  },

  /**
   * Chờ kết quả dự toán (Bước 2): đọc trạng thái bản dự toán định kỳ cho tới khi có kết quả hoặc thất bại.
   * Việc GỬI AI (giữ một lượt) là thao tác riêng ở cuối Bước 1; vào Bước 2 mà chưa gửi thì ném
   * `EstimateFlowError('notSubmitted')` để quay về Bước 1 — mở lại trang không bao giờ tự tốn thêm lượt.
   */
  generateEstimate: (projectId: string, signal?: AbortSignal): Promise<EstimateResult> => {
    return waitForEstimate(projectId, signal)
  },

  getEstimate: (projectId: string, signal?: AbortSignal): Promise<EstimateResult> => {
    return waitForEstimate(projectId, signal)
  },

  /**
   * Bước 3 của dự toán thật: BE không có bước "render hồ sơ" riêng — hồ sơ là kết quả AI cùng tệp xuất. Bộ hồ sơ
   * "sẵn sàng" khi tệp PDF đã xuất xong (`exportAvailability`); chưa thì `idle` và nút Nhận hồ sơ sẽ yêu cầu xuất.
   */
  getDossier: async (projectId: string): Promise<Dossier> => {
    const detail = await estimateInputApi.getEstimate(projectId)
    if (estimateStateKind(detail.state) !== 'succeeded') return idleDossier(projectId)
    const [result, share] = await Promise.all([estimateGenerationApi.getResult(projectId), activeShare(projectId)])
    const pdf = result.exportAvailability?.find(
      (item) => item.format === 'Pdf' && item.state === 'Ready' && item.exportId
    )
    return {
      ...idleDossier(projectId),
      status: pdf ? 'ready' : 'idle',
      pdfUrl: pdf?.exportId ? estimateGenerationApi.exportFileUrl(projectId, pdf.exportId) : null,
      shareToken: share?.shareId ?? null,
      shareUrl: share?.url ?? null,
      shareExpiry: share ? expiryDateOf(share) : null,
      images: imagesOf(projectId, result.dossier?.files)
    }
  },

  /** "Nhận hồ sơ": yêu cầu xuất PDF rồi chờ Ready. Xuất hỏng (không lấy được tệp…) thì ném lỗi để màn chờ hiện Thử lại. */
  renderDossier: async (projectId: string): Promise<Dossier> => {
    const started = await estimateGenerationApi.requestExport(projectId, 'Pdf')
    const done = await pollExport(() => estimateGenerationApi.getExport(projectId, started.exportId))
    if (done.state !== 'Ready') throw new Error(done.failureCode ?? 'ExportFailed')
    const [share, result] = await Promise.all([activeShare(projectId), estimateGenerationApi.getResult(projectId)])
    return {
      ...idleDossier(projectId),
      status: 'ready',
      pdfUrl: estimateGenerationApi.exportFileUrl(projectId, started.exportId),
      shareToken: share?.shareId ?? null,
      shareUrl: share?.url ?? null,
      shareExpiry: share ? expiryDateOf(share) : null,
      images: imagesOf(projectId, result.dossier?.files)
    }
  },

  /**
   * Tạo (hoặc lấy lại) link chia sẻ. Chủ bản CHỌN ngày hết hạn (BR-PROJ-006 khoản 1: không có hạn mặc định). Mỗi bản
   * chỉ một link đang hiệu lực: còn hiệu lực thì BE trả lại chính link đó và `applied=false` nếu ngày chọn khác.
   */
  createShareLink: async (
    projectId: string,
    expiryDate?: string
  ): Promise<{ token: string; url?: string; expiryDate?: string | null; applied?: boolean }> => {
    if (!expiryDate) throw new Error('ExpiryRequired')
    const link = await estimateGenerationApi.createShare(projectId, expiryDate)
    return {
      token: link.shareId,
      url: link.url,
      expiryDate: expiryDateOf(link),
      applied: link.requestedExpiryApplied !== false
    }
  },

  /** Thu hồi link: từ lúc này người có link (kể cả QR/email đã gửi) không xem hay tải được nữa. */
  revokeShareLink: async (projectId: string, shareId: string): Promise<void> => {
    await estimateGenerationApi.revokeShare(projectId, shareId)
  },

  /**
   * Gửi link (không đính kèm tệp) tới một email, rồi hỏi trạng thái gửi: `accepted` = máy chủ thư đã nhận,
   * `unknown` = không biết thư đã nhận chưa; `Failed` thì ném lỗi. Phải có link hiện hành còn hiệu lực.
   */
  sendDossierEmail: async (projectId: string, email: string): Promise<'accepted' | 'unknown' | void> => {
    const link = await activeShare(projectId)
    if (!link) throw new Error('ShareUnavailable')
    const queued = await estimateGenerationApi.emailShare(projectId, link.shareId, email)
    return waitForEmail(projectId, queued.emailRequestId)
  },

  /** Xem hồ sơ qua link chia sẻ của BE (`/vi/estimates/shared/{shareId}#token=…`): không đăng nhập, link hỏng → `null`. */
  getSharedEstimate: async (shareId: string, token: string): Promise<SharedDossier | null> => {
    try {
      const shared = await estimateGenerationApi.getShared(shareId, token)
      const mapped = mapEstimateContent(shared.dossier?.content, { projectId: shareId, areaM2: 0 })
      return {
        projectName: shared.estimateName,
        // DTO chia sẻ không có địa chỉ và ngày tạo: bỏ trống, màn xem tự ẩn.
        address: '',
        createdAt: '',
        sections: mapped.result.sections,
        grandTotal: mapped.result.grandTotal,
        estimatedFloorArea: 0,
        files: (shared.dossier?.files ?? []).map((file) => ({ fileId: file.fileId, roleKey: file.roleKey }))
      }
    } catch {
      return null
    }
  }
}

/* ===========================================================================
 * Chờ và đọc kết quả dự toán thật
 * ======================================================================== */

/** Hỏi lại trạng thái mỗi 3 giây (AI không có tiến độ phần trăm để hỏi). */
const POLL_INTERVAL_MS = 3_000
/** Quá hạn chờ phía khách (BE tự chốt Failed/TimedOut sau 15 phút, đây chỉ là chốt chặn). */
const MAX_WAIT_MS = 20 * 60_000

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const done = () => {
      signal?.removeEventListener('abort', abort)
      resolve()
    }
    const timer = window.setTimeout(done, ms)
    const abort = () => {
      window.clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', abort, { once: true })
  })
}

async function loadEstimateResult(
  projectId: string,
  detail: BmtEstimateDetail,
  signal?: AbortSignal
): Promise<EstimateResult> {
  const raw = await estimateGenerationApi.getResult(projectId, signal)
  const mapped = mapEstimateContent(raw.dossier?.content, {
    projectId,
    areaM2: Number(detail.input?.areaM2) || 0
  })
  return { ...mapped.result, isSample: mapped.isSample, notice: mapped.notice }
}

async function waitForEstimate(projectId: string, signal?: AbortSignal): Promise<EstimateResult> {
  const startedAt = Date.now()
  while (!signal?.aborted) {
    // Biết mã tác vụ vừa gửi (cùng phiên) thì hỏi đúng tác vụ đó: có mã lỗi chính xác. Không biết (mở lại trang, tab
    // khác) thì hỏi trạng thái bản dự toán.
    const operationId = recallOperation(projectId)
    if (operationId) {
      try {
        const generation = await estimateGenerationApi.getGeneration(projectId, operationId, signal)
        if (generation.state === 'Failed' || generation.state === 'TimedOut') {
          forgetOperation(projectId)
          throw new EstimateFlowError('failed', generation.failureCode)
        }
        if (generation.state === 'Pending') {
          if (Date.now() - startedAt > MAX_WAIT_MS) throw new Error('GenerationPollingTimeout')
          await sleep(POLL_INTERVAL_MS, signal)
          continue
        }
        // Succeeded: đọc kết quả qua bản dự toán bên dưới.
      } catch (error) {
        if (error instanceof EstimateFlowError) throw error
        if (!isApiError(error) || error.status !== 404 || (error.messageCode ?? error.code) !== 'GenerationNotFound')
          throw error
        // Mã cũ / không thuộc bản này (404 `GenerationNotFound`): bỏ và hỏi bản dự toán.
        forgetOperation(projectId)
      }
    }

    const detail = await estimateInputApi.getEstimate(projectId, signal)
    switch (estimateStateKind(detail.state)) {
      case 'succeeded':
        forgetOperation(projectId)
        return loadEstimateResult(projectId, detail, signal)
      case 'draft':
        throw new EstimateFlowError('notSubmitted')
      case 'failed':
        forgetOperation(projectId)
        throw new EstimateFlowError('failed', detail.failureCode)
      default:
        if (Date.now() - startedAt > MAX_WAIT_MS) throw new Error('GenerationPollingTimeout')
        await sleep(POLL_INTERVAL_MS, signal)
    }
  }
  throw new DOMException('Aborted', 'AbortError')
}

/* ===========================================================================
 * Hồ sơ, xuất tệp và chia sẻ của dự toán thật
 * ======================================================================== */

const idleDossier = (projectId: string): Dossier => ({
  projectId,
  status: 'idle',
  pdfUrl: null,
  pdfSize: null,
  shareToken: null,
  shareUrl: null
})

const EMAIL_POLL_MS = 1_500
const EMAIL_MAX_WAIT_MS = 30_000

/** `expiryDate` của BE là `YYYY-MM-DD` (hoặc đối tượng ngày tuỳ serializer): lấy phần ngày. */
function expiryDateOf(link: ShareLink): string | null {
  const value = link.expiryDate as unknown
  return typeof value === 'string' ? value.slice(0, 10) : null
}

/** Link chia sẻ đang hiệu lực (Active) của bản, hoặc `null`. */
async function activeShare(projectId: string): Promise<ShareLink | null> {
  const share = await estimateGenerationApi.getCurrentShare(projectId)
  return share && share.state === 'Active' && share.url ? share : null
}

/** Chờ trạng thái gửi email: Queued → Accepted | Unknown | Failed. */
async function waitForEmail(projectId: string, emailRequestId: string): Promise<'accepted' | 'unknown'> {
  const startedAt = Date.now()
  for (;;) {
    const status = await estimateGenerationApi.getEmailStatus(projectId, emailRequestId)
    if (status.state === 'Accepted') return 'accepted'
    if (status.state === 'Unknown') return 'unknown'
    if (status.state === 'Rejected' || status.state === 'Skipped' || status.state === 'Failed')
      throw new Error(status.failureCode ?? 'EmailFailed')
    // Hết hạn chờ phía khách: không biết thư đã tới chưa.
    if (Date.now() - startedAt > EMAIL_MAX_WAIT_MS) return 'unknown'
    await sleepMs(EMAIL_POLL_MS)
  }
}

/** Ảnh kết quả theo vai trò tệp của hợp đồng AI (lấy tệp đầu tiên của mỗi vai trò). */
function imagesOf(projectId: string, files: ResultFile[] | undefined): DossierImages {
  const urlOf = (role: string) => {
    const found = files?.filter((file) => file.roleKey === role).sort((a, b) => a.ordinal - b.ordinal)[0]
    return found ? estimateGenerationApi.resultFileUrl(projectId, found.fileId) : null
  }
  return { cover: urlOf('cover-image'), floorPlan: urlOf('floor-plan-2d'), perspective: urlOf('perspective') }
}
