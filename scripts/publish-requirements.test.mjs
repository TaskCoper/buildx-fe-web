import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import ts from 'typescript'

// Chạy phần thuần `publish-requirements.service.ts` (không import) bằng Node test runner.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = await readFile(resolve(root, 'src/features/admin/services/publish-requirements.service.ts'), 'utf8')
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText
const { hasMeaningfulHtml, librarySectionsProblem } = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`
)

const isImageName = (name) => /\.(jpe?g|png|webp)$/i.test(name)

test('nội dung bài: rỗng, thẻ rỗng và khoảng trắng không tính', () => {
  assert.equal(hasMeaningfulHtml(undefined), false)
  assert.equal(hasMeaningfulHtml(''), false)
  assert.equal(hasMeaningfulHtml('<p></p>'), false)
  assert.equal(hasMeaningfulHtml('<p><br></p><p>&nbsp;</p>'), false)
  assert.equal(hasMeaningfulHtml('<p>   </p>'), false)
})

test('nội dung bài: có chữ hoặc có ảnh có src thì hợp lệ', () => {
  assert.equal(hasMeaningfulHtml('<p>Xin chào</p>'), true)
  assert.equal(hasMeaningfulHtml('<h2>Tiêu đề</h2>'), true)
  assert.equal(hasMeaningfulHtml('<p><img src="https://cdn.example/a.jpg"></p>'), true)
  // Ảnh không có src không phải nội dung (BE đếm ảnh có `src`).
  assert.equal(hasMeaningfulHtml('<p><img alt="x"></p>'), false)
})

const section = (patch = {}) => ({ name: '', files: [], assets: [], ...patch })

test('thư viện: không có mục nào hoặc chỉ có mục trống hoàn toàn thì báo thiếu mục', () => {
  assert.deepEqual(librarySectionsProblem([], isImageName), { kind: 'noSection' })
  assert.deepEqual(librarySectionsProblem([section()], isImageName), { kind: 'noSection' })
})

test('thư viện: mục đã đặt tên mà chưa có tệp thì báo thiếu tệp', () => {
  assert.deepEqual(librarySectionsProblem([section({ name: 'Tầng 1' })], isImageName), {
    kind: 'sectionWithoutFile',
    name: 'Tầng 1'
  })
})

test('thư viện: mục đã lưu mà bỏ hết tệp vẫn bị coi là chưa có tệp', () => {
  const saved = section({ sectionId: 's1', name: 'Tầng 2', assets: [] })
  assert.equal(librarySectionsProblem([saved], isImageName)?.kind, 'sectionWithoutFile')
})

test('thư viện: toàn tệp không phải ảnh thì báo thiếu ảnh', () => {
  const dwg = section({ name: 'Mặt bằng', files: [{ name: 'ban-ve.dwg' }] })
  assert.deepEqual(librarySectionsProblem([dwg], isImageName), { kind: 'noImage' })
})

test('thư viện: đủ mục, mỗi mục có tệp và có ít nhất một ảnh thì hợp lệ', () => {
  const upload = section({ name: 'Tầng 1', files: [{ name: 'a.PNG' }] })
  const saved = section({ sectionId: 's2', name: 'Tầng 2', assets: [{ isImage: false }] })
  assert.equal(librarySectionsProblem([upload, saved], isImageName), null)
  const savedImage = section({ sectionId: 's3', name: 'Tầng 3', assets: [{ isImage: true }] })
  assert.equal(librarySectionsProblem([savedImage], isImageName), null)
})

test('thư viện: mục trống hoàn toàn bị bỏ qua, không làm hỏng các mục còn lại', () => {
  const ok = section({ name: 'Tầng 1', files: [{ name: 'a.jpg' }] })
  assert.equal(librarySectionsProblem([ok, section()], isImageName), null)
})
