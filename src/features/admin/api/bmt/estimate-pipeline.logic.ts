/**
 * Màn quản trị luồng AI tạo dự toán (STORY-PROJ-011, STORY-PROJ-012, TDD-PROJ-008) — phần thuần, không import giá
 * trị, để kiểm bằng `node --test`. Đọc phòng thủ vì hợp đồng GET chỉ được mô tả ở mức trường trong TDD.
 */

export type PipelineStage = 'Plan2d' | 'Estimate' | 'Render3d' | 'Dossier'
export const PIPELINE_STAGES: readonly PipelineStage[] = ['Plan2d', 'Estimate', 'Render3d', 'Dossier']

export type PipelineTask = 'lotVerify' | 'plan2dSpec' | 'plan2dImage' | 'estimate' | 'render3dImage' | 'render3dCheck'
export const PIPELINE_TASKS: readonly PipelineTask[] = [
  'lotVerify',
  'plan2dSpec',
  'plan2dImage',
  'estimate',
  'render3dImage',
  'render3dCheck'
]

export type AiProvider = 'OpenAI' | 'Anthropic'

export interface StageSetting {
  stage: PipelineStage
  timeoutMinutes: number
  retryLimit: number
}

export interface TaskSetting {
  task: PipelineTask
  provider: AiProvider
  model: string
  fallbackModel: string | null
  /** Tham số theo model (`reasoning`, `quality`…), sửa dạng JSON và được BE kiểm theo cờ khả năng. */
  parameters: Record<string, unknown>
}

export interface ModelPrice {
  model: string
  inputPerMTok: number
  cachedInputPerMTok: number
  outputPerMTok: number
  cacheWritePerMTok: number | null
}

export interface SupportedModel {
  model: string
  provider: AiProvider | string
  /** Cờ khả năng (`reasoning`, `temperature`, `forceTool`, `inputFidelity`) — chỉ để hiển thị gợi ý. */
  capabilities: Record<string, boolean>
}

/** Cấu hình AI hiện hành, đúng các trường của body PUT (TDD-PROJ-008 Examples). */
export interface PipelineConfig {
  stages: StageSetting[]
  lotVerifyDailyLimit: number
  lotVerifySystemDailyLimit: number
  lotVerifyTimeoutSeconds: number
  maxQueuedRuns: number
  breaker: { failureThreshold: number; openMinutes: number }
  runCostAlertUsd: number
  planOutline: { redraw: boolean; tolerance: number; minOverlap: number }
  limits: {
    imagesPerMinute: number
    imageConcurrency: number
    textConcurrency: number
    anthropicConcurrency: number
    lotVerifyConcurrency: number
  }
  tasks: TaskSetting[]
  prices: ModelPrice[]
}

export interface PipelineConfigView {
  version: number
  revisionId: string | null
  config: PipelineConfig
  /** Trường BE trả mà màn này chưa biết: gửi lại nguyên khi lưu để không làm mất cấu hình. */
  extra: Record<string, unknown>
  supportedModels: SupportedModel[]
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const num = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value)
    ? value
    : typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))
      ? Number(value)
      : fallback
const str = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback)
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

const KNOWN_KEYS = [
  'stages',
  'lotVerifyDailyLimit',
  'lotVerifySystemDailyLimit',
  'lotVerifyTimeoutSeconds',
  'maxQueuedRuns',
  'breaker',
  'runCostAlertUsd',
  'planOutline',
  'limits',
  'tasks',
  'prices'
]

/** Đọc `GET /admin/estimate-pipeline/config`; nhận cả dạng có lớp `config` lẫn dạng phẳng. */
export function normalizePipelineConfig(raw: unknown): PipelineConfigView {
  const root = isObject(raw) ? raw : {}
  const source = isObject(root.config) ? root.config : root
  const breaker = isObject(source.breaker) ? source.breaker : {}
  const outline = isObject(source.planOutline) ? source.planOutline : {}
  const limits = isObject(source.limits) ? source.limits : {}
  const stages = PIPELINE_STAGES.map((stage) => {
    const found = list(source.stages).find((item) => isObject(item) && item.stage === stage)
    const row = isObject(found) ? found : {}
    return { stage, timeoutMinutes: num(row.timeoutMinutes), retryLimit: num(row.retryLimit) }
  })
  const extra: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(source)) if (!KNOWN_KEYS.includes(key)) extra[key] = value
  return {
    version: num(root.version),
    revisionId: typeof root.revisionId === 'string' ? root.revisionId : null,
    extra,
    supportedModels: list(root.supportedModels)
      .filter(isObject)
      .map((item) => ({
        model: str(item.model),
        provider: str(item.provider),
        capabilities: isObject(item.capabilities)
          ? Object.fromEntries(Object.entries(item.capabilities).map(([key, value]) => [key, value === true]))
          : {}
      })),
    config: {
      stages,
      lotVerifyDailyLimit: num(source.lotVerifyDailyLimit),
      lotVerifySystemDailyLimit: num(source.lotVerifySystemDailyLimit),
      lotVerifyTimeoutSeconds: num(source.lotVerifyTimeoutSeconds),
      maxQueuedRuns: num(source.maxQueuedRuns),
      breaker: { failureThreshold: num(breaker.failureThreshold), openMinutes: num(breaker.openMinutes) },
      runCostAlertUsd: num(source.runCostAlertUsd),
      planOutline: {
        redraw: outline.redraw === true,
        tolerance: num(outline.tolerance),
        minOverlap: num(outline.minOverlap)
      },
      limits: {
        imagesPerMinute: num(limits.imagesPerMinute),
        imageConcurrency: num(limits.imageConcurrency),
        textConcurrency: num(limits.textConcurrency),
        anthropicConcurrency: num(limits.anthropicConcurrency),
        lotVerifyConcurrency: num(limits.lotVerifyConcurrency)
      },
      tasks: list(source.tasks)
        .filter(isObject)
        .map((item) => ({
          task: str(item.task) as PipelineTask,
          provider: str(item.provider, 'OpenAI') as AiProvider,
          model: str(item.model),
          fallbackModel: typeof item.fallbackModel === 'string' && item.fallbackModel ? item.fallbackModel : null,
          parameters: isObject(item.parameters) ? item.parameters : {}
        })),
      prices: list(source.prices)
        .filter(isObject)
        .map((item) => ({
          model: str(item.model),
          inputPerMTok: num(item.inputPerMTok),
          cachedInputPerMTok: num(item.cachedInputPerMTok),
          outputPerMTok: num(item.outputPerMTok),
          cacheWritePerMTok:
            item.cacheWritePerMTok === null || item.cacheWritePerMTok === undefined ? null : num(item.cacheWritePerMTok)
        }))
    }
  }
}

/** Body `PUT /admin/estimate-pipeline/config`: giữ trường lạ BE đã trả, ghi đè trường màn này sửa. */
export function pipelineConfigBody(view: PipelineConfigView, edited: PipelineConfig, note: string) {
  return { ...view.extra, ...edited, expectedVersion: view.version, note: note.trim() }
}

/** Tham số model nhập dạng JSON: phải là object; trả `null` khi sai để form báo lỗi. */
export function parseParameters(text: string): Record<string, unknown> | null {
  if (text.trim() === '') return {}
  try {
    const value: unknown = JSON.parse(text)
    return isObject(value) ? value : null
  } catch {
    return null
  }
}

/** Lỗi trường từ 422 `InvalidPipelineConfig` (`errors` theo đường dẫn như `tasks[0].model`) → đường dẫn form antd. */
export function configFieldPath(key: string): (string | number)[] {
  return key
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean)
    .map((part) => (/^\d+$/.test(part) ? Number(part) : part))
}

/* ===========================================================================
 * Miền giá theo tỉnh (BR-PROJ-013, TDD-PROJ-008 mục G)
 * ======================================================================== */

export type PriceRegion = 'North' | 'Central' | 'South'
export const PRICE_REGIONS: readonly PriceRegion[] = ['North', 'Central', 'South']

export interface PricingRegionRow {
  provinceCode: string
  provinceName: string
  region: PriceRegion | null
  highland: boolean
  rowVersion: string
}

export function normalizePricingRegions(raw: unknown): { tableVersion: number | null; rows: PricingRegionRow[] } {
  const root = isObject(raw) ? raw : {}
  const items = Array.isArray(raw) ? raw : list(root.provinces).length ? list(root.provinces) : list(root.items)
  return {
    tableVersion: root.tableVersion === undefined ? null : num(root.tableVersion),
    rows: items.filter(isObject).map((item) => ({
      provinceCode: str(item.provinceCode),
      provinceName: str(item.provinceName),
      region: PRICE_REGIONS.includes(item.region as PriceRegion) ? (item.region as PriceRegion) : null,
      highland: item.highland === true,
      rowVersion: String(item.rowVersion ?? '')
    }))
  }
}

/** Dòng hợp lệ: có miền; dấu Tây Nguyên chỉ đi với miền Trung (CHECK NOT Highland OR Region='Central'). */
export function regionRowProblem(
  row: Pick<PricingRegionRow, 'region' | 'highland'>
): 'missingRegion' | 'highlandOutsideCentral' | null {
  if (!row.region) return 'missingRegion'
  if (row.highland && row.region !== 'Central') return 'highlandOutsideCentral'
  return null
}

/** Chỉ gửi những dòng đã đổi, kèm `rowVersion` đọc được để BE chặn ghi đè (409 `VersionConflict`). */
export function changedRegionRows(original: readonly PricingRegionRow[], edited: readonly PricingRegionRow[]) {
  const before = new Map(original.map((row) => [row.provinceCode, row]))
  return edited
    .filter((row) => {
      const old = before.get(row.provinceCode)
      return !old || old.region !== row.region || old.highland !== row.highland
    })
    .map((row) => ({
      provinceCode: row.provinceCode,
      region: row.region,
      highland: row.highland,
      rowVersion: row.rowVersion
    }))
}

/* ===========================================================================
 * Chi tiết luồng AI của một bản dự toán (TDD-PROJ-006 Internal API)
 * ======================================================================== */

export interface AiCallRow {
  callId: string
  task: string
  provider: string
  model: string
  startedAtUtc: string | null
  durationMs: number | null
  inputTokens: number | null
  outputTokens: number | null
  retries: number | null
  outcome: string
  errorCode: string | null
  estimatedCostUsd: number | null
  hasRaw: boolean
}

export interface StepRow {
  stepKey: string
  attempt: number | null
  model: string | null
  promptVersion: string | null
  completedAtUtc: string | null
}

export interface RunRow {
  runId: string
  stage: string
  state: string
  acceptedAtUtc: string | null
  finishedAtUtc: string | null
  failureCode: string | null
  failureDetail: string | null
  countsTowardLimit: boolean | null
  pipelineVersion: string | null
  configRevision: string | null
  ruleSetRevision: string | null
  steps: StepRow[]
  aiCalls: AiCallRow[]
}

export interface PipelineDetail {
  estimateId: string
  code: string
  name: string
  runs: RunRow[]
  /** Phần nội bộ (cờ cần rà, kết quả đo viền…), hiện nguyên dạng JSON cho nhân viên. */
  internal: unknown
}

const optNum = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null)
const optStr = (value: unknown): string | null => (typeof value === 'string' && value !== '' ? value : null)

export function normalizePipelineDetail(raw: unknown): PipelineDetail {
  const root = isObject(raw) ? raw : {}
  return {
    estimateId: str(root.estimateId),
    code: str(root.code ?? root.estimateCode),
    name: str(root.name ?? root.estimateName),
    internal: root.internal ?? null,
    runs: list(root.runs)
      .filter(isObject)
      .map((run) => ({
        runId: str(run.runId ?? run.id),
        stage: str(run.stage),
        state: str(run.state ?? run.status),
        acceptedAtUtc: optStr(run.acceptedAtUtc),
        finishedAtUtc: optStr(run.finishedAtUtc),
        failureCode: optStr(run.failureCode),
        failureDetail: optStr(run.failureDetail),
        countsTowardLimit: typeof run.countsTowardLimit === 'boolean' ? run.countsTowardLimit : null,
        pipelineVersion: optStr(run.pipelineVersion),
        configRevision:
          run.configRevisionNumber !== undefined ? String(run.configRevisionNumber) : optStr(run.configRevisionId),
        ruleSetRevision:
          run.ruleSetRevisionNumber !== undefined ? String(run.ruleSetRevisionNumber) : optStr(run.ruleSetRevisionId),
        steps: list(run.steps)
          .filter(isObject)
          .map((step) => ({
            stepKey: str(step.stepKey),
            attempt: optNum(step.attempt),
            model: optStr(step.model),
            promptVersion: optStr(step.promptVersion),
            completedAtUtc: optStr(step.completedAtUtc)
          })),
        aiCalls: list(run.aiCalls)
          .filter(isObject)
          .map((call) => ({
            callId: str(call.callId ?? call.id),
            task: str(call.task),
            provider: str(call.provider),
            model: str(call.model),
            startedAtUtc: optStr(call.startedAtUtc),
            durationMs: optNum(call.durationMs),
            inputTokens: optNum(call.inputTokens),
            outputTokens: optNum(call.outputTokens),
            retries: optNum(call.retries),
            outcome: str(call.outcome),
            errorCode: optStr(call.errorCode),
            estimatedCostUsd: optNum(call.estimatedCostUsd),
            hasRaw: call.hasRaw !== false
          }))
      }))
  }
}

/** Tổng chi phí AI ước tính của một lần chạy (USD); không có số nào thì `null`. */
export function runCostUsd(run: Pick<RunRow, 'aiCalls'>): number | null {
  const costs = run.aiCalls.map((call) => call.estimatedCostUsd).filter((cost): cost is number => cost !== null)
  return costs.length ? Math.round(costs.reduce((sum, cost) => sum + cost, 0) * 1_000_000) / 1_000_000 : null
}

/** Chặng có thể đặt lại bộ đếm: có lần lỗi được tính và chặng chưa thành công, không đang chạy. */
export function canResetStage(
  runs: readonly Pick<RunRow, 'stage' | 'state' | 'countsTowardLimit'>[],
  stage: string
): boolean {
  const ofStage = runs.filter((run) => run.stage === stage)
  if (ofStage.some((run) => run.state === 'Succeeded' || run.state === 'Queued' || run.state === 'Running'))
    return false
  return ofStage.some((run) => (run.state === 'Failed' || run.state === 'TimedOut') && run.countsTowardLimit === true)
}
