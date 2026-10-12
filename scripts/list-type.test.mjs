import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

// `list-type.ts` là phần thuần của kiểu đánh số danh sách trong ô rich text (không import): kiểm bằng node --test.
const source = await readFile(
  new URL('../src/features/admin/components/handbook/list-type.ts', import.meta.url),
  'utf8'
)
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText
const { LIST_STYLE_CSS, ORDERED_LIST_TYPES, isOrderedListType, listStyleDeclaration, listTypeFromStyle } = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`
)

test('đủ năm kiểu đánh số, phân biệt chữ hoa và chữ thường', () => {
  assert.deepEqual([...ORDERED_LIST_TYPES], ['1', 'a', 'A', 'i', 'I'])
  for (const type of ORDERED_LIST_TYPES) assert.equal(isOrderedListType(type), true, type)
  for (const bad of ['', 'b', 'B', 'II', 'disc', 'lower-alpha', '1 ', ' a', null, undefined])
    assert.equal(isOrderedListType(bad), false, String(bad))
})

test('ghi kiểu đánh số thành list-style-type đúng dạng backend dựng lại, và đọc lại được', () => {
  assert.deepEqual(
    ORDERED_LIST_TYPES.map((type) => listStyleDeclaration(type)),
    [
      'list-style-type: decimal;',
      'list-style-type: lower-alpha;',
      'list-style-type: upper-alpha;',
      'list-style-type: lower-roman;',
      'list-style-type: upper-roman;'
    ]
  )
  // Vòng ghi → đọc giữ nguyên từng kiểu, kể cả cặp a/A và i/I chỉ khác hoa thường.
  for (const type of ORDERED_LIST_TYPES) assert.equal(listTypeFromStyle(listStyleDeclaration(type)), type, type)
  assert.equal(new Set(Object.values(LIST_STYLE_CSS)).size, ORDERED_LIST_TYPES.length)
})

test('đọc kiểu đánh số từ list-style-type của Google Docs', () => {
  const cases = {
    'list-style-type:decimal': '1',
    'list-style-type:lower-alpha': 'a',
    'list-style-type:lower-latin': 'a',
    'list-style-type:upper-alpha': 'A',
    'list-style-type:upper-latin': 'A',
    'list-style-type:lower-roman': 'i',
    'list-style-type:upper-roman': 'I',
    // Docs ghi nhiều khai báo, có khoảng trắng và viết hoa; list-style rút gọn cũng được nhận.
    'margin-left: 36pt; List-Style-Type : Lower-Alpha; font-size:11pt': 'a',
    'list-style: upper-roman inside': 'I'
  }
  for (const [style, expected] of Object.entries(cases)) assert.equal(listTypeFromStyle(style), expected, style)
})

test('kiểu không phải số / chữ, hoặc không có style, thì không có kiểu đánh số', () => {
  for (const style of [
    'list-style-type:disc',
    'list-style-type:circle',
    'list-style-type:square',
    'list-style-type:decimal-leading-zero',
    'list-style-type:none',
    'margin-left:36pt',
    'xlist-style-type:lower-alpha',
    '',
    null,
    undefined
  ])
    assert.equal(listTypeFromStyle(style), null, String(style))
})
