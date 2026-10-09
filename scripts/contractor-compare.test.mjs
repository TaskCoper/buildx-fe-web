import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import ts from 'typescript'

// Chạy phần thuần của bảng so sánh nhà thầu (`contractor-compare.service.ts`, chỉ import kiểu) bằng Node test runner.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = await readFile(resolve(root, 'src/features/contractors/services/contractor-compare.service.ts'), 'utf8')
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText
const { betterByCriterion, compareLegalVerified, compareNumber, contractorFromCompareItem } = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`
)

/** Nhà thầu đủ dữ liệu; từng test ghi đè phần cần thử. */
const contractor = (id, overrides = {}) => ({
  id,
  name: id,
  verified: true,
  rating: 4.5,
  similarProjects: 3,
  distanceKm: 5,
  surveyWithinHours: 24,
  warrantyMonths: 12,
  ...overrides
})

test('nhà thầu đủ dữ liệu: mọi tiêu chí số có giá trị', () => {
  const c = contractor('a')
  assert.equal(compareNumber('rating', c), 4.5)
  assert.equal(compareNumber('similarProjects', c), 3)
  assert.equal(compareNumber('distance', c), 5)
  assert.equal(compareNumber('surveyTime', c), 24)
  assert.equal(compareNumber('warranty', c), 12)
  assert.equal(compareLegalVerified(c), true)
})

test('API báo chưa khai báo (cờ Known = false) thì tiêu chí là null, dù số là 0', () => {
  const c = contractor('a', {
    rating: 0,
    ratingKnown: false,
    similarProjects: 0,
    similarProjectsKnown: false,
    distanceKm: 0,
    distanceKnown: false,
    surveyWithinHours: 0,
    surveyTimeKnown: false
  })
  assert.equal(compareNumber('rating', c), null)
  assert.equal(compareNumber('similarProjects', c), null)
  assert.equal(compareNumber('distance', c), null)
  assert.equal(compareNumber('surveyTime', c), null)
})

test('đã khai báo giá trị 0 (cờ Known = true) vẫn là một giá trị, không phải chưa cập nhật', () => {
  const c = contractor('a', {
    similarProjects: 0,
    similarProjectsKnown: true,
    surveyWithinHours: 0,
    surveyTimeKnown: true
  })
  assert.equal(compareNumber('similarProjects', c), 0)
  assert.equal(compareNumber('surveyTime', c), 0)
})

test('không có cờ (dữ liệu mock cũ) thì coi là đã biết', () => {
  assert.equal(compareNumber('rating', contractor('a', { rating: 3 })), 3)
})

test('bảo hành 0 tháng nghĩa là chưa khai báo', () => {
  assert.equal(compareNumber('warranty', contractor('a', { warrantyMonths: 0 })), null)
})

test('hồ sơ chưa xác minh thì pháp lý chưa cập nhật', () => {
  assert.equal(compareLegalVerified(contractor('a', { verified: false })), false)
})

/** Một nhà thầu đủ dữ liệu như BE `GET /contractors/compare` trả về. */
const apiItem = (overrides = {}) => ({
  contractorId: 'api-1',
  name: 'Nhà thầu API',
  shortDescription: 'Thi công nhà phố',
  address: '1 Đường Test',
  provinceCode: '79',
  regionCode: 'south',
  serviceAreaText: 'TP.HCM; Bình Dương',
  logoUrl: 'https://cdn.example.test/logo.png',
  buildingTypes: [{ id: 'bt1', name: 'Nhà phố' }],
  scopes: [{ id: 's1', name: 'Phần thô' }],
  rating: 4.8,
  ratingCount: 21,
  projectCount: 9,
  similarProjectCount: 4,
  distanceKm: 3.1,
  surveyHours: 24,
  warrantyMonths: 24,
  acceptingProjects: true,
  foundedYear: 2010,
  teamSize: 8,
  legalName: 'Công ty Alpha',
  isVerified: true,
  ...overrides
})

test('phản hồi API đủ dữ liệu: các trường được chuyển đúng và đều là "đã biết"', () => {
  const c = contractorFromCompareItem(apiItem())
  assert.equal(c.id, 'api-1')
  assert.equal(c.legalName, 'Công ty Alpha')
  assert.equal(c.region, 'south')
  assert.deepEqual(c.serviceAreas, ['TP.HCM', 'Bình Dương'])
  assert.deepEqual(c.buildingTypeNames, ['Nhà phố'])
  assert.deepEqual(c.scopeNames, ['Phần thô'])
  assert.equal(c.completedProjects, 9)
  assert.equal(compareNumber('rating', c), 4.8)
  assert.equal(compareNumber('similarProjects', c), 4)
  assert.equal(compareNumber('distance', c), 3.1)
  assert.equal(compareNumber('surveyTime', c), 24)
  assert.equal(compareNumber('warranty', c), 24)
  assert.equal(compareLegalVerified(c), true)
})

test('phản hồi API thiếu trường (null): mọi tiêu chí là "chưa cập nhật", không phải số 0', () => {
  const c = contractorFromCompareItem(
    apiItem({
      rating: null,
      ratingCount: null,
      similarProjectCount: null,
      distanceKm: null,
      surveyHours: null,
      warrantyMonths: null,
      acceptingProjects: null,
      legalName: null,
      teamSize: null
    })
  )
  assert.equal(compareNumber('rating', c), null)
  assert.equal(compareNumber('similarProjects', c), null)
  assert.equal(compareNumber('distance', c), null)
  assert.equal(compareNumber('surveyTime', c), null)
  assert.equal(compareNumber('warranty', c), null)
  assert.equal(c.legalName, undefined)
  assert.equal(c.acceptingProjectsKnown, false)
})

test('phản hồi API không có công trình (không có khoảng cách và dự án tương tự) vẫn có điểm, khảo sát, bảo hành', () => {
  const c = contractorFromCompareItem(apiItem({ similarProjectCount: null, distanceKm: null }))
  assert.equal(compareNumber('distance', c), null)
  assert.equal(compareNumber('similarProjects', c), null)
  assert.equal(compareNumber('rating', c), 4.8)
  assert.equal(compareNumber('surveyTime', c), 24)
})

test('giá trị 0 do API khai báo (ví dụ 0 dự án tương tự, khảo sát trong 0 giờ) là một giá trị thật', () => {
  const c = contractorFromCompareItem(apiItem({ similarProjectCount: 0, surveyHours: 0, distanceKm: 0 }))
  assert.equal(compareNumber('similarProjects', c), 0)
  assert.equal(compareNumber('surveyTime', c), 0)
  assert.equal(compareNumber('distance', c), 0)
})

test('miền lạ hoặc thiếu thì region là null; nhà thầu không xác minh thì pháp lý chưa cập nhật', () => {
  assert.equal(contractorFromCompareItem(apiItem({ regionCode: 'moon' })).region, null)
  assert.equal(contractorFromCompareItem(apiItem({ regionCode: null })).region, null)
  assert.equal(compareLegalVerified(contractorFromCompareItem(apiItem({ isVerified: false }))), false)
})

test('"tốt hơn": điểm càng cao càng tốt, khoảng cách và giờ khảo sát càng thấp càng tốt', () => {
  const rows = [
    contractor('a', { rating: 4.2, distanceKm: 12, surveyWithinHours: 48 }),
    contractor('b', { rating: 4.8, distanceKm: 3, surveyWithinHours: 24 })
  ]
  const better = betterByCriterion(rows, ['rating', 'distance', 'surveyTime'])
  assert.equal(better.get('rating'), 'b')
  assert.equal(better.get('distance'), 'b')
  assert.equal(better.get('surveyTime'), 'b')
})

test('"tốt hơn": hoà thì không đánh dấu ai', () => {
  const rows = [contractor('a', { rating: 4.5 }), contractor('b', { rating: 4.5 })]
  assert.equal(betterByCriterion(rows, ['rating']).has('rating'), false)
})

test('"tốt hơn": ô chưa cập nhật không được tính là 0 (khoảng cách 0 không thắng)', () => {
  const rows = [
    contractor('a', { distanceKm: 0, distanceKnown: false }),
    contractor('b', { distanceKm: 8 }),
    contractor('c', { distanceKm: 6 })
  ]
  assert.equal(betterByCriterion(rows, ['distance']).get('distance'), 'c')
})

test('"tốt hơn": chỉ một nhà thầu có dữ liệu thì không có gì để so', () => {
  const rows = [contractor('a', { rating: 0, ratingKnown: false }), contractor('b', { rating: 4.9 })]
  assert.equal(betterByCriterion(rows, ['rating']).has('rating'), false)
})
