import { z } from 'zod'
import { http } from '@/shared/lib/api'
export const baseTypesRow = z.object({
  buildingTypeId: z.string().uuid().nullable().optional(),
  baseCode: z.string().default(''),
  defaultLotWidthM: z.number(),
  defaultLotDepthM: z.number(),
  maxFloors: z.number(),
  hasRoof: z.boolean(),
  allowsTum: z.boolean(),
  hasStructurePart: z.boolean(),
  lotMinSideM: z.number(),
  lotMaxSideM: z.number(),
  lotMinAreaM2: z.number(),
  lotMaxAreaM2: z.number(),
  carFrontageMinM: z.number(),
  garageFrontageMinM: z.number(),
  garageMinAreaM2: z.number(),
  bedroomMinAreaM2: z.number(),
  bedroomMinSideM: z.number(),
  instruction: z.string().nullable()
})
export const roofRulesRow = z.object({
  buildingTypeId: z.string().uuid().nullable().optional(),
  styleId: z.string().uuid().nullable().optional(),
  baseCode: z.string().default(''),
  baseStyleCode: z.string().default('*'),
  roofKind: z.string(),
  slopeFactor: z.number(),
  conversionFactor: z.number(),
  nameVi: z.string().nullable(),
  descriptionVi: z.string(),
  assumptionVi: z.string().nullable(),
  render3dText: z.string().nullable()
})
const packageStagesRow = z.object({ package: z.string(), stage: z.string(), text: z.string() })
const regionInstructionsRow = z.object({ stage: z.string(), region: z.string(), topic: z.string(), text: z.string() })
const instructionsRow = z.object({
  id: z.string(),
  stage: z.string(),
  baseCode: z.string().nullable(),
  package: z.string().nullable(),
  region: z.string().nullable(),
  text: z.string(),
  enabled: z.boolean(),
  sortOrder: z.number()
})
const promptPartsRow = z.object({ promptCode: z.string(), slotKey: z.string(), text: z.string() })
export const ruleContent = z.object({
  baseTypes: z.array(baseTypesRow),
  roofRules: z.array(roofRulesRow),
  packageStages: z.array(packageStagesRow),
  regionInstructions: z.array(regionInstructionsRow),
  instructions: z.array(instructionsRow),
  promptParts: z.array(promptPartsRow)
})
export type RuleContent = z.infer<typeof ruleContent>
export type RuleGroup = Exclude<keyof RuleContent, 'promptParts'>
const view = z.object({
  version: z.number(),
  number: z.number(),
  revisionId: z.string(),
  sourceCommit: z.string().nullable(),
  content: ruleContent
})
const revision = z.object({
  revisionId: z.string(),
  number: z.number(),
  createdBy: z.string().nullable(),
  createdAtUtc: z.string(),
  note: z.string().nullable(),
  changeScope: z.string().nullable(),
  restoredFromNumber: z.number().nullable()
})
export type RuleRevision = z.infer<typeof revision>
const prompt = z.object({
  code: z.string(),
  stage: z.string(),
  codeVersion: z.string(),
  affectedTasks: z.array(z.string()),
  slots: z.array(
    z.object({
      slotKey: z.string(),
      defaultText: z.string(),
      allowEmpty: z.boolean(),
      requiredVariables: z.array(z.number())
    })
  )
})
export type PromptDefinition = z.infer<typeof prompt>
const catalog = z.object({
  buildingTypes: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      architectureStyleIds: z.array(z.string().uuid()),
      missingConfiguration: z.array(z.string())
    })
  ),
  architectureStyles: z.array(z.object({ id: z.string().uuid(), name: z.string() })),
  baseCodes: z.array(z.string()),
  baseStyleCodes: z.array(z.string()),
  roofKinds: z.array(z.string()),
  packages: z.array(z.string()),
  stages: z.array(z.string()),
  regions: z.array(z.string())
})
export type RuleCatalog = z.infer<typeof catalog>
const saved = z.object({ version: z.number(), revisionId: z.string(), warnings: z.array(z.string()) })
const base = '/admin/estimate-ai-rules'
const key = (value: string) => ({ headers: { 'Idempotency-Key': value } })
export const aiRulesApi = {
  saveBuildingType: async (
    id: string,
    expectedVersion: number,
    note: string,
    configuration: { baseType: RuleContent['baseTypes'][number]; roofRules: RuleContent['roofRules'] },
    mutationKey: string
  ) =>
    saved.parse(
      await http.put<unknown>(
        `${base}/building-types/${id}`,
        { expectedVersion, note, configuration },
        key(mutationKey)
      )
    ),
  current: async () => view.parse(await http.get<unknown>(base)),
  catalog: async () => catalog.parse(await http.get<unknown>(`${base}/catalog`)),
  revisions: async (page: number) =>
    z
      .object({ items: z.array(revision), totalCount: z.number() })
      .parse(await http.get<unknown>(`${base}/revisions?pageIndex=${page}&pageSize=10`)),
  revision: async (number: number) => view.parse(await http.get<unknown>(`${base}/revisions/${number}`)),
  save: async (
    group: RuleGroup,
    expectedVersion: number,
    note: string,
    items: RuleContent[RuleGroup],
    mutationKey: string
  ) =>
    saved.parse(await http.put<unknown>(`${base}/groups/${group}`, { expectedVersion, note, items }, key(mutationKey))),
  restore: async (number: number, expectedVersion: number, note: string, mutationKey: string, promptCode?: string) =>
    saved.parse(
      await http.post<unknown>(
        promptCode
          ? `/admin/estimate-prompts/${encodeURIComponent(promptCode)}/revisions/${number}/restore`
          : `${base}/revisions/${number}/restore`,
        { expectedVersion, note },
        key(mutationKey)
      )
    ),
  prompts: async () =>
    z
      .object({ version: z.number(), revisionId: z.string(), catalog: z.array(prompt), parts: z.array(promptPartsRow) })
      .parse(await http.get<unknown>('/admin/estimate-prompts')),
  savePrompt: async (
    code: string,
    expectedVersion: number,
    note: string,
    slots: { slotKey: string; text: string }[],
    mutationKey: string
  ) =>
    saved.parse(
      await http.put<unknown>(
        `/admin/estimate-prompts/${encodeURIComponent(code)}`,
        { expectedVersion, note, slots },
        key(mutationKey)
      )
    )
}
