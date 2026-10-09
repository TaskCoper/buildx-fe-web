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
      if (name.startsWith('@/shared/cms/')) return load(name.replace('@/', 'src/') + '.ts', overrides)
      if (name.startsWith('./')) return load(normalize(dirname(path) + '/' + name + '.ts'), overrides)
      return require(name)
    },
    loaded,
    loaded.exports
  )
  return loaded.exports
}
const pure = load('src/shared/cms/supervision-content.ts')
const admin = load('src/features/admin/services/supervision-sections.service.ts', {
  '@/shared/utils': { formatCurrency: (value) => String(value) + 'đ' }
})
const service = load('src/features/admin/services/home-sections.service.ts')
const catalog = parsePageCatalog(readFileSync(CATALOG_URL, 'utf8'), 'Supervision', 'SupervisionSectionKeys')
const packages = [
  { tier: 'self', price: 0, inspections: 0, durationMonths: 0 },
  { tier: 'check', price: 8900000, inspections: 6, durationMonths: 6 },
  { tier: 'control', price: 18900000, inspections: 12, durationMonths: 6 }
]
const messagesFor = (locale) => ({
  ...JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), 'utf8')),
  supervisionDefaults: packages,
  supervisionLocale: locale
})
const section = (key) => admin.SUPERVISION_CONTENT_SECTIONS.find((s) => s.key === key)

test('six screenshot blocks match the backend schema; editable fields have localized labels', () => {
  assert.deepEqual(
    admin.SUPERVISION_CONTENT_SECTIONS.map((s) => s.key),
    ['comparison', 'addons', 'scope', 'journey', 'value', 'notes']
  )
  for (const locale of ['vi', 'en']) {
    const messages = messagesFor(locale)
    for (const s of admin.SUPERVISION_CONTENT_SECTIONS) {
      const schema = catalog.get(s.key)
      assert.ok(schema, s.key)
      const allowed = [...schema.optional, ...schema.structured.map((f) => f.name)]
      for (const field of s.fields) {
        assert.ok(allowed.includes(field.name), field.name)
        assert.equal(typeof messages.admin.homeContent.sections[s.textKey].fields[field.name], 'string')
      }
      const values = service.formValuesFor(s, undefined, messages)
      const content = service.buildContent(s, values, messages)
      assert.ok(
        Object.keys(content).every((k) => allowed.includes(k)),
        s.key
      )
    }
  }
})
test('comparison round-trip saves supervision tier keys and custom cells independently of package numbers', () => {
  const m = messagesFor('vi'),
    s = section('comparison'),
    v = service.formValuesFor(s, undefined, m)
  v.groups[0].rows[0].basic = { kind: 'text', text: '999 lượt' }
  v.groups[0].rows[0].advanced = { kind: 'yes', text: '' }
  v.groups[0].rows[0].pro = { kind: 'no', text: '' }
  v.groups.reverse()
  v.groups[0].rows.reverse()
  const saved = service.buildContent(s, v, m)
  const parsed = pure.readSupervisionGroups(saved.groups)
  assert.ok(parsed)
  const row = parsed.find((g) => g.id === 'core').rows[0]
  assert.deepEqual(row.self, { kind: 'text', text: '999 lượt' })
  assert.equal(row.check.kind, 'yes')
  assert.equal(row.control.kind, 'no')
  assert.equal('basic' in row, false)
  const changed = structuredClone(m)
  changed.supervisionDefaults[1].inspections = 123
  assert.deepEqual(service.formValuesFor(s, saved, changed), v)
  assert.deepEqual(
    packages.map((p) => p.inspections),
    [0, 6, 12]
  )
})
test('all dynamic lists preserve explicit empty; blank cells do not restore defaults', () => {
  const m = messagesFor('en')
  for (const key of ['comparison', 'addons', 'scope', 'journey', 'value']) {
    const s = section(key),
      field = key === 'comparison' ? 'groups' : 'items'
    const v = service.formValuesFor(s, { [field]: [] }, m)
    assert.deepEqual(v[field], [])
    assert.deepEqual(service.buildContent(s, v, m)[field], [])
  }
  const s = section('value'),
    v = service.formValuesFor(s, { items: [{ label: 'New', icon: 'Rocket', self: '', check: 'A', control: 'B' }] }, m)
  assert.equal(v.items[0].basic, '')
  assert.deepEqual(service.buildContent(s, v, m).items, [
    { label: 'New', icon: 'Rocket', self: '', check: 'A', control: 'B' }
  ])
})
test('default groups and list values use the selected locale; placeholders resolve only for supplied display values', () => {
  for (const locale of ['vi', 'en']) {
    const m = messagesFor(locale)
    const s = section('addons'),
      v = service.formValuesFor(s, undefined, m)
    assert.equal(v.items.length, 4)
    assert.equal(v.items[3].label.includes('{months}'), false)
    const journey = service.formValuesFor(section('journey'), undefined, m)
    assert.equal(journey.items.length, 4)
    assert.equal(journey.items[0].icon, 'ShieldCheck')
    assert.equal(service.formValuesFor(section('value'), undefined, m).items.length, 4)
  }
  assert.equal(
    pure.supervisionCopy({ buttons_check: 'Chọn {tier}' }, 'buttons.check', '', { tier: 'Tên thật' }),
    'Chọn Tên thật'
  )
  assert.equal(pure.supervisionCopy({ title: '<b>{unknown}</b>' }, 'title', ''), ' <b>{unknown}</b>'.trim())
})
test('rejects wrong columns, duplicate IDs, malformed cells, unknown fields and overflow', () => {
  const s = section('comparison'),
    m = messagesFor('vi'),
    v = service.formValuesFor(s, undefined, m)
  const good = service.buildContent(s, v, m).groups
  for (const mutate of [
    (g) => {
      g[0].rows[0].self = 123
    },
    (g) => {
      g[0].rows[0].basic = g[0].rows[0].self
    },
    (g) => {
      g[0].rows[0].self.kind = 'enabled'
    },
    (g) => {
      g[0].rows[1].id = g[0].rows[0].id
    },
    (g) => {
      g[0].title = 'x'.repeat(1001)
    },
    (g) => {
      delete g[0].rows[0].check
    }
  ]) {
    const g = structuredClone(good)
    mutate(g)
    assert.equal(pure.readSupervisionGroups(g), undefined)
  }
  for (const invalid of [
    [{ label: 'X', price: 42 }],
    [{ label: 'X', price: '1đ', planId: 'bad' }],
    Array.from({ length: 101 }, () => ({}))
  ])
    assert.equal(pure.readSupervisionItems(invalid, pure.SUPERVISION_ITEM_FIELDS.addons), undefined)
  assert.equal(pure.readSupervisionItems([{ icon: 'bad name' }], pure.SUPERVISION_ITEM_FIELDS.journey), undefined)
})
test('value and auxiliary lists preserve addition, deletion, order, literal text and fallback icon names', () => {
  const m = messagesFor('vi')
  for (const key of ['addons', 'scope', 'journey', 'value']) {
    const s = section(key),
      v = service.formValuesFor(s, undefined, m)
    v.items.reverse()
    v.items.pop()
    if (key === 'value')
      v.items.push({ label: 'Extra', icon: 'UnknownIcon', basic: '<script>safe text</script>', advanced: '', pro: 'C' })
    else
      v.items.push(
        Object.fromEntries(
          pure.SUPERVISION_ITEM_FIELDS[key].map((f) => [f, f === 'icon' ? 'UnknownIcon' : '<b>literal</b>'])
        )
      )
    const saved = service.buildContent(s, v, m)
    assert.deepEqual(service.formValuesFor(s, saved, m).items, v.items)
  }
})
