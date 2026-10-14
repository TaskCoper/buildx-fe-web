import type { RuleGroup, RuleContent, RuleCatalog } from '../api/bmt/ai-rules.api'
export interface RuleField {
  key: string
  kind: 'text' | 'number' | 'boolean' | 'select'
  options?: Exclude<keyof RuleCatalog, 'buildingTypes' | 'architectureStyles'>
  optional?: boolean
  max?: number
}
export const ruleKeys: Record<keyof RuleContent, string[]> = {
  baseTypes: ['buildingTypeId'],
  roofRules: ['buildingTypeId', 'styleId'],
  packageStages: ['package', 'stage'],
  regionInstructions: ['stage', 'region', 'topic'],
  instructions: ['id'],
  promptParts: ['promptCode', 'slotKey']
}
export function ruleRowKey(group: keyof RuleContent, row: Record<string, unknown>): string {
  if ((group === 'baseTypes' || group === 'roofRules') && !row.buildingTypeId)
    return JSON.stringify([row.baseCode, ...(group === 'roofRules' ? [row.baseStyleCode] : [])])
  return JSON.stringify(ruleKeys[group].map((key) => row[key] ?? null))
}
export function ruleComparison(content: RuleContent, promptCode?: string): string {
  const groups = promptCode ? (['promptParts'] as const) : (Object.keys(content) as (keyof RuleContent)[])
  return groups
    .flatMap((group) =>
      content[group]
        .filter((row) => !promptCode || ('promptCode' in row && row.promptCode === promptCode))
        .map((row) => ({ key: ruleRowKey(group, row), row }))
        .sort((a, b) => a.key.localeCompare(b.key))
        .flatMap(({ key, row }) =>
          Object.entries(row)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([field, value]) => `${group} ${key} · ${field}: ${String(value ?? '')}`)
        )
    )
    .join('\n')
}
export const ruleFields: Record<RuleGroup, RuleField[]> = {
  baseTypes: [
    { key: 'buildingTypeId', kind: 'select' },
    { key: 'defaultLotWidthM', kind: 'number' },
    { key: 'defaultLotDepthM', kind: 'number' },
    { key: 'maxFloors', kind: 'number' },
    { key: 'hasRoof', kind: 'boolean' },
    { key: 'allowsTum', kind: 'boolean' },
    { key: 'hasStructurePart', kind: 'boolean' },
    { key: 'lotMinSideM', kind: 'number' },
    { key: 'lotMaxSideM', kind: 'number' },
    { key: 'lotMinAreaM2', kind: 'number' },
    { key: 'lotMaxAreaM2', kind: 'number' },
    { key: 'carFrontageMinM', kind: 'number' },
    { key: 'garageFrontageMinM', kind: 'number' },
    { key: 'garageMinAreaM2', kind: 'number' },
    { key: 'bedroomMinAreaM2', kind: 'number' },
    { key: 'bedroomMinSideM', kind: 'number' },
    { key: 'instruction', kind: 'text', optional: true, max: 2000 }
  ],
  roofRules: [
    { key: 'buildingTypeId', kind: 'select' },
    { key: 'styleId', kind: 'select', optional: true },
    { key: 'roofKind', kind: 'select', options: 'roofKinds' },
    { key: 'slopeFactor', kind: 'number' },
    { key: 'conversionFactor', kind: 'number' },
    { key: 'nameVi', kind: 'text', optional: true, max: 100 },
    { key: 'descriptionVi', kind: 'text', max: 500 },
    { key: 'assumptionVi', kind: 'text', optional: true, max: 1000 },
    { key: 'render3dText', kind: 'text', optional: true, max: 1000 }
  ],
  packageStages: [
    { key: 'package', kind: 'select', options: 'packages' },
    { key: 'stage', kind: 'select', options: 'stages' },
    { key: 'text', kind: 'text', max: 2000 }
  ],
  regionInstructions: [
    { key: 'stage', kind: 'select', options: 'stages' },
    { key: 'region', kind: 'select', options: 'regions' },
    { key: 'topic', kind: 'text', max: 32 },
    { key: 'text', kind: 'text', max: 2000 }
  ],
  instructions: [
    { key: 'stage', kind: 'select', options: 'stages' },
    { key: 'baseCode', kind: 'select', options: 'baseCodes', optional: true },
    { key: 'package', kind: 'select', options: 'packages', optional: true },
    { key: 'region', kind: 'select', options: 'regions', optional: true },
    { key: 'text', kind: 'text', max: 2000 },
    { key: 'enabled', kind: 'boolean' },
    { key: 'sortOrder', kind: 'number' }
  ]
}

export function architectureOptions(catalog: RuleCatalog | undefined, buildingTypeId: unknown) {
  const type = catalog?.buildingTypes.find((item) => item.id === buildingTypeId)
  return (
    catalog?.architectureStyles
      .filter((style) => type?.architectureStyleIds.includes(style.id))
      .map((style) => ({ value: style.id, label: style.name })) ?? []
  )
}
