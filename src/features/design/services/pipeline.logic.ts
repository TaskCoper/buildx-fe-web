/**
 * Luồng dự toán bốn chặng (TDD-PROJ-006/007) — logic thuần, không React, không HTTP, không import giá trị nên chạy
 * được bằng `node --test` (xem `scripts/estimate-pipeline.test.mjs`).
 *
 * Bốn chặng nối nhau: Bản vẽ 2D → Dự toán → Phối cảnh 3D → Hồ sơ. Thanh tiến trình của khách có năm bước: Nhập liệu
 * rồi bốn chặng.
 */

export type StageName = 'Plan2d' | 'Estimate' | 'Render3d' | 'Dossier'

export const PIPELINE_STAGES: readonly StageName[] = ['Plan2d', 'Estimate', 'Render3d', 'Dossier']

/** Bước của thanh tiến trình năm bước: 1 Nhập liệu, 2 Bản vẽ 2D, 3 Dự toán, 4 Phối cảnh 3D, 5 Hồ sơ. */
export type PipelineStep = 1 | 2 | 3 | 4 | 5

export const PIPELINE_STEPS: readonly PipelineStep[] = [1, 2, 3, 4, 5]

export const STEP_OF_STAGE: Record<StageName, PipelineStep> = { Plan2d: 2, Estimate: 3, Render3d: 4, Dossier: 5 }

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

/** Trạng thái một nấc của thanh tiến trình năm bước. */
export type PipelineStepState = 'done' | 'current' | 'running' | 'failed' | 'ready' | 'locked'

/**
 * Nấc của thanh tiến trình theo trạng thái các chặng. Nấc 1 (Nhập liệu) xong khi chặng 2D đã được tiếp nhận hoặc
 * thành công; `current` là nấc của màn đang mở để tô màu thương hiệu.
 */
export function pipelineStepStates(
  stages: readonly Pick<StageView, 'stage' | 'status'>[] | undefined,
  current: PipelineStep
): Record<PipelineStep, PipelineStepState> {
  const plan2d = stageOf(stages, 'Plan2d')?.status
  const inputDone = plan2d === 'Succeeded' || isStageActive(plan2d)
  const result = { 1: inputDone ? 'done' : 'ready' } as Record<PipelineStep, PipelineStepState>
  for (const stage of PIPELINE_STAGES) {
    const status = stageOf(stages, stage)?.status ?? (stage === 'Plan2d' ? 'Ready' : 'Locked')
    result[STEP_OF_STAGE[stage]] =
      status === 'Succeeded'
        ? 'done'
        : isStageActive(status)
          ? 'running'
          : status === 'Failed'
            ? 'failed'
            : status === 'Ready'
              ? 'ready'
              : 'locked'
  }
  if (result[current] !== 'done' && result[current] !== 'running' && result[current] !== 'failed') {
    result[current] = 'current'
  }
  return result
}

/* ===========================================================================
 * Tiếp nhận lần chạy chặng: lỗi và khóa chống gửi lặp
 * ======================================================================== */

/** Nhóm lỗi khi bấm chạy chặng — mỗi nhóm một câu cho khách (khóa `design.pipeline.runError.<kind>`). */
export type StageRunErrorKind =
  | 'inProgress'
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
 * Nấc của mini-stepper năm bước trên thẻ dự án: các chặng tới `lastSucceededStage` đã xong; nấc kế tiếp đang làm
 * (hoặc đang chạy / lỗi theo trạng thái danh sách); còn lại chưa tới. Hoàn tất thì cả năm nấc xong.
 */
export function pipelineMiniSteps(
  state: PipelineListState,
  lastSucceededStage: StageName | null
): Record<PipelineStep, 'done' | 'current' | 'failed' | 'pending'> {
  const result = {} as Record<PipelineStep, 'done' | 'current' | 'failed' | 'pending'>
  const lastDone: number =
    state === 'Completed' ? 5 : lastSucceededStage ? STEP_OF_STAGE[lastSucceededStage] : state === 'Draft' ? 0 : 1
  for (const step of PIPELINE_STEPS) {
    if (step <= lastDone) result[step] = 'done'
    else if (step === lastDone + 1) result[step] = state === 'Failed' ? 'failed' : 'current'
    else result[step] = 'pending'
  }
  return result
}

/** Bước khách nên mở tiếp: bản nháp → Nhập liệu; còn lại → chặng kế tiếp sau chặng đã xong gần nhất. */
export function resumeStep(state: PipelineListState, lastSucceededStage: StageName | null): PipelineStep {
  if (state === 'Draft') return 1
  if (state === 'Completed') return 5
  const after = lastSucceededStage ? STEP_OF_STAGE[lastSucceededStage] + 1 : 2
  return Math.min(5, after) as PipelineStep
}
