import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

// `image-variants.ts` (không import) và `next.config.ts` phải khai báo cùng các bậc ảnh; lệch nhau là warm sinh sai bậc
// nên khách vẫn gặp ảnh nguội, hoặc bộ tối ưu trả 400 cho bậc ngoài danh sách.
const root = new URL('../', import.meta.url)
const source = await readFile(new URL('src/shared/lib/image-variants.ts', root), 'utf8')
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText
const { ALL_WIDTHS, DEVICE_SIZES, IMAGE_QUALITY, IMAGE_SIZES, optimizedImageUrl } = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`
)
const config = await readFile(new URL('next.config.ts', root), 'utf8')
const listOf = (name) => {
  const match = new RegExp(`${name}:\\s*\\[([^\\]]*)\\]`).exec(config)
  assert.ok(match, `${name} có trong next.config.ts`)
  return match[1].split(',').map((item) => Number(item.trim()))
}

test('next.config.ts khai báo đúng các bậc và mức nén của image-variants.ts', () => {
  assert.deepEqual(listOf('deviceSizes'), [...DEVICE_SIZES])
  assert.deepEqual(listOf('imageSizes'), [...IMAGE_SIZES])
  assert.deepEqual(listOf('qualities'), [IMAGE_QUALITY])
})

test('warm sinh trước đủ mọi bậc, không trùng, tăng dần', () => {
  assert.deepEqual([...ALL_WIDTHS], [...IMAGE_SIZES, ...DEVICE_SIZES])
  assert.equal(new Set(ALL_WIDTHS).size, ALL_WIDTHS.length)
  assert.deepEqual(
    [...ALL_WIDTHS],
    [...ALL_WIDTHS].sort((a, b) => a - b)
  )
})

test('optimizedImageUrl mã hoá địa chỉ nguồn và dùng mức nén duy nhất', () => {
  assert.equal(
    optimizedImageUrl('https://cdn.example.test/a b.webp?x=1', 640),
    `/_next/image?url=https%3A%2F%2Fcdn.example.test%2Fa%20b.webp%3Fx%3D1&w=640&q=${IMAGE_QUALITY}`
  )
})
