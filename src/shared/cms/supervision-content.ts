import type { SupervisionPackage, SupervisionTier } from './index'
import {
  SUPERVISION_COMPARISON,
  SUPERVISION_TIERS,
  SUPERVISION_VALUE_ROWS,
  ADDONS,
  JOURNEY_STEPS
} from './supervision-pricing-defaults'
import { readComparisonGroups, type ComparisonGroup, type ComparisonRow } from './plans-comparison-content'
import { readValueItems, type ValueItem } from './plans-value-content'

export const SUPERVISION_SECTIONS = ['comparison', 'addons', 'scope', 'journey', 'value', 'notes'] as const
export type SupervisionSection = (typeof SUPERVISION_SECTIONS)[number]
export interface SupervisionComparisonGroup extends Omit<ComparisonGroup, 'rows'> {
  rows: Array<Omit<ComparisonRow, 'basic' | 'advanced' | 'pro'> & Record<SupervisionTier, ComparisonRow['basic']>>
}
export type SupervisionValueItem = Record<'label' | 'icon' | SupervisionTier, string>
export type SupervisionContentItem = Record<string, string>
export const SUPERVISION_ITEM_FIELDS = {
  addons: ['label', 'price', 'note'],
  scope: ['text'],
  journey: ['title', 'description', 'icon'],
  value: ['label', 'icon', 'self', 'check', 'control']
} as const
export const SUPERVISION_HEADER_KEYS = [
  'title',
  'criterion',
  'choosePlanRow',
  'buttons.self',
  'buttons.check',
  'buttons.control'
] as const
export const supervisionField = (key: string) => key.replaceAll('.', '_')
export const supervisionPath = (section: SupervisionSection, key: string) => [
  'supervision',
  'pricing',
  section,
  ...key.split('.')
]

// Bộ điều khiển bảng dùng ba vị trí của Gói tư vấn trong form. Chỉ chuyển tại ranh giới form;
// JSON lưu và đọc của trang giám sát luôn dùng self/check/control, không dùng mã gói tư vấn.
export function supervisionGroupsToEditor(groups: SupervisionComparisonGroup[]): ComparisonGroup[] {
  return groups.map((group) => ({
    ...group,
    rows: group.rows.map(({ self, check, control, ...row }) => ({ ...row, basic: self, advanced: check, pro: control }))
  }))
}
export function supervisionGroupsFromEditor(groups: ComparisonGroup[]): SupervisionComparisonGroup[] {
  return groups.map((group) => ({
    ...group,
    rows: group.rows.map(({ basic, advanced, pro, ...row }) => ({ ...row, self: basic, check: advanced, control: pro }))
  }))
}
export function readSupervisionGroups(value: unknown): SupervisionComparisonGroup[] | undefined {
  if (!Array.isArray(value)) return undefined
  const converted = value.map((group) => {
    if (!object(group) || !Array.isArray(group.rows)) return group
    return {
      ...group,
      rows: group.rows.map((row) => {
        if (!object(row) || Object.keys(row).some((key) => !['id', 'label', ...SUPERVISION_TIERS].includes(key)))
          return null
        const { self, check, control, ...rest } = row
        return { ...rest, basic: self, advanced: check, pro: control }
      })
    }
  })
  const parsed = readComparisonGroups(converted)
  return parsed === undefined ? undefined : supervisionGroupsFromEditor(parsed)
}
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
export function readSupervisionItems(value: unknown, fields: readonly string[]): SupervisionContentItem[] | undefined {
  if (!Array.isArray(value) || value.length > 100) return undefined
  const result: SupervisionContentItem[] = []
  for (const item of value) {
    if (!object(item) || Object.keys(item).some((key) => !fields.includes(key))) return undefined
    const row: SupervisionContentItem = {}
    for (const field of fields) {
      const v = item[field] === undefined ? '' : item[field]
      if (typeof v !== 'string') return undefined
      const clean = v.trim()
      if (field === 'icon' ? clean !== '' && !/^[A-Za-z0-9-]{1,64}$/.test(clean) : [...clean].length > 1000)
        return undefined
      row[field] = clean
    }
    result.push(row)
  }
  return result
}
export function supervisionValuesToEditor(items: SupervisionContentItem[]): ValueItem[] {
  return items.map((item) => ({
    label: item.label ?? '',
    icon: item.icon ?? '',
    basic: item.self ?? '',
    advanced: item.check ?? '',
    pro: item.control ?? ''
  }))
}
export function supervisionValuesFromEditor(value: unknown): SupervisionContentItem[] | undefined {
  return readValueItems(value)?.map(({ basic, advanced, pro, ...row }) => ({
    ...row,
    self: basic,
    check: advanced,
    control: pro
  }))
}

export function supervisionDefaultGroups(
  packages: readonly SupervisionPackage[],
  copy: (key: string, values?: Record<string, string | number>) => string,
  money: (value: number) => string
): SupervisionComparisonGroup[] {
  const byTier = (tier: SupervisionTier) => packages.find((item) => item.tier === tier)
  const core = ['inspectionCount', 'duration', 'price'].map((key) => ({
    id: key,
    label: copy('rows.' + key),
    ...Object.fromEntries(
      SUPERVISION_TIERS.map((tier) => {
        const pkg = byTier(tier)
        const text =
          key === 'inspectionCount'
            ? pkg?.inspections
              ? String(pkg.inspections)
              : '—'
            : key === 'price'
              ? money(pkg?.price ?? 0)
              : tier === 'self'
                ? copy('values.unlimited')
                : copy('values.months', { count: pkg?.durationMonths ?? 0 })
        return [tier, { kind: 'text', text }]
      })
    )
  })) as SupervisionComparisonGroup['rows']
  return [
    { id: 'core', title: copy('groups.core'), style: 'standard', rows: core },
    ...SUPERVISION_COMPARISON.map((group) => ({
      id: group.key,
      title: copy('groups.' + group.key),
      style: 'standard' as const,
      rows: group.rows.map((row) => ({
        id: row.key,
        label: copy('rows.' + row.key),
        ...Object.fromEntries(
          SUPERVISION_TIERS.map((tier) => {
            const value = row.values[tier]
            return [
              tier,
              typeof value === 'boolean'
                ? { kind: value ? 'yes' : 'no', text: '' }
                : { kind: 'text', text: copy('values.' + value) }
            ]
          })
        )
      })) as SupervisionComparisonGroup['rows']
    }))
  ]
}
export function supervisionDefaultItems(
  section: 'addons' | 'scope' | 'journey' | 'value',
  copy: (key: string, values?: Record<string, string | number>) => string,
  months = 6
): SupervisionContentItem[] {
  switch (section) {
    case 'addons':
      return ADDONS.map((key) => ({
        label: copy(key, { months }),
        price: copy(key + 'Price'),
        note: copy(key + 'Note')
      }))
    case 'scope':
      return ['r1', 'r2', 'r3'].map((key) => ({ text: copy(key) }))
    case 'journey':
      return JOURNEY_STEPS.map((key, index) => ({
        title: copy(key),
        description: copy(key + 'Body'),
        icon: ['ShieldCheck', 'Construction', 'FileText', 'House'][index] ?? 'Circle'
      }))
    case 'value':
      return SUPERVISION_VALUE_ROWS.map((key, index) => ({
        label: copy('rows.' + key),
        icon: ['ShieldCheck', 'FileText', 'ClipboardCheck', 'House'][index] ?? 'Circle',
        ...Object.fromEntries(SUPERVISION_TIERS.map((tier) => [tier, copy(`cells.${key}.${tier}`)]))
      }))
  }
}
export function supervisionCopy(
  content: Readonly<Record<string, unknown>> | undefined,
  key: string,
  fallback: string,
  values?: Record<string, string | number>
) {
  const value = content?.[supervisionField(key)]
  const text = typeof value === 'string' && value.trim() ? value.trim() : fallback
  return text.replace(/\{(tier|count|months)\}/g, (match, key: string) =>
    values?.[key] === undefined ? match : String(values[key])
  )
}
