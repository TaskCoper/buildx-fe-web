import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import ts from 'typescript'

// Chạy thẳng `src/shared/lib/image-src.ts` (hàm thuần, không import) bằng Node test runner.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = await readFile(resolve(root, 'src/shared/lib/image-src.ts'), 'utf8')
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText
const { OPTIMIZABLE_IMAGE_HOSTS, canOptimizeImage } = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`
)

test('ảnh trong public/ đi qua bộ tối ưu', () => {
  assert.equal(canOptimizeImage('/images/partners/kova.avif'), true)
  assert.equal(canOptimizeImage('/images/placeholder-hero.svg'), true)
})

test('route /api/ của backend cần cookie phiên nên không qua next/image', () => {
  assert.equal(canOptimizeImage('/api/v1/library-versions/abc/content'), false)
})

test('URL tuyệt đối không cùng host được coi là ngoài danh sách', () => {
  assert.equal(canOptimizeImage('//evil.example/x.png'), false)
  assert.equal(canOptimizeImage('http://images.unsplash.com/photo.jpg'), false)
  assert.equal(canOptimizeImage('https://images.unsplash.com.evil.example/photo.jpg'), false)
  assert.equal(canOptimizeImage('https://evilimages.unsplash.com/photo.jpg'), false)
  assert.equal(canOptimizeImage('https://example.com/logo.png'), false)
})

test('host khai báo trong remotePatterns được nhận, kể cả tên miền con của mẫu **.', () => {
  assert.equal(canOptimizeImage('https://bmt-cdn-vnzdna.cdn.vccloud.vn/media/images/a.png'), true)
  assert.equal(canOptimizeImage('https://images.unsplash.com/photo-1?w=900&q=80'), true)
  assert.equal(canOptimizeImage('https://bucket.ss.bfcplatform.vn/media/a.jpg'), true)
  assert.equal(canOptimizeImage('https://a.b.ss.bfcplatform.vn/media/a.jpg'), true)
  // `**.ss.bfcplatform.vn` đòi ít nhất một nhãn đứng trước, giống cách Next khớp remotePatterns.
  assert.equal(canOptimizeImage('https://ss.bfcplatform.vn/media/a.jpg'), false)
})

test('dữ liệu không phải URL ảnh hợp lệ thì không tối ưu', () => {
  for (const value of [
    '',
    undefined,
    null,
    'blob:https://buildx.vnzdna.com/uuid',
    'data:image/png;base64,AAAA',
    'logo.png'
  ]) {
    assert.equal(canOptimizeImage(value), false, String(value))
  }
})

test('danh sách host khớp images.remotePatterns trong next.config.ts', async () => {
  const config = await readFile(resolve(root, 'next.config.ts'), 'utf8')
  // Chỉ xét phần trong `remotePatterns: [ … ]`, bỏ qua dòng chú thích đã tắt.
  const block = /remotePatterns:\s*\[([\s\S]*?)\n\s*\]\s*\n\s*\}/.exec(config)?.[1] ?? ''
  const declared = [
    ...block
      .split(/\r?\n/)
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n')
      .matchAll(/hostname:\s*'([^']+)'/g)
  ]
    .map((match) => match[1])
    .sort()
  assert.ok(declared.length > 0, 'không đọc được remotePatterns')
  assert.deepEqual(declared, [...OPTIMIZABLE_IMAGE_HOSTS].sort())
})
