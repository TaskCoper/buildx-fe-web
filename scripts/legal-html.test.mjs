import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

/**
 * Hàm đổi nội dung trang pháp lý có sẵn sang HTML để admin sửa tại chỗ (`src/shared/legal/legal-html.ts`), kiểm cả
 * trên năm trang thật ở hai ngôn ngữ để chắc HTML sinh ra nằm trong bộ thẻ mà backend giữ lại.
 */
const root = new URL('../src/shared/legal/', import.meta.url)
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

const { legalDocToHtml } = (await load('legal-html')).module
const { LEGAL_DOCS } = (await load('legal-docs')).module
const { LEGAL_DOCS_EN } = (await load('legal-docs.en')).module

const doc = (blocks, base = { c: '334155', z: 21 }) => ({ base, blocks })
const run = (t, extra = {}) => ({ t, ...extra })
const NBSP = String.fromCharCode(160)

test('tiêu đề trang thành h2, tiêu đề mục thành h3, đoạn thành p', () => {
  const html = legalDocToHtml(
    doc([
      { k: 'title', a: 'c', r: [run('ĐIỀU KHOẢN', { b: true, z: 36 })] },
      { k: 'h2', r: [run('Điều 1', { b: true, z: 25 })] },
      { k: 'p', a: 'j', r: [run('Nội dung đoạn.')] }
    ])
  )
  assert.equal(html, '<h2>ĐIỀU KHOẢN</h2><h3>Điều 1</h3><p>Nội dung đoạn.</p>')
})

test('đoạn đầu in đậm, cỡ lớn được coi là tiêu đề trang; đoạn đậm cỡ lớn khác là tiêu đề mục', () => {
  const html = legalDocToHtml(
    doc([
      { k: 'p', a: 'c', r: [run('TIÊU ĐỀ', { b: true, z: 36 })] },
      { k: 'p', r: [run('Mục lớn', { b: true, z: 25 })] },
      { k: 'p', r: [run('Đậm nhưng cùng cỡ thân bài', { b: true })] }
    ])
  )
  assert.equal(html, '<h2>TIÊU ĐỀ</h2><h3>Mục lớn</h3><p><strong>Đậm nhưng cùng cỡ thân bài</strong></p>')
})

test('các li liền nhau gom thành một ul, li nằm trong đoạn như TipTap xuất', () => {
  const html = legalDocToHtml(
    doc([
      { k: 'p', r: [run('Trước')] },
      { k: 'li', r: [run('Một: ', { b: true }), run('nội dung')] },
      { k: 'li', r: [run('Hai')] },
      { k: 'p', r: [run('Sau')] },
      { k: 'li', r: [run('Ba')] }
    ])
  )
  assert.equal(
    html,
    '<p>Trước</p><ul><li><p><strong>Một: </strong>nội dung</p></li><li><p>Hai</p></li></ul><p>Sau</p><ul><li><p>Ba</p></li></ul>'
  )
})

test('đậm và nghiêng thành strong và em, ký tự đặc biệt được thoát', () => {
  const html = legalDocToHtml(
    doc([
      { k: 'p', r: [run('A & B < C > D ', { i: true }), run('đậm', { b: true }), run(' cả hai', { b: true, i: true })] }
    ])
  )
  assert.equal(html, '<p><em>A &amp; B &lt; C &gt; D </em><strong>đậm</strong><strong><em> cả hai</em></strong></p>')
})

test('khung ghi chú thành blockquote, bỏ màu và viền', () => {
  const html = legalDocToHtml(
    doc([
      {
        k: 'note',
        fill: 'f0fdf4',
        sides: { left: ['15803d', 4] },
        ps: [
          { k: 'p', r: [run('Lưu ý ', { b: true }), run('quan trọng')] },
          { k: 'p', r: [run('Dòng hai')] }
        ]
      }
    ])
  )
  assert.equal(html, '<blockquote><p><strong>Lưu ý </strong>quan trọng</p><p>Dòng hai</p></blockquote>')
})

test('"Build X" dính bằng khoảng trắng không ngắt để chữ X không rớt dòng', () => {
  const html = legalDocToHtml(doc([{ k: 'p', r: [run('Nền tảng Build X và BUILD  X.')] }]))
  assert.equal(html, `<p>Nền tảng Build${NBSP}X và BUILD${NBSP}X.</p>`)
})

const ALLOWED_TAGS = new Set(['p', 'h2', 'h3', 'ul', 'li', 'blockquote', 'strong', 'em'])
const BLOCK_END = new RegExp('</(p|h2|h3|li|blockquote)>', 'g')
const WHITESPACE = new RegExp('\\s+', 'g')
const BRAND = new RegExp('(build)\\s+x\\b', 'gi')

/** Chữ của HTML: hết một khối (đoạn, tiêu đề, mục) thì xuống một khoảng trắng; thẻ trong dòng không thêm gì. */
const textOf = (html) =>
  html
    .replace(BLOCK_END, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(WHITESPACE, ' ')
    .trim()

const sourceText = (document) =>
  document.blocks
    .flatMap((block) => (block.k === 'note' ? block.ps : [block]))
    .map((paragraph) => paragraph.r.map((r) => r.t).join(''))
    .join(' ')
    .replace(BRAND, (_, brand) => `${brand}${NBSP}X`)
    .replace(WHITESPACE, ' ')
    .trim()

for (const [locale, docs] of [
  ['vi', LEGAL_DOCS],
  ['en', LEGAL_DOCS_EN]
]) {
  for (const [key, document] of Object.entries(docs)) {
    test(`${locale}/${key}: HTML sinh ra chỉ dùng thẻ backend giữ lại và đủ chữ của bản gốc`, () => {
      const html = legalDocToHtml(document)
      assert.ok(html.length > 500, 'có nội dung')
      assert.match(html, /^<h2>/, 'bắt đầu bằng tiêu đề trang')

      const tags = new Set([...html.matchAll(/<\/?([a-z0-9]+)/gi)].map((match) => match[1].toLowerCase()))
      for (const tag of tags) assert.ok(ALLOWED_TAGS.has(tag), `thẻ ngoài danh sách: ${tag}`)
      assert.doesNotMatch(html, /<script|javascript:|on\w+=/i)

      const lis = document.blocks.filter((block) => block.k === 'li').length
      assert.equal((html.match(/<li>/g) ?? []).length, lis, 'số li khớp bản gốc')
      assert.equal(textOf(html), sourceText(document), 'chữ không bị mất hay thừa')
    })
  }
}
