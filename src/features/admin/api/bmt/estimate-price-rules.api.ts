import { z } from 'zod'
import { http } from '@/shared/lib/api'

export const priceRuleKind = z.enum(['PriceFramework', 'TakeoffRules'])
export type PriceRuleKind = z.infer<typeof priceRuleKind>
const version = z.object({
  versionId: z.string(),
  number: z.number().int(),
  createdBy: z.string().nullable(),
  createdAtUtc: z.string(),
  note: z.string().nullable(),
  restoredFromNumber: z.number().int().nullable()
})
const document = version.extend({ kind: priceRuleKind, content: z.string() })
export type PriceRuleDocument = z.infer<typeof document>
export type PriceRuleVersion = z.infer<typeof version>
const preview = z.object({
  bands: z.array(
    z.object({
      priceType: z.string(),
      part: z.string(),
      package: z.string(),
      lowTrM2: z.number(),
      highTrM2: z.number(),
      currentLowTrM2: z.number().nullable(),
      currentHighTrM2: z.number().nullable()
    })
  ),
  warnings: z.array(z.string())
})
export type PricePreview = z.infer<typeof preview>
const saved = z.object({
  kind: priceRuleKind,
  number: z.number().int(),
  versionId: z.string(),
  createdAtUtc: z.string(),
  warnings: z.array(z.string())
})
const path = (kind: PriceRuleKind) => `/admin/estimate-pricing/rule-documents/${kind}`
const key = (mutationKey: string) => ({ headers: { 'Idempotency-Key': mutationKey } })
export const estimatePriceRulesApi = {
  current: async () =>
    z.object({ documents: z.array(document) }).parse(await http.get<unknown>('/admin/estimate-pricing/rule-documents'))
      .documents,
  versions: async (kind: PriceRuleKind, pageIndex: number) =>
    z
      .object({ items: z.array(version), totalCount: z.number(), pageIndex: z.number(), pageSize: z.number() })
      .parse(await http.get<unknown>(`${path(kind)}/versions?pageIndex=${pageIndex}&pageSize=10`)),
  version: async (kind: PriceRuleKind, number: number) =>
    document.parse(await http.get<unknown>(`${path(kind)}/versions/${number}`)),
  preview: async (content: string) =>
    preview.parse(await http.post<unknown>(`${path('PriceFramework')}/preview`, { content })),
  save: async (
    kind: PriceRuleKind,
    body: { expectedVersion: number; content: string; note: string },
    mutationKey: string
  ) => saved.parse(await http.put<unknown>(path(kind), body, key(mutationKey))),
  restore: async (
    kind: PriceRuleKind,
    number: number,
    body: { expectedVersion: number; note: string },
    mutationKey: string
  ) => saved.parse(await http.post<unknown>(`${path(kind)}/versions/${number}/restore`, body, key(mutationKey)))
}
