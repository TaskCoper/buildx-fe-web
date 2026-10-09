import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import ts from 'typescript'

// Chạy phần thuần của route ảnh thư viện (`library-image.logic.ts`, không import) bằng Node test runner.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = await readFile(resolve(root, 'src/shared/media/library-image.logic.ts'), 'utf8')
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText
const {
  LIBRARY_IMAGE_WIDTHS,
  isConvertibleMediaType,
  isGuid,
  libraryImageQuality,
  libraryImageSrcSet,
  libraryImageUrl,
  negotiateLibraryImageFormat,
  parseLibraryContentUrl,
  parseLibraryImageWidth
} = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)

const V = '348ed6ba-d8ff-49e7-9b25-9ba477331773'
const A = '0b86f439-50e9-4c84-a232-4779e876232a'
const CONTENT = `/api/v1/library-versions/${V}/assets/${A}/content`

test('nhận ra contentUrl của thư viện và tách mã phiên bản, mã tệp', () => {
  assert.deepEqual(parseLibraryContentUrl(CONTENT), { versionId: V, assetId: A })
  assert.deepEqual(parseLibraryContentUrl(`${CONTENT}/`), { versionId: V, assetId: A })
  assert.deepEqual(
    parseLibraryContentUrl(
      CONTENT.toUpperCase()
        .replace('/API/V1/', '/api/v1/')
        .replace('LIBRARY-VERSIONS', 'library-versions')
        .replace('/ASSETS/', '/assets/')
        .replace('/CONTENT', '/content')
    ),
    {
      versionId: V,
      assetId: A
    }
  )
})

test('URL không đúng dạng (khác đường dẫn, có query, ngoài /api/v1, ký tự lạ) thì không nhận', () => {
  for (const bad of [
    '',
    null,
    undefined,
    '/images/a.avif',
    `${CONTENT}?w=100`,
    `https://evil.example${CONTENT}`,
    `/api/v1/library-versions/${V}/assets/${A}/content/../../x`,
    `/api/v1/library-versions/not-a-guid/assets/${A}/content`,
    `/api/v1/library-versions/${V}/assets/${A}/download`,
    `/api/v1/estimates/${V}/result-files/${A}`
  ]) {
    assert.equal(parseLibraryContentUrl(bad), null, String(bad))
  }
})

test('chỉ nhận các cỡ rộng trong danh sách cho phép', () => {
  for (const width of LIBRARY_IMAGE_WIDTHS) assert.equal(parseLibraryImageWidth(String(width)), width)
  for (const bad of [
    null,
    undefined,
    '',
    '0',
    '100',
    '641',
    '1921',
    '4096',
    '-640',
    '640.5',
    '640px',
    '0640',
    'abc',
    '1e3'
  ])
    assert.equal(parseLibraryImageWidth(bad), null, String(bad))
})

test('mã GUID phải đúng 8-4-4-4-12 chữ số thập lục phân', () => {
  assert.equal(isGuid(V), true)
  assert.equal(isGuid(V.toUpperCase()), true)
  for (const bad of ['', 'abc', `${V}x`, `x${V}`, `${V}/..`, '../etc/passwd', V.replaceAll('-', '')])
    assert.equal(isGuid(bad), false, bad)
})

test('địa chỉ ảnh đã đổi cỡ trỏ vào route riêng, kèm cỡ', () => {
  assert.equal(libraryImageUrl(CONTENT, 1280), `/api/media/library/${V}/${A}?w=1280`)
  assert.equal(libraryImageUrl('/images/a.avif', 1280), null)
  assert.equal(libraryImageUrl(null, 640), null)
})

test('srcset có đủ bốn cỡ, mỗi cỡ một mô tả w; URL lạ thì không có srcset', () => {
  const srcset = libraryImageSrcSet(CONTENT)
  assert.equal(srcset?.split(', ').length, 4)
  for (const width of LIBRARY_IMAGE_WIDTHS) assert.ok(srcset?.includes(`?w=${width} ${width}w`), String(width))
  assert.equal(libraryImageSrcSet('/images/a.avif'), undefined)
})

test('chọn định dạng: AVIF khi nhận, không thì WebP, không nữa thì giữ file gốc', () => {
  assert.equal(negotiateLibraryImageFormat('image/avif,image/webp,image/apng,*/*;q=0.8'), 'avif')
  assert.equal(negotiateLibraryImageFormat('image/webp,*/*'), 'webp')
  assert.equal(negotiateLibraryImageFormat('IMAGE/WEBP'), 'webp')
  assert.equal(negotiateLibraryImageFormat('image/png,image/*;q=0.8'), 'original')
  assert.equal(negotiateLibraryImageFormat(null), 'original')
  assert.equal(negotiateLibraryImageFormat('*/*'), 'original')
})

test('chỉ đổi JPEG, PNG, WebP; PDF, DWG, ảnh động và rỗng thì không', () => {
  for (const ok of ['image/jpeg', 'image/png', 'image/webp', 'image/png; charset=binary', 'IMAGE/JPEG'])
    assert.equal(isConvertibleMediaType(ok), true, ok)
  for (const bad of [
    'application/pdf',
    'image/vnd.dwg',
    'image/gif',
    'image/svg+xml',
    'application/octet-stream',
    '',
    null,
    undefined
  ])
    assert.equal(isConvertibleMediaType(bad), false, String(bad))
})

test('PNG (bản vẽ) giữ đủ màu và chất lượng cao hơn JPEG (ảnh chụp)', () => {
  assert.deepEqual(libraryImageQuality('image/png'), { quality: 65, chroma: '4:4:4' })
  assert.deepEqual(libraryImageQuality('image/jpeg'), { quality: 60, chroma: '4:2:0' })
  assert.deepEqual(libraryImageQuality(null), { quality: 60, chroma: '4:2:0' })
})
