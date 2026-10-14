/**
 * Luồng dự toán bốn chặng (TDD-PROJ-006/007) — logic thuần, không React, không HTTP, không import giá trị nên chạy
 * được bằng `node --test` (xem `scripts/estimate-pipeline.test.mjs`).
 *
 * Bốn chặng: Bản vẽ 2D, rồi Dự toán và Phối cảnh 3D chạy cùng lúc, sau cùng là Hồ sơ (BR-PROJ-010, sửa 13/10/2026).
 * Thanh tiến trình của khách có bốn bước: Nhập liệu → Bản vẽ 2D → Dự toán & 3D → Hồ sơ.
 */

export type StageName = 'Plan2d' | 'Estimate' | 'Render3d' | 'Dossier'

export const PIPELINE_STAGES: readonly StageName[] = ['Plan2d', 'Estimate', 'Render3d', 'Dossier']

/** Bước của thanh tiến trình bốn bước: 1 Nhập liệu, 2 Bản vẽ 2D, 3 Dự toán & 3D (hai chặng chạy cùng lúc), 4 Hồ sơ. */
export type PipelineStep = 1 | 2 | 3 | 4

export const PIPELINE_STEPS: readonly PipelineStep[] = [1, 2, 3, 4]

export const STEP_OF_STAGE: Record<StageName, PipelineStep> = { Plan2d: 2, Estimate: 3, Render3d: 3, Dossier: 4 }

/** Cặp chặng chạy cùng lúc sau 2D, cùng một nút Đi tiếp/Thử lại (BR-PROJ-010 khoản 2–3). */
export const PARALLEL_STAGES: readonly StageName[] = ['Estimate', 'Render3d']

/**
 * Trạng thái chặng khách thấy (`GET /stages`, TDD-PROJ-006 State Diagram): Chưa mở, Sẵn sàng, Đang chờ, Đang chạy,
 * Thành công, Lỗi. `TimedOut` của lần chạy được BE trả thành `Failed`; nếu BE trả nguyên thì vẫn đọc là lỗi.
 */
export type StageStatus = 'Locked' | 'Ready' | 'Queued' | 'Running' | 'Succeeded' | 'Failed'

export interface StageProgress {
  done: number
  total: number | null
}

export interface StageView {
  stage: StageName
  status: StageStatus
  runId?: string | null
  acceptedAtUtc?: string | null
  deadlineUtc?: string | null
  finishedAtUtc?: string | null
  failureCode?: string | null
  /** Số lần còn được chạy lại; `null`/thiếu khi BE không trả (chặng chưa chạy lần nào). */
  retriesLeft?: number | null
  blockedReason?: string | null
  progress?: StageProgress | null
}

export const ACTIVE_STAGE_STATUSES: readonly StageStatus[] = ['Queued', 'Running']

export function isStageActive(status: StageStatus | null | undefined): boolean {
  return status === 'Queued' || status === 'Running'
}

/** Đọc trạng thái lạ (`TimedOut`, chữ thường…) về đúng sáu giá trị; giá trị không biết coi là Chưa mở. */
export function normalizeStageStatus(raw: string | null | undefined): StageStatus {
  switch ((raw ?? '').toLowerCase()) {
    case 'ready':
      return 'Ready'
    case 'queued':
      return 'Queued'
    case 'running':
      return 'Running'
    case 'succeeded':
      return 'Succeeded'
    case 'failed':
    case 'timedout':
      return 'Failed'
    default:
      return 'Locked'
  }
}

/** Đọc `progress` phòng thủ: BE có thể trả `{done,total}` hoặc chuỗi `"3/5"`. */
export function parseProgress(raw: unknown): StageProgress | null {
  if (!raw) return null
  if (typeof raw === 'string') {
    const match = /^(\d+)\s*\/\s*(\d+)$/.exec(raw.trim())
    return match ? { done: Number(match[1]), total: Number(match[2]) } : null
  }
  if (typeof raw === 'object') {
    const value = raw as { done?: unknown; total?: unknown }
    if (typeof value.done !== 'number') return null
    return { done: value.done, total: typeof value.total === 'number' ? value.total : null }
  }
  return null
}

/** Phần trăm tiến độ (0–100) khi biết tổng số bước; không biết tổng thì `null` (không đoán theo thời gian). */
export function progressPercent(progress: StageProgress | null | undefined): number | null {
  if (!progress || !progress.total || progress.total <= 0) return null
  return Math.max(0, Math.min(100, Math.round((progress.done / progress.total) * 100)))
}

/** Hỏi lại `GET /stages` mỗi 5 giây khi còn chặng đang chờ hoặc đang chạy; không thì dừng hỏi. */
export const STAGE_POLL_MS = 5_000

export function stagePollInterval(stages: readonly Pick<StageView, 'status'>[] | undefined): number | false {
  return stages?.some((stage) => isStageActive(stage.status)) ? STAGE_POLL_MS : false
}

export function stageOf<T extends Pick<StageView, 'stage'>>(stages: readonly T[] | undefined, name: StageName) {
  return stages?.find((stage) => stage.stage === name)
}

/** Trạng thái một nấc của thanh tiến trình bốn bước. */
export type PipelineStepState = 'done' | 'current' | 'running' | 'failed' | 'ready' | 'locked'

function stageStepState(status: StageStatus): PipelineStepState {
  if (status === 'Succeeded') return 'done'
  if (isStageActive(status)) return 'running'
  if (status === 'Failed') return 'failed'
  return status === 'Ready' ? 'ready' : 'locked'
}

/** Gộp trạng thái Dự toán và 3D thành một nấc: xong khi cả hai xong; đang chạy khi có chặng chạy; lỗi khi có chặng lỗi. */
function groupStepState(statuses: readonly StageStatus[]): PipelineStepState {
  if (statuses.every((status) => status === 'Succeeded')) return 'done'
  if (statuses.some(isStageActive)) return 'running'
  if (statuses.some((status) => status === 'Failed')) return 'failed'
  return statuses.some((status) => status === 'Ready') ? 'ready' : 'locked'
}

/**
 * Nấc của thanh tiến trình theo trạng thái các chặng. Nấc 1 (Nhập liệu) xong khi chặng 2D đã được tiếp nhận hoặc
 * thành công; nấc 3 gộp Dự toán và 3D; `current` là nấc của màn đang mở để tô màu thương hiệu.
 */
export function pipelineStepStates(
  stages: readonly Pick<StageView, 'stage' | 'status'>[] | undefined,
  current: PipelineStep
): Record<PipelineStep, PipelineStepState> {
  const statusOf = (stage: StageName) => stageOf(stages, stage)?.status ?? (stage === 'Plan2d' ? 'Ready' : 'Locked')
  const plan2d = statusOf('Plan2d')
  const result: Record<PipelineStep, PipelineStepState> = {
    1: plan2d === 'Succeeded' || isStageActive(plan2d) ? 'done' : 'ready',
    2: stageStepState(plan2d),
    3: groupStepState(PARALLEL_STAGES.map(statusOf)),
    4: stageStepState(statusOf('Dossier'))
  }
  if (result[current] !== 'done' && result[current] !== 'running' && result[current] !== 'failed') {
    result[current] = 'current'
  }
  return result
}

/** Thao tác hiện ở bước Dự toán & 3D (BR-PROJ-010 khoản 2–4, BR-PROJ-011 khoản 9). */
export interface StageGroupActions {
  /**
   * Đi tiếp: có chặng Sẵn sàng (chưa từng chạy), không chặng nào đang chạy và không cần Thử lại. Gồm cả bản đã xong Dự
   * toán theo luồng cũ mà chưa chạy 3D: Đi tiếp chỉ chạy 3D (BR-PROJ-010 khoản 2).
   */
  next: boolean
  /** Thử lại: có chặng Lỗi còn chạy lại được, kể cả khi chặng kia đang chạy. */
  retry: boolean
  /** Mọi chặng đang lỗi đều đã hết số lần chạy lại và không còn chặng nào chạy được: báo liên hệ hỗ trợ. */
  contactSupport: boolean
  /** Sang bước Hồ sơ: cả hai chặng đã thành công. */
  toDossier: boolean
}

type GroupStage = Pick<StageView, 'status' | 'runId' | 'retriesLeft'> | undefined

export function stageGroupActions(estimate: GroupStage, render3d: GroupStage): StageGroupActions {
  const pair = [estimate, render3d]
  const status = (stage: GroupStage): StageStatus => stage?.status ?? 'Locked'
  const canRetry = (stage: GroupStage) => status(stage) === 'Failed' && (stage?.retriesLeft ?? 1) > 0
  const failed = pair.filter((stage) => status(stage) === 'Failed')
  const toDossier = pair.every((stage) => status(stage) === 'Succeeded')
  const retry = pair.some(canRetry)
  const next =
    !retry && pair.some((stage) => status(stage) === 'Ready') && !pair.some((stage) => isStageActive(status(stage)))
  const contactSupport =
    failed.length > 0 && !retry && !pair.some((stage) => isStageActive(status(stage)) || status(stage) === 'Ready')
  return { next, retry, contactSupport, toDossier }
}

/** Idempotency-Key cố định khi tự tạo hồ sơ: tải lại trang hay mở hai tab chỉ tạo một lần chạy (TDD-PROJ-011). */
export function dossierAutoKey(estimateId: string): string {
  return `dossier-auto:${estimateId}`
}

/**
 * Có tự tạo hồ sơ khi khách vào bước Hồ sơ không (BR-PROJ-010 khoản 4): chỉ khi chặng Sẵn sàng và chưa có lần chạy nào.
 * Lần chạy trước đã lỗi thì không tự chạy lại; khách bấm Chạy lại (STORY-PROJ-010 ALT-05).
 */
export function dossierAutoStart(dossier: Pick<StageView, 'status' | 'runId'> | undefined, pending: boolean): boolean {
  return !pending && dossier?.status === 'Ready' && !dossier.runId
}

/**
 * Thời gian AI thường cần cho mỗi chặng, hiện cho khách thay giờ hạn hoàn tất (người dùng chốt 14/10/2026: mọi chặng
 * ghi “khoảng 3–4 phút”). Đây là con số để khách ước lượng, không phải hạn xử lý của hệ thống (`deadlineUtc`).
 */
export const STAGE_TYPICAL_MINUTES = { min: 3, max: 4 } as const

/**
 * `overdue` khi lần chạy đã quá thời gian thường cần tính từ lúc tiếp nhận: màn đổi sang câu trấn an, không hiện giờ hạn.
 * Thiếu `acceptedAtUtc` thì coi như còn trong khoảng thường cần.
 */
export function stageEtaState(acceptedAtUtc: string | null | undefined, nowMs: number): 'typical' | 'overdue' {
  const accepted = acceptedAtUtc ? Date.parse(acceptedAtUtc) : Number.NaN
  if (Number.isNaN(accepted)) return 'typical'
  return nowMs - accepted > STAGE_TYPICAL_MINUTES.max * 60_000 ? 'overdue' : 'typical'
}

/** Mili-giây còn lại tới lúc chuyển sang `overdue`; `null` khi không cần hẹn giờ (thiếu mốc hoặc đã quá). */
export function stageEtaRemainingMs(acceptedAtUtc: string | null | undefined, nowMs: number): number | null {
  const accepted = acceptedAtUtc ? Date.parse(acceptedAtUtc) : Number.NaN
  if (Number.isNaN(accepted)) return null
  const remaining = accepted + STAGE_TYPICAL_MINUTES.max * 60_000 - nowMs
  return remaining > 0 ? remaining : null
}

/** Loại mẫu thư viện cho màn chờ: 2D khi chặng 2D đang chạy, 3D khi Dự toán hoặc 3D đang chạy (BR-LIB-001 khoản 16). */
export function waitingTemplateKind(
  stages: readonly Pick<StageView, 'stage' | 'status'>[] | undefined
): '2d' | '3d' | null {
  if (isStageActive(stageOf(stages, 'Plan2d')?.status)) return '2d'
  return PARALLEL_STAGES.some((stage) => isStageActive(stageOf(stages, stage)?.status)) ? '3d' : null
}

/* ===========================================================================
 * Tiếp nhận lần chạy chặng: lỗi và khóa chống gửi lặp
 * ======================================================================== */

/** Nhóm lỗi khi bấm chạy chặng — mỗi nhóm một câu cho khách (khóa `design.pipeline.runError.<kind>`). */
export type StageRunErrorKind =
  | 'inProgress'
  | 'groupRequired'
  | 'alreadySucceeded'
  | 'prerequisite'
  | 'retryLimit'
  | 'versionConflict'
  | 'idempotencyConflict'
  | 'legacyResult'
  | 'invalidInput'
  | 'maintenance'
  | 'busy'
  | 'aiPaused'
  | 'stageUnavailable'
  | 'quota'
  | 'subscription'
  | 'notFound'
  | 'network'
  | 'other'

interface ErrorLike {
  status?: number
  code?: string
  messageCode?: string
}

const errorCode = (error: ErrorLike) => error.messageCode ?? error.code ?? ''

export function stageRunErrorKind(error: ErrorLike | null | undefined): StageRunErrorKind {
  if (!error) return 'other'
  switch (errorCode(error)) {
    case 'StageRunInProgress':
      return 'inProgress'
    case 'StageRunGroupRequired':
      return 'groupRequired'
    case 'StageAlreadySucceeded':
      return 'alreadySucceeded'
    case 'StagePrerequisiteNotMet':
      return 'prerequisite'
    case 'StageRetryLimitReached':
      return 'retryLimit'
    case 'InputVersionConflict':
      return 'versionConflict'
    case 'IdempotencyConflict':
      return 'idempotencyConflict'
    case 'LegacyResultExists':
      return 'legacyResult'
    case 'InvalidStageInput':
      return 'invalidInput'
    case 'PipelineUnavailable':
      return 'maintenance'
    case 'PipelineBusy':
      return 'busy'
    case 'AiServiceUnavailable':
      return 'aiPaused'
    case 'StageUnavailable':
      return 'stageUnavailable'
    case 'QuotaUnavailable':
      return 'quota'
    case 'SubscriptionInactive':
    case 'EntitlementMissing':
      return 'subscription'
    case 'EstimateNotFound':
      return 'notFound'
    default:
      if (error.status === 0) return 'network'
      return 'other'
  }
}

/**
 * Giữ khóa Idempotency-Key cho lần bấm này hay không. Lỗi mạng/máy chủ (không rõ BE đã nhận chưa) thì giữ để lần thử
 * lại không giữ thêm lượt; mọi phản hồi khác (đã nhận, hoặc bị từ chối rõ ràng) kết thúc lần bấm, lần sau dùng khóa mới.
 */
export function keepRunKeyAfter(error: ErrorLike | null | undefined): boolean {
  if (!error) return false
  const status = error.status ?? 0
  return status === 0 || status >= 500
    ? !['PipelineUnavailable', 'PipelineBusy', 'AiServiceUnavailable', 'StageUnavailable'].includes(errorCode(error))
    : false
}

/** Trường thiếu BE trả trong 422 `InvalidStageInput` (khóa của `errors`), bỏ tiền tố `input.` nếu có. */
export function invalidStageFields(errors: Record<string, string[]> | null | undefined): string[] {
  if (!errors) return []
  return [...new Set(Object.keys(errors).map((key) => key.replace(/^input\./, '')))]
}

/* ===========================================================================
 * Ảnh lô đất và soi ảnh (TDD-PROJ-007 mục C, D; BR-PROJ-015)
 * ======================================================================== */

export const LOT_IMAGE_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp']
export const LOT_IMAGE_MAX_BYTES = 10 * 1024 * 1024
export const LOT_IMAGE_MIN_LONG = 640
export const LOT_IMAGE_MIN_SHORT = 480
export const LOT_IMAGE_MAX_ASPECT = 3
export const LOT_IMAGE_MAX_PIXELS = 40_000_000

export type LotImageProblem = 'type' | 'size' | 'tooSmall' | 'aspect' | 'tooLarge'

/**
 * Kiểm sớm ảnh lô ở trình duyệt để khỏi tốn một lượt tải: JPG/PNG/WebP, tối đa 10 MiB, tối thiểu 640×480 (cạnh dài ×
 * cạnh ngắn), cạnh dài không quá 3 lần cạnh ngắn, không quá 40 triệu điểm ảnh. BE đọc lại byte thật và quyết định cuối.
 * Chưa đọc được kích thước (`width`/`height` thiếu) thì chỉ kiểm loại và dung lượng.
 */
export function lotImageProblem(file: {
  type: string
  size: number
  width?: number | null
  height?: number | null
}): LotImageProblem | null {
  if (!LOT_IMAGE_TYPES.includes(file.type)) return 'type'
  if (file.size <= 0 || file.size > LOT_IMAGE_MAX_BYTES) return 'size'
  if (!file.width || !file.height) return null
  const long = Math.max(file.width, file.height)
  const short = Math.min(file.width, file.height)
  if (long < LOT_IMAGE_MIN_LONG || short < LOT_IMAGE_MIN_SHORT) return 'tooSmall'
  if (long * short > LOT_IMAGE_MAX_PIXELS) return 'tooLarge'
  if (long / short > LOT_IMAGE_MAX_ASPECT) return 'aspect'
  return null
}

/** Trạng thái một yêu cầu soi ảnh (`EstimateLotVerificationRequest.State`). */
export type LotVerificationState = 'Pending' | 'Processing' | 'Completed' | 'Failed'

export interface LotVerificationIssue {
  code: string
  message?: string | null
}

export interface LotVerificationView {
  requestId: string
  state: LotVerificationState
  verdict?: 'Pass' | 'Fail' | null
  issues?: LotVerificationIssue[] | null
  reason?: string | null
  reused?: boolean | null
  remainingToday?: number | null
  failureCode?: string | null
  deadlineUtc?: string | null
}

/** Hỏi lại `GET …/lot-verifications/current` mỗi 3 giây khi đang soi (không có SignalR). */
export const LOT_VERIFICATION_POLL_MS = 3_000

export function isVerificationInFlight(state: LotVerificationState | null | undefined): boolean {
  return state === 'Pending' || state === 'Processing'
}

export function lotVerificationPollInterval(
  view: Pick<LotVerificationView, 'state'> | null | undefined
): number | false {
  return isVerificationInFlight(view?.state) ? LOT_VERIFICATION_POLL_MS : false
}

/** Ảnh hiện tại đã soi Đạt? Chỉ kết quả `Completed` + `Pass` mới mở được chặng 2D (BR-PROJ-015 khoản 5). */
export function lotVerificationPassed(view: LotVerificationView | null | undefined): boolean {
  return view?.state === 'Completed' && view.verdict === 'Pass'
}

/** Ảnh hiện tại có kết quả cuối (Đạt, Không đạt hoặc lỗi) chưa — dùng để biết có cần tự gửi yêu cầu soi không. */
export function needsVerificationRequest(view: LotVerificationView | null | undefined): boolean {
  return view === null || view === undefined
}

/** Kiểu hiển thị khối kết quả soi ảnh. */
export type LotVerificationDisplay = 'none' | 'checking' | 'pass' | 'fail' | 'failed'

export function lotVerificationDisplay(view: LotVerificationView | null | undefined): LotVerificationDisplay {
  if (!view) return 'none'
  if (isVerificationInFlight(view.state)) return 'checking'
  if (view.state === 'Failed') return 'failed'
  return view.verdict === 'Pass' ? 'pass' : 'fail'
}

/** Lý do yêu cầu soi lỗi → khóa câu cho khách (`design.pipeline.verify.failure.<kind>`). */
export type LotVerificationFailureKind = 'quota' | 'unavailable' | 'invalidImage' | 'busy' | 'other'

export function lotVerificationFailureKind(code: string | null | undefined): LotVerificationFailureKind {
  switch (code) {
    case 'LotVerificationQuotaExceeded':
      return 'quota'
    case 'LotVerificationUnavailable':
      return 'unavailable'
    case 'LotImageInvalid':
      return 'invalidImage'
    case 'LotVerificationBusy':
      return 'busy'
    default:
      return 'other'
  }
}

/** Lỗi khi gửi yêu cầu soi (`POST lot-verifications`) → nhóm lỗi (`design.pipeline.verify.requestError.<kind>`). */
export type LotVerificationRequestErrorKind = 'locked' | 'noImage' | 'aiPaused' | 'busy' | 'other'

export function lotVerificationRequestErrorKind(error: ErrorLike | null | undefined): LotVerificationRequestErrorKind {
  if (!error) return 'other'
  switch (errorCode(error)) {
    case 'EstimateInputLocked':
      return 'locked'
    case 'LotImageRequired':
      return 'noImage'
    case 'AiServiceUnavailable':
      return 'aiPaused'
    case 'LotVerificationBusy':
      return 'busy'
    default:
      return 'other'
  }
}

/* ===========================================================================
 * Danh sách "Dự toán của tôi" (BR-PROJ-008 khoản 2)
 * ======================================================================== */

/** Trạng thái danh sách của luồng bốn chặng; `Succeeded` là bí danh cũ của `Completed`. */
export type PipelineListState = 'Draft' | 'Processing' | 'Failed' | 'InProgress' | 'Completed'

export function normalizeListState(raw: string | null | undefined): PipelineListState {
  switch (raw) {
    case 'Processing':
    case 'Pending':
      return 'Processing'
    case 'Failed':
    case 'TimedOut':
      return 'Failed'
    case 'InProgress':
      return 'InProgress'
    case 'Completed':
    case 'Succeeded':
      return 'Completed'
    default:
      return 'Draft'
  }
}

/** Trạng thái thẻ dự án (chip lọc, badge) của luồng bốn chặng. */
export type PipelineProjectStatus = 'input' | 'designing' | 'failed' | 'inProgress' | 'completed'

export function projectStatusOfListState(state: PipelineListState): PipelineProjectStatus {
  switch (state) {
    case 'Processing':
      return 'designing'
    case 'Failed':
      return 'failed'
    case 'InProgress':
      return 'inProgress'
    case 'Completed':
      return 'completed'
    default:
      return 'input'
  }
}

export function normalizeStageName(raw: string | null | undefined): StageName | null {
  return PIPELINE_STAGES.find((stage) => stage.toLowerCase() === (raw ?? '').toLowerCase()) ?? null
}

/**
 * Nấc của mini-stepper bốn bước trên thẻ dự án, tính từ các chặng đã xong: nấc đầu tiên chưa xong là nấc đang làm
 * (hoặc lỗi theo trạng thái danh sách); các nấc sau chưa tới. Hoàn tất thì cả bốn nấc xong.
 */
export function pipelineMiniSteps(
  state: PipelineListState,
  succeededStages: readonly StageName[]
): Record<PipelineStep, 'done' | 'current' | 'failed' | 'pending'> {
  const done: Record<PipelineStep, boolean> = {
    1: state !== 'Draft',
    2: succeededStages.includes('Plan2d'),
    3: PARALLEL_STAGES.every((stage) => succeededStages.includes(stage)),
    4: state === 'Completed' || succeededStages.includes('Dossier')
  }
  if (state === 'Completed') for (const step of PIPELINE_STEPS) done[step] = true
  const result = {} as Record<PipelineStep, 'done' | 'current' | 'failed' | 'pending'>
  let reached = false
  for (const step of PIPELINE_STEPS) {
    if (done[step] && !reached) result[step] = 'done'
    else if (!reached) {
      reached = true
      result[step] = state === 'Failed' ? 'failed' : 'current'
    } else result[step] = 'pending'
  }
  return result
}

/**
 * Bước khách nên mở tiếp (TDD-PROJ-006, chạy cùng lúc khoản 8): có Hồ sơ hoặc đã xong cả Dự toán và 3D → Hồ sơ; có 2D
 * → Dự toán & 3D; đã có lần chạy 2D → Bản vẽ 2D; còn lại → Nhập liệu.
 */
export function resumeStep(state: PipelineListState, succeededStages: readonly StageName[]): PipelineStep {
  if (state === 'Draft') return 1
  if (state === 'Completed' || succeededStages.includes('Dossier')) return 4
  if (PARALLEL_STAGES.every((stage) => succeededStages.includes(stage))) return 4
  if (succeededStages.includes('Plan2d')) return 3
  return 2
}
