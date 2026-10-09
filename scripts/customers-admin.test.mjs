import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import ts from 'typescript'

// Chạy phần thuần của màn Khách hàng (`customers.logic.ts`, không import) bằng Node test runner.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = await readFile(resolve(root, 'src/features/admin/api/bmt/customers.logic.ts'), 'utf8')
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText
const { currentPurchase, customerDisplayName, customerStatusView, quotaLeft } = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`
)

test('họ tên đọc theo thứ tự Việt: họ và tên đệm trước, tên sau', () => {
  assert.equal(
    customerDisplayName({ lastName: 'Nguyễn Văn', firstName: 'An', email: 'an@example.test' }),
    'Nguyễn Văn An'
  )
})

test('thiếu họ hoặc tên thì dùng phần còn lại, bỏ khoảng trắng thừa', () => {
  assert.equal(customerDisplayName({ lastName: '  Trần ', firstName: null, email: 'x@example.test' }), 'Trần')
  assert.equal(customerDisplayName({ lastName: undefined, firstName: ' Bình ', email: 'x@example.test' }), 'Bình')
})

test('chưa có tên thì hiện email để dòng không trống', () => {
  assert.equal(
    customerDisplayName({ lastName: null, firstName: null, email: 'khach@example.test' }),
    'khach@example.test'
  )
  assert.equal(
    customerDisplayName({ lastName: '  ', firstName: '', email: 'khach@example.test' }),
    'khach@example.test'
  )
})

test('trạng thái Locked của backend hiện là "Đã ban", còn lại là hoạt động', () => {
  assert.equal(customerStatusView('Locked'), 'suspended')
  assert.equal(customerStatusView('Active'), 'active')
})

test('lượt còn lại = hạn mức − đang giữ − đã dùng, không âm', () => {
  assert.equal(quotaLeft({ isUnlimited: false, limit: 10, used: 3, reserved: 2 }), 5)
  assert.equal(quotaLeft({ isUnlimited: false, limit: 3, used: 3, reserved: 2 }), 0)
  assert.equal(quotaLeft({ isUnlimited: false, limit: 0, used: 0, reserved: 0 }), 0)
})

test('hạn mức không giới hạn hoặc thiếu hạn mức thì không có "còn lại"', () => {
  assert.equal(quotaLeft({ isUnlimited: true, limit: null, used: 7, reserved: 1 }), null)
  assert.equal(quotaLeft({ isUnlimited: true, limit: 5, used: 1, reserved: 0 }), null)
  assert.equal(quotaLeft({ isUnlimited: false, limit: null, used: 1, reserved: 0 }), null)
})

const purchase = (id, kind, effectiveState) => ({ id, kind, effectiveState })

test('gói đang dùng là dòng đầu tiên (mới nhất) còn hiệu lực của đúng loại', () => {
  const list = [
    purchase('d-new', 'Design', 'Expired'),
    purchase('s-1', 'Supervision', 'Assigned'),
    purchase('d-old', 'Design', 'Active'),
    purchase('d-oldest', 'Design', 'Active')
  ]
  assert.equal(currentPurchase(list, 'Design').id, 'd-old')
  assert.equal(currentPurchase(list, 'Supervision').id, 's-1')
})

test('gói giám sát chưa gán, đã gán và đã hoàn thành đều còn giữ chỗ', () => {
  for (const state of ['Unassigned', 'Assigned', 'Completed']) {
    assert.equal(currentPurchase([purchase('s', 'Supervision', state)], 'Supervision')?.id, 's', state)
  }
})

test('hết hạn, đã hủy, bị thay thế không tính là gói đang dùng', () => {
  for (const state of ['Expired', 'ExpiredUnassigned', 'CanceledByStaff', 'Superseded', 'SupersededBeforeActivation']) {
    assert.equal(currentPurchase([purchase('x', 'Design', state)], 'Design'), undefined, state)
    assert.equal(currentPurchase([purchase('x', 'Supervision', state)], 'Supervision'), undefined, state)
  }
  assert.equal(currentPurchase([], 'Design'), undefined)
})
