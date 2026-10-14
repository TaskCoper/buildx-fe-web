import { z } from 'zod'
import { http } from '@/shared/lib/api'
const fixture = z.object({
  id: z.string(),
  version: z.string(),
  hash: z.string(),
  name: z.string(),
  cases: z.array(z.string())
})
const preview = z.object({
  previewHash: z.string(),
  promptCode: z.string(),
  caseCode: z.string(),
  fixture,
  ruleVersion: z.number(),
  ruleSetRevisionId: z.string(),
  configRevisionId: z.string(),
  priceFrameworkVersionId: z.string().nullable(),
  takeoffRulesVersionId: z.string().nullable(),
  executorVersion: z.string(),
  matchedInstructions: z.array(z.string()),
  request: z.object({
    mode: z.string(),
    kind: z.string(),
    stage: z.string(),
    task: z.string(),
    stepKey: z.string(),
    systemPrompt: z.string(),
    userText: z.string(),
    schemaName: z.string().nullable(),
    schemaJson: z.string().nullable(),
    toolDescription: z.string().nullable(),
    imageSize: z.string().nullable(),
    qualityPrompt: z.string().nullable(),
    qualitySchema: z.string().nullable(),
    images: z.array(
      z.object({ name: z.string(), sha256: z.string(), contentType: z.string(), width: z.number(), height: z.number() })
    )
  })
})
const item = z.object({
  trialId: z.string(),
  promptCode: z.string(),
  caseCode: z.string(),
  state: z.enum(['Queued', 'Running', 'Succeeded', 'Failed', 'TimedOut']),
  previewHash: z.string(),
  createdAtUtc: z.string(),
  deadlineUtc: z.string(),
  finishedAtUtc: z.string().nullable(),
  failureCode: z.string().nullable()
})
const detail = z.object({
  trial: item,
  mode: z.string(),
  validation: z
    .object({ passed: z.boolean(), errors: z.array(z.string()), expectedCalls: z.number().optional() })
    .nullable(),
  text: z.string().nullable(),
  resultContentType: z.string().nullable(),
  resultBytes: z.number().nullable(),
  estimatedCostUsd: z.number().nullable(),
  warnings: z.array(z.string()),
  calls: z.array(
    z.object({
      callId: z.string(),
      task: z.string(),
      model: z.string(),
      outcome: z.string(),
      errorCode: z.string().nullable(),
      durationMs: z.number(),
      inputTokens: z.number().nullable(),
      outputTokens: z.number().nullable(),
      retries: z.number(),
      estimatedCostUsd: z.number().nullable()
    })
  )
})
export type PromptPreview = z.infer<typeof preview>
export type PromptTrial = z.infer<typeof item>
export type PromptTrialDetail = z.infer<typeof detail>
export type PromptTrialInput = {
  expectedVersion: number
  slots: { slotKey: string; text: string }[]
  fixtureId: string
  fixtureVersion: string
  caseCode: string
}
const base = '/admin/estimate-prompts'
const path = (code: string) => `${base}/${encodeURIComponent(code)}`
export const promptTrialsApi = {
  fixtures: async (code: string) => z.array(fixture).parse(await http.get<unknown>(`${path(code)}/fixtures`)),
  preview: async (code: string, input: PromptTrialInput) =>
    preview.parse(await http.post<unknown>(`${path(code)}/preview`, input)),
  start: async (code: string, input: PromptTrialInput, previewHash: string, key: string) =>
    z
      .object({ trialId: z.string(), state: z.string(), wasAlreadyAccepted: z.boolean() })
      .parse(
        await http.post<unknown>(
          `${path(code)}/trials`,
          { ...input, previewHash },
          { headers: { 'Idempotency-Key': key } }
        )
      ),
  list: async (code: string, page = 1, hash?: string) =>
    z
      .object({ items: z.array(item), totalCount: z.number() })
      .parse(
        await http.get<unknown>(
          `${path(code)}/trials?pageIndex=${page}&pageSize=10${hash ? `&previewHash=${encodeURIComponent(hash)}` : ''}`
        )
      ),
  detail: async (id: string) => detail.parse(await http.get<unknown>(`${base}/trials/${encodeURIComponent(id)}`)),
  result: async (id: string) =>
    z
      .object({ fileUrl: z.string(), contentType: z.string(), sizeBytes: z.number(), sha256: z.string() })
      .parse(await http.get<unknown>(`${base}/trials/${encodeURIComponent(id)}/result`))
}
