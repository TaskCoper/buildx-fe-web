import { PLAN_VALUE_ROWS } from './plans-comparison-legacy'
import { comparisonCopy, comparisonDefaultText } from './plans-comparison-content'

export const VALUE_MAX_ROWS = 100
export const VALUE_FIELDS = ['label', 'icon', 'basic', 'advanced', 'pro'] as const
export type ValueItem = Record<(typeof VALUE_FIELDS)[number], string>
export const VALUE_DEFAULT_ICONS = ['MousePointerClick', 'Clock', 'Wallet', 'HardHat'] as const

/** [] là bảng đã xóa; undefined là nội dung cũ chưa chuyển sang danh sách động. */
export function readValueItems(value: unknown): ValueItem[] | undefined {
  if (!Array.isArray(value) || value.length > VALUE_MAX_ROWS) return undefined
  const result: ValueItem[] = []
  for (const item of value) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) return undefined
    if (Object.keys(item).some((key) => !VALUE_FIELDS.includes(key as (typeof VALUE_FIELDS)[number]))) return undefined
    const source = item as Record<string, unknown>
    const row = {} as ValueItem
    for (const field of VALUE_FIELDS) {
      const value = source[field] === undefined ? '' : source[field]
      if (typeof value !== 'string') return undefined
      const clean = value.trim()
      if (field === 'icon' ? clean !== '' && !/^[A-Za-z0-9-]{1,64}$/.test(clean) : [...clean].length > 1000)
        return undefined
      row[field] = clean
    }
    result.push(row)
  }
  return result
}

export function legacyValueItems(
  content: Readonly<Record<string, unknown>> | undefined,
  messages: unknown
): ValueItem[] {
  const copy = (key: string) => comparisonCopy(content, key, comparisonDefaultText(messages, 'plans.value.' + key))
  return PLAN_VALUE_ROWS.map((row, index) => ({
    label: copy('rows.' + row),
    icon: VALUE_DEFAULT_ICONS[index] ?? 'Circle',
    basic: copy(`cells.${row}.basic`),
    advanced: copy(`cells.${row}.advanced`),
    pro: copy(`cells.${row}.pro`)
  }))
}

export const newValueItem = (): ValueItem => ({ label: '', icon: '', basic: '', advanced: '', pro: '' })
