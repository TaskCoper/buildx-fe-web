import type { SupervisionPackage } from '@/shared/cms'
import { readComparisonGroups } from '@/shared/cms/plans-comparison-content'
import {
  SUPERVISION_SECTIONS,
  SUPERVISION_HEADER_KEYS,
  SUPERVISION_ITEM_FIELDS,
  supervisionField,
  supervisionPath,
  supervisionCopy,
  supervisionDefaultGroups,
  supervisionDefaultItems,
  readSupervisionGroups,
  readSupervisionItems,
  supervisionGroupsToEditor,
  supervisionGroupsFromEditor,
  supervisionValuesToEditor,
  supervisionValuesFromEditor,
  type SupervisionSection
} from '@/shared/cms/supervision-content'
import { formatCurrency } from '@/shared/utils'
import { defaultText, type HomeSectionDef, type HomeField } from './home-sections.service'

const scalarKeys = (key: SupervisionSection): readonly string[] =>
  key === 'comparison'
    ? SUPERVISION_HEADER_KEYS
    : key === 'addons'
      ? ['title', 'item', 'price', 'note']
      : key === 'scope'
        ? ['title', 'icon']
        : key === 'notes'
          ? ['payment', 'paymentIcon', 'scope', 'scopeIcon', 'area', 'areaIcon']
          : ['title']
export const SUPERVISION_CONTENT_SECTIONS: readonly HomeSectionDef[] = SUPERVISION_SECTIONS.map((key) => ({
  key,
  textKey: 'supervision_' + key,
  fields: scalarKeys(key).map(
    (field) =>
      ({
        name: supervisionField(field),
        kind: field.endsWith('Icon') || field === 'icon' ? 'icon' : 'text',
        defaultPath: supervisionPath(key, field)
      }) as HomeField
  ),
  lists: [],
  contentAdapter: {
    formValues: (saved, messages) => {
      const root = messages as { supervisionDefaults?: SupervisionPackage[]; supervisionLocale?: 'vi' | 'en' }
      const copy = (field: string, values?: Record<string, string | number>) =>
        supervisionCopy(saved ?? undefined, field, defaultText(messages, supervisionPath(key, field)), values)
      const packages = root.supervisionDefaults ?? []
      const headers = Object.fromEntries(scalarKeys(key).map((field) => [supervisionField(field), copy(field)]))
      if (key === 'comparison') {
        const groups =
          readSupervisionGroups(saved?.groups) ??
          supervisionDefaultGroups(packages, copy, (value) => formatCurrency(value, root.supervisionLocale ?? 'vi'))
        return { ...headers, groups: supervisionGroupsToEditor(groups) }
      }
      if (key === 'notes') return headers
      const items =
        readSupervisionItems(saved?.items, SUPERVISION_ITEM_FIELDS[key]) ??
        supervisionDefaultItems(key, copy, packages.find((pkg) => pkg.tier === 'check')?.durationMonths ?? 6)
      return { ...headers, items: key === 'value' ? supervisionValuesToEditor(items) : items }
    },
    buildContent: (values, messages) => {
      const content: Record<string, unknown> = {}
      for (const field of scalarKeys(key)) {
        const name = supervisionField(field)
        const value = typeof values[name] === 'string' ? values[name].trim() : ''
        if (value && value !== defaultText(messages, supervisionPath(key, field)).trim()) content[name] = value
      }
      if (key === 'comparison') {
        const groups = readComparisonGroups(values.groups)
        content.groups = groups ? supervisionGroupsFromEditor(groups) : values.groups
      } else if (key !== 'notes')
        content.items =
          key === 'value'
            ? (supervisionValuesFromEditor(values.items) ?? values.items)
            : (readSupervisionItems(values.items, SUPERVISION_ITEM_FIELDS[key]) ?? values.items)
      return content
    }
  }
}))
