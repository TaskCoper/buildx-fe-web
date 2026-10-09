import { formatPlansCopy, plansCopyField } from './plans-sections'
import { PLAN_COMPARISON, planCell } from './plans-comparison-legacy'
import type { PlanView } from './plans-merge'

export const COMPARISON_TIERS = ['basic', 'advanced', 'pro'] as const
export type ComparisonTier = (typeof COMPARISON_TIERS)[number]
export type ComparisonCellKind = 'yes' | 'no' | 'text'
export interface ComparisonCell {
  kind: ComparisonCellKind
  text: string
}
export interface ComparisonRow {
  id: string
  label: string
  basic: ComparisonCell
  advanced: ComparisonCell
  pro: ComparisonCell
}
export interface ComparisonGroup {
  id: string
  title: string
  style: 'standard' | 'accent'
  rows: ComparisonRow[]
}
export const COMPARISON_MAX_GROUPS = 100
export const COMPARISON_MAX_ROWS = 500

const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const keysAre = (value: Record<string, unknown>, fields: string[]) =>
  Object.keys(value).every((key) => fields.includes(key))
const text = (value: unknown): value is string => typeof value === 'string' && [...value.trim()].length <= 1000
const id = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value)

/** Kiểm dữ liệu ở ranh giới API; mảng [] là nội dung đã xóa có chủ đích, khác trường chưa được lưu. */
export function readComparisonGroups(value: unknown): ComparisonGroup[] | undefined {
  if (!Array.isArray(value) || value.length > COMPARISON_MAX_GROUPS) return undefined
  const groupIds = new Set<string>()
  const rowIds = new Set<string>()
  const result: ComparisonGroup[] = []
  for (const group of value) {
    if (
      !object(group) ||
      !keysAre(group, ['id', 'title', 'style', 'rows']) ||
      !id(group.id) ||
      groupIds.has(group.id) ||
      !text(group.title) ||
      (group.style !== 'standard' && group.style !== 'accent') ||
      !Array.isArray(group.rows)
    )
      return undefined
    groupIds.add(group.id)
    const rows: ComparisonRow[] = []
    for (const row of group.rows) {
      if (
        !object(row) ||
        !keysAre(row, ['id', 'label', ...COMPARISON_TIERS]) ||
        !id(row.id) ||
        rowIds.has(row.id) ||
        !text(row.label)
      )
        return undefined
      rowIds.add(row.id)
      if (rowIds.size > COMPARISON_MAX_ROWS) return undefined
      const cells: Partial<Record<ComparisonTier, ComparisonCell>> = {}
      for (const tier of COMPARISON_TIERS) {
        const cell = row[tier]
        if (
          !object(cell) ||
          !keysAre(cell, ['kind', 'text']) ||
          !['yes', 'no', 'text'].includes(String(cell.kind)) ||
          !text(cell.text)
        )
          return undefined
        cells[tier] = { kind: cell.kind as ComparisonCellKind, text: cell.text }
      }
      rows.push({ id: row.id, label: row.label, basic: cells.basic!, advanced: cells.advanced!, pro: cells.pro! })
    }
    result.push({ id: group.id, title: group.title, style: group.style, rows })
  }
  return result
}

export function newComparisonRow(id: string): ComparisonRow {
  return {
    id,
    label: '',
    basic: { kind: 'no', text: '' },
    advanced: { kind: 'no', text: '' },
    pro: { kind: 'no', text: '' }
  }
}

/** Lấy bảng cũ làm điểm bắt đầu. Gói chỉ được đọc tại đây, không có thao tác sửa quyền/hạn mức. */
export function legacyComparisonGroups(
  plans: PlanView[],
  copy: (key: string, values?: Record<string, string | number>) => string,
  giftText: (plan: PlanView) => string
): ComparisonGroup[] {
  const byTier = (tier: ComparisonTier) => plans.find((plan) => plan.tier === tier)
  const quotaRow = (
    key: 'designOptions' | 'libraryCredits',
    unit: string,
    field: 'designCredits' | 'libraryCredits'
  ): ComparisonRow =>
    ({
      id: key,
      label: copy(`core.${key}`),
      ...Object.fromEntries(
        COMPARISON_TIERS.map((tier) => [
          tier,
          {
            kind: 'text',
            text: formatPlansCopy(copy(unit, { count: byTier(tier)?.[field] ?? 0 }), {
              count: byTier(tier)?.[field] ?? 0
            })
          }
        ])
      )
    }) as ComparisonRow
  return [
    {
      id: 'core',
      title: copy('groups.core'),
      style: 'standard',
      rows: [
        quotaRow('designOptions', 'core.optionUnit', 'designCredits'),
        quotaRow('libraryCredits', 'core.libraryUnit', 'libraryCredits')
      ]
    },
    ...PLAN_COMPARISON.map((group) => ({
      id: group.key,
      title: copy(`groups.${group.key}`),
      style: group.highlight ? ('accent' as const) : ('standard' as const),
      rows: group.rows.map((key) => {
        const cells = Object.fromEntries(
          COMPARISON_TIERS.map((tier) => {
            const plan = byTier(tier)
            const value = planCell(plan, key, plan ? giftText(plan) : '')
            const cell: ComparisonCell =
              typeof value === 'boolean'
                ? { kind: value ? 'yes' : 'no', text: '' }
                : { kind: 'text', text: typeof value === 'string' ? copy(`values.${value}`) : value.text }
            return [tier, cell]
          })
        ) as Record<ComparisonTier, ComparisonCell>
        return { id: key, label: copy(`rows.${key}`), ...cells }
      })
    }))
  ]
}

export function comparisonCopy(
  content: Readonly<Record<string, unknown>> | undefined,
  key: string,
  fallback: string,
  values?: Record<string, string | number>
) {
  const saved = content?.[plansCopyField(key)]
  return formatPlansCopy(typeof saved === 'string' && saved.trim() ? saved.trim() : fallback, values)
}

export function comparisonDefaultText(messages: unknown, key: string): string {
  let value: unknown = messages
  for (const segment of key.split('.')) value = object(value) ? value[segment] : undefined
  return typeof value === 'string' ? value : ''
}
