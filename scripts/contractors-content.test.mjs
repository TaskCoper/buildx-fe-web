import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

import { CATALOG_URL, parsePageCatalog } from './page-section-catalog.mjs'

/**
 * Nội dung trang "Tìm nhà thầu" do admin biên tập (`CONTRACTORS_SECTIONS` trong
 * `src/features/admin/services/home-sections.service.ts`), đối chiếu với:
 * 1. Bản dịch có sẵn (chữ mở form lần đầu) và khóa dịch của màn admin ở cả hai ngôn ngữ.
 * 2. Trang công khai: thứ tự mục trong danh sách cố định phải khớp thứ tự thẻ trên giao diện.
 * 3. Hợp đồng backend (`PageSectionCatalog.cs`), chỉ chạy được khi có thư mục `bmt-be` cạnh frontend.
 */
const source = new URL('../src/features/admin/services/home-sections.service.ts', import.meta.url)
const js = ts.transpileModule(await readFile(source, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText
const service = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)

const readJson = async (name) =>
  JSON.parse(await readFile(new URL(`../messages/${name}.json`, import.meta.url), 'utf8'))
const vi = await readJson('vi')
const en = await readJson('en')
const pick = (messages, path) => path.split('.').reduce((cursor, key) => cursor?.[key], messages)

/** Như `loadContractorsDefaults`: câu trả lời có sẵn bỏ thẻ <mark>. */
const withoutMarks = (messages) => {
  const copy = structuredClone(messages)
  const faq = copy.contractors.landing.faq
  for (const key of Object.keys(faq)) faq[key] = faq[key].replace(/<\/?mark>/g, '')
  return copy
}

const section = (key) => service.CONTRACTORS_SECTIONS.find((item) => item.key === key)

test('năm khối theo thứ tự trên trang, mã khối trùng trang chủ nên dùng textKey riêng', () => {
  assert.deepEqual(
    service.CONTRACTORS_SECTIONS.map((item) => item.key),
    ['hero', 'promises', 'safety', 'faq', 'cta']
  )
  for (const def of service.CONTRACTORS_SECTIONS) {
    assert.match(service.sectionTextKey(def), /^contractors[A-Z]/, `${def.key}: textKey`)
    assert.notEqual(service.sectionTextKey(def), def.key)
  }
  const homeKeys = new Set(service.HOME_SECTIONS.map((def) => service.sectionTextKey(def)))
  for (const def of service.CONTRACTORS_SECTIONS) {
    assert.equal(homeKeys.has(service.sectionTextKey(def)), false, `${def.key}: khóa dịch không trùng trang chủ`)
  }
  // Khối trang chủ không có textKey thì khóa dịch là mã khối như trước.
  assert.equal(service.sectionTextKey(service.HOME_SECTIONS[0]), 'hero')
})

test('defaultText thay {row} cả khi nằm trong một đoạn của khóa', () => {
  const messages = { a: { privacyTitle: 'T', q3: 'Q3', free: 'F' } }
  assert.equal(service.defaultText(messages, ['a', '{row}Title'], 'privacy'), 'T')
  assert.equal(service.defaultText(messages, ['a', 'q{row}'], '3'), 'Q3')
  assert.equal(service.defaultText(messages, ['a', '{row}'], 'free'), 'F')
  assert.equal(service.defaultText(messages, ['a', 'free']), 'F')
})

for (const [lang, messages] of [
  ['vi', vi],
  ['en', en]
]) {
  test(`${lang}: mọi chữ có sẵn của trang Tìm nhà thầu đều có, câu trả lời không còn thẻ <mark>`, () => {
    const defaults = withoutMarks(messages)
    for (const def of service.CONTRACTORS_SECTIONS) {
      const scalar = service.scalarDefaults(def, defaults)
      for (const field of def.fields) {
        if (field.kind === 'image' || !field.defaultPath) continue
        assert.notEqual(scalar[field.name], '', `${def.key}.${field.name} không có chữ có sẵn`)
      }
      for (const list of def.lists) {
        if (list.type !== 'rows') continue
        service.rowDefaults(list, defaults).forEach((row, index) => {
          for (const field of list.fields) {
            if (!field.defaultPath) continue
            assert.notEqual(row[field.name], '', `${def.key}.${list.rows[index]}.${field.name} không có chữ có sẵn`)
            assert.doesNotMatch(row[field.name], /<\/?mark>/, `${def.key}.${list.rows[index]}.${field.name}`)
          }
        })
      }
    }
  })

  test(`${lang}: mở form lần đầu thì chưa có gì khác bản có sẵn để lưu`, () => {
    const defaults = withoutMarks(messages)
    for (const def of service.CONTRACTORS_SECTIONS) {
      const values = service.formValuesFor(def, null, defaults)
      assert.deepEqual(service.buildContent(def, values, defaults), {}, `${def.key}: chưa sửa thì không gửi gì`)
      assert.deepEqual(service.planSectionSave(def, values, defaults, null), { action: 'none' })
    }
  })

  test(`${lang}: khóa dịch của màn admin đủ cho năm khối`, () => {
    const text = (path) => {
      const value = pick(messages, `admin.homeContent.${path}`)
      assert.equal(typeof value, 'string', `${lang}: thiếu admin.homeContent.${path}`)
      assert.notEqual(value.trim(), '', `${lang}: admin.homeContent.${path} trống`)
    }
    const label = (textKey, name) => {
      if (typeof pick(messages, `admin.homeContent.fieldsBySection.${textKey}.${name}`) === 'string') return
      text(`fields.${name}`)
    }
    assert.equal(typeof pick(messages, 'admin.nav.contractorsContent'), 'string')
    text('contractorsDescription')
    for (const def of service.CONTRACTORS_SECTIONS) {
      const textKey = service.sectionTextKey(def)
      text(`sections.${textKey}.title`)
      text(`sections.${textKey}.hint`)
      for (const field of def.fields) label(textKey, field.name)
      for (const list of def.lists) {
        text(`lists.${textKey}.${list.name}.title`)
        text(`lists.${textKey}.${list.name}.hint`)
        for (const field of list.fields) label(textKey, field.name)
      }
    }
  })
}

test('sửa một câu trả lời thì cả danh sách bảy câu được ghi, đủ trường để vị trí không lệch', () => {
  const defaults = withoutMarks(vi)
  const def = section('faq')
  const values = service.formValuesFor(def, null, defaults)
  values.items[2].answer = 'Tối đa 2 nhà thầu.'

  const content = service.buildContent(def, values, defaults)
  assert.equal(content.items.length, 7)
  assert.equal(content.items[2].answer, 'Tối đa 2 nhà thầu.')
  assert.equal(content.items[2].question, vi.contractors.landing.faq.q3)
  assert.equal(content.items[0].question, vi.contractors.landing.faq.q1)
})

test('ảnh đầu trang: có ảnh thì ghi, để trống thì không ghi và dùng ảnh có sẵn', () => {
  const defaults = withoutMarks(vi)
  const def = section('hero')
  const values = service.formValuesFor(def, null, defaults)
  assert.equal(values.imageUrl, '')
  assert.deepEqual(service.buildContent(def, values, defaults), {})

  values.imageUrl = '  https://images.example.test/hero.webp  '
  assert.deepEqual(service.buildContent(def, values, defaults), { imageUrl: 'https://images.example.test/hero.webp' })
})

test('đưa icon của cam kết: ghi cả danh sách bốn mục, mục không đổi vẫn có chữ có sẵn', () => {
  const defaults = withoutMarks(vi)
  const def = section('promises')
  const values = service.formValuesFor(def, null, defaults)
  values.items[1].icon = 'ShieldCheck'

  const content = service.buildContent(def, values, defaults)
  assert.equal(content.items.length, 4)
  assert.equal(content.items[1].icon, 'ShieldCheck')
  assert.equal(content.items[0].title, vi.contractors.landing.promises.free)
  assert.equal(content.items[0].icon, undefined)
})

test('trang công khai: thứ tự mục của danh sách cố định khớp thứ tự thẻ trên giao diện', async () => {
  const landing = await readFile(
    new URL('../src/features/contractors/components/contractor-landing.tsx', import.meta.url),
    'utf8'
  )

  const safety = landing.match(/const SAFETY_CARDS = \[([^\]]+)\]/)[1].match(/key: '(\w+)'/g)
  assert.deepEqual(
    safety.map((item) => item.slice(6, -1)),
    section('safety').lists[0].rows,
    'thẻ an toàn'
  )

  const promises = landing.match(/\{ key: '(free|verified|transparent|privacy)', icon: \w+ \}/g)
  assert.deepEqual(
    promises.map((item) => item.match(/'(\w+)'/)[1]),
    section('promises').lists[0].rows,
    'bốn cam kết'
  )

  assert.deepEqual(section('faq').lists[0].rows, ['1', '2', '3', '4', '5', '6', '7'])
  assert.match(landing, /\(\[1, 2, 3, 4, 5, 6, 7\] as const\)/, 'giao diện có đúng bảy câu hỏi')
})

const catalogSource = await readFile(CATALOG_URL, 'utf8').catch(() => null)
const skip = catalogSource
  ? catalogSource.includes('ContractorsSectionKeys')
    ? false
    : 'catalog của bmt-be chưa khai báo trang contractors'
  : 'không có thư mục bmt-be cạnh frontend'

test('hợp đồng BE: khối, trường lẻ, ảnh và danh sách của FE khớp catalog', { skip }, () => {
  const catalog = parsePageCatalog(catalogSource, 'Contractors', 'ContractorsSectionKeys')
  assert.deepEqual([...catalog.keys()].sort(), service.CONTRACTORS_SECTIONS.map((def) => def.key).sort())

  const WIRE_KIND = { text: 'Text', textarea: 'Text', image: 'Image', icon: 'Icon' }
  for (const def of service.CONTRACTORS_SECTIONS) {
    const schema = catalog.get(def.key)
    assert.deepEqual(schema.required, [], `${def.key}: không có trường bắt buộc`)
    assert.deepEqual(
      def.fields.filter((field) => field.kind === 'image').map((field) => field.name),
      schema.images,
      `${def.key}: ảnh lệch với BE`
    )
    assert.deepEqual(
      def.fields
        .filter((field) => field.kind === 'text' || field.kind === 'textarea')
        .map((field) => field.name)
        .sort(),
      [...schema.optional].sort(),
      `${def.key}: trường chữ lệch với BE`
    )
    assert.deepEqual(
      def.lists.map((list) => list.name).sort(),
      schema.structured.map((field) => field.name).sort(),
      `${def.key}: danh sách lệch với BE`
    )
    for (const list of def.lists) {
      const wire = schema.structured.find((field) => field.name === list.name)
      assert.equal(wire.kind, 'Items', `${def.key}.${list.name}`)
      assert.equal(list.type, 'rows')
      assert.equal(list.rows.length, wire.min, `${def.key}.${list.name}: số mục tối thiểu`)
      assert.equal(list.rows.length, wire.max, `${def.key}.${list.name}: số mục tối đa`)
      assert.deepEqual(
        list.fields.map((field) => [field.name, WIRE_KIND[field.kind]]).sort(),
        wire.itemFields.map((field) => [field.name, field.kind]).sort(),
        `${def.key}.${list.name}: trường của mục lệch với BE`
      )
    }
  }
})

test('hợp đồng BE: nội dung FE sinh ra luôn đúng số mục và chỉ có trường BE cho phép', { skip }, () => {
  const catalog = parsePageCatalog(catalogSource, 'Contractors', 'ContractorsSectionKeys')
  const defaults = withoutMarks(vi)

  for (const def of service.CONTRACTORS_SECTIONS) {
    const schema = catalog.get(def.key)
    const values = service.formValuesFor(def, null, defaults)
    for (const field of def.fields) values[field.name] = `${field.name} đã sửa`
    for (const list of def.lists) {
      values[list.name] = list.rows.map(() =>
        Object.fromEntries(list.fields.map((field) => [field.name, `${field.name} đã sửa`]))
      )
    }

    const content = service.buildContent(def, values, defaults)
    const allowed = new Set([...schema.optional, ...schema.images, ...schema.structured.map((field) => field.name)])
    for (const key of Object.keys(content)) assert.ok(allowed.has(key), `${def.key}: trường lạ ${key}`)

    for (const wire of schema.structured) {
      const sent = content[wire.name]
      assert.ok(Array.isArray(sent), `${def.key}.${wire.name} phải là mảng`)
      assert.equal(sent.length, wire.min, `${def.key}.${wire.name}: ${sent.length} mục`)
      const itemKeys = new Set(wire.itemFields.map((field) => field.name))
      for (const item of sent) {
        for (const key of Object.keys(item)) assert.ok(itemKeys.has(key), `${def.key}.${wire.name}: trường lạ ${key}`)
      }
    }
  }
})
