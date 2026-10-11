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
