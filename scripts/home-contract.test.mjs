import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

import { CATALOG_URL, parseHomeCatalog } from './page-section-catalog.mjs'

/**
 * Màn admin Nội dung trang chủ đối chiếu với hai nguồn sự thật:
 * 1. Khóa dịch: component tra bằng khóa ghép từ mã khối và tên trường nên trình biên dịch không kiểm giúp; test này
 *    bảo đảm mọi khóa ghép được đều có chữ ở cả tiếng Việt và tiếng Anh.
 * 2. Hợp đồng backend: đối chiếu với `PageSectionCatalog.cs` (hình dạng từng khối do backend kiểm). Chỉ chạy được khi
 *    có thư mục `bmt-be` cạnh frontend trong workspace; nơi khác (CI riêng của frontend) thì bỏ qua.
 */
const source = new URL('../src/features/admin/services/home-sections.service.ts', import.meta.url)
const js = ts.transpileModule(await readFile(source, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText
const home = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)

const readJson = async (name) =>
  JSON.parse(await readFile(new URL(`../messages/${name}.json`, import.meta.url), 'utf8'))
const vi = await readJson('vi')
const en = await readJson('en')

const pick = (messages, path) => path.split('.').reduce((cursor, key) => cursor?.[key], messages)

test('khóa dịch: mọi khóa ghép được đều có chữ ở cả tiếng Việt và tiếng Anh', () => {
  for (const [lang, messages] of [
    ['vi', vi],
    ['en', en]
  ]) {
    const text = (path) => {
      const value = pick(messages, `admin.homeContent.${path}`)
      assert.equal(typeof value, 'string', `${lang}: thiếu admin.homeContent.${path}`)
      assert.notEqual(value.trim(), '', `${lang}: admin.homeContent.${path} trống`)
    }
    const label = (sectionKey, name) => {
      if (typeof pick(messages, `admin.homeContent.fieldsBySection.${sectionKey}.${name}`) === 'string') return
      text(`fields.${name}`)
    }

    assert.equal(typeof pick(messages, 'admin.nav.homeContent'), 'string', `${lang}: thiếu admin.nav.homeContent`)
    for (const key of ['description', 'edited', 'usingDefault', 'restore', 'restoreConfirm', 'restored']) text(key)
    for (const key of ['unchanged', 'restoredBecauseSame']) text(key)
    for (const key of ['iconHint', 'iconInvalid', 'iconNotFound', 'rowTitle', 'idsHint']) text(key)
    for (const key of ['pickTemplates', 'pickGuides', 'pickLoadError', 'idsTotalHint', 'idsTotalExceeded']) text(key)
    for (const key of ['moveUp', 'moveDown', 'addRow', 'maxReached', 'locales.vi', 'locales.en']) text(key)

    for (const def of home.HOME_SECTIONS) {
      text(`sections.${def.key}.title`)
      text(`sections.${def.key}.hint`)
      for (const field of def.fields) label(def.key, field.name)
      for (const list of def.lists) {
        text(`lists.${def.key}.${list.name}.title`)
        text(`lists.${def.key}.${list.name}.hint`)
        for (const field of list.fields ?? []) label(def.key, field.name)
      }
    }
  }
})

const catalogSource = await readFile(CATALOG_URL, 'utf8').catch(() => null)
const skip = catalogSource ? false : 'không có thư mục bmt-be cạnh frontend'

const WIRE_KIND = { text: 'Text', textarea: 'Text', image: 'Image', icon: 'Icon' }

test('hợp đồng BE: đọc đủ 11 khối trang chủ từ catalog', { skip }, () => {
  const catalog = parseHomeCatalog(catalogSource)
  assert.equal(catalog.size, 11)
  assert.deepEqual(catalog.get('stats').structured[0], {
    kind: 'Items',
    name: 'items',
    min: 5,
    max: 5,
    itemFields: [
      { kind: 'Text', name: 'value' },
      { kind: 'Text', name: 'label' },
      { kind: 'Icon', name: 'icon' }
    ]
  })
  assert.deepEqual(
    catalog.get('dossiers').structured.map((field) => [field.name, field.max]),
    [
      ['templateIds2d', 4],
      ['templateIds3d', 4]
    ]
  )
  assert.equal(catalog.get('hero').structured[0].max, 8)
})

test('hợp đồng BE: khối, trường và số mục của FE khớp catalog của backend', { skip }, () => {
  const catalog = parseHomeCatalog(catalogSource)
  assert.deepEqual(
    home.HOME_SECTIONS.map((def) => def.key).sort(),
    [...catalog.keys()].sort(),
    'FE và BE phải có cùng tập khối'
  )

  for (const def of home.HOME_SECTIONS) {
    const schema = catalog.get(def.key)
    assert.deepEqual(schema.required, [], `${def.key}: khối trang chủ không có trường bắt buộc`)
    assert.deepEqual(schema.images, [], `${def.key}: ảnh của trang chủ nằm trong danh sách mục`)
    assert.deepEqual(
      def.fields.map((field) => field.name).sort(),
      [...schema.optional].sort(),
      `${def.key}: trường lẻ lệch với BE`
    )
    assert.ok(
      def.fields.every((field) => field.kind === 'text' || field.kind === 'textarea'),
      `${def.key}: trường lẻ chỉ là chữ`
    )
    assert.deepEqual(
      def.lists.map((list) => list.name).sort(),
      schema.structured.map((field) => field.name).sort(),
      `${def.key}: danh sách lệch với BE`
    )

    for (const list of def.lists) {
      const wire = schema.structured.find((field) => field.name === list.name)
      if (list.type === 'ids') {
        assert.equal(wire.kind, 'Ids', `${def.key}.${list.name}`)
        assert.equal(list.max, wire.max, `${def.key}.${list.name}: số id tối đa`)
        continue
      }
      assert.equal(wire.kind, 'Items', `${def.key}.${list.name}`)
      assert.deepEqual(
        list.fields.map((field) => [field.name, WIRE_KIND[field.kind]]).sort(),
        wire.itemFields.map((field) => [field.name, field.kind]).sort(),
        `${def.key}.${list.name}: trường của mục lệch với BE`
      )
      if (list.type === 'rows') {
        assert.equal(list.rows.length, wire.min, `${def.key}.${list.name}: số mục tối thiểu`)
        assert.equal(list.rows.length, wire.max, `${def.key}.${list.name}: số mục tối đa`)
      } else {
        assert.equal(list.max, wire.max, `${def.key}.${list.name}: số mục tối đa`)
        assert.ok(wire.min <= 1, `${def.key}.${list.name}: FE chỉ ghi danh sách khi có ít nhất một mục`)
      }
    }
  }
})

test('hợp đồng BE: nội dung FE sinh ra luôn đúng số mục và chỉ có trường BE cho phép', { skip }, () => {
  const catalog = parseHomeCatalog(catalogSource)

  for (const def of home.HOME_SECTIONS) {
    const schema = catalog.get(def.key)
    const values = home.formValuesFor(def, null, vi)

    // Sửa mọi thứ có thể sửa để nội dung sinh ra đủ mọi trường, kể cả vượt số mục tối đa.
    for (const field of def.fields) values[field.name] = `${field.name} đã sửa`
    for (const list of def.lists) {
      if (list.type === 'ids') {
        values[list.name] = Array.from({ length: list.max + 2 }, (_, i) => `00000000-0000-4000-8000-00000000000${i}`)
      } else {
        const make = () => Object.fromEntries(list.fields.map((field) => [field.name, `${field.name} đã sửa`]))
        values[list.name] = list.type === 'rows' ? list.rows.map(make) : Array.from({ length: list.max + 3 }, make)
      }
    }

    const content = home.buildContent(def, values, vi)
    const allowed = new Set([...schema.optional, ...schema.structured.map((field) => field.name)])
    for (const key of Object.keys(content)) assert.ok(allowed.has(key), `${def.key}: trường lạ ${key}`)

    for (const wire of schema.structured) {
      const sent = content[wire.name]
      assert.ok(Array.isArray(sent), `${def.key}.${wire.name} phải là mảng`)
      if (wire.kind === 'Ids') {
        assert.ok(sent.length <= wire.max, `${def.key}.${wire.name}: quá số id`)
        assert.equal(new Set(sent).size, sent.length, `${def.key}.${wire.name}: id trùng`)
        continue
      }
      assert.ok(sent.length >= wire.min && sent.length <= wire.max, `${def.key}.${wire.name}: ${sent.length} mục`)
      const itemKeys = new Set(wire.itemFields.map((field) => field.name))
      for (const item of sent) {
        for (const key of Object.keys(item)) assert.ok(itemKeys.has(key), `${def.key}.${wire.name}: trường lạ ${key}`)
      }
    }
  }
})
