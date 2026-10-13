import { z } from 'zod'

import {
  normalizeStageName,
  normalizeStageStatus,
  parseProgress,
  type StageName,
  type StageView
} from '../services/pipeline.logic'

/**
 * Hợp đồng API của luồng bốn chặng (TDD-PROJ-006/007 mục Internal API). Đọc phòng thủ: trường lạ bị bỏ, trường
 * thiếu thành null, để BE thêm trường không làm vỡ giao diện. Mọi kiểu dùng ở giao diện suy ra từ đây.
 */

const nullableText = z.string().nullable().optional()
const stageName = z.string().transform((value, ctx) => {
  const stage = normalizeStageName(value)
  if (!stage) {
    ctx.addIssue({ code: 'custom', message: `Unknown stage ${value}` })
    return z.NEVER
  }
  return stage as StageName
})

/** `GET /estimates/{id}/stages` — trạng thái bốn chặng. */
export const stagesSchema = z
  .object({
    stages: z.array(
      z.object({
        stage: stageName,
        status: z.string().nullable().optional(),
        runId: nullableText,
        acceptedAtUtc: nullableText,
        deadlineUtc: nullableText,
        finishedAtUtc: nullableText,
        failureCode: nullableText,
        retriesLeft: z.number().int().nullable().optional(),
        blockedReason: nullableText,
        progress: z.unknown().optional()
      })
    )
  })
  .transform(({ stages }): StageView[] =>
    stages.map((stage) => ({
      ...stage,
      status: normalizeStageStatus(stage.status),
      progress: parseProgress(stage.progress)
    }))
  )

/** `POST /estimates/{id}/stages/{stage}/runs` — 202 khi vừa tiếp nhận, 200 khi gửi lặp cùng khóa. */
export const stageRunAcceptedSchema = z.object({
  runId: z.string(),
  stage: stageName,
  state: z.string(),
  acceptedAtUtc: nullableText,
  deadlineUtc: nullableText
})
export type StageRunAccepted = z.infer<typeof stageRunAcceptedSchema>

const verificationState = z.enum(['Pending', 'Processing', 'Completed', 'Failed'])

/** `POST …/lot-verifications` (202/200) và `GET …/lot-verifications/current`. */
export const lotVerificationSchema = z.object({
  requestId: z.string(),
  state: verificationState,
  verdict: z.enum(['Pass', 'Fail']).nullable().optional(),
  issues: z
    .array(z.object({ code: z.string(), message: z.string().nullable().optional() }))
    .nullable()
    .optional(),
  reason: nullableText,
  reused: z.boolean().nullable().optional(),
  remainingToday: z.number().int().nullable().optional(),
  failureCode: nullableText,
  deadlineUtc: nullableText
})

/** Nguồn kích thước lô của phương án (TDD-PROJ-007 mục F). */
export type LotSource = 'customer' | 'image' | 'description' | 'default'

const room = z.object({
  name: z.string(),
  areaM2: z.number().nullable().optional(),
  size: z.string().nullable().optional()
})

/** `GET /estimates/{id}/stages/Plan2d/result` — phần gửi khách của chặng 2D. */
export const plan2dResultSchema = z.object({
  runId: z.string(),
  lot: z
    .object({
      widthM: z.number(),
      depthM: z.number(),
      source: z.string().nullable().optional()
    })
    .nullable()
    .optional(),
  totalFloorAreaM2: z.number().nullable().optional(),
  builtAreaM2: z.number().nullable().optional(),
  summary: z.string().nullable().optional(),
  assumptions: z.array(z.string()).nullable().optional(),
  notes: z.array(z.string()).nullable().optional(),
  floors: z
    .array(
      z.object({
        index: z.number().int(),
        name: z.string(),
        areaM2: z.number().nullable().optional(),
        rooms: z.array(room).nullable().optional()
      })
    )
    .default([]),
  drawings: z
    .array(
      z.object({
        floorIndex: z.number().int(),
        floorName: z.string().nullable().optional(),
        kind: z.string(),
        fileUrl: z.string(),
        width: z.number().nullable().optional(),
        height: z.number().nullable().optional()
      })
    )
    .default([])
})
export type Plan2dResult = z.infer<typeof plan2dResultSchema>
export type Plan2dDrawing = Plan2dResult['drawings'][number]

/* ===========================================================================
 * Chặng Dự toán — phần gửi khách, hợp đồng `estimate-v1` (TDD-PROJ-009 Internal API, mục G, P)
 * ======================================================================== */

/**
 * Số của dự toán đọc phòng thủ: nhận số hoặc chuỗi số (cột `numeric` có thể bị ghi thành chuỗi), giá trị lạ thành
 * `null` thay vì làm hỏng cả bảng. Màn hình in "—" cho ô thiếu số.
 */
const estimateNumber = z
  .preprocess(
    (value) => (typeof value === 'string' && value.trim() !== '' ? Number(value) : value),
    z.number().finite().nullable().optional()
  )
  .catch(null)
const estimateText = z.string().nullable().optional().catch(null)

const estimateItem = z.object({
  name: z.string().catch(''),
  /** Kích thước, chỉ có ở dòng nội thất; in dưới tên hạng mục như app demo. */
  size: estimateText,
  unit: estimateText,
  quantity: estimateNumber,
  /** Phần thô, hoàn thiện: vật tư + nhân công đã cộng sẵn (app demo `unit_price`); thành tiền tính theo đúng số này. */
  unitPrice: estimateNumber,
  amount: estimateNumber,
  /** Vật liệu kèm hãng. Đọc để giữ hợp đồng nhưng màn hình không hiện, theo app demo (không hiện hãng vật tư). */
  material: estimateText
})

const estimateGroup = z
  .object({
    name: estimateText,
    /** Tên nhóm theo khóa của app demo (`group`), phòng khi BE giữ nguyên khóa cũ. */
    group: estimateText,
    items: z.array(estimateItem).catch([]).default([])
  })
  .transform(({ name, group, items }) => ({ name: name ?? group ?? '', items }))

const estimatePartSchema = z.object({
  part: z.string(),
  title: estimateText,
  total: estimateNumber,
  groups: z.array(estimateGroup).catch([]).default([])
})

/** `GET /estimates/{id}/stages/Estimate/result` — phần gửi khách của chặng Dự toán. */
export const estimateResultSchema = z.object({
  runId: estimateText,
  contractVersion: estimateText,
  completedAtUtc: estimateText,
  /** Ngày lập dự toán theo giờ Việt Nam (`yyyy-MM-dd`). */
  estimateDateVn: estimateText,
  convertedFloorAreaM2: estimateNumber,
  totals: z
    .object({
      structure: estimateNumber,
      finishing: estimateNumber,
      interior: estimateNumber,
      grandTotal: estimateNumber
    })
    .nullable()
    .optional()
    .catch(null),
  /** Đơn giá trên m² sàn quy đổi = tổng dự toán ÷ tổng sàn quy đổi, đã làm tròn tới đồng (mục G). */
  pricePerM2Vnd: estimateNumber,
  parts: z.array(estimatePartSchema).default([]),
  /** Thời gian thi công dự kiến của từng phần và tổng, dạng chữ (ví dụ "~95 ngày"). */
  schedule: z
    .object({ structure: estimateText, finishing: estimateText, interior: estimateText, total: estimateText })
    .nullable()
    .optional()
    .catch(null),
  /** Đoạn tư vấn gửi khách, đã lọc nội dung nội bộ; hiện như văn bản thuần (mục L). */
  advice: estimateText
})
export type EstimateStageResult = z.infer<typeof estimateResultSchema>

/** TDD-PROJ-010: ảnh đã commit và các ô đang chờ, kể cả khi lần chạy lỗi. */
export const render3dResultSchema = z.object({
  contractVersion: z.literal('render3d-v1'),
  runId: z.string().uuid().nullable(),
  status: z.enum(['Ready', 'Running', 'Failed', 'Succeeded']),
  planReady: z.boolean(),
  progress: z.object({ done: z.number().int().nonnegative(), total: z.number().int().nonnegative().nullable() }),
  items: z.array(
    z.object({
      itemKey: z.string(),
      label: z.string(),
      groupKey: z.string(),
      groupLabel: z.string(),
      floorIndex: z.number().int().positive().nullable(),
      view: z.number().int().positive(),
      fileUrl: z.string().nullable(),
      width: z.number().int().positive().nullable(),
      height: z.number().int().positive().nullable()
    })
  ),
  notes: z.array(z.string())
})
export type Render3dResult = z.infer<typeof render3dResultSchema>

export const dossierDocumentSchema = z
  .object({
    role: z.enum(['dossier-pdf', 'render3d-pdf', 'architecture-pdf', 'estimate-xlsx']),
    fileUrl: z.string().regex(/^\/api\/v1\/estimates\/[^/]+\/stage-files\//),
    contentType: z.enum(['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
    sizeBytes: z.number().int().positive(),
    pageCount: z.number().int().positive().nullable()
  })
  .refine((file) =>
    file.role === 'estimate-xlsx'
      ? file.contentType.endsWith('sheet') && file.pageCount === null
      : file.contentType === 'application/pdf' && file.pageCount !== null
  )
export const dossierResultSchema = z.object({
  schemaVersion: z.literal(1),
  runId: z.string().uuid(),
  projectName: z.string(),
  projectCode: z.string(),
  printedProjectName: z.string(),
  documents: z
    .array(dossierDocumentSchema)
    .length(4)
    .refine((files) => new Set(files.map((file) => file.role)).size === 4)
})
export type DossierStageResult = z.infer<typeof dossierResultSchema>
export type DossierDocument = z.infer<typeof dossierDocumentSchema>
export const dossierContentSchema = z.object({
  schemaVersion: z.literal(1),
  project: z.object({ projectName: z.string(), projectCode: z.string(), address: z.string(), quoteDate: z.string() }),
  estimate: estimateResultSchema,
  drawings: z.array(
    z.object({
      fileId: z.string().uuid(),
      label: z.string(),
      kind: z.enum(['2d', '3d']),
      floorIndex: z.number().int().nullable(),
      sheetCode: z.string()
    })
  )
})
