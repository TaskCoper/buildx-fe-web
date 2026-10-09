import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import ts from 'typescript'

// Chạy các hàm định dạng ô nhập tiền trong `src/shared/utils/formatters.ts` bằng Node test runner.
// `import type` bị TypeScript bỏ khi biên dịch nên file này nạp được mà không cần cấu hình alias.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = await readFile(resolve(root, 'src/shared/utils/formatters.ts'), 'utf8')
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText
const { caretAfterDigits, formatMoneyInput, parseMoneyInput } = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`
)

test('nhóm chữ số mỗi 3 số bằng dấu chấm', () => {
  assert.equal(formatMoneyInput('1'), '1')
  assert.equal(formatMoneyInput('999'), '999')
  assert.equal(formatMoneyInput('1000'), '1.000')
  assert.equal(formatMoneyInput('1850000'), '1.850.000')
  assert.equal(formatMoneyInput('1850000000'), '1.850.000.000')
  assert.equal(formatMoneyInput(1850000000), '1.850.000.000')
})

test('giữ đủ 28 chữ số của ngân sách, không làm tròn qua Number', () => {
  const digits = '9'.repeat(28)
  assert.equal(parseMoneyInput(formatMoneyInput(digits)), digits)
})

test('ô trống và giá trị rỗng cho ra chuỗi rỗng', () => {
  for (const value of ['', undefined, null]) assert.equal(formatMoneyInput(value), '')
  assert.equal(parseMoneyInput(''), '')
  assert.equal(parseMoneyInput(undefined), '')
})

test('dán chuỗi có ký hiệu tiền hoặc dấu cách thì vẫn ra đúng số', () => {
  assert.equal(parseMoneyInput('1.850.000.000 ₫'), '1850000000')
  assert.equal(parseMoneyInput('1,850,000 đ'), '1850000')
  assert.equal(formatMoneyInput('1 850 000'), '1.850.000')
  assert.equal(parseMoneyInput('abc'), '')
})

test('con trỏ nằm sau đúng chữ số người dùng vừa gõ khi dấu chấm chen vào', () => {
  // Gõ thêm số 0 vào cuối "999": 1.000, con trỏ sau chữ số thứ 4 (cuối chuỗi).
  assert.equal(caretAfterDigits('1.000', 4), 5)
  // Sửa giữa chừng: "1.850.000" con trỏ sau chữ số thứ 2 → sau số 8.
  assert.equal(caretAfterDigits('1.850.000', 2), 3)
  // Xoá hết các chữ số phía trước: con trỏ về đầu.
  assert.equal(caretAfterDigits('1.850.000', 0), 0)
  // Số chữ số vượt quá độ dài (ví dụ vừa bỏ số 0 đứng đầu) thì về cuối chuỗi.
  assert.equal(caretAfterDigits('7', 3), 1)
})
