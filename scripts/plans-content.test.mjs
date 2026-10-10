import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, normalize } from 'node:path'
import { test } from 'node:test'
import ts from 'typescript'
import { CATALOG_URL, parsePageCatalog } from './page-section-catalog.mjs'

const require = createRequire(import.meta.url)
function load(path, overrides = {}) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText
  const loaded = { exports: {} }
  new Function('require', 'module', 'exports', js)(
    (name) => {
      if (overrides[name]) return overrides[name]
      if (name.startsWith('@/shared/cms/')) return load(name.replace('@/', 'src/') + '.ts')
      if (name.startsWith('./')) return load(normalize(dirname(path) + '/' + name + '.ts'))
      return require(name)
    },
    loaded,
    loaded.exports
  )
  return loaded.exports
}
const copy = load('src/shared/cms/plans-sections.ts')
const admin = load('src/features/admin/services/plans-sections.service.ts', { '@/shared/cms/plans-sections': copy })
const service = load('src/features/admin/services/home-sections.service.ts')
const locales = ['vi', 'en'].map((lang) => [
  lang,
  JSON.parse(readFileSync(new URL(`../messages/${lang}.json`, import.meta.url), 'utf8'))
])
const pick = (root, path) => path.reduce((value, key) => value?.[key], root)
const catalogSource = (() => {
  try {
    return readFileSync(CATALOG_URL, 'utf8')
  } catch {
    return null
  }
})()

test('only the five requested blocks are editable; package cards and hidden rows are excluded', () => {
  assert.deepEqual(
    admin.PLANS_SECTIONS.map((s) => s.key),
    ['hero', 'advice', 'comparison', 'value', 'notes']
  )
  const keys = Object.values(copy.PLANS_COPY_KEYS).flat()
  for (const excluded of ['price', 'designCredits', 'isHighlighted', 'core.editCredits', 'core.editUnit', 'credits']) {
    assert.ok(!keys.includes(excluded), excluded)
  }
})

test('each field has localized defaults and a clear label in both languages', () => {
  for (const [lang, messages] of locales) {
    for (const section of admin.PLANS_SECTIONS) {
      assert.equal(typeof messages.admin.homeContent.sections[section.textKey].title, 'string')
      const defaults = service.formValuesFor(section, undefined, messages)
      for (const field of section.fields) {
        assert.equal(typeof pick(messages, field.defaultPath), 'string', `${lang}: ${field.name}`)
        assert.equal(defaults[field.name], pick(messages, field.defaultPath))
        assert.ok(messages.admin.homeContent.fieldsBySection[section.textKey][field.name], `${lang}: ${field.name}`)
      }
    }
  }
})

test('legacy value changes become dynamic content; default rows remain explicit CMS content', () => {
  const def = admin.PLANS_SECTIONS.find((s) => s.key === 'value')
  const messages = locales[0][1]
  const saved = { sectionKey: 'value', version: 7, content: { cells_easy_advanced: 'Old PLUS value' } }
  const values = service.formValuesFor(def, saved.content, messages)
  assert.equal(values.items[0].advanced, 'Old PLUS value')
  values.items[0].advanced = 'New PLUS value'
  const content = service.buildContent(def, values, messages)
  assert.deepEqual(Object.keys(content), ['items'])
  assert.equal(content.items[0].advanced, 'New PLUS value')
  assert.equal(service.planSectionSave(def, values, messages, saved).action, 'save')
  const restored = service.formValuesFor(def, undefined, messages)
  assert.equal(service.planSectionSave(def, restored, messages, saved).action, 'save')
})

test('template variables use live plan and hotline data and keep plain text intact', () => {
  assert.equal(copy.formatPlansCopy('Gọi {hotline}', { hotline: '0900 123 456' }), 'Gọi 0900 123 456')
  assert.equal(copy.formatPlansCopy('{count} phương án', { count: 27 }), '27 phương án')
  assert.equal(copy.formatPlansCopy('Chọn {name}', { name: 'CUSTOM PRO' }), 'Chọn CUSTOM PRO')
  assert.equal(copy.formatPlansCopy('<img onerror=x> {name}', { name: '$&{count}' }), '<img onerror=x> $&{count}')
})

test(
  'frontend fields exactly match the real backend catalog',
  { skip: !catalogSource && 'backend source unavailable' },
  () => {
    const catalog = parsePageCatalog(catalogSource, 'Plans', 'PlansSectionKeys')
    assert.equal(catalog.size, 5)
    for (const section of admin.PLANS_SECTIONS) {
      const schema = catalog.get(section.key)
      assert.ok(schema, section.key)
      assert.deepEqual([...schema.optional].sort(), copy.PLANS_COPY_KEYS[section.key].map(copy.plansCopyField).sort())
      assert.deepEqual(schema.required, [])
      assert.deepEqual(schema.images, [])
      assert.deepEqual(
        schema.structured,
        section.key === 'comparison'
          ? [{ kind: 'PlansComparisonGroups', name: 'groups' }]
          : section.key === 'value'
            ? [
                {
                  kind: 'Items',
                  name: 'items',
                  min: 0,
                  max: 100,
                  itemFields: ['label', 'icon', 'basic', 'advanced', 'pro'].map((name) => ({
                    name,
                    kind: name === 'icon' ? 'Icon' : 'Text'
                  }))
                }
              ]
            : []
      )
    }
  }
)

const comparison = load('src/shared/cms/plans-comparison-content.ts')
const adapter = load('src/features/admin/services/plans-comparison.service.ts').comparisonContentAdapter
const cell = (kind, text = '') => ({ kind, text })
const row = (id) => ({
  id,
  label: `Item ${id}`,
  basic: cell('yes'),
  advanced: cell('no'),
  pro: cell('text', 'Call first')
})
const group = (id, rows = []) => ({ id, title: `Group ${id}`, style: 'standard', rows })

test('dynamic content keeps cell types and order; empty groups differs from missing content', () => {
  const groups = [group('new', [row('b'), row('a')]), group('empty')]
  assert.deepEqual(comparison.readComparisonGroups(groups), groups)
  assert.deepEqual(comparison.readComparisonGroups([]), [])
  assert.equal(comparison.readComparisonGroups(undefined), undefined)
  const def = admin.PLANS_SECTIONS.find((s) => s.key === 'comparison')
  const values = service.formValuesFor(def, { groups }, locales[0][1])
  assert.deepEqual(values.groups, groups)
  values.groups = []
  assert.deepEqual(service.buildContent(def, values, locales[0][1]), { groups: [] })
  assert.equal(service.planSectionSave(def, values, locales[0][1], { content: { groups } }).action, 'save')
})

test('runtime boundary rejects wrong cell kinds, missing tiers, duplicate ids and entitlement fields', () => {
  const good = [group('g', [row('r')])]
  for (const mutate of [
    (data) => {
      data[0].rows[0].basic.kind = 'quota'
    },
    (data) => {
      delete data[0].rows[0].pro
    },
    (data) => {
      data[0].rows.push(row('r'))
    },
    (data) => {
      data.push(group('g'))
    },
    (data) => {
      data[0].rows[0].basic.designCredits = 999
    },
    (data) => {
      data[0].rows[0].pro.text = 'a'.repeat(1001)
    },
    (data) => {
      data[0].rows = {}
    }
  ]) {
    const data = structuredClone(good)
    mutate(data)
    assert.equal(comparison.readComparisonGroups(data), undefined)
  }
  const data = structuredClone(good)
  data[0].rows[0].pro.text = 'a'.repeat(1000)
  assert.ok(comparison.readComparisonGroups(data))
})

test('legacy overrides and visible quota values seed the first CMS edit; saved CMS never reads plan quotas again', () => {
  const messages = structuredClone(locales[0][1])
  const toggleKeys = load('src/shared/cms/plans.ts').PLAN_TOGGLE_KEYS
  messages.plansComparisonDefaults = [
    {
      tier: 'basic',
      designCredits: 77,
      libraryCredits: 88,
      benefits: {
        toggles: Object.fromEntries(toggleKeys.map((key) => [key, { enabled: true }])),
        layout: { level: 'basic' },
        interiorEstimate: { level: 'rough' },
        advisory: { level: 'online' }
      }
    }
  ]
  const values = adapter.formValues(
    { groups_core: 'Group edited before', core_optionUnit: '{count} phương án cũ' },
    messages
  )
  assert.equal(values.groups[0].title, 'Group edited before')
  assert.equal(values.groups[0].rows[0].basic.text, '77 phương án cũ')
  values.groups[0].rows[0].basic.text = '999 phương án CMS'
  const saved = adapter.buildContent(values, messages)
  messages.plansComparisonDefaults[0].designCredits = 1
  assert.equal(adapter.formValues(saved, messages).groups[0].rows[0].basic.text, '999 phương án CMS')
  assert.deepEqual(Object.keys(saved), ['groups'])
})

const valueContent = load('src/shared/cms/plans-value-content.ts')
test('value rows preserve order, literal text and empty cells without borrowing defaults', () => {
  const items = [
    { label: 'New', icon: 'Rocket', basic: '<b>{count}</b>', advanced: '', pro: '999' },
    { label: 'Second' }
  ]
  assert.deepEqual(valueContent.readValueItems(items), [
    items[0],
    { label: 'Second', icon: '', basic: '', advanced: '', pro: '' }
  ])
  assert.deepEqual(valueContent.readValueItems([]), [])
  const def = admin.PLANS_SECTIONS.find((s) => s.key === 'value')
  const values = service.formValuesFor(def, { items: [] }, locales[0][1])
  assert.deepEqual(values.items, [])
  assert.deepEqual(service.buildContent(def, values, locales[0][1]), { items: [] })
  assert.equal(service.planSectionSave(def, values, locales[0][1], { content: { items } }).action, 'save')
})
test('value rows reject invalid shapes, icons, entitlement fields and overflow', () => {
  for (const input of [
    null,
    {},
    [null],
    [{ basic: 42 }],
    [{ icon: 'bad name' }],
    [{ icon: 'a'.repeat(65) }],
    [{ basic: null }],
    [{ designCredits: 999 }],
    [{ pro: 'a'.repeat(1001) }],
    Array.from({ length: 101 }, () => ({}))
  ])
    assert.equal(valueContent.readValueItems(input), undefined)
  assert.equal(valueContent.readValueItems([{ pro: '😀'.repeat(1000) }])[0].pro, '😀'.repeat(1000))
  assert.equal(valueContent.readValueItems([{ pro: '😀'.repeat(1001) }]), undefined)
})
test('legacy value labels, cells and icons are retained separately in each locale', () => {
  for (const [, messages] of locales) {
    const rows = valueContent.legacyValueItems({ rows_easy: 'Edited', cells_easy_pro: 'Edited PRO' }, messages)
    assert.equal(rows.length, 4)
    assert.equal(rows[0].label, 'Edited')
    assert.equal(rows[0].pro, 'Edited PRO')
    assert.equal(rows[0].basic, messages.plans.value.cells.easy.basic)
    assert.deepEqual(
      rows.map((row) => row.icon),
      ['MousePointerClick', 'Clock', 'Wallet', 'HardHat']
    )
  }
})
