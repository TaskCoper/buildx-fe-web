import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

/**
 * Phần dành cho chân trang trong logic thuần của màn sửa nội dung trang
 * (`src/features/admin/services/home-sections.service.ts`): bảy khối, chữ có sẵn lấy từ bản gộp `siteDefaults` +
 * `legalHtml`, và cách xử lý trường rich text (HTML).
 */
const source = new URL('../src/features/admin/services/home-sections.service.ts', import.meta.url)
const js = ts.transpileModule(await readFile(source, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText
const service = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)

const NBSP = String.fromCharCode(160)

/** Bản gộp chữ có sẵn như `loadFooterDefaults` dựng: messages + siteDefaults + legalHtml. */
const defaults = {
  legal: {
    terms: { title: 'Điều khoản sử dụng' },
    privacy: { title: 'Quyền riêng tư' },
    aiTerms: { title: 'Điều khoản sử dụng AI' },
    ecommerce: { title: 'TMĐT & Đối tác' },
    payment: { title: 'Thanh toán & Hoàn tiền' }
  },
  siteDefaults: {
    hotline: '0934 888 881',
    email: 'hello@savico.ai',
    address: '54 Trần Minh Quyền, phường Vườn Lài, TP. HCM',
    facebookUrl: 'https://facebook.com/default',
    zaloUrl: 'https://zalo.me/0934888881',
    youtubeUrl: 'https://youtube.com/@default',
    tiktokUrl: 'https://tiktok.com/@default',
    instagramUrl: 'https://instagram.com/default'
  },
  legalHtml: {
    terms: `<h2>ĐIỀU KHOẢN</h2><h3>Điều 1</h3><p>Nền tảng Build${NBSP}X cung cấp dịch vụ.</p><ul><li><p>Một</p></li></ul>`,
    privacy: '<h2>QUYỀN RIÊNG TƯ</h2><p>Nội dung.</p>',
    aiTerms: '<h2>AI</h2><p>Nội dung.</p>',
    ecommerce: '<h2>TMĐT</h2><p>Nội dung.</p>',
    payment: '<h2>THANH TOÁN</h2><p>Nội dung.</p>'
  }
}

const section = (key) => service.FOOTER_SECTIONS.find((item) => item.key === key)

test('bảy khối theo thứ tự ở chân trang, năm trang pháp lý theo thứ tự cột Về BuildX', () => {
  assert.deepEqual(
    service.FOOTER_SECTIONS.map((item) => item.key),
    ['contact', 'social', 'terms', 'privacy', 'aiTerms', 'ecommerce', 'payment']
  )
  assert.deepEqual(service.FOOTER_LEGAL_KEYS, ['terms', 'privacy', 'aiTerms', 'ecommerce', 'payment'])
  for (const item of service.FOOTER_SECTIONS) assert.deepEqual(item.lists, [], `${item.key} không có danh sách`)
})

test('mỗi trang pháp lý có tiêu đề (chữ) và nội dung (rich text), không có danh sách', () => {
  for (const key of service.FOOTER_LEGAL_KEYS) {
    assert.deepEqual(
      section(key).fields.map((field) => [field.name, field.kind]),
      [
        ['title', 'text'],
        ['body', 'html']
      ]
    )
  }
})

test('chữ có sẵn: liên hệ, mạng xã hội và trang pháp lý lấy từ bản gộp', () => {
  assert.equal(service.scalarDefaults(section('contact'), defaults).hotline, '0934 888 881')
  assert.equal(service.scalarDefaults(section('social'), defaults).zaloUrl, 'https://zalo.me/0934888881')
  const terms = service.scalarDefaults(section('terms'), defaults)
  assert.equal(terms.title, 'Điều khoản sử dụng')
  assert.equal(terms.body, defaults.legalHtml.terms)
})

test('mở form lần đầu: đủ chữ có sẵn, chưa gì khác bản có sẵn để lưu', () => {
  const all = service.formValuesForAll(service.FOOTER_SECTIONS, {}, defaults)
  assert.deepEqual(Object.keys(all), ['contact', 'social', 'terms', 'privacy', 'aiTerms', 'ecommerce', 'payment'])
  for (const def of service.FOOTER_SECTIONS) {
    assert.deepEqual(service.buildContent(def, all[def.key], defaults), {}, `${def.key}: chưa sửa thì không gửi gì`)
    assert.deepEqual(service.planSectionSave(def, all[def.key], defaults, null), { action: 'none' })
  }
})

test('sửa một ô liên hệ thì chỉ ô đó được lưu; gõ lại đúng chữ có sẵn thì bỏ sửa đổi', () => {
  const def = section('contact')
  const values = service.formValuesFor(def, null, defaults)
  values.hotline = '  1900 1234  '
  assert.deepEqual(service.buildContent(def, values, defaults), { hotline: '1900 1234' })

  values.hotline = defaults.siteDefaults.hotline
  assert.deepEqual(service.buildContent(def, values, defaults), {})
})

test('đã lưu liên hệ thì form mở với bản đã lưu; xóa trắng một ô thì quay về chữ có sẵn', () => {
  const def = section('contact')
  const values = service.formValuesFor(def, { hotline: '1900 1234' }, defaults)
  assert.equal(values.hotline, '1900 1234')
  assert.equal(values.email, defaults.siteDefaults.email)

  values.hotline = '   '
  assert.deepEqual(service.buildContent(def, values, defaults), {}, 'ô trống nghĩa là dùng bản có sẵn')
  assert.deepEqual(service.planSectionSave(def, values, defaults, { content: { hotline: '1900 1234' } }), {
    action: 'delete'
  })
})

test('trang pháp lý: sửa nội dung thì lưu nội dung, tiêu đề giữ nguyên thì không lưu', () => {
  const def = section('privacy')
  const values = service.formValuesFor(def, null, defaults)
  values.body = '<h2>QUYỀN RIÊNG TƯ</h2><p>Nội dung đã sửa.</p>'
  assert.deepEqual(service.buildContent(def, values, defaults), {
    body: '<h2>QUYỀN RIÊNG TƯ</h2><p>Nội dung đã sửa.</p>'
  })

  values.title = 'Chính sách riêng tư'
  assert.deepEqual(service.buildContent(def, values, defaults), {
    title: 'Chính sách riêng tư',
    body: '<h2>QUYỀN RIÊNG TƯ</h2><p>Nội dung đã sửa.</p>'
  })
})

test('trang pháp lý: trình soạn ghi lại &nbsp; và khoảng trắng giữa các thẻ không bị coi là đã sửa', () => {
  const def = section('terms')
  const values = service.formValuesFor(def, null, defaults)
  values.body = defaults.legalHtml.terms.replaceAll(NBSP, '&nbsp;').replace('</h3><p>', '</h3>\n  <p>')
  assert.notEqual(values.body, defaults.legalHtml.terms)
  assert.deepEqual(service.buildContent(def, values, defaults), {})
})

test('trang pháp lý: nội dung trống (trình soạn rỗng cho <p></p>) coi như bỏ sửa, khôi phục bản có sẵn', () => {
  const def = section('terms')
  for (const empty of ['', '<p></p>', '<p> </p>', `<p>${NBSP}</p>`, '<p>&nbsp;</p><p></p>']) {
    const values = service.formValuesFor(def, null, defaults)
    values.body = empty
    assert.deepEqual(service.buildContent(def, values, defaults), {}, `rỗng: ${JSON.stringify(empty)}`)
    assert.deepEqual(service.planSectionSave(def, values, defaults, null), { action: 'none' })
    assert.deepEqual(service.planSectionSave(def, values, defaults, { content: { body: '<p>cũ</p>' } }), {
      action: 'delete'
    })
  }
})

test('trang pháp lý đã lưu: form mở bằng bản đã lưu, nhưng trang đã lưu mà body rỗng thì mở bằng bản có sẵn', () => {
  const def = section('payment')
  assert.equal(service.formValuesFor(def, { body: '<p>Bản đã lưu</p>' }, defaults).body, '<p>Bản đã lưu</p>')
  assert.equal(service.formValuesFor(def, { body: '<p></p>' }, defaults).body, defaults.legalHtml.payment)
})

test('giới hạn HTML khớp BE (200000) và khác giới hạn chữ thường', () => {
  assert.equal(service.HOME_HTML_MAX_LENGTH, 200_000)
  assert.equal(service.HOME_TEXT_MAX_LENGTH, 1000)
})
