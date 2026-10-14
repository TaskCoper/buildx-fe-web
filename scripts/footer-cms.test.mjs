import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

/**
 * Logic thuần của nội dung chân trang và các trang "Về BuildX" phía khách (`src/shared/cms/footer-sections.ts`): đọc
 * liên hệ, mạng xã hội và trang pháp lý do admin soạn, và chặn liên kết không an toàn.
 */
const root = new URL('../src/shared/cms/', import.meta.url)
const cache = new Map()

async function load(name) {
  if (cache.has(name)) return cache.get(name)
  let js = ts.transpileModule(await readFile(new URL(`${name}.ts`, root), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
  }).outputText
  for (const match of [...js.matchAll(/from ['"]\.\/([^'"]+)['"]/g)]) {
    const dependency = await load(match[1])
    js = js.replace(match[0], `from '${dependency.url}'`)
  }
  const url = `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`
  const loaded = { url, module: await import(url) }
  cache.set(name, loaded)
  return loaded
}

const footer = (await load('footer-sections')).module
const { indexHomeSections } = (await load('home-sections')).module

const sectionsOf = (...entries) => indexHomeSections(entries.map(([sectionKey, content]) => ({ sectionKey, content })))

test('safeHref chỉ nhận http và https', () => {
  assert.equal(footer.safeHref('https://facebook.com/buildx'), 'https://facebook.com/buildx')
  assert.equal(footer.safeHref('http://example.com/a?b=1'), 'http://example.com/a?b=1')
  assert.equal(footer.safeHref('  https://zalo.me/0934888881  '), 'https://zalo.me/0934888881')
})

test('safeHref bổ sung https cho dạng thiếu giao thức', () => {
  assert.equal(footer.safeHref('zalo.me/abc'), 'https://zalo.me/abc')
  assert.equal(footer.safeHref('www.facebook.com/buildx'), 'https://www.facebook.com/buildx')
})

test('safeHref loại giao thức nguy hiểm, đường dẫn tương đối và chuỗi lạ', () => {
  for (const bad of [
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'ftp://example.com',
    'mailto:a@b.c',
    'tel:0934888881',
    '//evil.example.com',
    '/admin',
    'khong-co-dau-cham',
    'có khoảng trắng.com',
    '',
    '   ',
    undefined
  ]) {
    assert.equal(footer.safeHref(bad), undefined, `phải loại: ${String(bad)}`)
  }
})

test('footerContentOf: chưa có dữ liệu thì rỗng, dùng được làm giá trị mặc định', () => {
  for (const content of [footer.footerContentOf(undefined), footer.footerContentOf({}), footer.EMPTY_FOOTER_CONTENT]) {
    assert.equal(content.contact.hotline, undefined)
    assert.equal(content.contact.email, undefined)
    assert.equal(content.contact.address, undefined)
    assert.deepEqual(content.social, {})
  }
})

test('footerContentOf: đọc liên hệ đã lưu, cắt khoảng trắng, trường để trống thành undefined', () => {
  const content = footer.footerContentOf(
    sectionsOf(['contact', { hotline: ' 0900 000 000 ', email: 'a@b.co', address: '   ' }])
  )
  assert.equal(content.contact.hotline, '0900 000 000')
  assert.equal(content.contact.email, 'a@b.co')
  assert.equal(content.contact.address, undefined)
})

test('footerContentOf: liên kết mạng xã hội chỉ giữ cái an toàn', () => {
  const content = footer.footerContentOf(
    sectionsOf([
      'social',
      {
        facebookUrl: 'https://facebook.com/buildx',
        zaloUrl: 'zalo.me/abc',
        youtubeUrl: 'javascript:alert(1)',
        tiktokUrl: '',
        instagramUrl: 'https://instagram.com/buildx'
      }
    ])
  )
  assert.deepEqual(content.social, {
    facebook: 'https://facebook.com/buildx',
    zalo: 'https://zalo.me/abc',
    instagram: 'https://instagram.com/buildx'
  })
})

test('SOCIAL_NETWORKS: mỗi mạng một trường, không trùng', () => {
  assert.deepEqual(footer.SOCIAL_NETWORKS.map((item) => item.network).sort(), [
    'facebook',
    'instagram',
    'tiktok',
    'youtube',
    'zalo'
  ])
  assert.equal(new Set(footer.SOCIAL_NETWORKS.map((item) => item.field)).size, 5)
})

test('legalPageOf: tên tab và nội dung độc lập, chỉ undefined khi admin chưa sửa gì', () => {
  assert.equal(footer.legalPageOf(undefined, 'terms'), undefined)
  assert.equal(footer.legalPageOf({}, 'terms'), undefined)
  assert.equal(footer.legalPageOf(sectionsOf(['terms', { body: '   ' }]), 'terms'), undefined)

  // Sửa mỗi tên tab: khối chỉ có `title` (màn admin bỏ trường giống bản có sẵn) — tên tab vẫn phải đổi.
  assert.deepEqual(footer.legalPageOf(sectionsOf(['terms', { title: ' Chỉ có tiêu đề ' }]), 'terms'), {
    title: 'Chỉ có tiêu đề',
    body: undefined
  })

  assert.deepEqual(
    footer.legalPageOf(sectionsOf(['privacy', { title: ' Riêng tư ', body: '<h2>A</h2><p>B</p>' }]), 'privacy'),
    {
      title: 'Riêng tư',
      body: '<h2>A</h2><p>B</p>'
    }
  )
  assert.deepEqual(footer.legalPageOf(sectionsOf(['payment', { body: '<p>x</p>' }]), 'payment'), {
    title: undefined,
    body: '<p>x</p>'
  })
})

test('legalPageOf: mỗi trang đọc đúng khối của mình', () => {
  const sections = sectionsOf(['terms', { body: '<p>điều khoản</p>' }], ['aiTerms', { body: '<p>ai</p>' }])
  assert.equal(footer.legalPageOf(sections, 'terms')?.body, '<p>điều khoản</p>')
  assert.equal(footer.legalPageOf(sections, 'aiTerms')?.body, '<p>ai</p>')
  assert.equal(footer.legalPageOf(sections, 'privacy'), undefined)
})

test('năm khóa pháp lý khớp khóa tài liệu pháp lý có sẵn', async () => {
  const docs = await readFile(new URL('../src/shared/legal/legal-docs.ts', import.meta.url), 'utf8')
  const declared = docs
    .match(/export type LegalDocKey = ([^\n]+)/)[1]
    .match(/'(\w+)'/g)
    .map((item) => item.slice(1, -1))
  assert.deepEqual([...footer.LEGAL_SECTION_KEYS].sort(), declared.sort())
})
