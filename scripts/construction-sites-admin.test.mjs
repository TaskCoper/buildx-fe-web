import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import ts from 'typescript'

// Chạy phần chuẩn hóa của màn Công trình quản trị (`construction-sites.logic.ts`, chỉ import zod) bằng Node test runner.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = await readFile(resolve(root, 'src/features/admin/api/bmt/construction-sites.logic.ts'), 'utf8')
const js = ts
  .transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
  .outputText.replace(/from ['"]zod['"]/, `from '${import.meta.resolve('zod')}'`)
const { normalizeSite } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)

// Dạng StaffConstructionSiteItem của BE (camelCase) với phần hồ sơ mở rộng tối thiểu.
const raw = (extra = {}) => ({
  constructionSiteId: '11111111-1111-4111-8111-111111111111',
  code: 'BUILDX-HS-20261010-T4W8NC',
  name: 'Nhà phố',
  address: '12 Đường A, Phường Ba Đình, Thành phố Hà Nội',
  version: 1,
  createdAtUtc: '2026-10-10T03:00:00+00:00',
  updatedAtUtc: '2026-10-10T03:00:00+00:00',
  profile: {
    areaM2: '100.25',
    addressDetail: '12 Đường A',
    floorCount: 3,
    hasTum: false,
    architectureStyleId: null,
    interiorStyleId: null
  },
  conditionName: 'Đất trống',
  budgetVnd: '2000000000',
  plannedStart: 'Undecided',
  provinceName: 'Thành phố Hà Nội',
  wardName: 'Phường Ba Đình',
  sourceEstimateId: null,
  buildingTypeName: 'Nhà phố',
  architectureStyleName: null,
  interiorStyleName: null,
  files: [],
  latitude: 21.04,
  longitude: 105.83,
  owner: { userId: '22222222-2222-4222-8222-222222222222', fullName: 'Khách U1', email: 'u1@example.test' },
  supervisionGrants: [],
  ...extra
})

test('mô tả nhu cầu của khách đi qua chuẩn hóa, giữ xuống dòng ở giữa (BR-SITE-003 khoản 15)', () => {
  const site = normalizeSite(raw({ description: 'Cần phá dỡ nhà cũ, giữ lại cổng.\nCuối tuần khảo sát được.' }))
  assert.equal(site.description, 'Cần phá dỡ nhà cũ, giữ lại cổng.\nCuối tuần khảo sát được.')
})

test('chưa nhập mô tả (null, thiếu trường hoặc chỉ khoảng trắng) thì là null để màn hiện "chưa nhập"', () => {
  assert.equal(normalizeSite(raw({ description: null })).description, null)
  assert.equal(normalizeSite(raw()).description, null)
  assert.equal(normalizeSite(raw({ description: '  \n ' })).description, null)
})

test('thêm mô tả không làm mất phần hồ sơ khác', () => {
  const site = normalizeSite(raw({ description: 'Mô tả' }))
  assert.equal(site.code, 'BUILDX-HS-20261010-T4W8NC')
  assert.equal(site.owner?.email, 'u1@example.test')
  assert.equal(site.profile.addressDetail, '12 Đường A')
  assert.equal(site.latitude, 21.04)
})
