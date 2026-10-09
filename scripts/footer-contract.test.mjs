import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

import { CATALOG_URL, parseFooterCatalog } from './page-section-catalog.mjs'

/**
 * Màn admin Chân trang & Về BuildX đối chiếu với hai nguồn sự thật, giống `home-contract.test.mjs`:
 * 1. Khóa dịch: component tra bằng khóa ghép từ mã khối và tên trường nên trình biên dịch không kiểm giúp.
 * 2. Hợp đồng backend: đối chiếu với `PageSectionCatalog.cs`. Chỉ chạy được khi có thư mục `bmt-be` cạnh frontend.
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

test('khóa dịch: mọi khóa ghép được của bảy khối chân trang đều có chữ ở cả hai ngôn ngữ', () => {
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

    assert.equal(typeof pick(messages, 'admin.nav.footerContent'), 'string', `${lang}: thiếu admin.nav.footerContent`)
    text('footerDescription')

    for (const def of service.FOOTER_SECTIONS) {
      text(`sections.${def.key}.title`)
      text(`sections.${def.key}.hint`)
      for (const field of def.fields) label(def.key, field.name)
    }
  }
})

test('chữ có sẵn của chân trang trỏ đúng khóa tiêu đề trang pháp lý ở cả hai ngôn ngữ', () => {
  for (const [lang, messages] of [
    ['vi', vi],
    ['en', en]
  ]) {
    for (const key of service.FOOTER_LEGAL_KEYS) {
      const title = pick(messages, `legal.${key}.title`)
      assert.equal(typeof title, 'string', `${lang}: thiếu legal.${key}.title`)
      assert.notEqual(title.trim(), '', `${lang}: legal.${key}.title trống`)
    }
    assert.equal(typeof pick(messages, 'footer.address'), 'string', `${lang}: thiếu footer.address`)
  }
})

const catalogSource = await readFile(CATALOG_URL, 'utf8').catch(() => null)
const skip = catalogSource ? false : 'không có thư mục bmt-be cạnh frontend'
const hasFooter = catalogSource ? catalogSource.includes('FooterSectionKeys') : false
const skipFooter = skip || (hasFooter ? false : 'catalog của bmt-be chưa khai báo trang footer')

test('hợp đồng BE: đọc đủ 7 khối chân trang từ catalog', { skip: skipFooter }, () => {
  const catalog = parseFooterCatalog(catalogSource)
  assert.deepEqual([...catalog.keys()].sort(), service.FOOTER_SECTIONS.map((def) => def.key).sort())
  assert.deepEqual(catalog.get('terms').structured, [{ kind: 'Html', name: 'body' }])
  assert.deepEqual(catalog.get('contact').optional, ['hotline', 'email', 'address'])
})

test('hợp đồng BE: khối, trường lẻ và trường rich text của FE khớp catalog', { skip: skipFooter }, () => {
  const catalog = parseFooterCatalog(catalogSource)

  for (const def of service.FOOTER_SECTIONS) {
    const schema = catalog.get(def.key)
    assert.deepEqual(schema.required, [], `${def.key}: khối chân trang không có trường bắt buộc`)
    assert.deepEqual(schema.images, [], `${def.key}: chân trang không có ảnh`)

    const textFields = def.fields.filter((field) => field.kind !== 'html')
    const htmlFields = def.fields.filter((field) => field.kind === 'html')
    assert.ok(
      textFields.every((field) => field.kind === 'text' || field.kind === 'textarea'),
      `${def.key}: trường lẻ chỉ là chữ hoặc rich text`
    )
    assert.deepEqual(
      textFields.map((field) => field.name).sort(),
      [...schema.optional].sort(),
      `${def.key}: trường chữ lệch với BE`
    )
    assert.deepEqual(
      htmlFields.map((field) => field.name).sort(),
      schema.structured.filter((field) => field.kind === 'Html').map((field) => field.name),
      `${def.key}: trường rich text lệch với BE`
    )
    assert.ok(
      schema.structured.every((field) => field.kind === 'Html'),
      `${def.key}: chân trang chỉ có rich text là trường có cấu trúc`
    )
  }
})

test('hợp đồng BE: nội dung FE sinh ra chỉ có trường BE cho phép', { skip: skipFooter }, () => {
  const catalog = parseFooterCatalog(catalogSource)
  const defaults = {
    legal: Object.fromEntries(service.FOOTER_LEGAL_KEYS.map((key) => [key, { title: `Tiêu đề ${key}` }])),
    siteDefaults: {},
    legalHtml: Object.fromEntries(service.FOOTER_LEGAL_KEYS.map((key) => [key, `<p>${key}</p>`]))
  }

  for (const def of service.FOOTER_SECTIONS) {
    const schema = catalog.get(def.key)
    const values = service.formValuesFor(def, null, defaults)
    for (const field of def.fields)
      values[field.name] = field.kind === 'html' ? '<p>Đã sửa</p>' : `${field.name} đã sửa`

    const content = service.buildContent(def, values, defaults)
    const allowed = new Set([...schema.optional, ...schema.structured.map((field) => field.name)])
    assert.ok(Object.keys(content).length > 0, `${def.key}: sửa mọi trường thì phải có nội dung để lưu`)
    for (const key of Object.keys(content)) assert.ok(allowed.has(key), `${def.key}: trường lạ ${key}`)
    for (const wire of schema.structured) assert.equal(typeof content[wire.name], 'string', `${def.key}.${wire.name}`)
  }
})

test('hợp đồng BE: giới hạn HTML của FE bằng PageSectionLimits.HtmlMaxLength', { skip: skipFooter }, () => {
  const limit = catalogSource.match(/HtmlMaxLength\s*=\s*([\d_]+)/)?.[1]
  assert.ok(limit, 'không thấy HtmlMaxLength trong catalog')
  assert.equal(service.HOME_HTML_MAX_LENGTH, Number(limit.replaceAll('_', '')))
})
